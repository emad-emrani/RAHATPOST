import { createHash } from "node:crypto";
import { BUILTIN_LANGS, type LangDef } from "./core";
import { BUILTIN_DICT, UI_KEYS } from "./builtin";
import { aiGenerate, geminiFor, logUsage } from "./gemini.server";

async function sql() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

let langCache: { at: number; v: LangDef[] } | null = null;

export async function loadLanguages(fresh = false): Promise<LangDef[]> {
  if (!fresh && langCache && Date.now() - langCache.at < 30_000) return langCache.v;
  let v = BUILTIN_LANGS;
  try {
    const db = await sql();
    const rows = await db<{
      code: string; name: string; dir: string; flag: string; enabled: boolean; is_default: boolean; mode: string; sort: number;
    }>`select * from site_languages order by sort, code`;
    if (rows.length) {
      v = rows.map((r) => ({
        code: r.code, name: r.name, dir: r.dir === "ltr" ? "ltr" : "rtl", flag: r.flag ?? "",
        enabled: r.enabled, isDefault: r.is_default, mode: r.mode === "manual" ? "manual" : "ai", sort: r.sort,
      }));
      if (!v.some((l) => l.code === "ar")) v = [BUILTIN_LANGS[0], ...v];
    }
  } catch (e) {
    console.error("[i18n] languages read failed", e);
  }
  langCache = { at: Date.now(), v };
  return v;
}

export async function saveLanguages(list: LangDef[]): Promise<void> {
  const db = await sql();
  const codes = list.map((l) => l.code);
  await db`delete from site_languages where not (code = any(${codes}))`;
  for (const l of list)
    await db`insert into site_languages (code, name, dir, flag, enabled, is_default, mode, sort)
      values (${l.code}, ${l.name}, ${l.dir}, ${l.flag}, ${l.enabled}, ${l.isDefault}, ${l.mode}, ${l.sort})
      on conflict (code) do update set name = excluded.name, dir = excluded.dir, flag = excluded.flag,
        enabled = excluded.enabled, is_default = excluded.is_default, mode = excluded.mode, sort = excluded.sort`;
  langCache = null;
}

const dictCache = new Map<string, { at: number; v: Record<string, string> }>();

/** UI dictionary for a language: built-in → AI rows → manual rows (later wins). */
export async function loadDict(lang: string, fresh = false): Promise<Record<string, string>> {
  if (lang === "ar") return {};
  const hit = dictCache.get(lang);
  if (!fresh && hit && Date.now() - hit.at < 60_000) return hit.v;
  const v: Record<string, string> = {};
  for (const k of UI_KEYS) {
    const t = BUILTIN_DICT[k]?.[lang];
    if (t) v[k] = t;
  }
  try {
    const db = await sql();
    const rows = await db<{ key: string; text: string; source: string }>`
      select key, text, source from ui_translations where lang = ${lang} order by (source = 'manual')`;
    for (const r of rows) v[r.key] = r.text;
  } catch (e) {
    console.error("[i18n] dict read failed", e);
  }
  dictCache.set(lang, { at: Date.now(), v });
  return v;
}

export function invalidateDict(lang?: string) {
  if (lang) dictCache.delete(lang);
  else dictCache.clear();
}

function langName(l: LangDef | undefined, code: string) {
  return l ? `${l.name} (${code})` : code;
}

function systemFor(style: string, target: string) {
  return `You are a professional translator. Translate from Arabic into ${target}. ${style}`;
}

/** Translate up to `max` missing UI keys for a language with Gemini. */
export async function translateMissingUi(lang: string, max = 120): Promise<{ done: number; remaining: number; ok: boolean }> {
  const s = await geminiFor("site");
  const langs = await loadLanguages();
  const dict = await loadDict(lang, true);
  const missing = UI_KEYS.filter((k) => !dict[k]);
  if (!s) return { done: 0, remaining: missing.length, ok: false };
  const batch = missing.slice(0, max);
  if (!batch.length) return { done: 0, remaining: 0, ok: true };
  const input = JSON.stringify(Object.fromEntries(batch.map((k, i) => [String(i), k])));
  const out = (await aiGenerate(
    s,
    "site",
    systemFor(s.stylePrompt, langName(langs.find((l) => l.code === lang), lang)) +
      " These are short website UI strings. Input is a JSON object of id → Arabic text. Return a JSON object with the same ids → translation. Keep placeholders like {0} {1}, emoji and punctuation.",
    input,
    { timeoutMs: 60_000, json: true },
  ))?.text;
  let done = 0;
  if (out) {
    try {
      const parsed = JSON.parse(out.replace(/^```(json)?|```$/g, "")) as Record<string, string>;
      const db = await sql();
      for (const [i, t] of Object.entries(parsed)) {
        const key = batch[Number(i)];
        if (!key || typeof t !== "string" || !t.trim()) continue;
        await db`insert into ui_translations (lang, key, text, source) values (${lang}, ${key}, ${t.trim()}, 'ai')
          on conflict (lang, key) do nothing`;
        done++;
      }
    } catch (e) {
      void logUsage("site", { errors: 1 }, "bad JSON from model: " + String(e));
    }
  }
  invalidateDict(lang);
  return { done, remaining: missing.length - done, ok: Boolean(out) };
}

// ---------- dynamic content (news, products…) ----------

const mem = new Map<string, string>();
const hashOf = (t: string) => createHash("sha1").update(t).digest("hex");
const inflight = new Map<string, Promise<void>>();

/**
 * Arabic texts → target language, from cache; missing ones go to Gemini in one batch, waiting at
 * most `budgetMs` (the rest finishes in the background for the next request). Falls back to the
 * original text so pages never break.
 */
export async function translateContent(texts: string[], lang: string, budgetMs = 2_500, kind: "site" | "auto" = "site"): Promise<string[]> {
  if (lang === "ar" || !texts.length) return texts;
  const uniq = [...new Set(texts.filter((t) => t && /[\u0600-\u06FF]/.test(t)))];
  const key = (t: string) => `${lang}:${hashOf(t)}`;
  const missing = uniq.filter((t) => !mem.has(key(t)));
  if (missing.length) {
    try {
      const db = await sql();
      const rows = await db<{ hash: string; text: string }>`
        select hash, text from content_translations where lang = ${lang} and hash = any(${missing.map(hashOf)})`;
      const byHash = new Map(rows.map((r) => [r.hash, r.text]));
      for (const t of missing) {
        const v = byHash.get(hashOf(t));
        if (v) mem.set(key(t), v);
      }
    } catch (e) {
      console.error("[i18n] content cache read failed", e);
    }
  }
  const todo = uniq.filter((t) => !mem.has(key(t)));
  const cachedHits = uniq.length - todo.length;
  if (cachedHits) void logUsage(kind, { cached: cachedHits });
  if (todo.length) {
    const s = await geminiFor(kind);
    if (s) {
      const id = `${lang}:${todo.map(hashOf).join(",")}`.slice(0, 400);
      const run =
        inflight.get(id) ??
        (async () => {
          const langs = await loadLanguages();
          for (let i = 0; i < todo.length; i += 20) {
            const chunk = todo.slice(i, i + 20);
            const out = (await aiGenerate(
              s,
              kind,
              systemFor(s.stylePrompt, langName(langs.find((l) => l.code === lang), lang)) +
                " Input is a JSON object of id → Arabic text (news headlines, excerpts, product names). Return a JSON object with the same ids → translation.",
              JSON.stringify(Object.fromEntries(chunk.map((t, j) => [String(j), t.slice(0, 4000)]))),
              { timeoutMs: 30_000, json: true },
            ))?.text;
            if (!out) {
              // No JSON-capable provider right now (e.g. Gemini 429, no xAI key): translate one by
              // one through the plain chain, which ends with MyMemory. Titles first (short texts).
              const order = [...chunk].sort((a, b) => a.length - b.length);
              const db = await sql();
              let next = 0;
              const worker = async () => {
                while (next < order.length) {
                  const src = order[next++];
                  const r = (await aiGenerate(s, kind, systemFor(s.stylePrompt, langName(langs.find((l) => l.code === lang), lang)), src.slice(0, 480), {
                    timeoutMs: 10_000,
                    pair: { from: "ar", to: lang },
                  }))?.text?.trim();
                  if (!r) continue;
                  mem.set(key(src), r);
                  await db`insert into content_translations (hash, lang, text) values (${hashOf(src)}, ${lang}, ${r})
                    on conflict (hash, lang) do update set text = excluded.text`.catch(() => {});
                }
              };
              await Promise.all([worker(), worker(), worker()]);
              continue;
            }
            try {
              const parsed = JSON.parse(out.replace(/^```(json)?|```$/g, "")) as Record<string, string>;
              const db = await sql();
              for (const [j, v] of Object.entries(parsed)) {
                const src = chunk[Number(j)];
                if (!src || typeof v !== "string" || !v.trim()) continue;
                mem.set(key(src), v.trim());
                await db`insert into content_translations (hash, lang, text) values (${hashOf(src)}, ${lang}, ${v.trim()})
                  on conflict (hash, lang) do update set text = excluded.text`;
              }
            } catch (e) {
              console.error("[i18n] content translate parse failed", e);
            }
          }
          if (mem.size > 5_000) for (const k of [...mem.keys()].slice(0, 1_000)) mem.delete(k);
        })().finally(() => inflight.delete(id));
      inflight.set(id, run);
      await Promise.race([run, new Promise((r) => setTimeout(r, budgetMs))]);
    }
  }
  return texts.map((t) => mem.get(key(t)) ?? t);
}

export async function clearContentCache(lang: string): Promise<number> {
  for (const k of [...mem.keys()]) if (k.startsWith(`${lang}:`)) mem.delete(k);
  const db = await sql();
  const rows = await db<{ n: number }>`with d as (delete from content_translations where lang = ${lang} returning 1) select count(*)::int as n from d`;
  await db`delete from ui_translations where lang = ${lang} and source = 'ai'`;
  invalidateDict(lang);
  return rows[0]?.n ?? 0;
}
