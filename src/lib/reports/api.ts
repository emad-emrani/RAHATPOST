import { createServerFn } from "@tanstack/react-start";
import { clean, looksLikeBot, rateLimited } from "@/lib/submit-guard";
import { REPORT_REASONS, TARGET_ID_RE, type ReportGroup, type ReportTarget } from "./types";

const TARGETS: ReportTarget[] = ["news", "ad", "business"];

type ReportInput = {
  type: ReportTarget;
  id: string;
  reason: string;
  note?: string;
  website?: string; // honeypot
  startedAt?: number;
};

/** Anyone (signed in or not) can report a public reader post, ad or approved business. */
export const reportContent = createServerFn({ method: "POST" })
  .inputValidator((input: ReportInput) => {
    if (!TARGETS.includes(input?.type)) throw new Error("bad type");
    const id = String(input?.id ?? "");
    if (!TARGET_ID_RE.test(id)) throw new Error("bad id");
    return {
      type: input.type,
      id,
      reason: String(input?.reason ?? ""),
      note: clean(input?.note, 500, true),
      website: input?.website,
      startedAt: input?.startedAt,
    };
  })
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
    assertSameSiteRequest();
    if (looksLikeBot(data)) return { ok: true };
    if (!(REPORT_REASONS as readonly string[]).includes(data.reason))
      return { ok: false, message: "اختر سبب الإبلاغ." };
    const { getRequestIP } = await import("@tanstack/react-start/server");
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const user = await getSessionUser().catch(() => null);
    const identity = user
      ? `u:${user.id}`
      : `ip:${getRequestIP({ xForwardedFor: true }) ?? "unknown"}`;
    if (await rateLimited("report", identity))
      return { ok: false, message: "أرسلت عدة بلاغات للتو. حاول بعد قليل." };
    try {
      const { createReport, isPublicTarget, reporterKey } = await import("./store.server");
      if (!(await isPublicTarget(data.type, data.id)))
        return { ok: false, message: "هذا المنشور غير متاح للإبلاغ." };
      await createReport({
        type: data.type,
        id: data.id,
        reason: data.reason,
        note: data.note,
        userId: user?.id ?? null,
        key: reporterKey(identity),
      });
      return { ok: true };
    } catch (error) {
      console.error("[reports] create failed", error);
      return { ok: false, message: "تعذّر إرسال البلاغ الآن. حاول مرة أخرى." };
    }
  });

/* ------------------------------------------------------------- admin */

export const adminListReports = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ authed: boolean; ok: boolean; groups: ReportGroup[] }> => {
    const { isAdmin } = await import("@/lib/admin-auth");
    if (!(await isAdmin())) return { authed: false, ok: true, groups: [] };
    try {
      const { pendingGroups } = await import("./store.server");
      return { authed: true, ok: true, groups: await pendingGroups() };
    } catch (error) {
      console.error("[admin] reports failed", error);
      return { authed: true, ok: false, groups: [] };
    }
  },
);

export const adminResolveReport = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { type: ReportTarget; id: string; action: "hide" | "delete" | "dismiss" }) => {
      if (!TARGETS.includes(input?.type)) throw new Error("bad type");
      if (!TARGET_ID_RE.test(String(input?.id))) throw new Error("bad id");
      if (!["hide", "delete", "dismiss"].includes(input?.action)) throw new Error("bad action");
      return { type: input.type, id: String(input.id), action: input.action };
    },
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/admin-auth");
    await requireAdmin();
    const { resolve } = await import("./store.server");
    await resolve(data.type, data.id, data.action);
    return { ok: true };
  });
