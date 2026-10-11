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
