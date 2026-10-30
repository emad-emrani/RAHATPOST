import { createFileRoute } from "@tanstack/react-router";

/**
 * Branded image for news items without a photo (headline + section + logo), or a cached AI
 * illustration (?ai=<key>), PLUS full-article content, original images, and videos extractor (?full=1&url=...).
 */
const IMMUTABLE = "public, max-age=31536000, s-maxage=31536000, immutable";

export type ExtractedVideo = {
  type: "video" | "iframe";
  src: string;
  poster?: string;
};

type FullArticleExtract = {
  ok: boolean;
  paragraphs: string[];
  images: string[];
  videos: ExtractedVideo[];
  ogImage?: string;
};

const articleExtractCache = new Map<string, { data: FullArticleExtract; at: number }>();
const ARTICLE_CACHE_TTL = 30 * 60_000;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  ndash: "–",
  mdash: "—",
  laquo: "«",
  raquo: "»",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  shy: "",
};

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n =
        code[1] === "x" || code[1] === "X"
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? whole;
  });
}

function stripTagsClean(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<(script|style|noscript|svg|iframe|form|nav|header|footer|aside)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isBoilerplateParagraph(text: string): boolean {
  const t = text.trim();
  if (t.length < 35) return true;
  if (
    /جميع الحقوق محفوظة|حقوق النشر|سياسة الخصوصية|شروط الاستخدام|ملفات تعريف الارتباط|اشترك في النشرة|تابعنا على|اقرأ أيضاً|إقرأ أيضاً|قد يعجبك أيضاً|مواضيع ذات صلة|كلمات مفتاحية|التعليقات المنشورة لا تعبر|الأكثر قراءة|لا تفوّت|حمل تطبيق|سجّل الدخول|Create an account|All rights reserved|Privacy Policy|Terms of Use|Cookie Policy|Subscribe to our newsletter/i.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

function normalizeImageUrl(raw: string, baseUrl: string): string | null {
  const cleaned = decodeHtmlEntities(raw).trim();
  if (!cleaned || cleaned.startsWith("data:")) return null;
  try {
    const resolved = new URL(cleaned, baseUrl).href;
    if (!/^https?:\/\//i.test(resolved)) return null;
    if (
      /avatar|logo|icon|sprite|pixel|1x1|blank|spinner|loader|emoji|gravatar|feedburner|ads|banner|button|badge/i.test(
        resolved,
      )
    ) {
      return null;
    }
    return resolved.replace(/^http:\/\//i, "https://");
  } catch {
    return null;
  }
}

function normalizeVideoCandidate(rawUrl: string, baseUrl: string): ExtractedVideo | null {
  const cleaned = decodeHtmlEntities(rawUrl).trim();
  if (!cleaned || cleaned.startsWith("data:") || cleaned.startsWith("javascript:")) return null;

  let resolved = cleaned;
  try {
    resolved = new URL(cleaned, baseUrl).href;
  } catch {
    return null;
  }
  if (!/^https?:\/\//i.test(resolved)) return null;

  // Skip ad/tracker/social-button iframes
  if (
    /doubleclick\.net|googlesyndication\.com|googletagmanager\.com|facebook\.com\/plugins\/(?:like|share|page|comments)|twitter\.com\/widgets|instagram\.com\/embed\.js|ads\.|adserver|taboola|outbrain|disqus\.com|recaptcha/i.test(
      resolved,
    )
  ) {
    return null;
  }

  // 1. Direct video file (.mp4, .webm, .ogg, .m3u8, .mov)
  if (/\.(mp4|webm|ogg|m3u8|mov)(\?.*)?$/i.test(resolved)) {
    return { type: "video", src: resolved.replace(/^http:\/\//i, "https://") };
  }

  // 2. YouTube (watch, youtu.be, shorts, embed, live)
  const ytMatch = resolved.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([A-Za-z0-9_-]{6,})/i,
  );
  if (ytMatch?.[1]) {
    return {
      type: "iframe",
      src: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`,
      poster: `https://i.ytimg.com/vi/${ytMatch[1]}/hqdefault.jpg`,
    };
  }

  // 3. Vimeo
  const vimeoMatch = resolved.match(/(?:player\.)?vimeo\.com\/(?:video\/)?(\d{6,})/i);
  if (vimeoMatch?.[1]) {
    return {
      type: "iframe",
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  // 4. Dailymotion
  const dmMatch = resolved.match(/dailymotion\.com\/(?:embed\/)?video\/([A-Za-z0-9]+)/i);
  if (dmMatch?.[1]) {
    return {
      type: "iframe",
      src: `https://www.dailymotion.com/embed/video/${dmMatch[1]}`,
    };
  }

  // 5. Facebook video
  if (/facebook\.com\/.+\/videos\//i.test(resolved) || /fb\.watch\//i.test(resolved)) {
    return {
      type: "iframe",
      src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(resolved)}&show_text=false`,
    };
  }
  if (/facebook\.com\/plugins\/video\.php/i.test(resolved)) {
    return { type: "iframe", src: resolved.replace(/^http:\/\//i, "https://") };
  }

  // 6. TikTok embed
  const ttMatch = resolved.match(/tiktok\.com\/.*\/video\/(\d+)/i);
  if (ttMatch?.[1]) {
    return {
      type: "iframe",
      src: `https://www.tiktok.com/embed/v2/${ttMatch[1]}`,
    };
  }

  // 7. Generic video player / embed URLs
  if (
    /player\.|embed|video|brightcove|jwplayer|kaltura|streamable\.com|vid\.|cdn\..*\.(?:mp4|m3u8)/i.test(
      resolved,
    )
  ) {
    return { type: "iframe", src: resolved.replace(/^http:\/\//i, "https://") };
  }

  return null;
}

function parseFullArticleHtml(html: string, pageUrl: string): FullArticleExtract {
  const paragraphs: string[] = [];
  const seenPara = new Set<string>();
  const images: string[] = [];
  const seenImg = new Set<string>();
  const videos: ExtractedVideo[] = [];
  const seenVid = new Set<string>();

  const pushPara = (raw: string) => {
    for (const line of raw.split(/\n+/)) {
      const clean = line.replace(/\s+/g, " ").trim();
      if (isBoilerplateParagraph(clean)) continue;
      const key = clean.slice(0, 100);
      if (seenPara.has(key)) continue;
      seenPara.add(key);
      paragraphs.push(clean);
    }
  };

  const pushImg = (raw: string | undefined | null) => {
    if (!raw) return;
    const norm = normalizeImageUrl(raw, pageUrl);
    if (!norm || seenImg.has(norm)) return;
    seenImg.add(norm);
    images.push(norm);
  };

  const pushVid = (rawUrl: string | undefined | null, poster?: string) => {
    if (!rawUrl) return;
    const norm = normalizeVideoCandidate(rawUrl, pageUrl);
    if (!norm || seenVid.has(norm.src)) return;
    seenVid.add(norm.src);
    if (poster && !norm.poster) {
      const normPoster = normalizeImageUrl(poster, pageUrl);
      if (normPoster) norm.poster = normPoster;
    }
    videos.push(norm);
  };

  // 1. Extract og:image & og:video / twitter:player meta tags
  const ogMeta =
    html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]*>/i)?.[0] ??
    html.match(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]*>/i)?.[0];
  const ogImgUrl = ogMeta?.match(/content=["']([^"']+)["']/i)?.[1];
  const normalizedOg = ogImgUrl ? normalizeImageUrl(ogImgUrl, pageUrl) ?? undefined : undefined;
  if (normalizedOg) pushImg(normalizedOg);

  for (const vMeta of html.match(
    /<meta[^>]+(?:property=["']og:video(?::url|:secure_url)?["']|name=["']twitter:player(?::stream)?["'])[^>]*>/gi,
  ) ?? []) {
    const vUrl = vMeta.match(/content=["']([^"']+)["']/i)?.[1];
    if (vUrl) pushVid(vUrl, normalizedOg);
  }

  // 2. Check JSON-LD for articleBody, image, and VideoObject
  const ldBlocks =
    html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of ldBlocks) {
    const inner = block.replace(/^<script[^>]*>|<\/script>$/gi, "").trim();
    try {
      const parsed = JSON.parse(inner);
      const walk = (node: unknown) => {
        if (!node || typeof node !== "object") return;
        if (Array.isArray(node)) {
          node.forEach(walk);
          return;
        }
        const obj = node as Record<string, unknown>;
        if (typeof obj.articleBody === "string" && obj.articleBody.trim().length > 80) {
          pushPara(stripTagsClean(obj.articleBody));
        }
        // VideoObject in JSON-LD
        const nodeType = String(obj["@type"] ?? "");
        if (/VideoObject/i.test(nodeType) || obj.contentUrl || obj.embedUrl) {
          const thumb =
            typeof obj.thumbnailUrl === "string"
              ? obj.thumbnailUrl
              : Array.isArray(obj.thumbnailUrl) && typeof obj.thumbnailUrl[0] === "string"
                ? obj.thumbnailUrl[0]
                : normalizedOg;
          if (typeof obj.contentUrl === "string") pushVid(obj.contentUrl, thumb);
          if (typeof obj.embedUrl === "string") pushVid(obj.embedUrl, thumb);
        }
        if (obj.video && typeof obj.video === "object") {
          walk(obj.video);
        }
        if (typeof obj.image === "string") pushImg(obj.image);
        else if (Array.isArray(obj.image)) {
          obj.image.forEach((im) => {
            if (typeof im === "string") pushImg(im);
            else if (im && typeof im === "object" && typeof (im as { url?: string }).url === "string") {
              pushImg((im as { url: string }).url);
            }
          });
        } else if (
          obj.image &&
          typeof obj.image === "object" &&
          typeof (obj.image as { url?: string }).url === "string"
        ) {
          pushImg((obj.image as { url: string }).url);
        }
        if (obj["@graph"]) walk(obj["@graph"]);
      };
      walk(parsed);
    } catch {
      // ignore malformed JSON-LD
    }
  }

  // 3. Extract from <article> or main article container (keeping <video> and <iframe> before stripping!)
  const articleScopes = [
    html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1],
    html.match(
      /<div[^>]+(?:itemprop=["']articleBody["']|class=["'][^"']*(?:entry-content|post-content|article-body|article-content|story-body|article__body|single-content|td-post-content|art-body)[^"']*["'])[^>]*>([\s\S]*?)<\/div>/i,
    )?.[1],
    html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1],
    html,
  ].filter((x): x is string => Boolean(x));

  for (const rawScope of articleScopes) {
    // 3a. Extract <video> and <source> tags
    for (const vBlock of rawScope.match(/<video\b[\s\S]*?<\/video>|<video\b[^>]*\/?>/gi) ?? []) {
      const poster = vBlock.match(/\bposter=["']([^"']+)["']/i)?.[1] ?? normalizedOg;
      const directSrc =
        vBlock.match(/\bsrc=["']([^"']+)["']/i)?.[1] ??
        vBlock.match(/\bdata-src=["']([^"']+)["']/i)?.[1];
      if (directSrc) pushVid(directSrc, poster);
      for (const sTag of vBlock.match(/<source\b[^>]*>/gi) ?? []) {
        const sUrl =
          sTag.match(/\bsrc=["']([^"']+)["']/i)?.[1] ??
          sTag.match(/\bdata-src=["']([^"']+)["']/i)?.[1];
        if (sUrl) pushVid(sUrl, poster);
      }
      if (videos.length >= 4) break;
    }

    // 3b. Extract <iframe> video embeds (YouTube, Vimeo, Dailymotion, Facebook, etc.)
    for (const ifTag of rawScope.match(/<iframe\b[^>]*>/gi) ?? []) {
      const ifSrc =
        ifTag.match(/\bdata-src=["']([^"']+)["']/i)?.[1] ??
        ifTag.match(/\bdata-lazy-src=["']([^"']+)["']/i)?.[1] ??
        ifTag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
      if (ifSrc) pushVid(ifSrc, normalizedOg);
      if (videos.length >= 4) break;
    }

    // 3c. Extract data-video-url / data-video-src / direct mp4/m3u8/youtube links inside article scope
    for (const m of rawScope.matchAll(
      /\b(?:data-video(?:-src|-url)?|data-mp4|data-hls|data-embed-url)=["']([^"']+)["']/gi,
    )) {
      if (m[1]) pushVid(m[1], normalizedOg);
      if (videos.length >= 4) break;
    }

    const cleanedScope = rawScope.replace(
      /<(script|style|noscript|svg|iframe|form|nav|footer|aside|header)\b[\s\S]*?<\/\1>/gi,
      " ",
    );

    // 3d. Extract images inside article scope
    for (const imgTag of cleanedScope.match(/<img\b[^>]*>/gi) ?? []) {
      const width = Number(imgTag.match(/\bwidth=["']?(\d+)/i)?.[1] ?? 0);
      const height = Number(imgTag.match(/\bheight=["']?(\d+)/i)?.[1] ?? 0);
      if ((width && width < 180) || (height && height < 120)) continue;
      const src =
        imgTag.match(/\bdata-src=["']([^"']+)["']/i)?.[1] ??
        imgTag.match(/\bdata-lazy-src=["']([^"']+)["']/i)?.[1] ??
        imgTag.match(/\bdata-original=["']([^"']+)["']/i)?.[1] ??
        imgTag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
      if (src) pushImg(src);
      if (images.length >= 8) break;
    }

    // 3e. Extract paragraphs & subheadings inside scope
    const pMatches =
      cleanedScope.match(/<(?:p|h2|h3|blockquote)\b[^>]*>([\s\S]*?)<\/(?:p|h2|h3|blockquote)>/gi) ?? [];
    for (const pHtml of pMatches) {
      const txt = stripTagsClean(pHtml);
      pushPara(txt);
      if (paragraphs.length >= 28) break;
    }
    if (paragraphs.length >= 4) break;
  }

  // 4. Fallback to og:description if page is JS-gated
  if (paragraphs.length === 0) {
    const descMeta =
      html.match(/<meta[^>]+property=["']og:description["'][^>]*>/i)?.[0] ??
      html.match(/<meta[^>]+name=["']description["'][^>]*>/i)?.[0];
    const desc = descMeta?.match(/content=["']([^"']+)["']/i)?.[1];
    if (desc) {
      const cleanDesc = stripTagsClean(desc);
      if (cleanDesc.length >= 25) paragraphs.push(cleanDesc);
    }
  }

  return {
    ok: paragraphs.length > 0 || images.length > 0 || videos.length > 0,
    paragraphs: paragraphs.slice(0, 26),
    images: images.slice(0, 8),
    videos: videos.slice(0, 4),
    ogImage: normalizedOg || images[0],
  };
}

async function fetchAndExtractFullArticle(targetUrl: string): Promise<FullArticleExtract> {
  const cached = articleExtractCache.get(targetUrl);
  if (cached && Date.now() - cached.at < ARTICLE_CACHE_TTL) {
    return cached.data;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_500);
  try {
    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "ar,he;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) {
      return { ok: false, paragraphs: [], images: [], videos: [] };
    }
    const html = await res.text();
    const extracted = parseFullArticleHtml(html, targetUrl);
    if (extracted.ok) {
      articleExtractCache.set(targetUrl, { data: extracted, at: Date.now() });
      if (articleExtractCache.size > 300) {
        const firstKey = articleExtractCache.keys().next().value;
        if (firstKey) articleExtractCache.delete(firstKey);
      }
    }
    return extracted;
  } catch {
    return { ok: false, paragraphs: [], images: [], videos: [] };
  } finally {
    clearTimeout(timer);
  }
}

export const Route = createFileRoute("/api/news-image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const q = new URL(request.url).searchParams;

        // Full article content, original images, and videos extraction endpoint (?full=1&url=...)
        if (q.get("full") === "1") {
          const targetUrl = (q.get("url") ?? "").trim();
          const wantLang = (q.get("lang") ?? "").trim();
          if (!/^https?:\/\/[^\s"'<>]+$/i.test(targetUrl)) {
            return Response.json(
              { ok: false, paragraphs: [], images: [], videos: [] },
              { status: 400, headers: { "cache-control": "no-store" } },
            );
          }
          const extracted = await fetchAndExtractFullArticle(targetUrl);
          if (wantLang && extracted.paragraphs.length > 0) {
            try {
              const sample = extracted.paragraphs.slice(0, 3).join(" ");
              const isHe = /[\u0590-\u05FF]/.test(sample);
              const isAr = /[\u0600-\u06FF]/.test(sample);
              if (wantLang === "ar" && !isAr) {
                const srcLang = isHe ? "he" : "en";
                const translatedParas = await Promise.all(
                  extracted.paragraphs.slice(0, 12).map(async (p) => {
                    try {
                      const params = new URLSearchParams({
                        q: p.slice(0, 480),
                        langpair: `${srcLang}|ar`,
                      });
                      const r = await fetch(
                        `https://api.mymemory.translated.net/get?${params.toString()}`,
                        { signal: AbortSignal.timeout(3_500) },
                      );
                      if (r.ok) {
                        const j = (await r.json()) as {
                          responseData?: { translatedText?: string };
                        };
                        const out = j?.responseData?.translatedText?.trim();
                        if (out && !out.includes("MYMEMORY WARNING")) return out;
                      }
                    } catch {
                      // keep original paragraph
                    }
                    return p;
                  }),
                );
                return Response.json(
                  { ...extracted, paragraphs: translatedParas },
                  {
                    headers: {
                      "cache-control": "public, max-age=600, s-maxage=1800, stale-while-revalidate=3600",
                    },
                  },
                );
              }
            } catch {
              // ignore translation error
            }
          }
          return Response.json(extracted, {
            headers: {
              "cache-control": "public, max-age=600, s-maxage=1800, stale-while-revalidate=3600",
            },
          });
        }

        if (q.get("debug") === "1") {
          const { cardDebug } = await import("@/lib/news/card-image.server");
          return Response.json(await cardDebug(), { headers: { "cache-control": "no-store" } });
        }
        const ai = q.get("ai");
        if (ai) {
          if (!/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(ai)) return new Response("Not found", { status: 404 });
          try {
            const { getMedia } = await import("@/lib/media/storage.server");
            const file = await getMedia(`ai/${ai}`);
            if (file)
              return new Response(file.body as BodyInit, {
                headers: { "content-type": ai.endsWith(".png") ? "image/png" : ai.endsWith(".webp") ? "image/webp" : "image/jpeg", "cache-control": IMMUTABLE },
              });
          } catch (error) {
            console.error("[news-image] ai", error);
          }
          return new Response("Not found", { status: 404, headers: { "cache-control": "public, s-maxage=300" } });
        }
        const title = (q.get("t") ?? "").slice(0, 220);
        const section = (q.get("s") ?? "news").slice(0, 12);
        const source = (q.get("src") ?? "").slice(0, 40);
        try {
          const { renderNewsCard } = await import("@/lib/news/card-image.server");
          const png = await renderNewsCard({ title, section, source });
          return new Response(new Uint8Array(png), { headers: { "content-type": "image/png", "cache-control": IMMUTABLE } });
        } catch (error) {
          console.error("[news-image] render", error);
          return new Response("Error", { status: 500, headers: { "cache-control": "no-store" } });
        }
      },
    },
  },
});
