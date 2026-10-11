export type ReaderNewsStatus = "pending" | "approved" | "rejected";

export type ReaderNewsInput = {
  title: string;
  body: string;
  sourceUrl: string;
  neighborhood: string;
};

export type OwnReaderNews = ReaderNewsInput & {
  id: string;
  status: ReaderNewsStatus;
  posterName: string;
  createdAt: string;
  updatedAt: string;
};

export const READER_NEWS_ID_RE = /^[a-f0-9]{16}$/;
/** Reader posts appear in the news feed under this slug prefix. */
export const READER_SLUG_PREFIX = "reader-";
export const READER_SOURCE = "من القراء";
