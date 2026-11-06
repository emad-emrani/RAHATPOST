/**
 * Automatic & on-demand AI illustrations for RSS news items without a photo.
 * Enabled by default (v2); supports Gemini Image, xAI Grok Image, and Flux AI editorial fallback,
 * stored permanently in media storage (`ai/<key>`) and indexed in `news_ai_images`.
 * Any failure gracefully falls back to the Rahat Post branded headline card.
 */
import { createHash } from "node:crypto";

export type AiImageProviderChoice = "auto" | "gemini" | "grok" | "flux";

type Item = {
  slug: string;
  image?: string;
  thumb?: string;
  title?: string;
  titleAr?: string;
  titleHe?: string;
  summary?: string;
  category: string;
};

const PER_REQUEST = 3;
const inflight = new Set<string>();
const inflightByKey = new Map<string, Promise<{ bytes: Uint8Array; type: string; key: string } | null>>();
let known: { at: number; map: Map<string, string | null> } | null = null;

export function titleSlugKey(title: string): string {
  const clean = title.replace(/\s+/g, " ").trim().toLowerCase();
  return `t-${createHash("sha256").update(clean).digest("hex").slice(0, 24)}`;
}

async function rows(slugs: string[]): Promise<Map<string, string | null>> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  if (!known || Date.now() - known.at > 45_000) known = { at: Date.now(), map: new Map() };
  const missing = slugs.filter((s) => s && !known!.map.has(s));
  if (missing.length) {
    const r = await sql<{ slug: string; key: string | null }>`select slug, key from news_ai_images where slug = any(${missing})`.catch(
      () => [] as { slug: string; key: string | null }[],
    );
    for (const x of r) {
      if (x.key) known.map.set(x.slug, x.key);
    }
  }
  return known.map;
}

export async function applyAiImages<T extends Item>(items: T[]): Promise<T[]> {
  try {
    const { loadGeminiSettings } = await import("@/lib/i18n/gemini.server");
    const s = await loadGeminiSettings();
    if (!s.aiImages.enabled) return items;
    const bare = items.filter((i) => !i.image).slice(0, 50);
    if (!bare.length) return items;
    const lookupKeys: string[] = [];
    for (const i of bare) {
      if (i.slug) lookupKeys.push(i.slug);
      const t = i.titleAr ?? i.title ?? i.titleHe ?? "";
      if (t) lookupKeys.push(titleSlugKey(t));
    }
    const map = await rows(lookupKeys);
    const todo = bare
      .filter((i) => {
        const t = i.titleAr ?? i.title ?? i.titleHe ?? "";
        const tKey = t ? titleSlugKey(t) : "";
        return !map.get(i.slug) && !(tKey && map.get(tKey)) && !inflight.has(i.slug);
      })
      .slice(0, PER_REQUEST);
    if (todo.length) void generate(todo, s);
    return items.map((i) => {
      if (i.image) return i;
      const t = i.titleAr ?? i.title ?? i.titleHe ?? "";
      const tKey = t ? titleSlugKey(t) : "";
      const key = map.get(i.slug) || (tKey ? map.get(tKey) : null);
      return key ? { ...i, image: `/api/news-image?ai=${key}` } : i;
    });
  } catch (error) {
    console.error("[ai-images] apply", error);
    return items;
  }
}

/**
 * Analyze Arabic / Hebrew / English news headline + category to extract contextual visual themes
 * so the AI illustration always matches the topic of the news article.
 */
function inferEditorialVisualSubject(title: string, category = ""): string {
  const text = `${title} ${category}`.toLowerCase();
  const hints: string[] = [];

  if (/رهط|النقب|اللقية|تل السبع|حورة|عرعرة|كسيفة|شقيب السلام|بئر السبع|רהט|נגב|بناء|بلدية|مشروع|شارع|تطوير|حديقة|تعبيد/.test(text)) {
    hints.push("modern Mediterranean Negev city architecture, sunny desert palm boulevard, community urban development");
  }
  if (/طقس|أمطار|مطر|حرارة|شتاء|رياح|عاصفة|منخفض|غبار|شمس|مناخ|מזג אוויר|גשם/.test(text)) {
    hints.push("dramatic sky and atmospheric weather landscape over southern hills and town rooftops, golden sunlight and rain clouds");
  }
  if (/تعليم|مدرسة|مدارس|طلاب|جامعة|كلية|امتحان|تخريج|معلم|روضة|חינוך|בית ספר/.test(text)) {
    hints.push("modern sunlit classroom and university campus courtyard, books, digital learning, education and knowledge");
  }
  if (/صحة|مستشفى|طبي|عيادة|دواء|إسعاف|مرض|علاج|سوروكا|وصحة|בריאות|בית חולים/.test(text)) {
    hints.push("modern healthcare center, clean medical architecture, stethoscope and wellness illustration");
  }
  if (/شرطة|أمن|حادث|حريق|إطفاء|إنقاذ|سير|مرور|محكمة|قانون|قضاء|اعتقال|משטרה|בית משפט/.test(text)) {
    hints.push("civic justice courthouse architecture, emergency response lights on city street at dusk, public safety");
  }
  if (/اقتصاد|سوق|تجارة|أسعار|مال|بنك|ذهب|دولار|شيكل|ميزانية|استثمار|عمل|وظائف|כלכלה/.test(text)) {
    hints.push("modern financial district, bustling commercial marketplace, rising economic charts and golden coins");
  }
  if (/تقنية|ذكاء اصطناعي|هاتف|تطبيق|إنترنت|برمجة|حاسوب|أبل|جوجل|سامسونج|سايبر|فضاء|tech|ai/.test(text) || category === "تقنية") {
    hints.push("futuristic digital technology hub, glowing circuit networks, sleek modern devices and innovation");
  }
  if (/رياضة|كرة قدم|مباراة|ملعب|بطولة|فوز|منتخب|دوري|هدف|نادي|ספורט|כדורגל/.test(text) || category === "رياضة") {
    hints.push("illuminated football stadium pitch at twilight, dynamic athletic energy, green turf and stadium lights");
  }
  if (/مسجد|رمضان|عيد|صلاة|تراث|ثقافة|مهرجان|فن|كتاب|معرض/.test(text)) {
    hints.push("warm Arabian cultural heritage architecture, lantern glow, peaceful community gathering space");
  }
  if (/سياسة|حكومة|كنيست|انتخابات|وزير|برلمان|دبلوماسية|مؤتمر|כנסת|ממשלה/.test(text)) {
    hints.push("official civic parliament hall, podium microphones, diplomatic conference room architecture");
  }
  if (/زراعة|أرض|مزارع|قمح|زيتون|بيئة|طاقة شمسية|مياه|طبيعة/.test(text)) {
    hints.push("lush olive groves and sustainable solar farms under a clear Mediterranean sky");
  }

  if (hints.length === 0) {
    hints.push("modern editorial journalism illustration, Mediterranean Middle Eastern townscape, warm daylight atmosphere");
  }
  return hints.slice(0, 2).join(", ");
}

const PROMPT = (title: string, summary = "", category = "") => {
  const visualTheme = inferEditorialVisualSubject(`${title} ${summary}`, category);
  const cleanTitle = title.replace(/["'`]/g, "").slice(0, 180);
  return (
    `Create a high-quality modern editorial news illustration (warm colors, clean cinematic digital art style, 16:9 widescreen) evoking this news story: "${cleanTitle}". ` +
    `Visual scene focus: ${visualTheme}. ` +
    "Strict rules: NO text, NO letters, NO Arabic or English words, NO numbers, NO watermarks or logos; no recognizable real human faces; symbolic editorial scene only. Landscape 16:9."
  );
};

async function generate(
  items: Item[],
  s: Awaited<ReturnType<typeof import("@/lib/i18n/gemini.server").loadGeminiSettings>>,
) {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const today =
    (
      await sql<{ n: number }>`select count(*)::int as n from news_ai_images where created_at > now() - interval '1 day' and key is not null`.catch(
        () => [{ n: 0 }],
      )
    )[0]?.n ?? 0;
  let left = Math.max(0, s.aiImages.dailyCap - today);
  for (const item of items) {
    if (left <= 0) return;
    inflight.add(item.slug);
    try {
      const title = item.titleAr ?? item.title ?? item.titleHe ?? "";
      const res = await getOrCreateAiImageByTitle({
        title,
        summary: item.summary,
        section: item.category,
        slug: item.slug,
      });
      if (res) left--;
    } catch (error) {
      console.error("[ai-images] background generate", error);
    } finally {
      inflight.delete(item.slug);
    }
  }
}

/**
 * On-demand or background AI image generator for any news item without a photo.
 * Checks DB/storage first; if not cached, runs the configured provider chain (Gemini -> Grok -> Flux AI),
 * stores the image in `ai/<key>` and `news_ai_images`, and returns the image bytes.
 */
export async function getOrCreateAiImageByTitle(opts: {
  title: string;
  summary?: string;
  section?: string;
  source?: string;
  slug?: string;
  forceProvider?: AiImageProviderChoice;
  bypassCache?: boolean;
}): Promise<{ bytes: Uint8Array; type: string; key: string; provider?: string } | null> {
  const cleanTitle = (opts.title ?? "").replace(/\s+/g, " ").trim();
  if (!cleanTitle) return null;

  const tSlug = titleSlugKey(cleanTitle);
  const canonicalSlug = (opts.slug ?? "").trim() || tSlug;
  const hashBase = createHash("sha256").update(cleanTitle).digest("hex").slice(0, 32);

  // 1. Check existing stored AI image unless bypassCache is set (e.g. Admin Test button)
  if (!opts.bypassCache) {
    try {
      const map = await rows([canonicalSlug, tSlug]);
      const existingKey = map.get(canonicalSlug) || map.get(tSlug);
      if (existingKey) {
        const { getMedia } = await import("@/lib/media/storage.server");
        const file = await getMedia(`ai/${existingKey}`);
        if (file) {
          return {
            bytes: new Uint8Array(file.body),
            type: existingKey.endsWith(".png") ? "image/png" : existingKey.endsWith(".webp") ? "image/webp" : "image/jpeg",
            key: existingKey,
          };
        }
      }
    } catch {
      // continue to generation
    }
  }

  // Deduplicate concurrent requests for the exact same headline
  const dedupeKey = `${opts.forceProvider || "default"}:${hashBase}`;
  const active = inflightByKey.get(dedupeKey);
  if (active && !opts.bypassCache) return active;

  const work = (async (): Promise<{ bytes: Uint8Array; type: string; key: string; provider?: string } | null> => {
    try {
      const g = await import("@/lib/i18n/gemini.server");
      const s = await g.loadGeminiSettings();
      if (!opts.forceProvider && !s.aiImages.enabled) return null;

      const { getSql } = await import("@/lib/db");
      const sql = await getSql();
      if (!opts.forceProvider) {
        const today =
          (
            await sql<{ n: number }>`select count(*)::int as n from news_ai_images where created_at > now() - interval '1 day' and key is not null`.catch(
              () => [{ n: 0 }],
            )
          )[0]?.n ?? 0;
        if (today >= (s.aiImages.dailyCap || 120)) return null;
      }

      const chosen: AiImageProviderChoice = (opts.forceProvider || s.aiImages.provider || "auto") as AiImageProviderChoice;
      const fullPrompt = PROMPT(cleanTitle, opts.summary ?? "", opts.section ?? "");
      const visualSubject = inferEditorialVisualSubject(`${cleanTitle} ${opts.summary ?? ""}`, opts.section ?? "");

      const chain: ("gemini" | "grok" | "flux")[] =
        chosen === "gemini"
          ? ["gemini", "flux"]
          : chosen === "grok"
            ? ["grok", "flux"]
            : chosen === "flux"
              ? ["flux"]
              : ["gemini", "grok", "flux"];

      let generated: { bytes: Uint8Array; type: string; usedProvider: string } | null = null;
      let lastErr = "";

      for (const p of chain) {
        try {
          if (p === "gemini") {
            const k = g.apiKeyOf(s);
            if (!k) continue;
            const out = await viaGemini(k, fullPrompt);
            generated = { ...out, usedProvider: "gemini" };
            break;
          }
          if (p === "grok") {
            const k = g.grokKeyOf(s);
            if (!k) continue;
            const out = await viaGrok(k, fullPrompt);
            generated = { ...out, usedProvider: "grok" };
            break;
          }
          if (p === "flux") {
            // Optionally ask Gemini/Grok text model to translate headline into a short English visual description (fast 2.2s budget)
            let enTopic = visualSubject;
            try {
              const tx = await g.aiGenerate(
                s,
                "image-prompt",
                "Write a 12-word English visual scene description for an editorial news illustration of this headline. No names, no text, only visual objects and setting.",
                cleanTitle,
                { timeoutMs: 2_200 },
              );
              if (tx?.text && tx.text.length > 8) {
                enTopic = `${tx.text.replace(/["'\n\r]/g, " ").slice(0, 140)}, ${visualSubject}`;
              }
            } catch {
              // keep inferred subject
            }
            const out = await viaFlux(enTopic, hashBase);
            generated = { ...out, usedProvider: "flux" };
            break;
          }
        } catch (err) {
          lastErr = err instanceof Error ? err.message.slice(0, 240) : String(err).slice(0, 240);
          void g.logUsage(`${p}/image`, { errors: 1 }, lastErr);
        }
      }

      if (!generated) {
        if (lastErr) console.warn("[ai-images] all providers failed:", lastErr);
        return null;
      }

      const ext = generated.type === "image/png" ? "png" : generated.type === "image/webp" ? "webp" : "jpg";
      const key = `${hashBase}.${ext}`;
      const { putMedia } = await import("@/lib/media/storage.server");
      await putMedia(`ai/${key}`, generated.bytes, generated.type).catch((e) => {
        if (!/exist/i.test(String(e))) throw e;
      });

      const slugsToSave = Array.from(new Set([canonicalSlug, tSlug].filter(Boolean)));
      for (const sl of slugsToSave) {
        await sql`insert into news_ai_images (slug, key, provider) values (${sl}, ${key}, ${generated.usedProvider})
          on conflict (slug) do update set key = excluded.key, provider = excluded.provider, error = null`.catch(() => {});
        known?.map.set(sl, key);
      }
      void g.logUsage(`${generated.usedProvider}/image`, { calls: 1 });
      return { bytes: generated.bytes, type: generated.type, key, provider: generated.usedProvider };
    } catch (error) {
      console.error("[ai-images] getOrCreate error", error);
      return null;
    } finally {
      inflightByKey.delete(dedupeKey);
    }
  })();

  if (!opts.bypassCache) inflightByKey.set(dedupeKey, work);
  return work;
}

async function viaGemini(key: string, promptText: string): Promise<{ bytes: Uint8Array; type: string }> {
  if (!key) throw new Error("no Gemini key");
  const model = process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-2.5-flash-image";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
    signal: AbortSignal.timeout(14_000),
  });
  if (!res.ok) throw new Error(`gemini image ${res.status}: ${(await res.text()).slice(0, 180)}`);
  const j = (await res.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { mimeType: string; data: string } }[] } }[];
  };
  const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
  if (!part) throw new Error("gemini image: no image returned");
  return { bytes: Buffer.from(part.data, "base64"), type: part.mimeType || "image/png" };
}

async function viaGrok(key: string, promptText: string): Promise<{ bytes: Uint8Array; type: string }> {
  if (!key) throw new Error("no xAI key");
  const res = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.XAI_IMAGE_MODEL?.trim() || "grok-2-image",
      prompt: promptText,
      n: 1,
      response_format: "b64_json",
    }),
    signal: AbortSignal.timeout(14_000),
  });
  if (!res.ok) throw new Error(`xai image ${res.status}: ${(await res.text()).slice(0, 180)}`);
  const j = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = j.data?.[0]?.b64_json;
  if (!b64) throw new Error("xai image: no image returned");
  return { bytes: Buffer.from(b64, "base64"), type: "image/jpeg" };
}

async function viaFlux(enTopic: string, hashHex: string): Promise<{ bytes: Uint8Array; type: string }> {
  const seed = parseInt(hashHex.slice(0, 7), 16) || 42;
  const cleanPrompt =
    `Editorial news illustration, ${enTopic}, warm cinematic lighting, modern flat digital art, widescreen 16:9, no text, no letters, no watermarks`.slice(
      0,
      360,
    );
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=960&height=540&seed=${seed}&nologo=true&model=flux`;
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; RahatPostBot/2.0; +https://www.rahatpost.com)",
      accept: "image/jpeg,image/png,image/webp,image/*;q=0.8",
    },
    signal: AbortSignal.timeout(14_000),
  });
  if (!res.ok) throw new Error(`flux image ${res.status}`);
  const ct = res.headers.get("content-type") || "image/jpeg";
  if (!ct.startsWith("image/")) throw new Error(`flux non-image content-type: ${ct}`);
  const ab = await res.arrayBuffer();
  if (ab.byteLength < 1500) throw new Error("flux image too small");
  return {
    bytes: new Uint8Array(ab),
    type: ct.includes("png") ? "image/png" : ct.includes("webp") ? "image/webp" : "image/jpeg",
  };
}
