import { createServerFn } from "@tanstack/react-start";
import { EMAIL_KINDS } from "./templates";
import type { EmailKind, EmailLang, EmailTemplates } from "./templates";

async function owner() {
  const { getAdminAccess } = await import("@/lib/admin-auth");
  const a = await getAdminAccess();
  return a?.level === "owner" ? a : null;
}

export const adminGetEmailTemplates = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ authed: boolean; ready: boolean; myEmail: string; templates: EmailTemplates | null }> => {
    if (!(await owner())) return { authed: false, ready: false, myEmail: "", templates: null };
    const { loadTemplates, mailReady } = await import("./send.server");
    let myEmail = "";
    try {
      const { getSessionUser } = await import("@/lib/auth/verify.server");
      myEmail = (await getSessionUser())?.email ?? "";
    } catch {
      /* password-only admin */
    }
    return { authed: true, ready: mailReady(), myEmail, templates: await loadTemplates() };
  },
);

export const adminSaveEmailTemplates = createServerFn({ method: "POST" })
  .inputValidator((i: { templates: unknown }) => i)
  .handler(async ({ data }): Promise<{ ok: boolean; templates?: EmailTemplates }> => {
    if (!(await owner())) return { ok: false };
    const { saveTemplates } = await import("./send.server");
    return { ok: true, templates: await saveTemplates(data.templates) };
  });

/** Test send: to the signed-in admin's own email (or, for the password-only login, the address typed). */
export const adminTestEmail = createServerFn({ method: "POST" })
  .inputValidator((i: { kind: EmailKind; lang: EmailLang; to?: string }) => ({
    kind: (EMAIL_KINDS as readonly string[]).includes(i?.kind) ? i.kind : ("welcome" as EmailKind),
    lang: (["ar", "he", "en"] as const).includes(i?.lang) ? i.lang : ("ar" as const),
    to: String(i?.to ?? "").trim().slice(0, 254),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; to: string }> => {
    const a = await owner();
    if (!a) return { ok: false, to: "" };
    let to = data.to;
    try {
      const { getSessionUser } = await import("@/lib/auth/verify.server");
      const me = await getSessionUser();
      if (me?.email) to = me.email;
    } catch {
      /* password-only admin */
    }
    const { sendTemplate } = await import("./send.server");
    const link = data.kind === "reset" ? "https://rahatpost.com/reset-password?token=TEST" : "https://rahatpost.com/haraj";
    const detail = data.kind.startsWith("listing") ? "سيارة تويوتا كامري 2018" : data.kind.startsWith("news") ? "افتتاح حديقة جديدة في رهط" : data.kind === "role_changed" ? "كاتب" : data.kind === "comment_approved" ? "شكراً على هذا الخبر المفيد" : "";
    return { ok: await sendTemplate(data.kind, to, a.name || "الإدارة", data.lang, link, true, detail), to };
  });
