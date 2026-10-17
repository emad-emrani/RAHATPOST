/**
 * Hebrew → Arabic machine translation for Israel news headlines/excerpts.
 *
 * Primary provider: Google Gemini (GEMINI_API_KEY, model GEMINI_MODEL, default gemini-3.8-flash).
 * Fallback provider: MyMemory (https://mymemory.translated.net) — an official, free, documented API from
 * Translated; no account or key needed. Anonymous use is limited to ~5,000 characters/day per
 * server IP; setting MYMEMORY_EMAIL (a contact email, the documented `de` parameter) raises it to
 * ~50,000/day. Set TRANSLATE_PROVIDER=off to disable translation (Hebrew is shown as-is).
 *
 * Each item is translated once: results are cached in memory and in the `news_translations`
 * table (migration 0003), keyed by the news item id. When the daily quota runs out we pause
 * until the next day and show Hebrew in the meantime.
 */

type Translation = { title?: string; summary?: string; provider?: string };

const GEMINI_TIMEOUT_MS = 15_000;
const GEMINI_PROMPT =
  "أنت مترجم أخبار محترف. ترجم النص العبري التالي إلى العربية الفصحى بأسلوب إخباري واضح وطبيعي. " +
  "حافظ على أسماء الأشخاص والأماكن والمؤسسات بصيغتها العربية المتعارف عليها (مثل: القدس، تل أبيب، رهط، النقب). " +
  "أعد الترجمة فقط دون أي شرح أو علامات تنصيص أو مقدمة.";
const hasGemini = () => Boolean(process.env.GEMINI_API_KEY?.trim());
const ENDPOINT = "https://api.mymemory.translated.net/get";
const TIMEOUT_MS = 6_000;
/** MyMemory accepts at most 500 bytes per query; Hebrew is 2 bytes per letter in UTF-8. */
const MAX_QUERY_BYTES = 480;

const memory = new Map<string, Translation>();
let pausedUntil = 0;
let dbBroken = false;

export function translationMode(): "on" | "paused" | "off" {
  if (process.env.TRANSLATE_PROVIDER?.trim().toLowerCase() === "off") return "off";
  return Date.now() < pausedUntil ? "paused" : "on";
}

/** Cached translations for these ids (memory first, then the database). */
export async function getCachedTranslations(ids: string[]): Promise<Map<string, Translation>> {
  const out = new Map<string, Translation>();
  const missing: string[] = [];
  for (const id of ids) {
    const hit = memory.get(id);
    if (hit) out.set(id, hit);
    else missing.push(id);
  }
  if (missing.length > 0 && !dbBroken) {
    try {
      const { getSql } = await import("@/lib/db");
      const sql = await getSql();
      const rows = await sql<{ id: string; title_ar: string | null; summary_ar: string | null; provider: string | null }>`
        select id, title_ar, summary_ar, provider from news_translations where id = any(${missing})`;
      for (const row of rows) {
        const t: Translation = {
          ...(row.title_ar ? { title: row.title_ar } : {}),
          ...(row.summary_ar ? { summary: row.summary_ar } : {}),
          provider: row.provider ?? undefined,
        };
        memory.set(row.id, t);
        out.set(row.id, t);
      }
    } catch (error) {
      dbBroken = true; // keep working from memory; retry the DB after a while
      setTimeout(() => (dbBroken = false), 5 * 60_000);
      console.error("[translate] cache read failed", error);
    }
  }
  return out;
}

export type TranslateJob = { id: string; title: string; summary?: string };

/**
 * Translate what isn't cached yet, a few at a time, within `budgetMs`. Work that doesn't finish
 * in time keeps going in the background and lands in the cache for the next request.
 */
export async function translateMissing(jobs: TranslateJob[], budgetMs: number): Promise<void> {
  if (translationMode() !== "on" || jobs.length === 0) return;
  const cached = await getCachedTranslations(jobs.map((j) => j.id));
  const todo = jobs.filter((job) => {
    const t = cached.get(job.id);
    // Upgrade older machine translations (MyMemory) to Gemini when a key is configured.
    if (t && hasGemini() && t.provider !== "gemini") return true;
    return !t?.title || (job.summary && !t.summary);
  });
  if (todo.length === 0) return;

  let next = 0;
  const worker = async () => {
    while (next < todo.length && translationMode() === "on") {
      const job = todo[next++];
      if (inflight.has(job.id)) {
        await inflight.get(job.id);
        continue;
      }
      const prev = cached.get(job.id);
      const have = prev && hasGemini() && prev.provider !== "gemini" ? {} : (prev ?? {});
      const run = translateJob(job, have).finally(() =>
        inflight.delete(job.id),
      );
      inflight.set(job.id, run);
      await run;
    }
  };
  const work = Promise.all(Array.from({ length: 3 }, worker)).catch((error) =>
    console.error("[translate]", error),
  );
  await Promise.race([work, new Promise((resolve) => setTimeout(resolve, budgetMs))]);
}

const inflight = new Map<string, Promise<void>>();

async function translateJob(job: TranslateJob, have: Translation): Promise<void> {
  let provider = have.provider ?? "mymemory";
  const one = async (text: string) => {
    const r = await translateText(text);
    if (r) provider = r.provider;
    return r?.text;
  };
  const title = have.title ?? (await one(job.title));
  const summary = have.summary ?? (job.summary ? await one(job.summary) : undefined);
  if (!title && !summary) return;
  const t: Translation = {
    ...(title ? { title } : {}),
    ...(summary ? { summary } : {}),
    provider,
  };
  memory.set(job.id, t);
  if (memory.size > 2_000)
    for (const key of [...memory.keys()].slice(0, memory.size - 1_500)) memory.delete(key);
  if (dbBroken) return;
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      insert into news_translations (id, title_ar, summary_ar, provider)
      values (${job.id}, ${t.title ?? null}, ${t.summary ?? null}, ${provider})
      on conflict (id) do update set
        title_ar = case when excluded.provider = 'gemini' then coalesce(excluded.title_ar, news_translations.title_ar)
                   else coalesce(news_translations.title_ar, excluded.title_ar) end,
        summary_ar = case when excluded.provider = 'gemini' then coalesce(excluded.summary_ar, news_translations.summary_ar)
                     else coalesce(news_translations.summary_ar, excluded.summary_ar) end,
        provider = excluded.provider,
        updated_at = now()`;
  } catch (error) {
    console.error("[translate] cache write failed", error);
  }
}

async function translateText(
  text: string,
): Promise<{ text: string; provider: string } | undefined> {
  {
    const g = await translateGemini(text);
    if (g) return { text: g, provider: "gemini" };
  }
  const m = await translateMyMemory(clip(text));
  return m ? { text: m, provider: "mymemory" } : undefined;
}


function looksArabic(out: string): boolean {
  const arabic = (out.match(/[\u0600-\u06FF]/g) ?? []).length;
  const hebrew = (out.match(/[\u0590-\u05FF]/g) ?? []).length;
  return arabic >= 3 && hebrew <= arabic / 4 && !/<[a-z]/i.test(out);
}

async function translateGemini(text: string): Promise<string | undefined> {
  const q = text.trim().slice(0, 4_000);
  if (!q) return undefined;
  const { geminiFor, geminiGenerate } = await import("@/lib/i18n/gemini.server");
  const s = await geminiFor("israel");
  if (!s) return undefined;
  const out = (await geminiGenerate(s, "israel", GEMINI_PROMPT, q, { timeoutMs: GEMINI_TIMEOUT_MS }))
    ?.trim()
    .replace(/^["«“]+|["»”]+$/g, "")
    .trim();
  return out && looksArabic(out) ? out : undefined;
}

async function translateMyMemory(text: string): Promise<string | undefined> {
  const q = text.trim();
  if (!q || translationMode() !== "on") return undefined;
  const params = new URLSearchParams({ q, langpair: "he|ar" });
  const email = process.env.MYMEMORY_EMAIL?.trim();
  if (email) params.set("de", email);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${ENDPOINT}?${params}`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (res.status === 429) return pause();
    if (!res.ok) return undefined;
    const data = (await res.json()) as {
      responseStatus?: number | string;
      quotaFinished?: boolean;
      responseData?: { translatedText?: string };
    };
    const out = data.responseData?.translatedText?.trim() ?? "";
    if (data.quotaFinished || /MYMEMORY WARNING|USED ALL AVAILABLE FREE/i.test(out)) return pause();
    if (Number(data.responseStatus) !== 200 || !out) return undefined;
    // Must actually be Arabic (not an echo of the Hebrew, an error string or HTML).
    const arabic = (out.match(/[\u0600-\u06FF]/g) ?? []).length;
    const hebrew = (out.match(/[\u0590-\u05FF]/g) ?? []).length;
    if (arabic < 3 || hebrew > arabic / 4 || /<[a-z]/i.test(out)) return undefined;
    return decode(out);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

function pause(): undefined {
  // Free quota is daily: try again in a few hours rather than hammering the service.
  pausedUntil = Date.now() + 3 * 60 * 60_000;
  console.warn("[translate] MyMemory quota reached; showing Hebrew until", new Date(pausedUntil));
  return undefined;
}

/** Cut to the query byte limit at a word boundary. */
function clip(text: string): string {
  const bytes = (s: string) => new TextEncoder().encode(s).length;
  if (bytes(text) <= MAX_QUERY_BYTES) return text;
  let cut = text;
  while (bytes(cut) > MAX_QUERY_BYTES - 3) cut = cut.slice(0, cut.lastIndexOf(" ", cut.length - 2));
  return `${cut}…`;
}

function decode(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
