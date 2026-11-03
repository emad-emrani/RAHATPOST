import { createFileRoute } from "@tanstack/react-router";
import { MAX_MEDIA_BYTES, MAX_MEDIA_SIDE, MEDIA_KEY_RE, mediaUrl } from "@/lib/media/types";

/**
 * Photo upload & Shop Hub API for signed-in users, shop supervisors, and admins.
 *   POST   /api/media?kind=ad|business       body: image bytes (JPEG/WebP, ≤ 3 MB)
 *   POST   /api/media?kind=staff             body: image bytes (admin cookie)
 *   POST   /api/media?kind=shop-upload&slug= body: image bytes (admin or shop supervisor)
 *   GET    /api/media?kind=shop-hub          returns all shop configs (logos, supervisors, products, campaigns) + viewer role
 *   POST   /api/media?kind=shop-hub          updates shop logo/profile, supervisor assignment, products, or promo campaigns
 *   DELETE /api/media?key=<key>              remove an unsaved upload
 */

export type ShopProductItem = {
  id: string;
  name: string;
  price: string;
  oldPrice?: string;
  badge?: string;
  description?: string;
  imageKey?: string;
  inStock?: boolean;
  createdAt: string;
};

export type ShopPromoCampaign = {
  id: string;
  title: string;
  subtitle: string;
  discountBadge: string;
  validUntil?: string;
  imageKey?: string;
  active: boolean;
  createdAt: string;
};

export type ShopHubEntryConfig = {
  slug: string;
  isCustomShop?: boolean;
  customName?: string;
  customCategory?: string;
  customArea?: string;
  customAddress?: string;
  customPhone?: string;
  customWhatsapp?: string;
  customOpeningHours?: string;
  customDescription?: string;
  customWebsite?: string;
  logoKey?: string;
  coverKey?: string;
  verified?: boolean;
  featured?: boolean;
  supervisorUserId?: string;
  supervisorEmail?: string;
  supervisorName?: string;
  products: ShopProductItem[];
  campaigns: ShopPromoCampaign[];
  updatedAt?: string;
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const hits = new Map<string, number[]>();
function tooMany(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(userId, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 15;
}

async function sessionUser() {
  const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  try {
    assertSameSiteRequest();
  } catch {
    return null;
  }
  return getSessionUser();
}

let tableReady = false;
async function ensureShopHubTable() {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  if (!tableReady) {
    await sql`
      CREATE TABLE IF NOT EXISTS shop_hub_configs (
        slug TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    tableReady = true;
  }
  return sql;
}

function normalizeShopConfig(slug: string, raw: unknown): ShopHubEntryConfig {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const str = (v: unknown, max = 200) =>
    typeof v === "string" ? v.replace(/[<>]/g, "").trim().slice(0, max) : "";
  const products: ShopProductItem[] = Array.isArray(obj.products)
    ? obj.products
        .map((p: any) => ({
          id: str(p?.id, 40) || Math.random().toString(36).slice(2, 10),
          name: str(p?.name, 100),
          price: str(p?.price, 40),
          oldPrice: str(p?.oldPrice, 40) || undefined,
          badge: str(p?.badge, 40) || undefined,
          description: str(p?.description, 300) || undefined,
          imageKey: MEDIA_KEY_RE.test(str(p?.imageKey, 60)) ? str(p?.imageKey, 60) : undefined,
          inStock: p?.inStock !== false,
          createdAt: str(p?.createdAt, 40) || new Date().toISOString(),
        }))
        .filter((p) => p.name.length > 0)
        .slice(0, 60)
    : [];
  const campaigns: ShopPromoCampaign[] = Array.isArray(obj.campaigns)
    ? obj.campaigns
        .map((c: any) => ({
          id: str(c?.id, 40) || Math.random().toString(36).slice(2, 10),
          title: str(c?.title, 120),
          subtitle: str(c?.subtitle, 400),
          discountBadge: str(c?.discountBadge, 50) || "عرض خاص",
          validUntil: str(c?.validUntil, 60) || undefined,
          imageKey: MEDIA_KEY_RE.test(str(c?.imageKey, 60)) ? str(c?.imageKey, 60) : undefined,
          active: c?.active !== false,
          createdAt: str(c?.createdAt, 40) || new Date().toISOString(),
        }))
        .filter((c) => c.title.length > 0)
        .slice(0, 30)
    : [];
  return {
    slug,
    isCustomShop: obj.isCustomShop === true,
    customName: str(obj.customName, 100) || undefined,
    customCategory: str(obj.customCategory, 50) || undefined,
    customArea: str(obj.customArea, 80) || undefined,
    customAddress: str(obj.customAddress, 140) || undefined,
    customPhone: str(obj.customPhone, 40) || undefined,
    customWhatsapp: str(obj.customWhatsapp, 40) || undefined,
    customOpeningHours: str(obj.customOpeningHours, 100) || undefined,
    customDescription: str(obj.customDescription, 500) || undefined,
    customWebsite: str(obj.customWebsite, 200) || undefined,
    logoKey: MEDIA_KEY_RE.test(str(obj.logoKey, 60)) ? str(obj.logoKey, 60) : undefined,
    coverKey: MEDIA_KEY_RE.test(str(obj.coverKey, 60)) ? str(obj.coverKey, 60) : undefined,
    verified: obj.verified === true ? true : obj.verified === false ? false : undefined,
    featured: obj.featured === true,
    supervisorUserId: str(obj.supervisorUserId, 80) || undefined,
    supervisorEmail: str(obj.supervisorEmail, 120).toLowerCase() || undefined,
    supervisorName: str(obj.supervisorName, 80) || undefined,
    products,
    campaigns,
    updatedAt: str(obj.updatedAt, 40) || new Date().toISOString(),
  };
}

async function loadAllShopConfigs(): Promise<Record<string, ShopHubEntryConfig>> {
  try {
    const sql = await ensureShopHubTable();
    const rows = await sql<{ slug: string; data: unknown }>`
      SELECT slug, data FROM shop_hub_configs ORDER BY updated_at DESC LIMIT 1000
    `;
    const out: Record<string, ShopHubEntryConfig> = {};
    for (const r of rows) {
      const parsed = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
      out[r.slug] = normalizeShopConfig(r.slug, parsed);
    }
    return out;
  } catch (e) {
    console.error("[shop-hub] load failed", e);
    return {};
  }
}

async function saveShopConfig(slug: string, cfg: ShopHubEntryConfig): Promise<void> {
  const sql = await ensureShopHubTable();
  const normalized = normalizeShopConfig(slug, { ...cfg, updatedAt: new Date().toISOString() });
  await sql`
    INSERT INTO shop_hub_configs (slug, data, updated_at)
    VALUES (${slug}, ${JSON.stringify(normalized)}::jsonb, now())
    ON CONFLICT (slug) DO UPDATE
      SET data = EXCLUDED.data,
          updated_at = now()
  `;
}

async function deleteShopConfig(slug: string): Promise<void> {
  const sql = await ensureShopHubTable();
  await sql`DELETE FROM shop_hub_configs WHERE slug = ${slug}`;
}

async function checkViewerRoles() {
  const { getAdminAccess } = await import("@/lib/admin-auth");
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const [adminAccess, user] = await Promise.all([
    getAdminAccess().catch(() => null),
    getSessionUser().catch(() => null),
  ]);
  const isAdmin = Boolean(
    adminAccess &&
      (adminAccess.level === "owner" ||
        (adminAccess.level === "moderator" && adminAccess.perms.includes("moderate_directory"))),
  );
  return {
    isAdmin,
    signedIn: Boolean(user || isAdmin),
    userId: user?.id ?? "",
    email: (user?.email ?? "").toLowerCase(),
    name: user?.name ?? (isAdmin ? "مدير الموقع" : ""),
  };
}

function isSupervisorOfShop(
  viewer: Awaited<ReturnType<typeof checkViewerRoles>>,
  cfg: ShopHubEntryConfig | undefined,
): boolean {
  if (viewer.isAdmin) return true;
  if (!viewer.signedIn || !cfg) return false;
  if (cfg.supervisorUserId && viewer.userId && cfg.supervisorUserId === viewer.userId) return true;
  if (
    cfg.supervisorEmail &&
    viewer.email &&
    cfg.supervisorEmail.toLowerCase() === viewer.email.toLowerCase()
  ) {
    return true;
  }
  return false;
}

/** Photo upload for an article or shop asset (admin or shop supervisor). */
async function staffOrShopUpload(request: Request, isShopUpload: boolean): Promise<Response> {
  const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
  try {
    assertSameSiteRequest();
  } catch {
    return json(403, { ok: false, message: "طلب غير صحيح." });
  }
  const viewer = await checkViewerRoles();
  if (isShopUpload) {
    const slug = (new URL(request.url).searchParams.get("slug") ?? "").trim();
    const all = await loadAllShopConfigs();
    const cfg = all[slug];
    if (!viewer.isAdmin && !isSupervisorOfShop(viewer, cfg)) {
      return json(401, { ok: false, message: "غير مصرح لك برفع صور لهذا المحل." });
    }
  } else {
    const { getAdminAccess } = await import("@/lib/admin-auth");
    if (!(await getAdminAccess()))
      return json(401, { ok: false, message: "سجّل دخول الإدارة أولاً." });
  }

  if (Number(request.headers.get("content-length") ?? 0) > MAX_MEDIA_BYTES)
    return json(413, { ok: false, message: "الصورة كبيرة جداً (الحد 3 ميغابايت)." });
  const raw = new Uint8Array(await request.arrayBuffer());
  if (raw.length === 0 || raw.length > MAX_MEDIA_BYTES)
    return json(413, { ok: false, message: "حجم الصورة غير مقبول." });
  const { checkImage } = await import("@/lib/media/image-check");
  let image: ReturnType<typeof checkImage>;
  try {
    image = checkImage(raw);
  } catch {
    return json(415, { ok: false, message: "نقبل صور JPG أو WebP فقط." });
  }
  try {
    const { randomBytes } = await import("node:crypto");
    const { putMedia } = await import("@/lib/media/storage.server");
    const key = `${randomBytes(16).toString("hex")}.${image.ext}`;
    await putMedia(key, image.bytes, image.contentType);
    return json(200, { ok: true, key, url: mediaUrl(key) });
  } catch (error) {
    console.error("[media] upload failed", error);
    return json(500, { ok: false, message: "تعذّر رفع الصورة الآن." });
  }
}

async function handleShopHubPost(request: Request): Promise<Response> {
  const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
  try {
    assertSameSiteRequest();
  } catch {
    return json(403, { ok: false, message: "طلب غير صحيح." });
  }
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, message: "بيانات غير صالحة." });
  }
  const slug = String(body?.slug ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 64);
  const action = String(body?.action ?? "");
  if (!slug || slug.length < 3) {
    return json(400, { ok: false, message: "معرّف المحل غير صالح." });
  }

  const viewer = await checkViewerRoles();
  const all = await loadAllShopConfigs();
  const current: ShopHubEntryConfig = all[slug] ?? {
    slug,
    products: [],
    campaigns: [],
  };

  const canManageShop = viewer.isAdmin || isSupervisorOfShop(viewer, current);
  if (!canManageShop) {
    return json(403, { ok: false, message: "ليس لديك صلاحية الإشراف على هذا المحل." });
  }

  if (action === "delete_shop") {
    if (!viewer.isAdmin) return json(403, { ok: false, message: "للإدارة فقط." });
    await deleteShopConfig(slug);
    const updatedAll = await loadAllShopConfigs();
    return json(200, { ok: true, shops: updatedAll });
  }

  if (action === "assign_supervisor") {
    if (!viewer.isAdmin) return json(403, { ok: false, message: "تعيين المشرف متاح لإدارة الموقع فقط." });
    const next: ShopHubEntryConfig = {
      ...current,
      supervisorUserId: String(body?.supervisorUserId ?? "").trim() || undefined,
      supervisorEmail: String(body?.supervisorEmail ?? "").trim().toLowerCase() || undefined,
      supervisorName: String(body?.supervisorName ?? "").trim() || undefined,
    };
    await saveShopConfig(slug, next);
    const updatedAll = await loadAllShopConfigs();
    return json(200, { ok: true, shop: updatedAll[slug], shops: updatedAll });
  }

  if (action === "update_profile") {
    const p = (body?.payload ?? {}) as Record<string, any>;
    const next: ShopHubEntryConfig = {
      ...current,
      ...(p.isCustomShop !== undefined && viewer.isAdmin ? { isCustomShop: Boolean(p.isCustomShop) } : {}),
      ...(p.customName !== undefined ? { customName: String(p.customName ?? "").trim() || undefined } : {}),
      ...(p.customCategory !== undefined ? { customCategory: String(p.customCategory ?? "").trim() || undefined } : {}),
      ...(p.customArea !== undefined ? { customArea: String(p.customArea ?? "").trim() || undefined } : {}),
      ...(p.customAddress !== undefined ? { customAddress: String(p.customAddress ?? "").trim() || undefined } : {}),
      ...(p.customPhone !== undefined ? { customPhone: String(p.customPhone ?? "").trim() || undefined } : {}),
      ...(p.customWhatsapp !== undefined ? { customWhatsapp: String(p.customWhatsapp ?? "").trim() || undefined } : {}),
      ...(p.customOpeningHours !== undefined ? { customOpeningHours: String(p.customOpeningHours ?? "").trim() || undefined } : {}),
      ...(p.customDescription !== undefined ? { customDescription: String(p.customDescription ?? "").trim() || undefined } : {}),
      ...(p.customWebsite !== undefined ? { customWebsite: String(p.customWebsite ?? "").trim() || undefined } : {}),
      ...(p.logoKey !== undefined ? { logoKey: String(p.logoKey ?? "").trim() || undefined } : {}),
      ...(p.coverKey !== undefined ? { coverKey: String(p.coverKey ?? "").trim() || undefined } : {}),
      ...(p.verified !== undefined && viewer.isAdmin ? { verified: Boolean(p.verified) } : {}),
      ...(p.featured !== undefined && viewer.isAdmin ? { featured: Boolean(p.featured) } : {}),
    };
    await saveShopConfig(slug, next);
    const updatedAll = await loadAllShopConfigs();
    return json(200, { ok: true, shop: updatedAll[slug], shops: updatedAll });
  }

  if (action === "save_product") {
    const prod = (body?.product ?? {}) as Record<string, any>;
    const name = String(prod.name ?? "").trim();
    if (!name) return json(400, { ok: false, message: "اكتب اسم المنتج." });
    const id = String(prod.id ?? "").trim() || `prd_${Date.now().toString(36)}`;
    const newItem: ShopProductItem = {
      id,
      name,
      price: String(prod.price ?? "").trim(),
      oldPrice: String(prod.oldPrice ?? "").trim() || undefined,
      badge: String(prod.badge ?? "").trim() || undefined,
      description: String(prod.description ?? "").trim() || undefined,
      imageKey: String(prod.imageKey ?? "").trim() || undefined,
      inStock: prod.inStock !== false,
      createdAt: String(prod.createdAt ?? "") || new Date().toISOString(),
    };
    const exists = current.products.some((x) => x.id === id);
    const nextProducts = exists
      ? current.products.map((x) => (x.id === id ? newItem : x))
      : [newItem, ...current.products];
    await saveShopConfig(slug, { ...current, products: nextProducts });
    const updatedAll = await loadAllShopConfigs();
    return json(200, { ok: true, shop: updatedAll[slug], shops: updatedAll });
  }

  if (action === "delete_product") {
    const prodId = String(body?.productId ?? "").trim();
    const nextProducts = current.products.filter((x) => x.id !== prodId);
    await saveShopConfig(slug, { ...current, products: nextProducts });
    const updatedAll = await loadAllShopConfigs();
    return json(200, { ok: true, shop: updatedAll[slug], shops: updatedAll });
  }

  if (action === "save_campaign") {
    const camp = (body?.campaign ?? {}) as Record<string, any>;
    const title = String(camp.title ?? "").trim();
    if (!title) return json(400, { ok: false, message: "اكتب عنوان الإعلان أو حملة العروض." });
    const id = String(camp.id ?? "").trim() || `cmp_${Date.now().toString(36)}`;
    const newCamp: ShopPromoCampaign = {
      id,
      title,
      subtitle: String(camp.subtitle ?? "").trim(),
      discountBadge: String(camp.discountBadge ?? "").trim() || "عرض خاص",
      validUntil: String(camp.validUntil ?? "").trim() || undefined,
      imageKey: String(camp.imageKey ?? "").trim() || undefined,
      active: camp.active !== false,
      createdAt: String(camp.createdAt ?? "") || new Date().toISOString(),
    };
    const exists = current.campaigns.some((x) => x.id === id);
    const nextCampaigns = exists
      ? current.campaigns.map((x) => (x.id === id ? newCamp : x))
      : [newCamp, ...current.campaigns];
    await saveShopConfig(slug, { ...current, campaigns: nextCampaigns });
    const updatedAll = await loadAllShopConfigs();
    return json(200, { ok: true, shop: updatedAll[slug], shops: updatedAll });
  }

  if (action === "delete_campaign") {
    const campId = String(body?.campaignId ?? "").trim();
    const nextCampaigns = current.campaigns.filter((x) => x.id !== campId);
    await saveShopConfig(slug, { ...current, campaigns: nextCampaigns });
    const updatedAll = await loadAllShopConfigs();
    return json(200, { ok: true, shop: updatedAll[slug], shops: updatedAll });
  }

  return json(400, { ok: false, message: "إجراء غير معروف." });
}

export const Route = createFileRoute("/api/media")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        if (u.searchParams.get("kind") === "shop-hub") {
          const [shops, viewer] = await Promise.all([loadAllShopConfigs(), checkViewerRoles()]);
          const slug = u.searchParams.get("slug");
          if (slug) {
            const shop = shops[slug] ?? { slug, products: [], campaigns: [] };
            return json(200, {
              ok: true,
              shop,
              shops,
              viewer,
              canManage: viewer.isAdmin || isSupervisorOfShop(viewer, shops[slug]),
            });
          }
          return json(200, { ok: true, shops, viewer });
        }
        return json(400, { ok: false });
      },
      POST: async ({ request }) => {
        const kind = new URL(request.url).searchParams.get("kind");
        if (kind === "staff") return staffOrShopUpload(request, false);
        if (kind === "shop-upload") return staffOrShopUpload(request, true);
        if (kind === "shop-hub") return handleShopHubPost(request);

        const user = await sessionUser();
        if (!user) return json(401, { ok: false, message: "سجّل الدخول أولاً." });
        if (kind !== "ad" && kind !== "business")
          return json(400, { ok: false, message: "طلب غير صحيح." });
        const declared = Number(request.headers.get("content-length") ?? 0);
        if (declared > MAX_MEDIA_BYTES)
          return json(413, { ok: false, message: "الصورة كبيرة جداً (الحد 3 ميغابايت)." });
        if (tooMany(user.id))
          return json(429, { ok: false, message: "رفعت صوراً كثيرة للتو. حاول بعد قليل." });

        const raw = new Uint8Array(await request.arrayBuffer());
        if (raw.length === 0) return json(400, { ok: false, message: "الصورة فارغة." });
        if (raw.length > MAX_MEDIA_BYTES)
          return json(413, { ok: false, message: "الصورة كبيرة جداً (الحد 3 ميغابايت)." });

        const { checkImage } = await import("@/lib/media/image-check");
        let image: ReturnType<typeof checkImage>;
        try {
          image = checkImage(raw);
        } catch {
          return json(415, { ok: false, message: "نقبل صور JPG أو WebP فقط." });
        }
        if (image.width > MAX_MEDIA_SIDE || image.height > MAX_MEDIA_SIDE)
          return json(400, { ok: false, message: "أبعاد الصورة كبيرة جداً." });

        try {
          const { randomBytes } = await import("node:crypto");
          const store = await import("@/lib/media/store.server");
          const { putMedia } = await import("@/lib/media/storage.server");
          void store.cleanupOrphans().catch((e) => console.error("[media] cleanup failed", e));
          if ((await store.countUnsaved(user.id)) >= store.MAX_UNSAVED_PER_USER)
            return json(429, {
              ok: false,
              message: "لديك صور كثيرة لم تُحفظ بعد. أرسل منشورك أو احذف بعضها.",
            });
          const key = `${randomBytes(16).toString("hex")}.${image.ext}`;
          await putMedia(key, image.bytes, image.contentType);
          await store.recordUpload({
            key,
            userId: user.id,
            kind,
            contentType: image.contentType,
            size: image.bytes.length,
            width: image.width,
            height: image.height,
          });
          return json(200, { ok: true, key, url: mediaUrl(key) });
        } catch (error) {
          console.error("[media] upload failed", error);
          return json(500, { ok: false, message: "تعذّر رفع الصورة الآن. حاول مرة أخرى." });
        }
      },
      DELETE: async ({ request }) => {
        const user = await sessionUser();
        if (!user) return json(401, { ok: false });
        const key = new URL(request.url).searchParams.get("key") ?? "";
        if (!MEDIA_KEY_RE.test(key)) return json(400, { ok: false });
        try {
          const { deleteUnsaved } = await import("@/lib/media/store.server");
          return json(200, { ok: await deleteUnsaved(user.id, key) });
        } catch (error) {
          console.error("[media] delete failed", error);
          return json(500, { ok: false });
        }
      },
    },
  },
});
