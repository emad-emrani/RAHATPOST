import type { IsraelNewsItem, IsraelNewsResult } from "./types";
import { excerpt, fetchText, fillOgImages, hash, parseDate, parseFeed } from "./feeds.server";
import { getCachedTranslations, translateMissing, translationMode } from "./translate.server";

/**
 * Israel news from major Hebrew outlets' own RSS feeds (titles + the feed's short excerpt only;
 * the detail page links to the original). Separate cache from the Arabic local news.
 */
type Source = {
  id: string;
  name: string;
  nameHe: string;
  home: string;
  urls: string[];
  /** Feed declares a tiny display size (width=100) for what is really a large image. */
  smallImages?: boolean;
  ogImage?: boolean;
};

const SOURCES: Source[] = [
  {
    id: "ynet",
    name: "واي نت",
    nameHe: "ynet",
    home: "https://www.ynet.co.il",
    urls: ["https://www.ynet.co.il/Integration/StoryRss2.xml"],
    smallImages: true,
  },
  {
    id: "n12",
    name: "أخبار 12",
    nameHe: "N12",
    home: "https://www.mako.co.il/news",
    urls: [
      "https://rcs.mako.co.il/rss/news-israel.xml",
      "https://rcs.mako.co.il/rss/news-military.xml",
    ],
  },
  {
    id: "maariv",
    name: "معاريف",
    nameHe: "מעריב",
    home: "https://www.maariv.co.il",
    urls: ["https://www.maariv.co.il/rss/rsschadashot"],
    smallImages: true,
  },
  {
    id: "globes",
    name: "غلوبس",
    nameHe: "גלובס",
    home: "https://www.globes.co.il",
    urls: ["https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=2"],
  },
];

export const ISRAEL_SOURCES = SOURCES.map(({ name, nameHe, home }) => ({ name, nameHe, home }));

const TTL_MS = 10 * 60_000;
const MAX_AGE_MS = 3 * 24 * 60 * 60_000;
const MAX_ITEMS = 60;
const PER_SOURCE = 15;
/** Titles translated eagerly (what /today and the list show first); the rest on demand. */
const TRANSLATE_FIRST = 24;
const TRANSLATE_BUDGET_MS = 4_000;

type Base = Omit<IsraelNewsItem, "titleAr" | "summaryAr">;

type Feed = { items: Base[]; failedSources: string[]; fetchedAt: number | null; at: number };

let cache: Feed | null = null;
let inflight: Promise<Feed> | null = null;

export async function loadIsraelNews(): Promise<IsraelNewsResult> {
  const feed = await loadFeed();
  // Titles of the newest items (excerpts are translated when a reader opens the item, which
  // keeps us well inside the free daily quota). Quick on a warm cache, bounded on a cold one.
  await translateMissing(
    feed.items.slice(0, TRANSLATE_FIRST).map((item) => ({ id: item.slug, title: item.titleHe })),
    TRANSLATE_BUDGET_MS,
  );
  return withTranslations(feed);
}

/** One item, translating it now if needed (the detail page). */
export async function loadIsraelNewsItem(
  slug: string,
): Promise<{ result: IsraelNewsResult; item: IsraelNewsItem | null }> {
  const feed = await loadFeed();
  const base = feed.items.find((item) => item.slug === slug);
  if (base) {
    await translateMissing(
      [{ id: base.slug, title: base.titleHe, summary: base.summaryHe || undefined }],
      TRANSLATE_BUDGET_MS,
    );
  }
  const result = await withTranslations(feed);
  return { result, item: result.items.find((item) => item.slug === slug) ?? null };
}

async function withTranslations(feed: Feed): Promise<IsraelNewsResult> {
  const translations = await getCachedTranslations(feed.items.map((item) => item.slug));
  return {
    items: feed.items.map((item) => {
      const t = translations.get(item.slug);
      return {
        ...item,
        ...(t?.title ? { titleAr: t.title } : {}),
        ...(t?.summary ? { summaryAr: t.summary } : {}),
      };
    }),
    now: Date.now(),
    fetchedAt: feed.fetchedAt,
    failedSources: feed.failedSources,
    translation: translationMode(),
  };
}

async function loadFeed(): Promise<Feed> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  if (!inflight) {
    inflight = refresh().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

async function refresh(): Promise<Feed> {
  const settled = await Promise.all(
    SOURCES.map(async (source) => {
      const pages = await Promise.allSettled(source.urls.map((url) => fetchText(url)));
      const items: Base[] = [];
      for (const page of pages) {
        if (page.status !== "fulfilled") continue;
        for (const raw of parseFeed(page.value, { smallImages: source.smallImages })) {
          const item = normalize(source, raw);
          if (item) items.push(item);
        }
      }
      // Newest few per outlet, so one busy feed doesn't crowd out the others.
      items.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
      return { source, items: items.slice(0, PER_SOURCE), failed: items.length === 0 };
    }),
  );

  const failedSources = settled.filter((s) => s.failed).map((s) => s.source.name);
  const seen = new Set<string>();
  const items = settled
    .flatMap((s) => s.items)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .filter((item) => {
      const key = item.titleHe.replace(/\s+/g, " ").trim();
      if (seen.has(item.slug) || seen.has(key)) return false;
      seen.add(item.slug);
      seen.add(key);
      return true;
    })
    .slice(0, MAX_ITEMS);

  await fillOgImages(items, new Set(SOURCES.filter((s) => s.ogImage).map((s) => s.name)));

  if (items.length === 0 && cache) {
    cache = { ...cache, failedSources, at: Date.now() - TTL_MS + 60_000 };
    return cache;
  }
  cache = {
    items,
    failedSources,
    fetchedAt: items.length ? Date.now() : null,
    at: items.length ? Date.now() : Date.now() - TTL_MS + 30_000,
  };
  return cache;
}

function normalize(source: Source, raw: ReturnType<typeof parseFeed>[number]): Base | null {
  if (!raw.title || !/^https?:\/\//i.test(raw.link)) return null;
  const published = parseDate(raw.date);
  if (published === null || Date.now() - published > MAX_AGE_MS) return null;
  if (/^(?:תוכן שיווקי|תוכן ממומן|בשיתוף )|כתבה שיווקית/.test(raw.title)) return null;
  let summary = excerpt(raw.description)
    .replace(/\s*(?:לכתבה המלאה|קראו עוד|לחצו כאן).*$/u, "")
    .trim();
  if (summary.startsWith(raw.title))
    summary = summary.slice(raw.title.length).replace(/^[\s:,.\-–—]+/, "");
  if (summary.length < 25) summary = "";
  const link = raw.link.replace(/^http:\/\//i, "https://");
  return {
    slug: `il-${source.id}-${hash(link)}`,
    source: source.name,
    sourceHe: source.nameHe,
    sourceUrl: source.home,
    link,
    publishedAt: new Date(Math.min(published, Date.now())).toISOString(),
    category: "إسرائيل",
    titleHe: raw.title,
    summaryHe: summary,
    ...(raw.image
      ? { image: raw.image.src, ...(raw.image.thumb ? { thumb: raw.image.thumb } : {}) }
      : {}),
  };
}
