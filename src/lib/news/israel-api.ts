import { createServerFn } from "@tanstack/react-start";
import type { IsraelNewsItem, IsraelNewsResult } from "./types";

async function cacheHeaders(ok: boolean) {
  try {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    setResponseHeader(
      "Cache-Control",
      ok
        ? "public, max-age=0, s-maxage=300, stale-while-revalidate=900"
        : "public, max-age=0, s-maxage=30",
    );
  } catch {
    // No active response (e.g. called outside a request) — ignore.
  }
}

/** Israel news from Hebrew outlets' RSS, with cached Arabic machine translations (~10 min). */
export const getIsraelNews = createServerFn({ method: "GET" }).handler(
  async (): Promise<IsraelNewsResult> => {
    const { loadIsraelNews } = await import("./israel.server");
    const { withCommentCounts } = await import("@/lib/comments/counts.server");
    const loaded = await loadIsraelNews();
    const result = { ...loaded, items: await withCommentCounts(loaded.items, "israel-news") };
    await cacheHeaders(result.items.length > 0);
    return result;
  },
);

export const getIsraelNewsItem = createServerFn({ method: "GET" })
  .validator((slug: unknown) => {
    if (typeof slug !== "string" || !/^il-[a-z0-9]+-[a-z0-9]{4,20}$/.test(slug))
      throw new Error("Invalid id");
    return slug;
  })
  .handler(async ({ data }): Promise<{ result: IsraelNewsResult; item: IsraelNewsItem | null }> => {
    const { loadIsraelNewsItem } = await import("./israel.server");
    const out = await loadIsraelNewsItem(data);
    await cacheHeaders(out.result.items.length > 0);
    return out;
  });
