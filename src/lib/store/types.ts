/** «المتجر» shared (client + server) types, labels and sanitizers. Prices are integer agorot. */

export const ORDER_STATUS = {
  pending: "بانتظار الدفع",
  paid: "مدفوع",
  delivered: "تم التسليم",
  cancelled: "ملغى",
} as const;
export type OrderStatus = keyof typeof ORDER_STATUS;

export const DURATIONS = {
  none: "بدون مدة",
  monthly: "شهري",
  yearly: "سنوي",
  lifetime: "مدى الحياة",
  once: "لمرة واحدة",
} as const;
export type Duration = keyof typeof DURATIONS;

export const CURRENCIES = { ILS: "₪", USD: "$", EUR: "€" } as const;
export type Currency = keyof typeof CURRENCIES;

export const PROVIDERS = {
  manual: "يدوي (تواصل لإتمام الدفع)",
  cardcom: "Cardcom (صفحة دفع آمنة)",
  tranzila: "Tranzila (صفحة دفع آمنة)",
} as const;
export type ProviderId = keyof typeof PROVIDERS;

export type StoreCategory = { id: string; name: string; slug: string; sort: number };

export type PublicProduct = {
  id: string;
  slug: string;
  name: string;
  categoryId: string | null;
  priceAgorot: number;
  saleAgorot: number | null;
  imageKey: string | null;
  shortDesc: string;
  description: string;
  duration: Duration;
  badges: string[];
  inStock: boolean;
};

export type AdminProduct = Omit<PublicProduct, "inStock"> & {
  stock: number | null;
  active: boolean;
  sort: number;
  delivery: string;
};

export type OrderItem = { productId: string; name: string; unitAgorot: number; qty: number };
export type Order = {
  id: string;
  status: OrderStatus;
  totalAgorot: number;
  currency: Currency;
  provider: ProviderId;
  createdAt: string;
  items: (OrderItem & { delivery?: string; revoked?: boolean })[];
  userName?: string;
  userEmail?: string;
  note?: string;
};

/** What every visitor may see of the store settings. */
export type PublicStoreSettings = {
  currency: Currency;
  whatsapp: string;
  email: string;
  provider: ProviderId; // the provider actually in use (manual if the chosen one is not ready)
};

/** wa.me digits from a local or international number (0… → 972…). */
export const waDigits = (n: string) => n.replace(/\D/g, "").replace(/^0/, "972");

export const ID_RE = /^[a-z0-9]{12,32}$/;
export const SLUG_RE = /^[a-z0-9-]{2,80}$/;

export const effectivePrice = (p: { priceAgorot: number; saleAgorot: number | null }) =>
  p.saleAgorot != null && p.saleAgorot < p.priceAgorot ? p.saleAgorot : p.priceAgorot;

export function formatPrice(agorot: number, currency: Currency = "ILS"): string {
  const v = agorot / 100;
  const s = Number.isInteger(v) ? String(v) : v.toFixed(2);
  return `${s} ${CURRENCIES[currency] ?? "₪"}`;
}

/** "12.5" → 1250; invalid / negative → null. */
export function toAgorot(v: unknown): number | null {
  const s = String(v ?? "")
    .trim()
    .replace(",", ".");
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

export const clip = (v: unknown, max: number, multiline = false) => {
  if (typeof v !== "string") return "";
  let s = v.replace(/[<>]/g, "").split(String.fromCharCode(0)).join("");
  s = multiline ? s.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n") : s.replace(/\s+/g, " ");
  return s.trim().slice(0, max);
};

export function slugify(v: string): string {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
