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
    return (await listStaffNews(30)).map((n) => ({
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
    const result: NewsFeedResult = {
      ...merged,
      items: await withCommentCounts(merged.items, "news"),
    };
    try {
      setResponseHeader(
        "Cache-Control",
        result.items.length > 0
          ? "public, max-age=0, s-maxage=60, stale-while-revalidate=300"
          : "public, max-age=0, s-maxage=30",
      );
    } catch {
      // No active response (e.g. called outside a request) — ignore.
    }
    return result;
  },
);
