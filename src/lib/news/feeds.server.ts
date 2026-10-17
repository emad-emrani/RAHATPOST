import type { NewsFeedResult, NewsItem } from "./types";

/**
 * Real Arabic news from publishers' own RSS feeds (no aggregators).
 * Titles + the feed's short excerpt only; the article page links to the source.
 */
type FeedSource = {
  id: string;
  name: string;
  home: string;
  urls: string[];
  /** Keep an item from this feed? (local-to-Rahat/Negev items are always kept) */
  keep?: (item: RawItem) => boolean;
  fixLink?: (link: string) => string;
  /** Article pages carry a usable og:image and load fast: fill missing feed images from it. */
  ogImage?: boolean;
};

export type RawItem = {
  title: string;
  link: string;
  date: string;
  description: string;
  categories: string[];
  image?: { src: string; thumb?: string };
};

const SOURCES: FeedSource[] = [
  {
    id: "janoob",
    name: "جنوب",
    home: "https://janoob.net",
    urls: ["https://janoob.net/feed/", "https://janoob.net/feed/?paged=2"],
  },
  {
    id: "arab48",
    name: "عرب 48",
    home: "https://www.arab48.com",
    urls: ["https://www.arab48.com/rss"],
    // Arab48 also covers world/Gaza news; keep only its local (محليات) desk.
    keep: (item) => decodeURIComponentSafe(item.link).includes("/محليات/"),
    // The feed emits links like "http://www.arab48.comمحليات/..." (missing slash).
    fixLink: (link) => {
      const path = link.replace(/^https?:\/\/(www\.)?arab48\.com\/?/i, "");
      return `https://www.arab48.com/${encodeURI(decodeURIComponentSafe(path))}`;
    },
  },
  {
    id: "sonara",
    name: "الصنارة",
    home: "https://sonara.net",
    urls: ["https://www.sonara.net/feed/"],
    keep: (item) =>
      !item.categories.some((c) => /^(فن|فنون|منوعات|AI\b|سياحة|أبراج)/.test(c.trim())),
  },
  {
    id: "haifanet",
    name: "حيفا نت",
    home: "https://www.haifanet.co.il",
    urls: ["https://www.haifanet.co.il/feed/"],
    ogImage: true,
  },
];

export const NEWS_SOURCE_NAMES = SOURCES.map((s) => s.name);

/** Feeds are re-checked every 4 minutes; the last good list is always served instantly meanwhile. */
const TTL_MS = 4 * 60_000;
const FEED_TIMEOUT_MS = 8_000;
const MAX_AGE_MS = 21 * 24 * 60 * 60_000;
const MAX_ITEMS = 80;
export const USER_AGENT = "Mozilla/5.0 (compatible; RahatPostBot/1.0; +https://rahatpost.com)";
const SNAP_KEY = "news";

let cache: { result: NewsFeedResult; at: number } | null = null;
let inflight: Promise<NewsFeedResult> | null = null;
let snapshotTried = false;

function startRefresh(): Promise<NewsFeedResult> {
  inflight ??= refresh()
    .catch((error) => {
      console.error("[news] refresh", error);
      if (cache) return cache.result;
      throw error;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Stale-while-revalidate: memory → Neon snapshot → (only on a brand-new, empty DB) wait for feeds. */
export async function loadNews(): Promise<NewsFeedResult> {
  if (!cache && !snapshotTried) {
    snapshotTried = true;
    const { readSnapshot } = await import("@/lib/snapshot.server");
    const snap = await readSnapshot<{ result: NewsFeedResult; at: number }>(SNAP_KEY);
    if (snap?.result?.items?.length && !cache) cache = snap;
  }
  if (cache && cache.result.items.length > 0) {
    if (Date.now() - cache.at >= TTL_MS) void startRefresh();
    return { ...cache.result, now: Date.now() };
  }
  const result = await startRefresh();
  return { ...result, now: Date.now() };
}

async function refresh(): Promise<NewsFeedResult> {
  const settled = await Promise.all(
    SOURCES.map(async (source) => {
      const pages = await Promise.allSettled(source.urls.map((url) => fetchText(url)));
      const ok = pages.filter((p): p is PromiseFulfilledResult<string> => p.status === "fulfilled");
      if (ok.length === 0) return { source, items: [] as NewsItem[], failed: true };
      const items: NewsItem[] = [];
      for (const page of ok) {
        for (const raw of parseFeed(page.value)) {
          const item = normalize(source, raw);
          if (item) items.push(item);
        }
      }
      return { source, items, failed: items.length === 0 };
    }),
  );

  const failedSources = settled.filter((s) => s.failed).map((s) => s.source.name);
  const seen = new Set<string>();
  const items = settled
    .flatMap((s) => s.items)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .filter((item) => {
      const key = item.title.replace(/\s+/g, " ").trim();
      if (seen.has(item.slug) || seen.has(key)) return false;
      seen.add(item.slug);
      seen.add(key);
      return true;
    })
    .slice(0, MAX_ITEMS);

  await fillOgImages(items, ogSources);

  if (items.length === 0 && cache) {
    // Every feed failed this round: keep serving the last good copy for a bit.
    const stale = { ...cache.result, failedSources };
    cache = { result: stale, at: Date.now() - TTL_MS + 60_000 };
    return stale;
  }

  const result: NewsFeedResult = {
    items,
    now: Date.now(),
    fetchedAt: items.length ? Date.now() : null,
    failedSources,
  };
  // Cache failures only briefly so the next visitor retries soon.
  cache = { result, at: items.length ? Date.now() : Date.now() - TTL_MS + 30_000 };
  if (items.length > 0) {
    const { writeSnapshot } = await import("@/lib/snapshot.server");
    await writeSnapshot(SNAP_KEY, cache);
  }
  return result;
}

/* -------------------------------------------------------- og:image fallback */

const OG_TIMEOUT_MS = 3_000;
const OG_BUDGET_MS = 4_000;
const OG_CONCURRENCY = 4;
const OG_MAX_BYTES = 150_000;
/** link → image URL ("" = page has none). Survives news refreshes. */
const ogCache = new Map<string, string>();
const ogSources = new Set(SOURCES.filter((s) => s.ogImage).map((s) => s.name));

/** Fill missing images from article og:image, for sources that allow it, within a small time budget. */
export async function fillOgImages(
  items: Pick<NewsItem, "image" | "source" | "link">[],
  sources: Set<string>,
): Promise<void> {
  const todo = items.filter((item) => !item.image && sources.has(item.source));
  const apply = () => {
    for (const item of todo) {
      const src = ogCache.get(item.link);
      if (src) item.image = src;
    }
  };
  const pending = todo.filter((item) => !ogCache.has(item.link));
  if (pending.length > 0) {
    let next = 0;
    const worker = async () => {
      while (next < pending.length) {
        const item = pending[next++];
        ogCache.set(item.link, (await fetchOgImage(item.link).catch(() => undefined)) ?? "");
      }
    };
    const work = Promise.all(Array.from({ length: OG_CONCURRENCY }, worker));
    // Whatever isn't done within the budget finishes in the background for the next refresh.
    await Promise.race([work, new Promise((resolve) => setTimeout(resolve, OG_BUDGET_MS))]);
    if (ogCache.size > 500)
      for (const key of [...ogCache.keys()].slice(0, ogCache.size - 400)) ogCache.delete(key);
  }
  apply();
}

async function fetchOgImage(url: string): Promise<string | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OG_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": USER_AGENT, accept: "text/html" },
    });
    if (!res.ok || !res.body) return undefined;
    // Only the <head> matters: read the first chunk and stop.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let html = "";
    while (html.length < OG_MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
    reader.cancel().catch(() => {});
    const meta =
      html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]*>/i)?.[0] ??
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]*>/i)?.[0];
    const content = meta?.match(/content=["']([^"']+)["']/i)?.[1];
    return content ? safeImageUrl(decodeEntities(content)) : undefined;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
      },
    });
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
    const text = await res.text();
    if (!/<(rss|feed|rdf:RDF)\b/i.test(text)) throw new Error(`${url} → not a feed`);
    return text;
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------------------------------------------------------- parsing */

export function parseFeed(xml: string, opts: { smallImages?: boolean } = {}): RawItem[] {
  const blocks =
    xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];
  return blocks.map((block) => {
    const atomLink =
      block.match(/<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)?.[1] ??
      block.match(/<link\b[^>]*href=["']([^"']+)["']/i)?.[1];
    return {
      title: cleanText(tag(block, "title")),
      link: decodeEntities(unwrap(tag(block, "link"))).trim() || atomLink || "",
      date: unwrap(
        tag(block, "pubDate") ||
          tag(block, "published") ||
          tag(block, "updated") ||
          tag(block, "dc:date"),
      ).trim(),
      description: tag(block, "description") || tag(block, "summary"),
      categories: [...block.matchAll(/<category\b[^>]*>([\s\S]*?)<\/category>/gi)].map((m) =>
        cleanText(m[1]),
      ),
      image: findImage(block, opts.smallImages),
    };
  });
}

/* ----------------------------------------------------------------- images */

/**
 * The item's own image: media:content / media:thumbnail, an image enclosure, or the first real
 * <img> in content:encoded / description. Returns https URLs only (http is upgraded).
 */
function findImage(
  block: string,
  smallImages = false,
): { src: string; thumb?: string } | undefined {
  const attr = (el: string, name: string) =>
    decodeEntities(el.match(new RegExp(`\\s${name}=["']([^"']+)["']`, "i"))?.[1] ?? "").trim();

  const media = block.match(/<media:(?:content|thumbnail)\b[^>]*>/gi) ?? [];
  for (const el of media) {
    const medium = attr(el, "medium");
    const type = attr(el, "type");
    if ((medium && medium !== "image") || (type && !type.startsWith("image/"))) continue;
    const src = safeImageUrl(attr(el, "url"));
    if (src) return { src };
  }

  for (const el of block.match(/<enclosure\b[^>]*>/gi) ?? []) {
    if (!/^image\//i.test(attr(el, "type"))) continue;
    const src = safeImageUrl(attr(el, "url"));
    if (src) return { src };
  }

  for (const name of ["content:encoded", "description"]) {
    let html = unwrap(tag(block, name));
    if (!/<img/i.test(html) && /&lt;img/i.test(html)) html = decodeEntities(html);
    for (const el of html.match(/<img\b[^>]*>/gi) ?? []) {
      const width = Number(attr(el, "width")) || 0;
      const height = Number(attr(el, "height")) || 0;
      // Icons, pixels, emoji. Some feeds (ynet, Maariv) declare a tiny display size for a large image.
      if (!smallImages && ((width && width < 120) || (height && height < 80))) continue;
      const src = safeImageUrl(attr(el, "data-src") || attr(el, "src"));
      if (
        !src ||
        /s\.w\.org\/images\/core\/emoji|gravatar\.com|feeds\.feedburner|\/pixel/i.test(src)
      )
        continue;
      return { src, thumb: pickThumb(attr(el, "srcset")) };
    }
  }
  return undefined;
}

/** Smallest srcset candidate that is still ≥ 280px wide (good for a 2× ~80px thumb). */
function pickThumb(srcset: string): string | undefined {
  const candidates = srcset
    .split(",")
    .map((part) => part.trim().split(/\s+/))
    .map(([url, size]) => ({ url: safeImageUrl(url ?? ""), w: parseInt(size ?? "", 10) || 0 }))
    .filter((c): c is { url: string; w: number } => Boolean(c.url) && c.w >= 280)
    .sort((a, b) => a.w - b.w);
  return candidates[0]?.url;
}

function safeImageUrl(value: string): string | undefined {
  if (!value) return undefined;
  const url = value.replace(/^\/\//, "https://").replace(/^http:\/\//i, "https://");
  if (!/^https:\/\/[^\s"'<>]+$/i.test(url)) return undefined;
  return url;
}

function tag(block: string, name: string): string {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i");
  return block.match(re)?.[1] ?? "";
}

function unwrap(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

const NAMED: Record<string, string> = {
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

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n =
        code[1] === "x" || code[1] === "X"
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    }
    return NAMED[code.toLowerCase()] ?? whole;
  });
}

export function cleanText(value: string): string {
  return decodeEntities(unwrap(value).replace(/<[^>]+>/g, " "))
    .replace(/[*_]{2,}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerpt(description: string): string {
  let html = unwrap(description);
  if (!/<[a-z]/i.test(html)) html = decodeEntities(html); // escaped HTML without CDATA
  html = html
    .replace(/<p[^>]*rights[^>]*>[\s\S]*?<\/p>/gi, "")
    .replace(/<(script|style|figure|figcaption)[\s\S]*?<\/\1>/gi, "")
    .replace(/<p>\s*The post [\s\S]*?appeared first on[\s\S]*?<\/p>/gi, "");
  let text = cleanText(html)
    .replace(/\[(?:…|\.\.\.|&hellip;)\]/g, "…")
    .replace(/\s*(?:اقرأ|إقرأ) (?:المزيد|أيضاً|ايضا).*$/u, "")
    .trim();
  if (text.length > 280) {
    const cut = text.slice(0, 280);
    text = `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 200))}…`;
  }
  return text;
}

/* ----------------------------------------------------------- normalizing */

const RAHAT = /رهط/;
const NEGEV =
  /النقب|بئر السبع|بير السبع|تل السبع|حورة|كسيفة|اللقية|اللقيّة|شقيب السلام|عرعرة النقب|سوروكا|ديمونا|أم بطين|ام بطين|الأطرش|أبو تلول|ابو تلول|بير هداج|بئر هداج|القرى مسلوبة الاعتراف|غير المعترف/;

const CATEGORY_RULES: [string, RegExp][] = [
  ["بلدية", /بلدية|البلدية|مجلس محلي|المجلس المحلي|المجلس الإقليمي|رئيس البلدية/],
  ["تعليم", /مدرس|طلاب|طالب|التعليم|التربية|جامع|كلية|امتحان|بجروت|معلم/],
  ["صحة", /وزارة الصحة|الصحة|صحية|الصحي |طبي|طبيب|أطباء|مرض|كورونا|علاج|عيادة|دواء|أدوية/],
  ["رياضة", /مباراة|دوري|كرة|نادي|منتخب|رياضي|لاعب|بطولة|الدوري/],
  ["أعمال", /اقتصاد|أسعار|اسعار|شيكل|شركة|تجار|ضريبة|بنك|رواتب|أجور|مصلحة/],
];

function categorize(text: string, categories: string[]): string {
  if (RAHAT.test(text)) return "رهط";
  if (NEGEV.test(text)) return "النقب";
  const hay = `${text} ${categories.join(" ")}`;
  for (const [name, re] of CATEGORY_RULES) if (re.test(hay)) return name;
  return "مجتمع";
}

function normalize(source: FeedSource, raw: RawItem): NewsItem | null {
  if (!raw.title || !raw.link) return null;
  const link = source.fixLink ? source.fixLink(raw.link) : raw.link;
  if (!/^https?:\/\//i.test(link)) return null;
  const published = parseDate(raw.date);
  if (published === null || Date.now() - published > MAX_AGE_MS) return null;

  if (/^(?:إعلان|اعلان)\s|إعلان ممول|اعلان ممول|مقال ممول/.test(raw.title)) return null;
  let summary = excerpt(raw.description);
  if (summary.startsWith(raw.title))
    summary = summary.slice(raw.title.length).replace(/^[\s:،.\-–—]+/, "");
  if (summary.length < 25 || /^[0-9a-f-]{20,}$/i.test(summary)) summary = "";
  const text = `${raw.title} ${summary}`;
  const local =
    RAHAT.test(text) ||
    NEGEV.test(text) ||
    raw.categories.some((c) => RAHAT.test(c) || NEGEV.test(c));
  if (!local && source.keep && !source.keep({ ...raw, link })) return null;

  return {
    slug: `${source.id}-${hash(link)}`,
    title: raw.title,
    source: source.name,
    sourceUrl: source.home,
    link,
    publishedAt: new Date(Math.min(published, Date.now())).toISOString(),
    category: categorize(text, raw.categories),
    summary,
    breaking: false,
    local,
    ...(raw.image
      ? { image: raw.image.src, ...(raw.image.thumb ? { thumb: raw.image.thumb } : {}) }
      : {}),
  };
}

/** RFC 822 / ISO dates, plus "dd/mm/yyyy - HH:MM" and "yyyy/mm/dd HH:MM:SS" in Israel time. */
export function parseDate(value: string): number | null {
  if (!value) return null;
  let m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) return israelTime(+m[3], +m[2], +m[1], +m[4], +m[5], +(m[6] ?? 0));
  m = value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m) return israelTime(+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] ?? 0));
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

function israelTime(y: number, mo: number, d: number, h: number, mi: number, s: number): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jerusalem",
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(new Date(guess));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asIfUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return guess - (asIfUtc - guess);
}

export function hash(value: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193 ^ 0x5bd1e995;
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x5bd1e995) ^ (b >>> 15);
  }
  return (a >>> 0).toString(36) + (b >>> 0).toString(36).slice(0, 4);
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
