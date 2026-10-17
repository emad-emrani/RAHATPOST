import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  clean,
  cleanPhone,
  friendly,
  looksLikeBot,
  PHONE_RE,
  rateLimited,
} from "@/lib/submit-guard";
import { cleanMediaKeys, MAX_BUSINESS_PHOTOS } from "@/lib/media/types";
import { ownerCategories, type BusinessSubmission, type DirectoryEntry } from "./types";

/* ------------------------------------------------------------ public */

export const getApprovedEntries = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ ok: boolean; entries: DirectoryEntry[] }> => {
    const { getApproved } = await import("./store.server");
    const { ownerEntry } = await import("./types");
    try {
      const approved = await getApproved();
      return { ok: true, entries: approved.map(ownerEntry) };
    } catch (error) {
      console.error("[directory] approved list failed", error);
      return { ok: false, entries: [] };
    }
  },
);

type SubmitInput = {
  name: string;
  category: string;
  area: string;
  about: string;
  phone: string;
  /** Uploaded logo/photo key (from /api/media?kind=business); at most one. */
  photos?: string[];
  website?: string; // honeypot — must stay empty
  startedAt?: number;
};

const MAX_PENDING = 100;
const MAX_PENDING_PER_USER = 3;

function validateBusiness(input: SubmitInput) {
  const data = {
    name: clean(input?.name, 80),
    category: clean(input?.category, 40),
    area: clean(input?.area, 60),
    about: clean(input?.about, 160),
    phone: cleanPhone(input?.phone),
    photos: cleanMediaKeys(input?.photos, MAX_BUSINESS_PHOTOS),
  };
  if (data.name.length < 2) throw new Error("اكتب اسم النشاط.");
  if (!(ownerCategories as readonly string[]).includes(data.category))
    throw new Error("اختر تصنيفاً من القائمة.");
  if (data.area.length < 2) throw new Error("اكتب الحي.");
  if (data.about.length < 5) throw new Error("اكتب سطر وصف قصير.");
  if (!PHONE_RE.test(data.phone)) throw new Error("رقم الهاتف غير صحيح.");
  return data;
}

/** Signed-in users only; the request is stored with the session user's id (never a client id). */
export const submitBusiness = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((input: SubmitInput) => input)
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    if (looksLikeBot(data)) return { ok: true };
    let business: ReturnType<typeof validateBusiness>;
    try {
      business = validateBusiness(data);
    } catch (error) {
      return { ok: false, message: friendly(error, "تحقق من الحقول.") };
    }
    if (await rateLimited("business", context.user.id))
      return { ok: false, message: "أرسلت عدة طلبات للتو. حاول بعد قليل." };
    try {
      const { countPending, countPendingByUser, createSubmission } = await import("./store.server");
      if ((await countPendingByUser(context.user.id)) >= MAX_PENDING_PER_USER)
        return { ok: false, message: "لديك طلبات بانتظار المراجعة. انتظر مراجعتها أولاً." };
      if ((await countPending()) >= MAX_PENDING)
        return { ok: false, message: "قائمة المراجعة ممتلئة الآن. حاول لاحقاً." };
      await createSubmission(context.user.id, business);
      return { ok: true };
    } catch (error) {
      console.error("[directory] submit failed", error);
      return { ok: false, message: "تعذّر الحفظ الآن. حاول مرة أخرى." };
    }
  });

export const listMyBusinesses = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<BusinessSubmission[]> => {
    const { listByUser } = await import("./store.server");
    return listByUser(context.user.id);
  });

export const deleteMyBusiness = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    if (!/^[a-f0-9]{16}$/.test(data.id)) return { ok: false };
    const { deleteOwnSubmission } = await import("./store.server");
    return { ok: await deleteOwnSubmission(context.user.id, data.id) };
  });

/* ------------------------------------------------------------- admin */

async function requireAdmin() {
  const { requireAdmin: check } = await import("@/lib/admin-auth");
  await check();
}

const loginHits = new Map<string, number[]>();

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => ({
    password: String(input?.password ?? "").slice(0, 200),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { getRequestIP, setCookie } = await import("@tanstack/react-start/server");
    const { ADMIN_COOKIE, checkPassword, issueSession, sessionMaxAge } =
      await import("./auth.server");
    const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
    const now = Date.now();
    const recent = (loginHits.get(ip) ?? []).filter((t) => now - t < 15 * 60_000);
    if (recent.length >= 8) return { ok: false, message: "محاولات كثيرة. حاول بعد ربع ساعة." };
    if (!checkPassword(data.password)) {
      recent.push(now);
      loginHits.set(ip, recent);
      return { ok: false, message: "كلمة المرور غير صحيحة." };
    }
    setCookie(ADMIN_COOKIE, issueSession(), {
      httpOnly: true,
      secure: Boolean(process.env.VERCEL),
      sameSite: "strict",
      path: "/",
      maxAge: sessionMaxAge(),
    });
    return { ok: true };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { deleteCookie } = await import("@tanstack/react-start/server");
  const { ADMIN_COOKIE } = await import("./auth.server");
  deleteCookie(ADMIN_COOKIE, { path: "/" });
  return { ok: true };
});

export const adminList = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ authed: boolean; ok: boolean; items: BusinessSubmission[] }> => {
    try {
      await requireAdmin();
    } catch {
      return { authed: false, ok: true, items: [] };
    }
    try {
      const { listSubmissions } = await import("./store.server");
      return { authed: true, ok: true, items: await listSubmissions() };
    } catch (error) {
      console.error("[admin] list failed", error);
      return { authed: true, ok: false, items: [] };
    }
  },
);

export const adminDecide = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { id: string; action: "approved" | "rejected" | "pending" | "delete" }) => {
      const id = String(input?.id ?? "");
      const action = input?.action;
      if (!/^[a-f0-9]{16}$/.test(id)) throw new Error("bad id");
      if (!["approved", "rejected", "pending", "delete"].includes(action))
        throw new Error("bad action");
      return { id, action };
    },
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { decide } = await import("./store.server");
    await decide(data.id, data.action);
    return { ok: true };
  });
