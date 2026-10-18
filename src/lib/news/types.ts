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
  /** Set for original posts by signed-in readers ("من القراء"), approved by the admin. */
  reader?: { name: string; neighborhood: string; sourceUrl?: string };
  /** Written by the رهط بوست team in /admin (full text in `body`). */
  staff?: boolean;
  /** Pinned to the top by the admin. */
  pinned?: boolean;
  /** Writer of a staff article (team member), when not the owner. */
  author?: string;
  /** Full text — only reader posts (original content); feed items carry an excerpt only. */
  body?: string;
  /** Approved comments on the article page (omitted when 0). */
  comments?: number;
  /** From a Hebrew feed (sports): machine-translated to Arabic when available. */
  fromHe?: boolean;
  /** Title/summary are still the Hebrew original (translation pending). */
  he?: boolean;
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

/** A headline from a major Hebrew news site, with a cached machine translation into Arabic when available. */
export type IsraelNewsItem = {
  slug: string;
  /** Arabic name of the outlet, e.g. «واي نت». */
  source: string;
  /** The outlet's own (Hebrew/Latin) name, e.g. «ynet». */
  sourceHe: string;
  sourceUrl: string;
  link: string;
  publishedAt: string; // ISO 8601
  category: string;
  titleHe: string;
  /** Admin overrides («الأخبار التلقائية»). */
  pinned?: boolean;
  breaking?: boolean;
  summaryHe: string;
  /** Machine translation of the title (Hebrew → Arabic); absent until translated. */
  titleAr?: string;
  summaryAr?: string;
  /** Approved comments on the article page (omitted when 0). */
  comments?: number;
  image?: string;
  thumb?: string;
};

export type IsraelNewsResult = {
  items: IsraelNewsItem[];
  now: number;
  fetchedAt: number | null;
  failedSources: string[];
  /** "on": translating; "paused": the translation service's daily quota is used up; "off": disabled. */
  translation: "on" | "paused" | "off";
};
