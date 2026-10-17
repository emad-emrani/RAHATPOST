/**
 * Shared Gemini client + settings (admin «Gemini»): global/per-use switches, model, temperature,
 * style prompt, optional encrypted API key override (env GEMINI_API_KEY as fallback), usage log.
 */
import { decryptSecret } from "@/lib/store/secrets.server";

export type GeminiUse = "israel" | "site" | "auto";
export type ProviderId = "gemini" | "grok" | "mymemory";
export const PROVIDERS: ProviderId[] = ["gemini", "grok", "mymemory"];
export type GeminiSettings = {
  /** Provider chain, tried in order; on 429/error/timeout the next one is used. */
  order: ProviderId[];
  providers: Record<ProviderId, boolean>;
  grokModel: string;
  /** AES-GCM box for the xAI key (never sent to the browser). */
  grokKeyBox?: string;
  enabled: boolean;
  uses: Record<GeminiUse, boolean>;
  model: string;
  temperature: number;
  stylePrompt: string;
  /** AES-GCM box (never sent to the browser). */
  apiKeyBox?: string;
  /** Optional AI illustrations for news items without a photo (off by default). */
  aiImages: { enabled: boolean; provider: "gemini" | "grok"; dailyCap: number };
};

export const DEFAULT_STYLE =
  "Translate naturally and accurately for a local community news website. Keep names of people, places and organizations in their common form in the target language. Return only the translation, no explanations or quotes.";

export const DEFAULT_GEMINI: GeminiSettings = {
  order: ["gemini", "grok", "mymemory"],
  providers: { gemini: true, grok: true, mymemory: true },
  grokModel: process.env.XAI_MODEL?.trim() || "grok-4-fast-non-reasoning",
  enabled: true,
  uses: { israel: true, site: true, auto: true },
  model: process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash",
  temperature: 0.2,
  stylePrompt: DEFAULT_STYLE,
  aiImages: { enabled: false, provider: "gemini", dailyCap: 20 },
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
      const order = (Array.isArray(d.order) ? d.order : []).filter((x): x is ProviderId => PROVIDERS.includes(x as ProviderId));
      for (const x of PROVIDERS) if (!order.includes(x)) order.push(x);
      s = {
        ...DEFAULT_GEMINI,
        ...d,
        order,
        providers: { ...DEFAULT_GEMINI.providers, ...(d.providers ?? {}) },
        uses: { ...DEFAULT_GEMINI.uses, ...(d.uses ?? {}) },
        aiImages: { ...DEFAULT_GEMINI.aiImages, ...(d.aiImages ?? {}) },
      };
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

export function grokKeyOf(s: GeminiSettings): string {
  const own = s.grokKeyBox ? decryptSecret(s.grokKeyBox) : "";
  return own || process.env.XAI_API_KEY?.trim() || "";
}

function available(s: GeminiSettings, p: ProviderId, json: boolean): boolean {
  if (!s.providers[p] || Date.now() < (paused[p] ?? 0)) return false;
  if (p === "gemini") return Boolean(apiKeyOf(s));
  if (p === "grok") return Boolean(grokKeyOf(s));
  return !json; // MyMemory: plain text with a known language pair only
}

/** Is AI translation usable for this use right now (any provider in the chain)? */
export async function geminiFor(use: GeminiUse): Promise<GeminiSettings | null> {
  const s = await loadGeminiSettings();
  if (!s.enabled || !s.uses[use]) return null;
  return s.order.some((p) => available(s, p, false)) ? s : null;
}

const paused: Partial<Record<ProviderId, number>> = {};

export type GenOpts = { timeoutMs?: number; json?: boolean; pair?: { from: string; to: string }; only?: ProviderId };

/**
 * Run the provider chain: Gemini → Grok → MyMemory (admin-configurable order). Returns the first
 * successful answer with the provider that produced it.
 */
export async function aiGenerate(
  s: GeminiSettings,
  kind: string,
  system: string,
  text: string,
  opts: GenOpts = {},
): Promise<{ text: string; provider: ProviderId } | undefined> {
  const chain = opts.only ? [opts.only] : s.order;
  for (const p of chain) {
    if (!opts.only && !available(s, p, Boolean(opts.json))) continue;
    if (p === "mymemory" && (!opts.pair || opts.json)) continue;
    const out =
      p === "gemini"
        ? await geminiGenerate(s, kind, system, text, opts)
        : p === "grok"
          ? await grokGenerate(s, kind, system, text, opts)
          : await myMemory(kind, text, opts.pair!);
    if (out) return { text: out, provider: p };
  }
  return undefined;
}

async function grokGenerate(s: GeminiSettings, kind: string, system: string, text: string, opts: GenOpts): Promise<string | undefined> {
  const key = grokKeyOf(s);
  const k = `grok/${kind}`;
  if (!key) return undefined;
  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: s.grokModel,
        temperature: s.temperature,
        messages: [
          { role: "system", content: system },
          { role: "user", content: text },
        ],
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (!res.ok) {
      if (res.status === 429) paused.grok = Date.now() + 5 * 60_000;
      const body = await res.text().catch(() => "");
      void logUsage(k, { calls: 1, errors: 1 }, `HTTP ${res.status} ${body.slice(0, 300)}`);
      return undefined;
    }
    const d = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const out = d.choices?.[0]?.message?.content?.trim() ?? "";
    void logUsage(k, { calls: 1, ...(out ? {} : { errors: 1 }) }, out ? undefined : "empty response");
    return out || undefined;
  } catch (e) {
    void logUsage(k, { calls: 1, errors: 1 }, e instanceof Error ? e.message : String(e));
    return undefined;
  }
}

async function myMemory(kind: string, text: string, pair: { from: string; to: string }): Promise<string | undefined> {
  const k = `mymemory/${kind}`;
  const q = text.trim().slice(0, 480);
  if (!q) return undefined;
  try {
    const params = new URLSearchParams({ q, langpair: `${pair.from}|${pair.to}` });
    const email = process.env.MYMEMORY_EMAIL?.trim();
    if (email) params.set("de", email);
    const res = await fetch(`https://api.mymemory.translated.net/get?${params}`, { signal: AbortSignal.timeout(6_000) });
    if (res.status === 429) paused.mymemory = Date.now() + 3 * 60 * 60_000;
    if (!res.ok) {
      void logUsage(k, { calls: 1, errors: 1 }, `HTTP ${res.status}`);
      return undefined;
    }
    const d = (await res.json()) as { responseStatus?: number | string; quotaFinished?: boolean; responseData?: { translatedText?: string } };
    const out = d.responseData?.translatedText?.trim() ?? "";
    if (d.quotaFinished || /MYMEMORY WARNING|USED ALL AVAILABLE FREE/i.test(out)) {
      paused.mymemory = Date.now() + 3 * 60 * 60_000;
      void logUsage(k, { calls: 1, errors: 1 }, "quota finished");
      return undefined;
    }
    const ok = Number(d.responseStatus) === 200 && out && out !== q;
    void logUsage(k, { calls: 1, ...(ok ? {} : { errors: 1 }) }, ok ? undefined : `status ${d.responseStatus}`);
    return ok ? out : undefined;
  } catch (e) {
    void logUsage(k, { calls: 1, errors: 1 }, e instanceof Error ? e.message : String(e));
    return undefined;
  }
}

export async function listGrokModels(s: GeminiSettings): Promise<string[]> {
  const key = grokKeyOf(s);
  if (!key) return [];
  try {
    const res = await fetch("https://api.x.ai/v1/models", { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return [];
    const d = (await res.json()) as { data?: { id: string }[] };
    return (d.data ?? []).map((m) => m.id).filter((id) => /grok/i.test(id) && !/image|vision|imagine|video/i.test(id));
  } catch {
    return [];
  }
}

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
  kindIn: string,
  system: string,
  text: string,
  opts: { timeoutMs?: number; json?: boolean } = {},
): Promise<string | undefined> {
  const key = apiKeyOf(s);
  const kind = `gemini/${kindIn}`;
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
      if (res.status === 429) paused.gemini = Date.now() + 5 * 60_000;
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
