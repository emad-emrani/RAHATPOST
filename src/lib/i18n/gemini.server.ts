/**
 * Shared Gemini client + settings (admin «Gemini»): global/per-use switches, model, temperature,
 * style prompt, optional encrypted API key override (env GEMINI_API_KEY as fallback), usage log.
 */
import { decryptSecret } from "@/lib/store/secrets.server";

export type GeminiUse = "israel" | "site" | "auto";
export type GeminiSettings = {
  enabled: boolean;
  uses: Record<GeminiUse, boolean>;
  model: string;
  temperature: number;
  stylePrompt: string;
  /** AES-GCM box (never sent to the browser). */
  apiKeyBox?: string;
};

export const DEFAULT_STYLE =
  "Translate naturally and accurately for a local community news website. Keep names of people, places and organizations in their common form in the target language. Return only the translation, no explanations or quotes.";

export const DEFAULT_GEMINI: GeminiSettings = {
  enabled: true,
  uses: { israel: true, site: true, auto: true },
  model: process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash",
  temperature: 0.2,
  stylePrompt: DEFAULT_STYLE,
};

let cache: { at: number; s: GeminiSettings } | null = null;

export async function loadGeminiSettings(fresh = false): Promise<GeminiSettings> {
  if (!fresh && cache && Date.now() - cache.at < 30_000) return cache.s;
  let s = DEFAULT_GEMINI;
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ data: Partial<GeminiSettings> }>`select data from gemini_settings where id = 1`;
    if (rows[0]?.data) {
      const d = rows[0].data;
      s = { ...DEFAULT_GEMINI, ...d, uses: { ...DEFAULT_GEMINI.uses, ...(d.uses ?? {}) } };
    }
  } catch (e) {
    console.error("[gemini] settings read failed", e);
  }
  cache = { at: Date.now(), s };
  return s;
}

export async function saveGeminiSettings(s: GeminiSettings): Promise<void> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await sql`insert into gemini_settings (id, data) values (1, ${JSON.stringify(s)}::jsonb)
    on conflict (id) do update set data = excluded.data, updated_at = now()`;
  cache = null;
}

export function apiKeyOf(s: GeminiSettings): string {
  const own = s.apiKeyBox ? decryptSecret(s.apiKeyBox) : "";
  return own || process.env.GEMINI_API_KEY?.trim() || "";
}

/** Is Gemini usable for this use right now? */
export async function geminiFor(use: GeminiUse): Promise<GeminiSettings | null> {
  const s = await loadGeminiSettings();
  if (!s.enabled || !s.uses[use] || !apiKeyOf(s) || Date.now() < pausedUntil) return null;
  return s;
}

let pausedUntil = 0;

export async function logUsage(kind: string, f: { calls?: number; cached?: number; errors?: number }, error?: string) {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`insert into gemini_usage (day, kind, calls, cached, errors)
      values ((now() at time zone 'Asia/Jerusalem')::date, ${kind}, ${f.calls ?? 0}, ${f.cached ?? 0}, ${f.errors ?? 0})
      on conflict (day, kind) do update set calls = gemini_usage.calls + excluded.calls,
        cached = gemini_usage.cached + excluded.cached, errors = gemini_usage.errors + excluded.errors`;
    if (error) {
      await sql`insert into gemini_errors (kind, message) values (${kind}, ${error.slice(0, 500)})`;
      await sql`delete from gemini_errors where id not in (select id from gemini_errors order by id desc limit 50)`;
    }
  } catch {
    /* never break callers over stats */
  }
}

/** One generateContent call. Returns undefined on any failure (logged). */
export async function geminiGenerate(
  s: GeminiSettings,
  kind: string,
  system: string,
  text: string,
  opts: { timeoutMs?: number; json?: boolean } = {},
): Promise<string | undefined> {
  const key = apiKeyOf(s);
  if (!key) return undefined;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15_000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(s.model)}:generateContent`,
      {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text }] }],
          generationConfig: {
            temperature: s.temperature,
            ...(opts.json ? { responseMimeType: "application/json" } : {}),
          },
        }),
      },
    );
    if (!res.ok) {
      if (res.status === 429) pausedUntil = Date.now() + 5 * 60_000;
      const body = await res.text().catch(() => "");
      void logUsage(kind, { calls: 1, errors: 1 }, `HTTP ${res.status} ${body.slice(0, 300)}`);
      return undefined;
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[];
    };
    const out = (data.candidates?.[0]?.content?.parts ?? [])
      .filter((p) => !p.thought && p.text)
      .map((p) => p.text)
      .join("")
      .trim();
    void logUsage(kind, { calls: 1, ...(out ? {} : { errors: 1 }) }, out ? undefined : "empty response");
    return out || undefined;
  } catch (e) {
    void logUsage(kind, { calls: 1, errors: 1 }, e instanceof Error ? e.message : String(e));
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

export async function listGeminiModels(s: GeminiSettings): Promise<string[]> {
  const key = apiKeyOf(s);
  if (!key) return [];
  try {
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
      headers: { "x-goog-api-key": key },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const d = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    return (d.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""))
      .filter((n) => /gemini/i.test(n));
  } catch {
    return [];
  }
}
