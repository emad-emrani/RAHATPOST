import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { clean, friendly, looksLikeBot, PHONE_RE, rateLimited } from "@/lib/submit-guard";
import { cleanMediaKeys, MAX_AD_PHOTOS } from "@/lib/media/types";
import { cleanSpecs, DEFAULT_CATEGORIES, findCat, type HarajCategory } from "./categories";
import {
  CONDITIONS,
  LISTING_ID_RE,
  PRICE_MODES,
  type Listing,
  type ListingInput,
  type ListingStatus,
  type OwnListing,
  type PriceMode,
  type Seller,
} from "./types";

const idOf = (input: { id?: unknown }) => ({ id: String(input?.id ?? "") });

/* ------------------------------------------------------------ public */

export const getListings = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ ok: boolean; items: Listing[] }> => {
    try {
      const { ensureSamplesOnPreview } = await import("./samples.server");
      await ensureSamplesOnPreview();
      const { listPublic } = await import("./store.server");
      return { ok: true, items: await listPublic() };
    } catch (error) {
      console.error("[haraj] list failed", error);
      return { ok: false, items: [] };
    }
  },
);

export const getListing = createServerFn({ method: "GET" })
  .inputValidator(idOf)
  .handler(async ({ data }): Promise<Listing | null> => {
    if (!LISTING_ID_RE.test(data.id)) return null;
    try {
      const { getPublic } = await import("./store.server");
      return await getPublic(data.id);
    } catch (error) {
      console.error("[haraj] get failed", error);
      return null;
    }
  });

export const getSeller = createServerFn({ method: "GET" })
  .inputValidator(idOf)
  .handler(async ({ data }): Promise<{ seller: Seller | null; items: Listing[] }> => {
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(data.id)) return { seller: null, items: [] };
    try {
      const { listBySeller } = await import("./store.server");
      return await listBySeller(data.id);
    } catch (error) {
      console.error("[haraj] seller failed", error);
      return { seller: null, items: [] };
    }
  });

/* -------------------------------------------------------------- owner */

type FormInput = Partial<Omit<ListingInput, "specs">> & { specs?: unknown } & { website?: string; startedAt?: number };

function validate(input: FormInput, cats: HarajCategory[]): ListingInput {
  const mode = (PRICE_MODES as readonly string[]).includes(String(input?.priceMode)) ? (input.priceMode as PriceMode) : "price";
  const rawPrice = Number(String(input?.price ?? "").replace(/[^\d]/g, ""));
  const data: ListingInput = {
    title: clean(input?.title, 90),
    category: clean(input?.category, 30),
    priceMode: mode,
    price: mode === "free" || !rawPrice ? null : Math.min(rawPrice, 99_999_999),
    condition: clean(input?.condition, 20),
    area: clean(input?.area, 60),
    description: clean(input?.description, 3000, true),
    phone: clean(input?.phone, 20).replace(/[\s-]/g, ""),
    hidePhone: input?.hidePhone === true,
    specs: {},
    photos: cleanMediaKeys(input?.photos, MAX_AD_PHOTOS),
  };
  data.specs = cleanSpecs(findCat(cats, data.category), input?.specs);
  if (data.title.length < 3) throw new Error("اكتب عنواناً (3 أحرف على الأقل).");
  if (!cats.some((c) => c.key === data.category && c.enabled)) throw new Error("اختر التصنيف.");
  if (!(CONDITIONS as readonly string[]).includes(data.condition)) throw new Error("اختر حالة الغرض.");
  if (mode === "price" && !data.price) throw new Error("اكتب السعر، أو اختر «قابل للتفاوض» أو «مجاناً».");
  if (data.area.length < 2) throw new Error("اكتب المنطقة أو الحي.");
  if (data.description.length < 10) throw new Error("اكتب وصفاً (10 أحرف على الأقل).");
  if (!PHONE_RE.test(data.phone)) throw new Error("رقم الهاتف غير صحيح.");
  return data;
}

const MAX_PENDING_PER_USER = 5;

export const createMyListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((input: FormInput) => input)
  .handler(async ({ data, context }): Promise<{ ok: boolean; id?: string; message?: string }> => {
    if (looksLikeBot(data)) return { ok: true };
    let item: ListingInput;
    try {
      item = validate(data, await categories());
    } catch (error) {
      return { ok: false, message: friendly(error, "تحقق من الحقول.") };
    }
    if (await rateLimited("ad", context.user.id)) return { ok: false, message: "أرسلت عدة إعلانات للتو. حاول بعد قليل." };
    try {
      const { countPending, createListing } = await import("./store.server");
      if ((await countPending(context.user.id)) >= MAX_PENDING_PER_USER)
        return { ok: false, message: "لديك عدة إعلانات بانتظار المراجعة. انتظر مراجعتها أولاً." };
      return { ok: true, id: await createListing(context.user.id, item) };
    } catch (error) {
      console.error("[haraj] create failed", error);
      return { ok: false, message: "تعذّر الحفظ الآن. حاول مرة أخرى." };
    }
  });

export const updateMyListing = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((input: FormInput & { id: string }) => input)
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    const id = String(data?.id ?? "");
    if (!LISTING_ID_RE.test(id)) return { ok: false, message: "إعلان غير موجود." };
    let item: ListingInput;
    try {
      item = validate(data, await categories());
    } catch (error) {
      return { ok: false, message: friendly(error, "تحقق من الحقول.") };
    }
    if (await rateLimited("ad", context.user.id)) return { ok: false, message: "عدّلت عدة مرات للتو. حاول بعد قليل." };
    const { updateListing } = await import("./store.server");
    return (await updateListing(context.user.id, id, item)) ? { ok: true } : { ok: false, message: "إعلان غير موجود." };
  });

export const listMyListings = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<OwnListing[]> => {
    const { listMine } = await import("./store.server");
    return listMine(context.user.id);
  });

export const ownerAction = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((input: { id: string; action: "sold" | "unsold" | "renew" | "delete" }) => {
    const id = String(input?.id ?? "");
    if (!LISTING_ID_RE.test(id) || !["sold", "unsold", "renew", "delete"].includes(input?.action)) throw new Error("bad input");
    return { id, action: input.action };
  })
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const s = await import("./store.server");
    const uid = context.user.id;
    const ok =
      data.action === "delete" ? await s.deleteListing(uid, data.id)
      : data.action === "renew" ? await s.renewListing(uid, data.id)
      : await s.setSold(uid, data.id, data.action === "sold");
    return { ok };
  });

/* ------------------------------------------------------------- admin */

async function requireAdmin() {
  const { requirePerm } = await import("@/lib/admin-auth");
  await requirePerm("moderate_haraj");
}

export const adminListListings = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ authed: boolean; ok: boolean; items: OwnListing[] }> => {
    try {
      await requireAdmin();
    } catch {
      return { authed: false, ok: true, items: [] };
    }
    try {
      const { listAll } = await import("./store.server");
      return { authed: true, ok: true, items: await listAll() };
    } catch (error) {
      console.error("[admin] haraj list failed", error);
      return { authed: true, ok: false, items: [] };
    }
  },
);

export const adminDecideListing = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; action: ListingStatus | "delete" }) => {
    const id = String(input?.id ?? "");
    if (!LISTING_ID_RE.test(id) || !["approved", "rejected", "pending", "hidden", "delete"].includes(input?.action)) throw new Error("bad input");
    return { id, action: input.action };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    const { adminSet } = await import("./store.server");
    await adminSet(data.id, data.action);
    return { ok: true };
  });

/* --------------------------------------------------------- categories */

async function categories(): Promise<HarajCategory[]> {
  try {
    const { loadCategories } = await import("./categories.server");
    return await loadCategories();
  } catch (error) {
    console.error("[haraj] categories failed", error);
    return DEFAULT_CATEGORIES;
  }
}

/** Enabled categories for the public grid / form / item page. */
export const getHarajCategories = createServerFn({ method: "GET" }).handler(async (): Promise<HarajCategory[]> =>
  (await categories()).filter((c) => c.enabled),
);

/** Everything (also disabled ones) for item pages of older listings. */
export const getAllHarajCategories = createServerFn({ method: "GET" }).handler(async (): Promise<HarajCategory[]> => categories());

export const adminGetHarajCategories = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ authed: boolean; cats: HarajCategory[]; counts: Record<string, number>; defaults: HarajCategory[] }> => {
    try {
      await requireAdmin();
    } catch {
      return { authed: false, cats: [], counts: {}, defaults: [] };
    }
    const { countByCategory } = await import("./categories.server");
    return { authed: true, cats: await categories(), counts: await countByCategory().catch(() => ({})), defaults: DEFAULT_CATEGORIES };
  },
);

export const adminSaveHarajCategories = createServerFn({ method: "POST" })
  .inputValidator((input: { cats: unknown }) => input)
  .handler(async ({ data }): Promise<{ ok: boolean; cats: HarajCategory[]; message?: string }> => {
    await requireAdmin();
    try {
      const { saveCategories } = await import("./categories.server");
      return { ok: true, cats: await saveCategories(data.cats as HarajCategory[]) };
    } catch {
      return { ok: false, cats: [], message: "تعذّر الحفظ. تأكد من وجود تصنيف واحد على الأقل." };
    }
  });

/* ------------------------------------------------------------ samples */

export const adminSamples = createServerFn({ method: "POST" })
  .inputValidator((input: { action: "add" | "remove" }) => ({ action: input?.action === "add" ? ("add" as const) : ("remove" as const) }))
  .handler(async ({ data }): Promise<{ ok: boolean; count: number }> => {
    await requireAdmin();
    const s = await import("./samples.server");
    return { ok: true, count: data.action === "add" ? await s.seedSamples() : await s.removeSamples() };
  });
