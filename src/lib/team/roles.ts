/** Member roles and their permissions (shared by client and server). */
export const PERMISSIONS = {
  auto_approve: "منشوراته تُنشر بلا مراجعة",
  verified_badge: "شارة «موثّق»",
  write_news: "كتابة أخبار الموقع",
  moderate_haraj: "مراجعة إعلانات الحراج",
  moderate_comments: "مراجعة التعليقات",
  moderate_news: "مراجعة أخبار القراء والبلاغات",
  moderate_directory: "مراجعة الدليل",
  manage_all: "كل الصلاحيات (مدير)",
  manage_roles: "تعيين أدوار الأعضاء (عدا المدير)",
} as const;
export type Permission = keyof typeof PERMISSIONS;
export const MODERATION_PERMS: Permission[] = ["moderate_haraj", "moderate_comments", "moderate_news", "moderate_directory"];

export type MemberRole = {
  key: string;
  name: string;
  nameHe: string;
  nameEn: string;
  /** Short badge shown next to the member's name (empty = no badge). */
  badge: string;
  perms: Permission[];
  builtin: boolean;
};

export const DEFAULT_ROLES: MemberRole[] = [
  { key: "member", name: "عضو", nameHe: "חבר", nameEn: "Member", badge: "", perms: [], builtin: true },
  { key: "verified", name: "موثّق", nameHe: "מאומת", nameEn: "Verified", badge: "✔ موثّق", perms: ["auto_approve", "verified_badge"], builtin: true },
  { key: "writer", name: "كاتب", nameHe: "כותב", nameEn: "Writer", badge: "كاتب", perms: ["write_news", "auto_approve"], builtin: true },
  { key: "moderator", name: "مشرف", nameHe: "מנהל תוכן", nameEn: "Moderator", badge: "مشرف", perms: ["auto_approve", "moderate_haraj", "moderate_comments", "moderate_news", "moderate_directory"], builtin: true },
  { key: "admin", name: "مدير", nameHe: "מנהל", nameEn: "Admin", badge: "الإدارة", perms: ["manage_all"], builtin: true },
];

export const hasPerm = (perms: readonly string[], p: Permission) => perms.includes("manage_all") || perms.includes(p);

const s = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[<>]/g, "").trim().slice(0, n) : "");
export function sanitizeRoles(input: unknown): MemberRole[] {
  const out: MemberRole[] = [];
  for (const raw of Array.isArray(input) ? input.slice(0, 30) : []) {
    const r = (raw ?? {}) as Record<string, unknown>;
    const key = s(r.key, 20).toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const name = s(r.name, 30);
    if (!key || key === "adminmaster" || !name || out.some((o) => o.key === key)) continue;
    const def = DEFAULT_ROLES.find((d) => d.key === key);
    out.push({
      key,
      name,
      nameHe: s(r.nameHe, 30),
      nameEn: s(r.nameEn, 30),
      badge: s(r.badge, 16),
      perms: key === "member" ? [] : (Array.isArray(r.perms) ? r.perms : []).filter((p): p is Permission => typeof p === "string" && p in PERMISSIONS),
      builtin: Boolean(def),
    });
  }
  // Built-in roles can be edited but never disappear.
  for (const d of DEFAULT_ROLES) if (!out.some((o) => o.key === d.key)) out.push({ ...d });
  return out;
}

/** Roles only adminmaster may hand out or take away. */
export const isPrivileged = (r: MemberRole | undefined) => Boolean(r && (r.perms.includes("manage_all") || r.perms.includes("manage_roles")));
