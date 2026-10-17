import { createServerFn } from "@tanstack/react-start";
import type { GaDashboard } from "./ga.server";
import type { GscDashboard } from "./gsc.server";
import type { InternalStats } from "./internal.server";

async function level(): Promise<"owner" | "moderator" | null> {
  const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
  assertSameSiteRequest();
  const { getAdminAccess } = await import("@/lib/admin-auth");
  const a = await getAdminAccess();
  return a?.level === "owner" || a?.level === "moderator" ? a.level : null;
}

export type StatsResult = {
  authed: boolean;
  isOwner: boolean;
  internal: InternalStats | null;
  ga: GaDashboard | null;
  gaConfigured: boolean;
  gaError: string;
  gsc: GscDashboard | null;
  gscError: string;
};

export const adminStats = createServerFn({ method: "POST" })
  .inputValidator((i: { start?: string; end?: string }) => ({
    start: String(i?.start ?? "27daysAgo").slice(0, 12),
    end: String(i?.end ?? "today").slice(0, 12),
  }))
  .handler(async ({ data }): Promise<StatsResult> => {
    const lv = await level();
    if (!lv)
      return {
        authed: false,
        isOwner: false,
        internal: null,
        ga: null,
        gaConfigured: false,
        gaError: "",
        gsc: null,
        gscError: "",
      };
    const { internalStats } = await import("./internal.server");
    const ga = await import("./ga.server");
    const internal = await internalStats();
    let dash: GaDashboard | null = null;
    let gaError = "";
    try {
      dash = await ga.dashboard(data.start, data.end);
    } catch (error) {
      gaError =
        error instanceof ga.GaError ? error.message : "تعذّر جلب بيانات Google Analytics الآن.";
      if (!(error instanceof ga.GaError)) console.error("[stats] ga failed", error);
    }
    let gsc: GscDashboard | null = null;
    let gscError = "";
    try {
      const { gscDashboard } = await import("./gsc.server");
      gsc = await gscDashboard(data.start, data.end);
    } catch (error) {
      gscError =
        error instanceof ga.GaError ? error.message : "تعذّر جلب بيانات Search Console الآن.";
      if (!(error instanceof ga.GaError)) console.error("[stats] gsc failed", error);
    }
    const view = await ga.adminView();
    return {
      authed: true,
      isOwner: lv === "owner",
      internal,
      ga: dash,
      gaConfigured: Boolean(view.propertyId && view.saSaved),
      gaError,
      gsc,
      gscError,
    };
  });

async function owner(): Promise<boolean> {
  return (await level()) === "owner";
}

export const adminGetGaSettings = createServerFn({ method: "POST" }).handler(async () => {
  if (!(await owner())) return { authed: false as const };
  const { adminView } = await import("./ga.server");
  return { authed: true as const, ...(await adminView()) };
});

export const adminSaveGaSettings = createServerFn({ method: "POST" })
  .inputValidator(
    (i: { propertyId?: string; saJson?: string; clearSa?: boolean; gscSite?: string }) => i,
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    if (!(await owner())) return { ok: false, message: "هذا القسم لمالك الموقع فقط." };
    try {
      const ga = await import("./ga.server");
      await ga.saveSettings(data ?? {});
      return { ok: true, message: "تم الحفظ." };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "تعذّر الحفظ." };
    }
  });

export const adminTestGa = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: boolean; message: string }> => {
    if (!(await owner())) return { ok: false, message: "غير مصرح." };
    const ga = await import("./ga.server");
    try {
      return { ok: true, message: await ga.testConnection() };
    } catch (e) {
      return { ok: false, message: e instanceof ga.GaError ? e.message : "تعذّر الاتصال." };
    }
  },
);
