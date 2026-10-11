import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { clean, friendly, looksLikeBot, PHONE_RE, rateLimited } from "@/lib/submit-guard";
import { cleanMediaKeys, MAX_AD_PHOTOS } from "@/lib/media/types";
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

type FormInput = Omit<AdInput, "photos"> & {
  photos?: string[];
  website?: string;
  startedAt?: number;
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
    photos: cleanMediaKeys(input?.photos, MAX_AD_PHOTOS),
  };
  if (!(adPostTypes as string[]).includes(data.type)) throw new Error("اختر نوع الإعلان.");
  if (data.title.length < 3) throw new Error("اكتب عنواناً للإعلان (3 أحرف على الأقل).");
  if (data.description.length < 10) throw new Error("اكتب تفاصيل الإعلان (10 أحرف على الأقل).");
  if (data.neighborhood.length < 2) throw new Error("اكتب الحي.");
  if (!PHONE_RE.test(data.phone)) throw new Error("رقم الهاتف غير صحيح.");
  return data;
}

const MAX_PENDING_PER_USER = 5;

export const createMyAd = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((input: FormInput) => input)
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    // Bots: filled honeypot or impossibly fast submit → pretend success, store nothing.
    if (looksLikeBot(data)) return { ok: true };
    let ad: AdInput;
    try {
      ad = validateAd(data);
    } catch (error) {
      return { ok: false, message: friendly(error, "تحقق من الحقول.") };
    }
    if (await rateLimited("ad", context.user.id))
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
    if (await rateLimited("ad", context.user.id))
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
