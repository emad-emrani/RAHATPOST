import { createServerFn } from "@tanstack/react-start";
import type { NewsFeedResult } from "./types";

/** Real news from publisher RSS feeds, cached on the server (~10 min). */
export const getNews = createServerFn({ method: "GET" }).handler(
  async (): Promise<NewsFeedResult> => {
    const { loadNews } = await import("./feeds.server");
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    const result = await loadNews();
    try {
      setResponseHeader(
        "Cache-Control",
        result.items.length > 0
          ? "public, max-age=0, s-maxage=300, stale-while-revalidate=900"
          : "public, max-age=0, s-maxage=30",
      );
    } catch {
      // No active response (e.g. called outside a request) — ignore.
    }
    return result;
  },
);
