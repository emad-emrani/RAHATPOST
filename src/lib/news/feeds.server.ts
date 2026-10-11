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
};

type RawItem = {
  title: string;
  link: string;
  date: string;
  description: string;
  categories: string[];
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
  },
];

const TTL_MS = 10 * 60_000;
const FEED_TIMEOUT_MS = 8_000;
const MAX_AGE_MS = 21 * 24 * 60 * 60_000;
const MAX_ITEMS = 80;
const USER_AGENT = "Mozilla/5.0 (compatible; RahatPostBot/1.0; +https://rahatpost.com)";

let cache: { result: NewsFeedResult; at: number } | null = null;
let inflight: Promise<NewsFeedResult> | null = null;

export async function loadNews(): Promise<NewsFeedResult> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return { ...cache.result, now };
  if (!inflight) {
    inflight = refresh().finally(() => {
      inflight = null;
    });
  }
  const result = await inflight;
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
  return result;
}

async function fetchText(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": USER_AGENT,
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
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

function parseFeed(xml: string): RawItem[] {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];
  return blocks.map((block) => {
    const atomLink =
      block.match(/<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)?.[1] ??
      block.match(/<link\b[^>]*href=["']([^"']+)["']/i)?.[1];
    return {
      title: cleanText(tag(block, "title")),
      link: decodeEntities(unwrap(tag(block, "link"))).trim() || atomLink || "",
      date: unwrap(tag(block, "pubDate") || tag(block, "published") || tag(block, "updated") || tag(block, "dc:date")).trim(),
      description: tag(block, "description") || tag(block, "summary"),
      categories: [...block.matchAll(/<category\b[^>]*>([\s\S]*?)<\/category>/gi)].map((m) =>
        cleanText(m[1]),
      ),
    };
  });
}

function tag(block: string, name: string): string {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i");
  return block.match(re)?.[1] ?? "";
}

function unwrap(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", ndash: "–",
  mdash: "—", laquo: "«", raquo: "»", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", shy: "",
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    }
    return NAMED[code.toLowerCase()] ?? whole;
  });
}

function cleanText(value: string): string {
  return decodeEntities(unwrap(value).replace(/<[^>]+>/g, " "))
    .replace(/[*_]{2,}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(description: string): string {
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
  if (summary.startsWith(raw.title)) summary = summary.slice(raw.title.length).replace(/^[\s:،.\-–—]+/, "");
  if (summary.length < 25 || /^[0-9a-f-]{20,}$/i.test(summary)) summary = "";
  const text = `${raw.title} ${summary}`;
  const local = RAHAT.test(text) || NEGEV.test(text) || raw.categories.some((c) => RAHAT.test(c) || NEGEV.test(c));
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
  };
}

/** RFC 822 / ISO dates, plus "dd/mm/yyyy - HH:MM" and "yyyy/mm/dd HH:MM:SS" in Israel time. */
function parseDate(value: string): number | null {
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
  const asIfUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return guess - (asIfUtc - guess);
}

function hash(value: string): string {
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
