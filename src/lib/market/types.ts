/** «سوق المستعمل»: used-items listings (stored in the classifieds table). */
export const MARKET_CATEGORIES = ["سيارات", "هواتف", "إلكترونيات", "أثاث", "أجهزة منزلية", "ملابس", "أطفال", "رياضة", "عقارات", "حيوانات", "خدمات", "أخرى"] as const;
export const CONDITIONS = ["جديد", "شبه جديد", "مستعمل"] as const;
export const PRICE_MODES = ["price", "negotiable", "free"] as const;
export type PriceMode = (typeof PRICE_MODES)[number];
export type ListingStatus = "pending" | "approved" | "rejected" | "hidden";

/** Listings stay up for this long after posting / renewing. */
export const LISTING_DAYS = 60;
export const LISTING_ID_RE = /^[a-f0-9]{16}$/;

/**
 * Optional per-category details. Every field is skippable. To give a category specs (or a new
 * category), add an entry here; the form, item page and grid filters read this config.
 * filter: "range" → min/max inputs, "max" → upper bound, "select" → dropdown.
 */
export type SpecType = "text" | "number" | "select" | "month";
export type SpecField = {
  key: string;
  label: string;
  labelHe?: string;
  labelEn?: string;
  type: SpecType;
  /** select: Arabic values (stored), with optional parallel he/en display labels. */
  options?: readonly string[];
  optionsHe?: readonly string[];
  optionsEn?: readonly string[];
  unit?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  filter?: "range" | "max" | "select";
};

const YEAR_MAX = new Date().getFullYear() + 1;
const brand = (placeholder: string): SpecField => ({ key: "brand", label: "الماركة", type: "text", max: 30, placeholder });
const model: SpecField = { key: "model", label: "الموديل", type: "text", max: 40 };
const color: SpecField = { key: "color", label: "اللون", type: "text", max: 20 };
const warranty: SpecField = { key: "warranty", label: "الكفالة", type: "select", options: ["بكفالة", "بدون كفالة"], filter: "select" };

export const DEFAULT_SPECS: Record<string, readonly SpecField[]> = {
  سيارات: [
    { key: "make", label: "الشركة", type: "text", max: 30, placeholder: "تويوتا" },
    { ...model, placeholder: "كورولا" } as SpecField,
    { key: "year", label: "سنة الصنع", type: "number", min: 1950, max: YEAR_MAX, filter: "range" },
    { key: "km", label: "الكيلومترات", type: "number", min: 0, max: 2_000_000, unit: "كم", filter: "max" },
    { key: "transmission", label: "ناقل الحركة", type: "select", options: ["أوتوماتيك", "عادي"], filter: "select" },
    { key: "fuel", label: "الوقود", type: "select", options: ["بنزين", "ديزل", "هايبرد", "كهرباء"], filter: "select" },
    color,
    { key: "hand", label: "اليد", type: "select", options: ["يد أولى", "يد ثانية", "يد ثالثة", "يد رابعة", "يد خامسة فأكثر"], filter: "select" },
    { key: "test", label: "التست ساري حتى", type: "month" },
  ],
  هواتف: [
    { ...brand("آيفون، سامسونج…"), filter: undefined } as SpecField,
    model,
    { key: "storage", label: "الذاكرة", type: "select", options: ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB"], filter: "select" },
    { key: "battery", label: "صحة البطارية", type: "number", min: 1, max: 100, unit: "%" },
    color,
    warranty,
  ],
  إلكترونيات: [
    { key: "kind", label: "النوع", type: "select", options: ["حاسوب", "لابتوب", "تابلت", "شاشة / تلفاز", "ألعاب فيديو", "كاميرا", "صوتيات", "أخرى"], filter: "select" },
    brand("سوني، أبل، ديل…"),
    model,
    warranty,
  ],
  عقارات: [
    { key: "deal", label: "بيع أو إيجار", type: "select", options: ["للبيع", "للإيجار"], filter: "select" },
    { key: "kind", label: "نوع العقار", type: "select", options: ["شقة", "بيت", "أرض", "محل", "مخزن"], filter: "select" },
    { key: "rooms", label: "الغرف", type: "number", min: 1, max: 20, filter: "range" },
    { key: "size", label: "المساحة", type: "number", min: 10, max: 100_000, unit: "م²", filter: "range" },
    { key: "floor", label: "الطابق", type: "number", min: 0, max: 60 },
    { key: "furnished", label: "مفروش", type: "select", options: ["مفروش", "نصف مفروش", "غير مفروش"], filter: "select" },
  ],
  أثاث: [
    { key: "kind", label: "النوع", type: "select", options: ["كنب", "غرفة نوم", "طاولة وكراسي", "خزانة", "مطبخ", "سجاد", "أخرى"], filter: "select" },
    { key: "material", label: "الخامة", type: "select", options: ["خشب", "معدن", "قماش", "جلد", "بلاستيك", "زجاج"], filter: "select" },
    { key: "dimensions", label: "الأبعاد", type: "text", max: 40, placeholder: "200×90×80 سم" },
  ],
  "أجهزة منزلية": [
    { key: "kind", label: "النوع", type: "select", options: ["غسالة", "ثلاجة", "فرن / غاز", "مكيف", "مكنسة", "ميكروويف", "أخرى"], filter: "select" },
    brand("سامسونج، LG…"),
    warranty,
  ],
  ملابس: [
    { key: "gender", label: "لمن", type: "select", options: ["رجالي", "نسائي", "أولادي", "بناتي"], filter: "select" },
    { key: "size", label: "المقاس", type: "text", max: 12, placeholder: "M / 42" },
    brand("زارا، نايك…"),
  ],
  أطفال: [
    { key: "kind", label: "النوع", type: "select", options: ["عربة", "كرسي سيارة", "سرير", "ألعاب", "ملابس", "أخرى"], filter: "select" },
    { key: "age", label: "العمر المناسب", type: "text", max: 20, placeholder: "0–3 سنوات" },
  ],
  رياضة: [
    { key: "kind", label: "النوع", type: "select", options: ["دراجة", "أجهزة لياقة", "كرة قدم", "تخييم", "أخرى"], filter: "select" },
    brand(""),
  ],
  حيوانات: [
    { key: "kind", label: "النوع", type: "select", options: ["خيل", "إبل", "أغنام", "ماعز", "طيور", "قطط", "كلاب", "أخرى"], filter: "select" },
    { key: "breed", label: "السلالة", type: "text", max: 30 },
    { key: "age", label: "العمر", type: "text", max: 20, placeholder: "سنتان" },
    { key: "sex", label: "الجنس", type: "select", options: ["ذكر", "أنثى"], filter: "select" },
  ],
  خدمات: [{ key: "kind", label: "نوع الخدمة", type: "text", max: 40 }],
};

export type Specs = Record<string, string | number>;

export type Seller = { id: string; name: string; image: string | null; since: string; badge?: string };

export type Listing = {
  id: string;
  title: string;
  category: string;
  priceMode: PriceMode;
  price: number | null;
  condition: string;
  area: string;
  description: string;
  specs: Specs;
  photos: string[];
  /** null when the seller hid it (WhatsApp still works through the server redirect). */
  phone: string | null;
  sold: boolean;
  /** Example listing («مثال»), removable in one admin action. */
  sample: boolean;
  expired: boolean;
  createdAt: string;
  renewedAt: string;
  seller: Seller;
};

export type OwnListing = Listing & { status: ListingStatus; phone: string; hidePhone: boolean; updatedAt: string };

export type ListingInput = {
  title: string;
  category: string;
  priceMode: PriceMode;
  price: number | null;
  condition: string;
  area: string;
  description: string;
  phone: string;
  hidePhone: boolean;
  specs: Specs;
  photos: string[];
};

export const STATUS_LABEL: Record<ListingStatus, string> = {
  pending: "بانتظار المراجعة",
  approved: "منشور",
  rejected: "مرفوض",
  hidden: "مخفي",
};

export function priceLabel(l: Pick<Listing, "priceMode" | "price">): string {
  if (l.priceMode === "free") return "مجاناً";
  if (l.priceMode === "negotiable" && !l.price) return "السعر قابل للتفاوض";
  const n = l.price ? `₪${l.price.toLocaleString("en-US")}` : "";
  return l.priceMode === "negotiable" ? `${n} · قابل للتفاوض` : n;
}

/** wa.me link with an Israeli number normalized to 972… */
export function whatsappUrl(phone: string, text: string): string {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("0")) d = `972${d.slice(1)}`;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

