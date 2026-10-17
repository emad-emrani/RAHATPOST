import { createServerFn } from "@tanstack/react-start";
import { sanitizeSettings, type SiteSettings } from "./types";

/** Public: current settings (applied on every page by the root route). */
export const getSiteSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<SiteSettings> => {
    const { loadSettings } = await import("./store.server");
    return loadSettings();
  },
);

async function owner(): Promise<boolean> {
  const { isOwner } = await import("@/lib/admin-auth");
  return isOwner();
}

export const adminGetSiteSettings = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ authed: boolean; settings: SiteSettings | null }> => {
    if (!(await owner())) return { authed: false, settings: null };
    const { loadSettings } = await import("./store.server");
    return { authed: true, settings: await loadSettings() };
  },
);

export const adminSaveSiteSettings = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => input)
  .handler(
    async ({ data }): Promise<{ ok: boolean; message?: string; settings?: SiteSettings }> => {
      if (!(await owner())) return { ok: false, message: "هذا القسم لمالك الموقع فقط." };
      if (JSON.stringify(data ?? {}).length > 50_000)
        return { ok: false, message: "البيانات كبيرة جداً." };
      try {
        const settings = sanitizeSettings(data);
        const { saveSettings } = await import("./store.server");
        await saveSettings(settings);
        return { ok: true, settings };
      } catch (error) {
        console.error("[settings] save failed", error);
        return { ok: false, message: "تعذّر الحفظ." };
      }
    },
  );

export const adminResetSiteSettings = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: boolean }> => {
    if (!(await owner())) return { ok: false };
    const { resetSettings } = await import("./store.server");
    await resetSettings();
    return { ok: true };
  },
);
