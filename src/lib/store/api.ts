import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  ID_RE,
  ORDER_STATUS,
  sectionVisible,
  type Order,
  type OrderStatus,
  type PublicProduct,
  type PublicStoreSettings,
  type StoreCategory,
} from "./types";

async function origin(): Promise<string> {
  const { getRequest } = await import("@tanstack/react-start/server");
  try {
    const u = new URL(getRequest().url);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1"
      ? `http://${u.host}`
      : `https://${u.host}`;
  } catch {
    return "https://rahatpost.com";
  }
}

async function publicSettings(): Promise<PublicStoreSettings> {
  const { publicContact, payConfig } = await import("./settings.server");
  const { activeProvider } = await import("./pay/providers.server");
  const [c, cfg] = await Promise.all([publicContact(), payConfig()]);
  return { ...c, provider: activeProvider(cfg).id };
}

/* ------------------------------------------------------------------ public */

export const getStore = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    ok: boolean;
    products: PublicProduct[];
    categories: StoreCategory[];
    settings: PublicStoreSettings;
  }> => {
    try {
      const s = await import("./store.server");
      const [products, all, settings] = await Promise.all([
        s.listPublicProducts(),
        s.listCategories(),
        publicSettings(),
      ]);
      return { ok: true, products, categories: all.filter(sectionVisible), settings };
    } catch (error) {
      console.error("[store] list failed", error);
      return {
        ok: false,
        products: [],
        categories: [],
        settings: { currency: "ILS", whatsapp: "", email: "", provider: "manual" },
      };
    }
  },
);

/** One catalog section: breadcrumbs, visible sub-sections and its products (incl. sub-sections). */
export const getStoreSection = createServerFn({ method: "GET" })
  .inputValidator((i: { slug: string }) => ({ slug: String(i?.slug ?? "").slice(0, 60) }))
  .handler(async ({ data }) => {
    const s = await import("./store.server");
    const [all, products, settings] = await Promise.all([
      s.listCategories(),
      s.listPublicProducts(500),
      publicSettings(),
    ]);
    const section = all.find((c) => c.slug === data.slug && sectionVisible(c)) ?? null;
    if (!section) return { section: null, parent: null, children: [], products: [], settings };
    const parent = all.find((c) => c.id === section.parentId && sectionVisible(c)) ?? null;
    const children = all.filter((c) => c.parentId === section.id && sectionVisible(c));
    const ids = [section.id, ...all.filter((c) => c.parentId === section.id).map((c) => c.id)];
    return {
      section,
      parent,
      children,
      products: products.filter((p) => p.categoryId && ids.includes(p.categoryId)),
      settings,
    };
  });

export const getStoreProduct = createServerFn({ method: "GET" })
  .inputValidator((i: { slug: string }) => ({ slug: String(i?.slug ?? "").slice(0, 80) }))
  .handler(async ({ data }) => {
    const s = await import("./store.server");
    const [product, categories, settings] = await Promise.all([
      s.getPublicProduct(data.slug),
      s.listCategories(),
      publicSettings(),
    ]);
    return { product, categories, settings };
  });

/** Current prices/stock of cart items (the cart in localStorage holds only ids + qty). */
export const getCartProducts = createServerFn({ method: "POST" })
  .inputValidator((i: { ids: string[] }) => ({
    ids: (Array.isArray(i?.ids) ? i.ids : [])
      .map(String)
      .filter((x) => ID_RE.test(x))
      .slice(0, 30),
  }))
  .handler(async ({ data }) => {
    const s = await import("./store.server");
    const all = await s.listPublicProducts(500);
    return {
      products: all.filter((p) => data.ids.includes(p.id)),
      settings: await publicSettings(),
    };
  });

/* ------------------------------------------------------------------- buyer */

export type CheckoutResult =
  | { ok: true; orderId: string; next: "manual" | "redirect" | "whatsapp"; url?: string }
  | { ok: false; message: string };

export const checkout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((i: { items: { id: string; qty: number }[]; method?: "online" | "whatsapp" }) => {
    const items = (Array.isArray(i?.items) ? i.items : [])
      .map((x) => ({ id: String(x?.id ?? ""), qty: Math.trunc(Number(x?.qty)) }))
      .filter((x) => ID_RE.test(x.id) && x.qty >= 1 && x.qty <= 20);
    const seen = new Set<string>();
    return {
      items: items.filter((x) => !seen.has(x.id) && seen.add(x.id)).slice(0, 30),
      method: i?.method === "whatsapp" ? ("whatsapp" as const) : ("online" as const),
    };
  })
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    if (!data.items.length) return { ok: false, message: "السلة فارغة." };
    const { rateLimited } = await import("@/lib/submit-guard");
    if (await rateLimited("store-order", context.user.id).catch(() => false))
      return { ok: false, message: "طلبات كثيرة للتو. حاول بعد قليل." };
    try {
      const s = await import("./store.server");
      const { payConfig } = await import("./settings.server");
      const { activeProvider, PROVIDER_IMPL } = await import("./pay/providers.server");
      const cfg = await payConfig();
      const provider = data.method === "whatsapp" ? PROVIDER_IMPL.manual : activeProvider(cfg);
      const order = await s.createOrder(context.user, data.items, cfg.currency, provider.id);
      if (data.method === "whatsapp") {
        // Cash via WhatsApp: order stays pending until the admin marks it paid (then auto-delivery).
        const { publicContact } = await import("./settings.server");
        const { formatPrice, waDigits } = await import("./types");
        const contact = await publicContact();
        await s.addNote(order.id, "[نقداً عبر واتساب]");
        const lines = await s.orderLines(order.id);
        const text = [
          "مرحباً، أريد إتمام طلبي من متجر رهط بوست والدفع نقداً.",
          `رقم الطلب: ${order.id.slice(0, 8)}`,
          ...lines.map((l) => `• ${l.name} × ${l.qty}`),
          `المجموع: ${formatPrice(order.totalAgorot, cfg.currency)}`,
          `الاسم: ${context.user.name || "-"}`,
        ].join("\n");
        const url = `https://wa.me/${waDigits(contact.whatsapp || "+972546669704")}?text=${encodeURIComponent(text)}`;
        return { ok: true, orderId: order.id, next: "whatsapp", url };
      }
      if (provider.id === "manual") return { ok: true, orderId: order.id, next: "manual" };
      try {
        const r = await provider.start(
          cfg,
          {
            id: order.id,
            totalAgorot: order.totalAgorot,
            currency: cfg.currency,
            description: order.names.join("، "),
            email: context.user.email ?? "",
            name: context.user.name ?? "",
          },
          await origin(),
        );
        if (r.kind === "redirect") {
          await s.setProviderRef(order.id, provider.id, r.ref);
          return { ok: true, orderId: order.id, next: "redirect", url: r.url };
        }
      } catch (error) {
        console.error("[store] provider start failed", error);
        await s.logPaymentEvent(
          order.id,
          provider.id,
          false,
          `start failed: ${String(error).slice(0, 200)}`,
        );
      }
      // Online payment unavailable right now: the order stays pending, handled manually.
      return { ok: true, orderId: order.id, next: "manual" };
    } catch (error) {
      return {
        ok: false,
        message:
          error instanceof Error && /[\u0600-\u06FF]/.test(error.message)
            ? error.message
            : "تعذّر إنشاء الطلب.",
      };
    }
  });

export const listMyOrders = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<Order[]> => {
    const { myOrders } = await import("./store.server");
    return myOrders(context.user.id);
  });

/**
 * After returning from the payment page: ask the provider's server (never trust the URL) and
 * mark paid + deliver if it confirms. Idempotent; the webhook does the same.
 */
export const confirmMyPayment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((i: { orderId: string }) => ({ orderId: String(i?.orderId ?? "") }))
  .handler(async ({ data, context }): Promise<{ status: OrderStatus | null }> => {
    const s = await import("./store.server");
    const o = await s.getOrderRow(data.orderId);
    if (!o || o.user_id !== context.user.id) return { status: null };
    if (o.status === "pending" && o.provider !== "manual" && o.provider_ref) {
      const { verifyAndMark } = await import("./pay/confirm.server");
      await verifyAndMark(o.id, "return");
    }
    return { status: ((await s.getOrderRow(o.id))?.status ?? null) as OrderStatus | null };
  });

/* ------------------------------------------------------------------- admin */

async function staff(): Promise<boolean> {
  const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
  assertSameSiteRequest();
  const { isAdmin } = await import("@/lib/admin-auth");
  return isAdmin();
}
async function owner(): Promise<boolean> {
  const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
  assertSameSiteRequest();
  const { isOwner } = await import("@/lib/admin-auth");
  return isOwner();
}
const msg = (e: unknown, f: string) =>
  e instanceof Error && /[\u0600-\u06FF]/.test(e.message) ? e.message : f;

export const adminStoreData = createServerFn({ method: "POST" }).handler(async () => {
  if (!(await staff())) return { authed: false as const };
  const s = await import("./store.server");
  const [products, categories, low] = await Promise.all([
    s.listAdminProducts(),
    s.listCategories(),
    s.lowStock(),
  ]);
  return { authed: true as const, products, categories, low, lowThreshold: s.LOW_CODES };
});

export const adminSaveProduct = createServerFn({ method: "POST" })
  .inputValidator((i: Record<string, unknown>) => i)
  .handler(async ({ data }) => {
    if (!(await staff())) return { ok: false, message: "غير مصرح." };
    try {
      const { saveProduct } = await import("./store.server");
      return { ok: true, id: await saveProduct(data) };
    } catch (e) {
      return { ok: false, message: msg(e, "تعذّر حفظ المنتج.") };
    }
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .inputValidator((i: { id: string }) => ({ id: String(i?.id ?? "") }))
  .handler(async ({ data }) => {
    if (!(await staff()) || !ID_RE.test(data.id)) return { ok: false };
    const { deleteProduct } = await import("./store.server");
    await deleteProduct(data.id);
    return { ok: true };
  });

export const adminSaveCategory = createServerFn({ method: "POST" })
  .inputValidator((i: Record<string, unknown>) => i)
  .handler(async ({ data }) => {
    if (!(await staff())) return { ok: false, message: "غير مصرح." };
    try {
      const { saveCategory } = await import("./store.server");
      await saveCategory(data);
      return { ok: true };
    } catch (e) {
      return { ok: false, message: msg(e, "تعذّر الحفظ.") };
    }
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .inputValidator((i: { id: string }) => ({ id: String(i?.id ?? "") }))
  .handler(async ({ data }) => {
    if (!(await staff()) || !ID_RE.test(data.id)) return { ok: false };
    const { deleteCategory } = await import("./store.server");
    await deleteCategory(data.id);
    return { ok: true };
  });

export const adminCodes = createServerFn({ method: "POST" })
  .inputValidator((i: { productId: string; text?: string; clear?: boolean }) => ({
    productId: String(i?.productId ?? ""),
    text: String(i?.text ?? "").slice(0, 200_000),
    clear: i?.clear === true,
  }))
  .handler(async ({ data }) => {
    if (!(await staff()) || !ID_RE.test(data.productId)) return { ok: false, n: 0 };
    const s = await import("./store.server");
    const n = data.clear
      ? await s.clearFreeCodes(data.productId)
      : await s.addCodes(data.productId, data.text);
    return { ok: true, n };
  });

export const adminListOrders = createServerFn({ method: "POST" })
  .inputValidator((i: { status?: string }) => ({
    status: i?.status && i.status in ORDER_STATUS ? (i.status as OrderStatus) : undefined,
  }))
  .handler(async ({ data }) => {
    if (!(await staff())) return { authed: false as const, orders: [] };
    const { adminOrders } = await import("./store.server");
    return { authed: true as const, orders: await adminOrders(data.status) };
  });

export const adminOrderAction = createServerFn({ method: "POST" })
  .inputValidator((i: { id: string; action: string }) => ({
    id: String(i?.id ?? ""),
    action: String(i?.action ?? ""),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    if (!(await staff()) || !ID_RE.test(data.id)) return { ok: false, message: "غير مصرح." };
    const s = await import("./store.server");
    if (data.action === "resend") await s.resend(data.id);
    else if (data.action === "revoke") await s.revoke(data.id);
    else if (data.action === "deliver") {
      const r = await s.deliver(data.id);
      if (!r.delivered)
        return {
          ok: false,
          message: r.short.length
            ? `لا يكفي المخزون/الأكواد: ${r.short.join("، ")}`
            : "الطلب غير مدفوع.",
        };
    } else if (data.action in ORDER_STATUS) {
      const ok = await s.setStatus(data.id, data.action as OrderStatus);
      if (!ok)
        return {
          ok: false,
          message: "لم تتغير الحالة (قد يكون الطلب ليس بانتظار الدفع، أو نقص في الأكواد).",
        };
    } else return { ok: false, message: "إجراء غير معروف." };
    return { ok: true };
  });

/* ------------------------------------------------ payment settings (owner only) */

export const adminGetPaySettings = createServerFn({ method: "POST" }).handler(async () => {
  if (!(await owner())) return { authed: false as const };
  const { adminPaySettings } = await import("./settings.server");
  const o = await origin();
  return {
    authed: true as const,
    settings: await adminPaySettings(),
    webhooks: {
      cardcom: `${o}/api/store-webhook/cardcom`,
      tranzila: `${o}/api/store-webhook/tranzila`,
    },
  };
});

export const adminSavePaySettings = createServerFn({ method: "POST" })
  .inputValidator((i: Record<string, unknown>) => i)
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    if (!(await owner())) return { ok: false, message: "هذا القسم لمالك الموقع فقط." };
    if (JSON.stringify(data ?? {}).length > 10_000)
      return { ok: false, message: "البيانات كبيرة جداً." };
    try {
      const { saveAdminPaySettings } = await import("./settings.server");
      await saveAdminPaySettings(data);
      return { ok: true };
    } catch (e) {
      return { ok: false, message: msg(e, "تعذّر الحفظ.") };
    }
  });

export const adminTestPayment = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: boolean; message: string }> => {
    if (!(await owner())) return { ok: false, message: "غير مصرح." };
    const { payConfig } = await import("./settings.server");
    const { PROVIDER_IMPL } = await import("./pay/providers.server");
    const cfg = await payConfig();
    return PROVIDER_IMPL[cfg.provider].test(cfg, await origin());
  },
);
