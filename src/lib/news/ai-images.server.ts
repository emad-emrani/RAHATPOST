/**
 * Optional AI illustrations for news items without a photo. Off by default; when enabled in the
 * admin, a few missing images are generated in the background per request (daily cap), stored in
 * Blob (ai/<key>) and cached in news_ai_images. Any failure → the branded card stays.
 */
import { createHash } from "node:crypto";

type Item = { slug: string; image?: string; thumb?: string; title?: string; titleAr?: string; titleHe?: string; category: string };

const PER_REQUEST = 2;
const inflight = new Set<string>();
let known: { at: number; map: Map<string, string | null> } | null = null;

async function rows(slugs: string[]): Promise<Map<string, string | null>> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  if (!known || Date.now() - known.at > 60_000) known = { at: Date.now(), map: new Map() };
  const missing = slugs.filter((s) => !known!.map.has(s));
  if (missing.length) {
    const r = await sql<{ slug: string; key: string | null }>`select slug, key from news_ai_images where slug = any(${missing})`;
    for (const x of r) known.map.set(x.slug, x.key);
  }
  return known.map;
}

export async function applyAiImages<T extends Item>(items: T[]): Promise<T[]> {
  try {
    const { loadGeminiSettings } = await import("@/lib/i18n/gemini.server");
    const s = await loadGeminiSettings();
    if (!s.aiImages.enabled) return items;
    const bare = items.filter((i) => !i.image).slice(0, 40);
    if (!bare.length) return items;
    const map = await rows(bare.map((i) => i.slug));
    const todo = bare.filter((i) => !map.has(i.slug) && !inflight.has(i.slug)).slice(0, PER_REQUEST);
    if (todo.length) void generate(todo, s);
    return items.map((i) => {
      const key = !i.image ? map.get(i.slug) : null;
      return key ? { ...i, image: `/api/news-image?ai=${key}` } : i;
    });
  } catch (error) {
    console.error("[ai-images] apply", error);
    return items;
  }
}

const PROMPT = (title: string) =>
  `Create a generic editorial illustration (flat, modern, soft colors, slightly abstract) evoking the topic of this news headline: "${title}". ` +
  "Strict rules: no text, letters, numbers or logos; no recognizable real people or faces; not a realistic photo; do not depict the specific event as if documented — just a symbolic, illustrative scene. Landscape 16:9.";

async function generate(items: Item[], s: Awaited<ReturnType<typeof import("@/lib/i18n/gemini.server").loadGeminiSettings>>) {
  const { getSql } = await import("@/lib/db");
  const g = await import("@/lib/i18n/gemini.server");
  const sql = await getSql();
  const today = (await sql<{ n: number }>`select count(*)::int as n from news_ai_images where created_at > now() - interval '1 day' and key is not null`)[0]?.n ?? 0;
  let left = Math.max(0, s.aiImages.dailyCap - today);
  for (const item of items) {
    if (left <= 0) return;
    inflight.add(item.slug);
    const provider = s.aiImages.provider;
    try {
      const title = item.titleAr ?? item.title ?? item.titleHe ?? "";
      const img = provider === "grok" ? await viaGrok(g.grokKeyOf(s), title) : await viaGemini(g.apiKeyOf(s), title);
      const ext = img.type === "image/png" ? "png" : img.type === "image/webp" ? "webp" : "jpg";
      const key = `${createHash("sha256").update(item.slug).digest("hex").slice(0, 32)}.${ext}`;
      const { putMedia } = await import("@/lib/media/storage.server");
      await putMedia(`ai/${key}`, img.bytes, img.type).catch((e) => {
        if (!/exist/i.test(String(e))) throw e;
      });
      await sql`insert into news_ai_images (slug, key, provider) values (${item.slug}, ${key}, ${provider})
        on conflict (slug) do update set key = excluded.key, provider = excluded.provider, error = null`;
      known?.map.set(item.slug, key);
      left--;
      void g.logUsage(`${provider}/image`, { calls: 1 });
    } catch (error) {
      const msg = error instanceof Error ? error.message.slice(0, 300) : "error";
      console.error("[ai-images] generate", msg);
      void g.logUsage(`${provider}/image`, { errors: 1 }, msg);
      // Remember the failure for a day-ish (row without key), so we don't retry every request.
      await sql`insert into news_ai_images (slug, key, provider, error) values (${item.slug}, null, ${provider}, ${msg})
        on conflict (slug) do nothing`.catch(() => {});
      known?.map.set(item.slug, null);
      if (/429|quota|rate/i.test(msg)) return;
    } finally {
      inflight.delete(item.slug);
    }
  }
}

async function viaGemini(key: string, title: string): Promise<{ bytes: Uint8Array; type: string }> {
  if (!key) throw new Error("no Gemini key");
  const model = process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-2.5-flash-image";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ contents: [{ parts: [{ text: PROMPT(title) }] }], generationConfig: { responseModalities: ["IMAGE"] } }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`gemini image ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { candidates?: { content?: { parts?: { inlineData?: { mimeType: string; data: string } }[] } }[] };
  const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
  if (!part) throw new Error("gemini image: no image returned");
  return { bytes: Buffer.from(part.data, "base64"), type: part.mimeType || "image/png" };
}

async function viaGrok(key: string, title: string): Promise<{ bytes: Uint8Array; type: string }> {
  if (!key) throw new Error("no xAI key");
  const res = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: process.env.XAI_IMAGE_MODEL?.trim() || "grok-2-image", prompt: PROMPT(title), n: 1, response_format: "b64_json" }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`xai image ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = j.data?.[0]?.b64_json;
  if (!b64) throw new Error("xai image: no image returned");
  return { bytes: Buffer.from(b64, "base64"), type: "image/jpeg" };
}
