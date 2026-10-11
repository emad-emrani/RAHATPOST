export type ReportTarget = "news" | "ad" | "business";

export const REPORT_REASONS = [
  "محتوى مسيء أو كراهية",
  "احتيال أو نصب",
  "معلومات كاذبة",
  "معلومات شخصية عن شخص آخر",
  "مكرر أو مزعج",
  "أخرى",
] as const;

/** Distinct reporters after which a post is hidden until an admin reviews it. */
export const AUTO_HIDE_AFTER = 3;

export const TARGET_ID_RE = /^[A-Za-z0-9_-]{1,40}$/;

export const TARGET_LABEL: Record<ReportTarget, string> = {
  news: "خبر قارئ",
  ad: "إعلان",
  business: "نشاط في الدليل",
};

export type ReportGroup = {
  targetType: ReportTarget;
  targetId: string;
  /** Title + excerpt of the reported post, or null if it no longer exists. */
  target: { title: string; excerpt: string; status: string; url: string } | null;
  count: number;
  reports: { id: string; reason: string; note: string; createdAt: string }[];
};
