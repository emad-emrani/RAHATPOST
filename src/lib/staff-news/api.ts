import { createServerFn } from "@tanstack/react-start";
import type { AdminAccess } from "@/lib/admin-auth";
import { MEDIA_KEY_RE } from "@/lib/media/types";
import { newsCategories } from "@/lib/news/types";
import { clean } from "@/lib/submit-guard";
import { STAFF_NEWS_ID_RE, type StaffNews, type StaffNewsInput } from "./types";

/** Any team level (owner, moderator, writer) may use this tab. */
async function access(): Promise<AdminAccess> {
  const { getAdminAccess } = await import("@/lib/admin-auth");
  return getAdminAccess();
}

/** Writers may only touch their own articles; owner/moderator any. */
async function mayEdit(a: NonNullable<AdminAccess>, id: string): Promise<boolean> {
  if (!STAFF_NEWS_ID_RE.test(id)) return false;
  const { getStaffNews } = await import("./store.server");
  const item = await getStaffNews(id);
  if (!item) return false;
  return a.level !== "writer" || item.authorId === a.userId;
}

function validate(data: StaffNewsInput): StaffNewsInput | string {
  const input: StaffNewsInput = {
    title: clean(data?.title, 160),
    category: (newsCategories as readonly string[]).includes(String(data?.category))
      ? String(data.category)
      : "رهط",
    body: clean(data?.body, 8000, true),
    imageKey: MEDIA_KEY_RE.test(String(data?.imageKey ?? "")) ? String(data.imageKey) : "",
    breaking: Boolean(data?.breaking),
  };
  if (input.title.length < 5) return "العنوان قصير (5 أحرف على الأقل).";
  if (input.body.length < 20) return "نص الخبر قصير (20 حرفاً على الأقل).";
  return input;
}

export const adminListStaffNews = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ authed: boolean; ok: boolean; items: StaffNews[] }> => {
    const a = await access();
    if (!a) return { authed: false, ok: true, items: [] };
    try {
      const { listStaffNews } = await import("./store.server");
      return {
        authed: true,
        ok: true,
        items: await listStaffNews(100, a.level === "writer" ? a.userId : undefined),
      };
    } catch (error) {
      console.error("[staff-news] list failed", error);
      return { authed: true, ok: false, items: [] };
    }
  },
);

/** Create (no id) or update (id) an article. */
export const adminSaveStaffNews = createServerFn({ method: "POST" })
  .inputValidator((input: StaffNewsInput & { id?: string }) => input)
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const a = await access();
    if (!a) return { ok: false, message: "انتهت الجلسة. سجّل الدخول من جديد." };
    const input = validate(data);
    if (typeof input === "string") return { ok: false, message: input };
    try {
      const store = await import("./store.server");
      if (data.id) {
        if (!(await mayEdit(a, String(data.id)))) return { ok: false, message: "غير مسموح." };
        await store.updateStaffNews(String(data.id), input);
      } else {
        await store.createStaffNews(input, a.userId ? { id: a.userId, name: a.name } : null);
      }
      return { ok: true };
    } catch (error) {
      console.error("[staff-news] save failed", error);
      return { ok: false, message: "تعذّر الحفظ الآن. حاول مرة أخرى." };
    }
  });

export const adminUpdateStaffNews = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; action: "delete" | "breaking-on" | "breaking-off" }) => ({
    id: String(input?.id ?? ""),
    action: input?.action,
  }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const a = await access();
    if (!a || !(await mayEdit(a, data.id))) return { ok: false };
    const store = await import("./store.server");
    if (data.action === "delete") await store.deleteStaffNews(data.id);
    else if (data.action === "breaking-on" || data.action === "breaking-off")
      await store.setStaffBreaking(data.id, data.action === "breaking-on");
    else return { ok: false };
    return { ok: true };
  });
