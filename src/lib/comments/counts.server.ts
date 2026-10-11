/**
 * Adds `comments` (approved count) to news items for list rows. One cached aggregated query
 * (see commentCounts); on any database problem the items are returned unchanged.
 */
export async function withCommentCounts<T extends { slug: string; comments?: number }>(
  items: T[],
  prefix: "news" | "israel-news",
): Promise<T[]> {
  if (items.length === 0) return items;
  try {
    const { commentCounts } = await import("./store.server");
    const counts = await commentCounts();
    if (counts.size === 0) return items;
    return items.map((item) => {
      const n = counts.get(`${prefix}/${item.slug}`);
      return n ? { ...item, comments: n } : item;
    });
  } catch (error) {
    console.error("[comments] counts failed", error);
    return items;
  }
}

/**
 * Only live article pages take new comments: an approved reader post, or a feed item that is
 * still in the (server-cached) feed. Old comments stay in the database either way.
 */
export async function articleExists(key: string): Promise<boolean> {
  const [section, slug] = key.split("/", 2);
  if (section === "news") {
    if (slug.startsWith("reader-")) {
      const { getMeta } = await import("@/lib/reader-news/store.server");
      return (await getMeta(slug.slice("reader-".length)))?.status === "approved";
    }
    const { loadNews } = await import("@/lib/news/feeds.server");
    return (await loadNews()).items.some((item) => item.slug === slug);
  }
  const { loadIsraelNews } = await import("@/lib/news/israel.server");
  return (await loadIsraelNews()).items.some((item) => item.slug === slug);
}
