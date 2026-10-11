/** A real news item pulled from a publisher's RSS feed (title + short excerpt only). */
export type NewsItem = {
  slug: string;
  title: string;
  source: string;
  sourceUrl: string;
  link: string;
  publishedAt: string; // ISO 8601
  category: string;
  summary: string;
  /** Only true if the publisher marks it as breaking — we never invent it. */
  breaking: boolean;
  /** Mentions Rahat or the Negev. */
  local: boolean;
  /** The publisher's own image for this story, taken from the feed item (https), if any. */
  image?: string;
  /** A smaller rendition of `image` for list thumbnails, when the feed offers one. */
  thumb?: string;
};

export type NewsFeedResult = {
  items: NewsItem[];
  /** Server time (ms) used as the reference for relative times, avoids hydration drift. */
  now: number;
  fetchedAt: number | null;
  failedSources: string[];
};

export const newsCategories = [
  "رهط",
  "النقب",
  "بلدية",
  "تعليم",
  "صحة",
  "رياضة",
  "مجتمع",
  "أعمال",
] as const;
