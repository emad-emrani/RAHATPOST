#!/usr/bin/env node
/**
 * Deploy-time UI translation fill: translates dictionary keys (src/lib/i18n/dict.json) that have no
 * built-in or stored translation yet into every enabled AI-mode language with Gemini, saving them in
 * `ui_translations` (source 'ai'). Non-fatal and time-boxed; skipped without DATABASE_URL or a key.
 */
import { readFile } from "node:fs/promises";
import pg from "pg";

const url = process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.DATABASE_URL?.trim();
const key = process.env.GEMINI_API_KEY?.trim();
if (!url || !key || process.env.I18N_FILL === "off") {
  console.log("[i18n-fill] skipped (no DATABASE_URL / GEMINI_API_KEY)");
  process.exit(0);
}
const deadline = Date.now() + Number(process.env.I18N_FILL_MS || 420_000);
const MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
const dict = JSON.parse(await readFile(new URL("../src/lib/i18n/dict.json", import.meta.url), "utf8"));
const keys = Object.keys(dict);
const client = new pg.Client({ connectionString: url });

const BUILTIN = [
  { code: "he", name: "Hebrew (עברית)" },
  { code: "en", name: "English" },
];

async function translate(lang, chunk) {
  const sys = `You translate UI strings of "رهط بوست" (Rahat Post), a community website for the Bedouin city of Rahat in the Negev, Israel (news, buses, digital store, classifieds, admin panel) from Arabic into ${lang.name}. Input: JSON object id → Arabic string. Output: JSON object id → translation. Natural, concise UI wording. Keep placeholders like {0} {1}, emoji, numbers and URLs exactly. Site name: Hebrew "רהט פוסט", English "Rahat Post". Return only JSON.`;
  for (let attempt = 0; attempt < 6 && Date.now() < deadline; attempt++) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sys }] },
          contents: [{ role: "user", parts: [{ text: JSON.stringify(Object.fromEntries(chunk.map((k, i) => [i, k]))) }] }],
          generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
        }),
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) {
        console.log("[i18n-fill] gemini", res.status);
        await new Promise((r) => setTimeout(r, res.status === 429 ? 20_000 : 3_000));
        continue;
      }
      const d = await res.json();
      const text = (d.candidates?.[0]?.content?.parts ?? []).filter((p) => !p.thought).map((p) => p.text).join("");
      return JSON.parse(text);
    } catch (e) {
      console.log("[i18n-fill] error", String(e).slice(0, 120));
    }
  }
  return {};
}

try {
  await client.connect();
  let langs = BUILTIN;
  try {
    const r = await client.query("select code, name from site_languages where enabled and mode = 'ai' and code <> 'ar'");
    if (r.rows.length) langs = r.rows.map((x) => ({ code: x.code, name: x.name }));
  } catch {
    /* table may not exist yet */
  }
  for (const lang of langs) {
    const have = new Set((await client.query("select key from ui_translations where lang = $1", [lang.code])).rows.map((r) => r.key));
    const todo = keys.filter((k) => !dict[k]?.[lang.code] && !have.has(k));
    console.log(`[i18n-fill] ${lang.code}: ${todo.length} missing`);
    const chunks = [];
    for (let i = 0; i < todo.length; i += 120) chunks.push(todo.slice(i, i + 120));
    let next = 0;
    let saved = 0;
    await Promise.all(
      Array.from({ length: 2 }, async () => {
        while (next < chunks.length && Date.now() < deadline) {
          const chunk = chunks[next++];
          const out = await translate(lang, chunk);
          for (const [i, t] of Object.entries(out)) {
            const k = chunk[Number(i)];
            if (!k || typeof t !== "string" || !t.trim()) continue;
            await client.query(
              "insert into ui_translations (lang, key, text, source) values ($1, $2, $3, 'ai') on conflict (lang, key) do nothing",
              [lang.code, k, t.trim()],
            );
            saved++;
          }
        }
      }),
    );
    console.log(`[i18n-fill] ${lang.code}: saved ${saved}`);
  }
} catch (e) {
  console.log("[i18n-fill] failed (non-fatal)", String(e).slice(0, 200));
} finally {
  await client.end().catch(() => {});
}
