import { createServerFn } from "@tanstack/react-start";
import type { NewsFeedResult, NewsItem } from "./types";

/** Approved reader posts as news items (newest first); [] if the database is unavailable. */
async function readerNewsItems(): Promise<NewsItem[]> {
  try {
    const { listApproved } = await import("@/lib/reader-news/store.server");
    const { READER_SLUG_PREFIX, READER_SOURCE } = await import("@/lib/reader-news/types");
    return (await listApproved()).map((n) => ({
      slug: `${READER_SLUG_PREFIX}${n.id}`,
      title: n.title,
      source: READER_SOURCE,
      sourceUrl: "",
      link: "",
      publishedAt: n.updatedAt,
      category: "رهط",
      summary: n.body.length > 220 ? `${n.body.slice(0, 200).replace(/\s+\S*$/, "")}…` : n.body,
      breaking: false,
      local: true,
      reader: {
        name: n.posterName,
        neighborhood: n.neighborhood,
        ...(n.sourceUrl ? { sourceUrl: n.sourceUrl } : {}),
      },
      body: n.body,
    }));
  } catch (error) {
    console.error("[news] reader news failed", error);
    return [];
  }
}

/** Articles published by the team from /admin; [] if the database is unavailable. */
async function staffNewsItems(): Promise<NewsItem[]> {
  try {
    const { listStaffNews } = await import("@/lib/staff-news/store.server");
    const { STAFF_SLUG_PREFIX, STAFF_SOURCE } = await import("@/lib/staff-news/types");
    const { mediaUrl } = await import("@/lib/media/types");
    return (await listStaffNews(50)).map((n) => ({
      slug: `${STAFF_SLUG_PREFIX}${n.id}`,
      title: n.title,
      source: STAFF_SOURCE,
      sourceUrl: "",
      link: "",
      publishedAt: n.createdAt,
      category: n.category,
      summary: n.body.length > 220 ? `${n.body.slice(0, 200).replace(/\s+\S*$/, "")}…` : n.body,
      breaking: n.breaking,
      local: true,
      staff: true,
      ...(n.authorName ? { author: n.authorName } : {}),
      ...(n.imageKey ? { image: mediaUrl(n.imageKey) } : {}),
      body: n.body,
    }));
  } catch (error) {
    console.error("[news] staff news failed", error);
    return [];
  }
}

/** Real news from publisher RSS feeds (cached on the server, ~10 min) plus approved reader posts. */
export const getNews = createServerFn({ method: "GET" }).handler(
  async (): Promise<NewsFeedResult> => {
    const { loadNews } = await import("./feeds.server");
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    const { withCommentCounts } = await import("@/lib/comments/counts.server");
    const { applyNews, loadOverrides } = await import("./overrides.server");
    const [rawFeed, readerOnly, staff, overrides] = await Promise.all([
      loadNews(),
      readerNewsItems(),
      staffNewsItems(),
      loadOverrides(),
    ]);
    const feed = { ...rawFeed, items: applyNews(rawFeed.items, overrides) };
    const readers = [...staff, ...readerOnly];
    const merged: NewsFeedResult = readers.length
      ? {
           ...feed,
          items: [...readers, ...feed.items].sort(
            (a, b) =>
              Number(!!b.pinned) - Number(!!a.pinned) ||
              Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
          ),
        }
      : feed;
    const { applyAiImages } = await import("./ai-images.server");
    const result: NewsFeedResult = {
      ...merged,
      items: await applyAiImages(await withCommentCounts(merged.items, "news")),
    };
    try {
      setResponseHeader(
        "Cache-Control",
        result.items.length > 0
          ? "public, max-age=0, s-maxage=60, stale-while-revalidate=180"
          : "public, max-age=0, s-maxage=30",
      );
    } catch {
      // No active response (e.g. called outside a request) — ignore.
    }
    return result;
  },
);

async function sectionNews(section: string): Promise<NewsFeedResult & { home: boolean; name: string }> {
  const { loadSection } = await import("./feeds.server");
  const { sectionConfig } = await import("./feed-config.server");
  const { withCommentCounts } = await import("@/lib/comments/counts.server");
  const [feed, cfg] = await Promise.all([loadSection(section as "news"), sectionConfig(section)]);
  const { applyAiImages } = await import("./ai-images.server");
  let items = await applyAiImages(await withCommentCounts(feed.items, "news"));
  if (items.some((i) => i.fromHe)) {
    // Hebrew sports items: translate titles (cached, background), show Arabic when ready.
    const { translateMissing, getCachedTranslations } = await import("./translate.server");
    const he = items.filter((i) => i.fromHe);
    await translateMissing(he.slice(0, 24).map((i) => ({ id: i.slug, title: i.title })), 1_200).catch(() => {});
    const t = await getCachedTranslations(he.map((i) => i.slug)).catch(() => new Map());
    items = items.map((i) => {
      const tr = i.fromHe ? t.get(i.slug) : undefined;
      return tr?.title ? { ...i, title: tr.title, summary: tr.summary ?? "", he: false } : i;
    });
  }
  try {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseHeader("Cache-Control", items.length ? "public, max-age=0, s-maxage=60, stale-while-revalidate=180" : "public, max-age=0, s-maxage=30");
  } catch {
    // outside a request
  }
  return { ...feed, items, home: cfg.section.enabled && cfg.section.home, name: cfg.section.name };
}

/** «أخبار تقنية»: Arabic tech sites' feeds (background refresh, snapshot fallback). */
export const getTechNews = createServerFn({ method: "GET" }).handler(() => sectionNews("tech"));
/** «رياضة»: Arabic sports desks' feeds. */
export const getSportsNews = createServerFn({ method: "GET" }).handler(() => sectionNews("sports"));

export type CustomSectionResult = {
  id: string;
  name: string;
  home: boolean;
  position: number;
  items: NewsItem[];
};

/** Load all admin-created custom news sections (e.g. «أخبار محلية») with their RSS feeds and matching staff/reader posts. */
export const getCustomSectionsNews = createServerFn({ method: "GET" }).handler(
  async (): Promise<CustomSectionResult[]> => {
    try {
      const { loadFeedConfig, isBuiltinSection } = await import("./feed-config.server");
      const { loadSection } = await import("./feeds.server");
      const cfg = await loadFeedConfig();
      const customSecs = cfg.sections.filter((s) => !isBuiltinSection(s.id) && s.enabled);
      if (!customSecs.length) return [];
      const [staff, reader] = await Promise.all([staffNewsItems(), readerNewsItems()]);
      const allLocal = [...staff, ...reader];
      return await Promise.all(
        customSecs.map(async (s) => {
          const feedRes = await loadSection(s.id as "news").catch(() => ({ items: [] as NewsItem[] }));
          const matchingStaff = allLocal.filter(
            (item) =>
              item.category === s.name ||
              (/محلي|رهط/.test(s.name) && (item.category === "رهط" || item.category === "النقب" || item.local)),
          );
          const seen = new Set<string>();
          const merged = [...matchingStaff, ...feedRes.items].filter((i) => {
            if (seen.has(i.slug)) return false;
            seen.add(i.slug);
            return true;
          });
          return {
            id: s.id,
            name: s.name,
            home: s.home,
            position: s.position,
            items: merged.slice(0, s.maxItems || 20),
          };
        }),
      );
    } catch (error) {
      console.error("[custom-sections] load failed", error);
      return [];
    }
  },
);

/** Whether each auto section shows on the home page (admin «الأقسام التلقائية»). */
export const getAutoSectionFlags = createServerFn({ method: "GET" }).handler(async () => {
  const { loadFeedConfig } = await import("./feed-config.server");
  const c = await loadFeedConfig();
  return Object.fromEntries(c.sections.map((s) => [s.id, s.enabled && s.home])) as Record<string, boolean>;
});
