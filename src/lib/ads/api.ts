import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { AD_ID_RE, adPostTypes, type AdInput, type OwnAd, type PublicAd } from "./types";

/* ------------------------------------------------------------ public */

/** Approved real ads. `showSamples` is true only while there are none. */
export const getPublicAds = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ ok: boolean; ads: PublicAd[]; showSamples: boolean }> => {
    try {
      const { listApproved } = await import("./store.server");
      const ads = await listApproved();
      return { ok: true, ads, showSamples: ads.length === 0 };
    } catch (error) {
      console.error("[ads] list failed", error);
      return { ok: false, ads: [], showSamples: true };
    }
  },
);

export const getPublicAd = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data }): Promise<PublicAd | null> => {
    if (!AD_ID_RE.test(data.id)) return null;
    try {
      const { getApproved } = await import("./store.server");
      return await getApproved(data.id);
    } catch (error) {
      console.error("[ads] get failed", error);
      return null;
    }
  });

/* -------------------------------------------------------------- owner */

type FormInput = AdInput & { website?: string; startedAt?: number };

const clean = (v: unknown, max: number, multiline = false) => {
  let s = String(v ?? "").replace(/[<>]/g, " ");
  s = multiline
    ? s
        .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
    : s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ");
  return s.trim().slice(0, max);
};

/** Validate + normalize; throws an Arabic message the form can show. */
function validateAd(input: FormInput): AdInput {
  const data: AdInput = {
    type: clean(input?.type, 20),
    title: clean(input?.title, 90),
    description: clean(input?.description, 1000, true),
    price: clean(input?.price, 30),
    neighborhood: clean(input?.neighborhood, 60),
    phone: clean(input?.phone, 20).replace(/[\s-]/g, ""),
  };
  if (!(adPostTypes as string[]).includes(data.type)) throw new Error("اختر نوع الإعلان.");
  if (data.title.length < 3) throw new Error("اكتب عنواناً للإعلان (3 أحرف على الأقل).");
  if (data.description.length < 10) throw new Error("اكتب تفاصيل الإعلان (10 أحرف على الأقل).");
  if (data.neighborhood.length < 2) throw new Error("اكتب الحي.");
  if (!/^(0\d{8,9}|\+972\d{8,9})$/.test(data.phone)) throw new Error("رقم الهاتف غير صحيح.");
  return data;
}

const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60_000;
const MAX_PER_USER = 3; // creates + edits per user per 10 minutes
const MAX_PER_IP = 10; // shared mobile / household IPs
const MAX_PENDING_PER_USER = 5;

async function rateLimited(userId: string): Promise<boolean> {
  const { getRequestIP } = await import("@tanstack/react-start/server");
  const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
  const now = Date.now();
  let limited = false;
  for (const [key, max] of [
    [`u:${userId}`, MAX_PER_USER],
    [`ip:${ip}`, MAX_PER_IP],
  ] as const) {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= max) limited = true;
    recent.push(now);
    hits.set(key, recent);
  }
  if (hits.size > 5000) hits.clear();
  return limited;
}

const friendly = (error: unknown, fallback: string) =>
  error instanceof Error && /[\u0600-\u06ff]/.test(error.message) ? error.message : fallback;

export const createMyAd = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((input: FormInput) => input)
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    // Bots: filled honeypot or impossibly fast submit → pretend success, store nothing.
    if (data.website || Date.now() - (Number(data.startedAt) || 0) < 3000) return { ok: true };
    let ad: AdInput;
    try {
      ad = validateAd(data);
    } catch (error) {
      return { ok: false, message: friendly(error, "تحقق من الحقول.") };
    }
    if (await rateLimited(context.user.id))
      return { ok: false, message: "أرسلت عدة إعلانات للتو. حاول بعد قليل." };
    try {
      const { countPendingByUser, createAd } = await import("./store.server");
      if ((await countPendingByUser(context.user.id)) >= MAX_PENDING_PER_USER) {
        return { ok: false, message: "لديك عدة إعلانات بانتظار المراجعة. انتظر مراجعتها أولاً." };
      }
      await createAd(context.user.id, ad);
      return { ok: true };
    } catch (error) {
      console.error("[ads] create failed", error);
      return { ok: false, message: "تعذّر الحفظ الآن. حاول مرة أخرى." };
    }
  });

export const listMyAds = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<OwnAd[]> => {
    const { listByUser } = await import("./store.server");
    return listByUser(context.user.id);
  });

export const updateMyAd = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((input: FormInput & { id: string }) => input)
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    const id = String(data?.id ?? "");
    if (!AD_ID_RE.test(id)) return { ok: false, message: "إعلان غير موجود." };
    let ad: AdInput;
    try {
      ad = validateAd(data);
    } catch (error) {
      return { ok: false, message: friendly(error, "تحقق من الحقول.") };
    }
    if (await rateLimited(context.user.id))
      return { ok: false, message: "عدّلت عدة مرات للتو. حاول بعد قليل." };
    const { updateOwnAd } = await import("./store.server");
    const ok = await updateOwnAd(context.user.id, id, ad);
    return ok ? { ok: true } : { ok: false, message: "إعلان غير موجود." };
  });

export const deleteMyAd = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    if (!AD_ID_RE.test(data.id)) return { ok: false };
    const { deleteOwnAd } = await import("./store.server");
    return { ok: await deleteOwnAd(context.user.id, data.id) };
  });

/* ------------------------------------------------------------- admin */

async function requireAdmin() {
  const { getCookie } = await import("@tanstack/react-start/server");
  const { ADMIN_COOKIE, verifySession } = await import("@/lib/directory/auth.server");
  if (!verifySession(getCookie(ADMIN_COOKIE))) throw new Error("unauthorized");
}

export const adminListAds = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ authed: boolean; ok: boolean; items: OwnAd[] }> => {
    try {
      await requireAdmin();
    } catch {
      return { authed: false, ok: true, items: [] };
    }
    try {
      const { listAll } = await import("./store.server");
      return { authed: true, ok: true, items: await listAll() };
    } catch (error) {
      console.error("[admin] ads list failed", error);
      return { authed: true, ok: false, items: [] };
    }
  },
);

export const adminDecideAd = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { id: string; action: "approved" | "rejected" | "pending" | "delete" }) => {
      const id = String(input?.id ?? "");
      const action = input?.action;
      if (!AD_ID_RE.test(id)) throw new Error("bad id");
      if (!["approved", "rejected", "pending", "delete"].includes(action))
        throw new Error("bad action");
      return { id, action };
    },
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { adminSetStatus } = await import("./store.server");
    await adminSetStatus(data.id, data.action);
    return { ok: true };
  });
