export type StaffNews = {
  id: string;
  title: string;
  category: string;
  body: string;
  imageKey: string;
  breaking: boolean;
  createdAt: string;
  authorId: string;
  /** Writer's name; empty for articles by the owner (password login). */
  authorName: string;
};
export type StaffNewsInput = {
  title: string;
  category: string;
  body: string;
  imageKey: string;
  breaking: boolean;
};
export const STAFF_NEWS_ID_RE = /^[a-f0-9]{16}$/;
export const STAFF_SLUG_PREFIX = "rp-";
export const STAFF_SOURCE = "رهط بوست";
