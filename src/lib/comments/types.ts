export const COMMENT_MIN = 2;
export const COMMENT_MAX = 800;
/** Authors may edit their comment for this long after posting. */
export const EDIT_WINDOW_MS = 10 * 60_000;
export const COMMENTS_PER_10_MIN = 5;
export const COMMENTS_PER_DAY = 20;

/** "news/<slug>" or "israel-news/<slug>" — the article page path without the leading slash. */
export const ARTICLE_KEY_RE = /^(news|israel-news)\/[A-Za-z0-9_-]{1,100}$/;
export const COMMENT_ID_RE = /^[a-f0-9]{16}$/;

export type CommentStatus = "approved" | "pending" | "hidden";
export type CommentOrder = "newest" | "oldest";

export type CommentView = {
  id: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  editedAt: string | null;
  status: CommentStatus;
  author: { name: string; image: string | null; badge?: string };
  /** Written by the signed-in viewer (can delete, and edit within EDIT_WINDOW_MS). */
  mine: boolean;
  replies: CommentView[];
};

export type CommentThread = {
  ok: boolean;
  comments: CommentView[];
  /** Approved comments + replies. */
  total: number;
  premod: boolean;
  /** Viewer is blocked from commenting. */
  blocked: boolean;
};

export type AdminComment = {
  id: string;
  articleKey: string;
  parentId: string | null;
  body: string;
  status: CommentStatus;
  createdAt: string;
  userId: string;
  userName: string;
  userEmail: string | null;
  userBlocked: boolean;
  reports: number;
};

export type AdminCommentFilter = "all" | "reported" | "hidden" | "pending";

export const STATUS_LABEL: Record<CommentStatus, string> = {
  approved: "منشور",
  pending: "بانتظار الموافقة",
  hidden: "مخفي",
};
