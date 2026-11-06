import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Clock,
  ExternalLink,
  Flame,
  Globe,
  ImagePlus,
  MapPin,
  Megaphone,
  PackagePlus,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { GuideCard } from "@/components/guide";
import { OsmCredit } from "@/components/osm-credit";
import { RevealPhone } from "@/components/phone";
import { compress } from "@/components/photo-picker";
import { ReportButton } from "@/components/report";
import { Shell } from "@/components/shell";
import { guidesForPlace } from "@/data/guides";
import { getApprovedEntries } from "@/lib/directory/api";
import { mapsUrl, osmEntries, ownerCategories, type DirectoryEntry } from "@/lib/directory/types";
import { tr, trv } from "@/lib/i18n/core";
import { mediaUrl } from "@/lib/media/types";
import { breadcrumbLd, localBusinessLd, seo, SITE_URL, snippet } from "@/lib/seo";

type ShopProductItem = {
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

type ShopPromoCampaign = {
  id: string;
  title: string;
  subtitle: string;
  discountBadge: string;
  validUntil?: string;
  imageKey?: string;
  active: boolean;
  createdAt: string;
};

type ShopHubEntryConfig = {
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

export const Route = createFileRoute("/directory/$slug")({
  loader: async ({ params }) => {
    let place: DirectoryEntry | undefined;
    if (params.slug.startsWith("biz-")) {
      const approved = await getApprovedEntries();
      place = approved.entries.find((e) => e.slug === params.slug);
    } else {
      place = osmEntries().find((e) => e.slug === params.slug);
    }
    return { place: place ?? null, slug: params.slug };
  },
  staleTime: 30_000,
  head: ({ loaderData, params }) => {
    const p = loaderData?.place;
    const path = `/directory/${params.slug}`;
    if (!p) {
      return seo({
        title: tr("محل وخدمات في دليل رهط · رهط بوست"),
        description: tr("صفحة المحل والمنتجات والعروض في دليل محلات وخدمات رهط."),
        path,
      });
    }
    const where = p.address ?? p.area;
    const description =
      snippet(p.description) ||
      snippet(
        tr(
          "{0}: {1} في رهط{2}. الموقع على الخريطة، المنتجات وحملات العروض{3}{4} في دليل رهط بوست.",
          p.name,
          p.category,
          where ? ` (${where})` : "",
          p.phone ? " ورقم الهاتف" : "",
          p.openingHours ? " وساعات العمل" : "",
        ),
      );
    return seo({
      title: tr("{0} · {1} في رهط | دليل رهط بوست", p.name, p.category),
      description,
      path,
      image: p.photo ? `${SITE_URL}${mediaUrl(p.photo)}` : undefined,
      jsonLd: [
        localBusinessLd({
          ...p,
          path,
          phone: p.source === "osm" ? p.phone : undefined,
        }),
        breadcrumbLd([
          { name: tr("دليل محلات وخدمات رهط"), path: "/directory" },
          { name: p.name, path },
        ]),
      ],
    });
  },
  component: BusinessPage,
});

function shopImgSrc(v?: string | null): string {
  if (!v) return "";
  if (
    v.startsWith("data:image/") ||
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("/")
  ) {
    return v;
  }
  return mediaUrl(v);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function formatWaNumber(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("+")) return digits.slice(1);
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return `972${digits.slice(1)}`;
  return digits;
}

function BusinessPage() {
  const { place: basePlace, slug } = Route.useLoaderData();
  const [hubCfg, setHubCfg] = useState<ShopHubEntryConfig | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingHub, setLoadingHub] = useState(true);
  const [manageOpen, setManageOpen] = useState(false);
  const [manageTab, setManageTab] = useState<"profile" | "products" | "campaigns">("products");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Profile edit state
  const [customName, setCustomName] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [customArea, setCustomArea] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [customPhone, setCustomPhone] = useState("");
  const [customWhatsapp, setCustomWhatsapp] = useState("");
  const [customHours, setCustomHours] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customWeb, setCustomWeb] = useState("");
  const [logoKey, setLogoKey] = useState("");
  const [coverKey, setCoverKey] = useState("");

  // New/Edit Product state
  const [prodId, setProdId] = useState("");
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodOldPrice, setProdOldPrice] = useState("");
  const [prodBadge, setProdBadge] = useState("عرض خاص");
  const [prodDesc, setProdDesc] = useState("");
  const [prodImgKey, setProdImgKey] = useState("");
  const [prodInStock, setProdInStock] = useState(true);

  // New/Edit Campaign state
  const [campId, setCampId] = useState("");
  const [campTitle, setCampTitle] = useState("");
  const [campSubtitle, setCampSubtitle] = useState("");
  const [campBadge, setCampBadge] = useState("🔥 حملة عروض");
  const [campValid, setCampValid] = useState("");
  const [campImgKey, setCampImgKey] = useState("");
  const [campActive, setCampActive] = useState(true);

  const loadShopHub = useCallback(async () => {
    try {
      const res = await fetch(`/api/media?kind=shop-hub&slug=${encodeURIComponent(slug)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.ok && data.shop) {
        const s: ShopHubEntryConfig = data.shop;
        setHubCfg(s);
        setCanManage(Boolean(data.canManage));
        setIsAdmin(Boolean(data.viewer?.isAdmin));
        setCustomName(s.customName || basePlace?.name || "");
        setCustomCategory(s.customCategory || basePlace?.category || "خدمات");
        setCustomArea(s.customArea || basePlace?.area || "");
        setCustomAddress(s.customAddress || basePlace?.address || "");
        setCustomPhone(s.customPhone || basePlace?.phone || "");
        setCustomWhatsapp(s.customWhatsapp || basePlace?.phone || "");
        setCustomHours(s.customOpeningHours || basePlace?.openingHours || "");
        setCustomDesc(s.customDescription || basePlace?.description || "");
        setCustomWeb(s.customWebsite || basePlace?.website || "");
        setLogoKey(s.logoKey || basePlace?.photo || "");
        setCoverKey(s.coverKey || "");
      }
    } catch {
      /* ignore network error */
    } finally {
      setLoadingHub(false);
    }
  }, [slug, basePlace]);

  useEffect(() => {
    void loadShopHub();
  }, [loadShopHub]);

  const place: DirectoryEntry | null = basePlace
    ? {
        ...basePlace,
        name: hubCfg?.customName || basePlace.name,
        category: hubCfg?.customCategory || basePlace.category,
        area: hubCfg?.customArea || basePlace.area,
        address: hubCfg?.customAddress || basePlace.address,
        phone: hubCfg?.customPhone || basePlace.phone,
        openingHours: hubCfg?.customOpeningHours || basePlace.openingHours,
        description: hubCfg?.customDescription || basePlace.description,
        website: hubCfg?.customWebsite || basePlace.website,
        photo: hubCfg?.logoKey || basePlace.photo,
        verified: hubCfg?.verified !== undefined ? hubCfg.verified : basePlace.verified,
      }
    : hubCfg?.isCustomShop && hubCfg.customName
      ? {
          slug,
          name: hubCfg.customName,
          category: hubCfg.customCategory || "خدمات",
          source: "owner",
          verified: hubCfg.verified !== false,
          area: hubCfg.customArea,
          address: hubCfg.customAddress,
          phone: hubCfg.customPhone,
          openingHours: hubCfg.customOpeningHours,
          description: hubCfg.customDescription,
          website: hubCfg.customWebsite,
          photo: hubCfg.logoKey,
        }
      : null;

  const uploadShopAsset = async (
    file: File,
    autoSaveField?: "logoKey" | "coverKey",
  ): Promise<string | null> => {
    setBusy(true);
    setMsg("");
    try {
      const blob = await compress(file);
      const dataUrl = await blobToDataUrl(blob).catch(() => "");
      let finalRef = dataUrl;
      try {
        const res = await fetch(`/api/media?kind=shop-upload&slug=${encodeURIComponent(slug)}`, {
          method: "POST",
          headers: { "content-type": blob.type || "image/webp" },
          body: blob,
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok && data?.key) {
          finalRef = String(data.key);
        }
      } catch {
        /* fallback to dataUrl */
      }
      if (!finalRef) {
        setMsg(tr("تعذّر قراءة الصورة."));
        return null;
      }
      if (autoSaveField) {
        const saveRes = await fetch("/api/media?kind=shop-hub", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            slug,
            action: "update_profile",
            payload: { [autoSaveField]: finalRef },
          }),
        }).catch(() => null);
        const saveData = await saveRes?.json().catch(() => null);
        if (saveData?.ok && saveData.shop) {
          setHubCfg(saveData.shop);
          setMsg(
            autoSaveField === "logoKey"
              ? tr("✓ تم رفع وحفظ لوجو المحل بنجاح.")
              : tr("✓ تم رفع وحفظ غلاف المحل بنجاح."),
          );
        }
      }
      return finalRef;
    } catch {
      setMsg(tr("تعذّر رفع الصورة."));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/media?kind=shop-hub", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          action: "update_profile",
          payload: {
            customName,
            customCategory,
            customArea,
            customAddress,
            customPhone,
            customWhatsapp,
            customOpeningHours: customHours,
            customDescription: customDesc,
            customWebsite: customWeb,
            logoKey,
            coverKey,
          },
        }),
      });
      const data = await res.json();
      if (data?.ok && data.shop) {
        setHubCfg(data.shop);
        setMsg(tr("✓ تم حفظ بيانات ولوجو المحل بنجاح."));
      } else {
        setMsg(data?.message || tr("تعذّر حفظ التعديلات."));
      }
    } catch {
      setMsg(tr("تعذّر حفظ التعديلات."));
    } finally {
      setBusy(false);
    }
  };

  const saveProduct = async () => {
    if (!prodName.trim()) {
      setMsg(tr("يرجى كتابة اسم المنتج."));
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/media?kind=shop-hub", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          action: "save_product",
          product: {
            id: prodId || undefined,
            name: prodName.trim(),
            price: prodPrice.trim(),
            oldPrice: prodOldPrice.trim(),
            badge: prodBadge.trim(),
            description: prodDesc.trim(),
            imageKey: prodImgKey,
            inStock: prodInStock,
          },
        }),
      });
      const data = await res.json();
      if (data?.ok && data.shop) {
        setHubCfg(data.shop);
        setProdId("");
        setProdName("");
        setProdPrice("");
        setProdOldPrice("");
        setProdDesc("");
        setProdImgKey("");
        setProdInStock(true);
        setMsg(tr("✓ تم حفظ المنتج في صفحة المحل بنجاح."));
      } else {
        setMsg(data?.message || tr("تعذّر حفظ المنتج."));
      }
    } catch {
      setMsg(tr("تعذّر حفظ المنتج."));
    } finally {
      setBusy(false);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm(tr("حذف هذا المنتج من المحل؟"))) return;
    setBusy(true);
    try {
      const res = await fetch("/api/media?kind=shop-hub", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, action: "delete_product", productId }),
      });
      const data = await res.json();
      if (data?.ok && data.shop) setHubCfg(data.shop);
    } finally {
      setBusy(false);
    }
  };

  const saveCampaign = async () => {
    if (!campTitle.trim()) {
      setMsg(tr("يرجى كتابة عنوان الإعلان أو حملة العروض."));
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/media?kind=shop-hub", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          action: "save_campaign",
          campaign: {
            id: campId || undefined,
            title: campTitle.trim(),
            subtitle: campSubtitle.trim(),
            discountBadge: campBadge.trim() || "🔥 حملة عروض",
            validUntil: campValid.trim(),
            imageKey: campImgKey,
            active: campActive,
          },
        }),
      });
      const data = await res.json();
      if (data?.ok && data.shop) {
        setHubCfg(data.shop);
        setCampId("");
        setCampTitle("");
        setCampSubtitle("");
        setCampBadge("🔥 حملة عروض");
        setCampValid("");
        setCampImgKey("");
        setCampActive(true);
        setMsg(tr("✓ تم نشر إعلان وحملة العروض في صفحة المحل بنجاح."));
      } else {
        setMsg(data?.message || tr("تعذّر حفظ حملة العروض."));
      }
    } catch {
      setMsg(tr("تعذّر حفظ حملة العروض."));
    } finally {
      setBusy(false);
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm(tr("حذف إعلان حملة العروض؟"))) return;
    setBusy(true);
    try {
      const res = await fetch("/api/media?kind=shop-hub", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, action: "delete_campaign", campaignId }),
      });
      const data = await res.json();
      if (data?.ok && data.shop) setHubCfg(data.shop);
    } finally {
      setBusy(false);
    }
  };

  if (!place && !loadingHub) {
    return (
      <Shell>
        <p className="stamp p-4 font-semibold">{tr("هذا النشاط غير موجود في الدليل.")}</p>
        <Link to="/directory" className="btn mt-4">
          {tr("رجوع للدليل")}
        </Link>
      </Shell>
    );
  }

  if (!place) {
    return (
      <Shell>
        <p className="stamp p-6 text-center font-bold">{tr("جاري تحميل صفحة المحل…")}</p>
      </Shell>
    );
  }

  const effectiveLogo = hubCfg?.logoKey || place.photo || "";
  const effectiveCover = hubCfg?.coverKey || "";
  const waSource = hubCfg?.customWhatsapp || place.phone || "";
  const waNum = formatWaNumber(waSource);
  const products = hubCfg?.products ?? [];
  const activeCampaigns = (hubCfg?.campaigns ?? []).filter((c) => c.active || canManage);

  return (
    <Shell>
      {/* Fullscreen Image Lightbox */}
      {lightboxImg ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs"
          onClick={() => setLightboxImg(null)}
        >
          <img
            src={lightboxImg}
            alt={place.name}
            className="max-h-[90vh] max-w-[95vw] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      ) : null}

      <div className="flex flex-col gap-5">
        {/* Top Breadcrumb & Supervisor Trigger Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-extrabold text-muted sm:text-sm">
            <Link to="/directory" className="chip hover:bg-primary-soft">
              🏪 {tr("دليل محلات وخدمات رهط")}
            </Link>
            <span>/</span>
            <span className="truncate font-extrabold text-ink">{trv(place.name)}</span>
          </div>

          {canManage ? (
            <button
              type="button"
              onClick={() => setManageOpen((v) => !v)}
              className="btn py-2 text-xs font-extrabold shadow-xs sm:text-sm"
            >
              <ShieldCheck className="size-4" aria-hidden />
              {manageOpen
                ? tr("إغلاق لوحة إشراف المحل")
                : tr("🛠️ إدارة المحل (اللوجو · المنتجات · العروض)")}
            </button>
          ) : null}
        </div>

        {/* Supervisor / Admin In-Page Management Panel */}
        {canManage && manageOpen ? (
          <section className="stamp border-2 border-primary bg-gradient-to-b from-primary-soft/60 via-paper to-paper p-4 sm:p-5 shadow-md space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#16A34A]/15 px-3 py-0.5 text-xs font-extrabold text-[#15803D]">
                  <ShieldCheck className="size-3.5" aria-hidden />
                  {isAdmin ? tr("صلاحية مدير الموقع") : tr("صلاحية مشرف المحل المعتمد")}
                </span>
                <h2 className="mt-1 text-lg font-extrabold text-ink">
                  🛠️ {tr("لوحة التحكم في صفحة المحل:")} {trv(place.name)}
                </h2>
              </div>
              {isAdmin ? (
                <Link to="/admin" className="btn btn-ghost py-1.5 text-xs font-extrabold">
                  {tr("فتح لوحة الإدارة الكاملة ↗")}
                </Link>
              ) : null}
            </div>

            {msg ? (
              <div className="rounded-2xl border border-primary bg-primary-soft/70 p-3 text-xs font-extrabold text-ink sm:text-sm">
                {msg}
              </div>
            ) : null}

            {/* Management Tabs */}
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-surface p-1.5">
              {[
                { id: "products" as const, label: "🛍️ إضافة منتجات", count: products.length },
                { id: "campaigns" as const, label: "📢 حملات العروض", count: hubCfg?.campaigns.length ?? 0 },
                { id: "profile" as const, label: "🖼️ اللوجو وبيانات المحل", count: null },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setManageTab(t.id)}
                  className={`press rounded-xl py-2.5 px-2 text-xs font-extrabold transition sm:text-sm ${
                    manageTab === t.id ? "bg-ink text-paper shadow-2xs" : "text-ink hover:bg-paper/70"
                  }`}
                >
                  {trv(t.label)}{" "}
                  {t.count !== null ? (
                    <span className="ms-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-extrabold text-ink">
                      {t.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            {/* Manage Tab 1: Products */}
            {manageTab === "products" ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-line bg-paper p-3.5 space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink sm:text-base">
                    <PackagePlus className="size-5 text-primary-ink" aria-hidden />
                    {prodId ? tr("تعديل المنتج") : tr("إضافة منتج جديد لصفحة المحل")}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-muted">{tr("اسم المنتج *")}</label>
                      <input
                        className="field"
                        value={prodName}
                        onChange={(e) => setProdName(e.target.value)}
                        placeholder={tr("مثال: وجبة شاورما عائلي / عطر فاخر / فستان...")}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-xs font-bold text-muted">{tr("السعر الحالي")}</label>
                        <input
                          className="field"
                          value={prodPrice}
                          onChange={(e) => setProdPrice(e.target.value)}
                          placeholder="45 ₪"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-muted">{tr("السعر قبل الخصم (اختياري)")}</label>
                        <input
                          className="field"
                          value={prodOldPrice}
                          onChange={(e) => setProdOldPrice(e.target.value)}
                          placeholder="65 ₪"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-muted">{tr("شارة المنتج (اختياري)")}</label>
                      <input
                        className="field"
                        value={prodBadge}
                        onChange={(e) => setProdBadge(e.target.value)}
                        placeholder={tr("عرض خاص / جديد / الأكثر طلباً")}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-muted">{tr("صورة المنتج")}</label>
                      <div className="flex items-center gap-2">
                        <label className="btn btn-ghost flex-1 cursor-pointer py-2 text-xs font-extrabold">
                          <ImagePlus className="size-4" aria-hidden />
                          {prodImgKey ? tr("تغيير صورة المنتج") : tr("رفع صورة المنتج")}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={busy}
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              const k = await uploadShopAsset(f);
                              if (k) setProdImgKey(k);
                            }}
                          />
                        </label>
                        {prodImgKey ? (
                          <img
                            src={shopImgSrc(prodImgKey)}
                            alt=""
                            className="size-10 rounded-xl border border-line object-cover"
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-muted">{tr("وصف مختصر للمنتج (اختياري)")}</label>
                    <textarea
                      className="field min-h-16"
                      value={prodDesc}
                      onChange={(e) => setProdDesc(e.target.value)}
                      placeholder={tr("تفاصيل المنتج أو الأحجام المتوفرة...")}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs font-extrabold">
                      <input
                        type="checkbox"
                        checked={prodInStock}
                        onChange={(e) => setProdInStock(e.target.checked)}
                        className="size-4 accent-primary"
                      />
                      {tr("المنتج متوفر حالياً")}
                    </label>
                    <div className="flex gap-2">
                      {prodId ? (
                        <button
                          type="button"
                          onClick={() => {
                            setProdId("");
                            setProdName("");
                            setProdPrice("");
                            setProdOldPrice("");
                            setProdDesc("");
                            setProdImgKey("");
                          }}
                          className="btn btn-ghost py-2 text-xs font-extrabold"
                        >
                          {tr("إلغاء التعديل")}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={saveProduct}
                        className="btn py-2 px-5 text-xs font-extrabold"
                      >
                        {prodId ? tr("حفظ تعديل المنتج") : tr("+ إضافة المنتج للمحل")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Manage Tab 2: Promotional Campaigns & Offer Ads */}
            {manageTab === "campaigns" ? (
              <div className="rounded-2xl border border-line bg-paper p-3.5 space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink sm:text-base">
                  <Megaphone className="size-5 text-alert" aria-hidden />
                  {campId
                    ? tr("تعديل إعلان العروض")
                    : tr("إضافة إعلان للمنتجات أو حملة عروض وتخفيضات")}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-muted">
                      {tr("عنوان الإعلان أو حملة العروض *")}
                    </label>
                    <input
                      className="field"
                      value={campTitle}
                      onChange={(e) => setCampTitle(e.target.value)}
                      placeholder={tr("مثال: حملة تخفيضات نهاية الأسبوع في محلنا!")}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-muted">
                        {tr("شارة الخصم / الحملة")}
                      </label>
                      <input
                        className="field"
                        value={campBadge}
                        onChange={(e) => setCampBadge(e.target.value)}
                        placeholder={tr("🔥 خصم 30% / حملة عروض")}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-muted">
                        {tr("مدة سريان العرض")}
                      </label>
                      <input
                        className="field"
                        value={campValid}
                        onChange={(e) => setCampValid(e.target.value)}
                        placeholder={tr("حتى يوم الخميس / كمية محدودة")}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">
                    {tr("تفاصيل الإعلان أو المنتجات المشمولة بالحملة")}
                  </label>
                  <textarea
                    className="field min-h-20"
                    value={campSubtitle}
                    onChange={(e) => setCampSubtitle(e.target.value)}
                    placeholder={tr("اكتب تفاصيل العرض أو الأسعار الخاصة للزبائن...")}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <label className="btn btn-ghost cursor-pointer py-2 text-xs font-extrabold">
                      <ImagePlus className="size-4" aria-hidden />
                      {campImgKey ? tr("تغيير صورة الإعلان/البانر") : tr("رفع صورة بوستر الإعلان")}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={busy}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const k = await uploadShopAsset(f);
                          if (k) setCampImgKey(k);
                        }}
                      />
                    </label>
                    {campImgKey ? (
                      <img
                        src={shopImgSrc(campImgKey)}
                        alt=""
                        className="size-10 rounded-xl border border-line object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 text-xs font-extrabold">
                      <input
                        type="checkbox"
                        checked={campActive}
                        onChange={(e) => setCampActive(e.target.checked)}
                        className="size-4 accent-primary"
                      />
                      {tr("الحملة فعّالة وظاهرة للزوار")}
                    </label>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={saveCampaign}
                      className="btn py-2 px-5 text-xs font-extrabold"
                    >
                      {campId ? tr("حفظ تعديل الحملة") : tr("📢 نشر حملة العروض")}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Manage Tab 3: Shop Logo & Profile Info */}
            {manageTab === "profile" ? (
              <div className="rounded-2xl border border-line bg-paper p-3.5 space-y-3">
                <h3 className="text-sm font-extrabold text-ink sm:text-base">
                  🖼️ {tr("تحديث لوجو المحل والبيانات الأساسية")}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface/60 p-3">
                    {logoKey ? (
                      <img
                        src={shopImgSrc(logoKey)}
                        alt="Logo"
                        className="size-16 shrink-0 rounded-2xl border-2 border-primary bg-paper object-cover"
                      />
                    ) : (
                      <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary-soft">
                        <Store className="size-8 text-primary-ink" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-xs font-extrabold text-ink">{tr("لوجو المحل (شعار المحل)")}</p>
                      <label className="btn inline-flex cursor-pointer py-1.5 px-3 text-xs font-extrabold">
                        <ImagePlus className="size-4" aria-hidden />
                        {logoKey ? tr("تغيير اللوجو") : tr("رفع لوجو المحل")}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={busy}
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const k = await uploadShopAsset(f, "logoKey");
                            if (k) setLogoKey(k);
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface/60 p-3">
                    {coverKey ? (
                      <img
                        src={shopImgSrc(coverKey)}
                        alt="Cover"
                        className="h-16 w-24 shrink-0 rounded-2xl border border-line bg-paper object-cover"
                      />
                    ) : (
                      <span className="grid h-16 w-24 shrink-0 place-items-center rounded-2xl bg-surface text-xs font-bold text-muted">
                        {tr("غلاف")}
                      </span>
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-xs font-extrabold text-ink">{tr("صورة غلاف المحل (اختياري)")}</p>
                      <label className="btn btn-ghost inline-flex cursor-pointer py-1.5 px-3 text-xs font-extrabold">
                        <ImagePlus className="size-4" aria-hidden />
                        {coverKey ? tr("تغيير الغلاف") : tr("رفع صورة غلاف")}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={busy}
                          onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const k = await uploadShopAsset(f, "coverKey");
                            if (k) setCoverKey(k);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-muted">{tr("اسم المحل")}</label>
                    <input
                      className="field"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-muted">{tr("التصنيف")}</label>
                    <select
                      className="field"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                    >
                      {ownerCategories.map((c) => (
                        <option key={c} value={c}>
                          {trv(c)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-muted">{tr("الحي / العنوان في رهط")}</label>
                    <input
                      className="field"
                      value={customAddress || customArea}
                      onChange={(e) => {
                        setCustomAddress(e.target.value);
                        setCustomArea(e.target.value);
                      }}
                      placeholder={tr("مثال: المركز التجاري / حي السلام / شارع صلاح الدين")}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-muted">{tr("رقم الهاتف")}</label>
                    <input
                      className="field"
                      dir="ltr"
                      value={customPhone}
                      onChange={(e) => setCustomPhone(e.target.value)}
                      placeholder="050-0000000"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-muted">{tr("رقم واتساب الطلبات")}</label>
                    <input
                      className="field"
                      dir="ltr"
                      value={customWhatsapp}
                      onChange={(e) => setCustomWhatsapp(e.target.value)}
                      placeholder="050-0000000"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-muted">{tr("ساعات العمل")}</label>
                    <input
                      className="field"
                      value={customHours}
                      onChange={(e) => setCustomHours(e.target.value)}
                      placeholder={tr("يومياً 09:00–22:00")}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-muted">{tr("نبذة ووصف المحل")}</label>
                  <textarea
                    className="field min-h-20"
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    placeholder={tr("اكتب نبذة مميزة عن المحل والخدمات والمنتجات التي يقدمها...")}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={saveProfile}
                    className="btn py-2.5 px-6 text-xs font-extrabold sm:text-sm"
                  >
                    💾 {tr("حفظ لوجو وبيانات المحل")}
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Modern Shop Hero Card */}
        <article className="stamp overflow-hidden border-2 border-line bg-paper p-0 shadow-sm">
          {/* Top Cover Banner */}
          <div className="relative h-36 w-full bg-gradient-to-l from-[#111827] via-[#1e293b] to-[#0f172a] sm:h-48">
            {effectiveCover ? (
              <img
                src={shopImgSrc(effectiveCover)}
                alt={place.name}
                onClick={() => setLightboxImg(shopImgSrc(effectiveCover))}
                className="h-full w-full cursor-zoom-in object-cover opacity-90"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-between px-6 opacity-20">
                <Store className="size-24 text-primary" aria-hidden />
                <Sparkles className="size-16 text-white" aria-hidden />
              </div>
            )}
            <div className="absolute top-3 start-3 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-paper/95 px-3 py-1 text-xs font-extrabold text-ink shadow-xs backdrop-blur-xs">
                {trv(place.category)}
              </span>
              {place.verified || hubCfg?.verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-ink shadow-xs">
                  <BadgeCheck className="size-3.5" aria-hidden />
                  {tr("محل موثّق")}
                </span>
              ) : null}
              {hubCfg?.supervisorName ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#16A34A] px-3 py-1 text-xs font-extrabold text-white shadow-xs">
                  <ShieldCheck className="size-3.5" aria-hidden />
                  {tr("إشراف:")} {hubCfg.supervisorName}
                </span>
              ) : null}
            </div>
          </div>

          {/* Shop Logo + Identity Body */}
          <div className="px-4 pb-5 pt-0 sm:px-6">
            <div className="-mt-10 flex flex-wrap items-end justify-between gap-4 sm:-mt-12">
              <div className="flex items-end gap-3.5">
                {effectiveLogo ? (
                  <button
                    type="button"
                    onClick={() => setLightboxImg(shopImgSrc(effectiveLogo))}
                    className="group relative size-20 shrink-0 overflow-hidden rounded-3xl border-4 border-paper bg-paper shadow-lg sm:size-24"
                  >
                    <img
                      src={shopImgSrc(effectiveLogo)}
                      alt={tr("لوجو {0}", place.name)}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </button>
                ) : (
                  <span className="grid size-20 shrink-0 place-items-center rounded-3xl border-4 border-paper bg-primary-soft text-primary-ink shadow-lg sm:size-24">
                    <CategoryIcon category={place.category} className="size-10" />
                  </span>
                )}

                <div className="pt-2">
                  <h1 className="text-xl font-extrabold leading-tight text-ink sm:text-2xl">
                    {trv(place.name)}
                  </h1>
                  {place.altName ? (
                    <p className="text-xs font-bold text-muted sm:text-sm">{trv(place.altName)}</p>
                  ) : null}
                  {place.address || place.area ? (
                    <p className="mt-1 flex items-center gap-1 text-xs font-bold text-muted sm:text-sm">
                      <MapPin className="size-4 shrink-0 text-primary-ink" aria-hidden />
                      <span>{trv(place.address || place.area || "")}</span>
                    </p>
                  ) : null}
                </div>
              </div>

              {place.openingHours ? (
                <div className="rounded-2xl border border-line bg-surface/80 px-3 py-1.5 text-xs font-extrabold text-ink">
                  <Clock className="me-1 inline size-3.5 text-primary-ink" aria-hidden />
                  {tr("ساعات العمل:")}{" "}
                  <span dir="ltr" className="text-primary-ink">
                    {trv(place.openingHours)}
                  </span>
                </div>
              ) : null}
            </div>

            {place.description ? (
              <p className="mt-4 rounded-2xl bg-surface/60 p-3.5 text-sm font-semibold leading-relaxed text-ink sm:text-base">
                {trv(place.description)}
              </p>
            ) : null}

            {/* Action Buttons Row */}
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {place.phone ? (
                <RevealPhone phone={place.phone} />
              ) : (
                <a
                  href={mapsUrl(place)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn py-2.5 text-xs font-extrabold sm:text-sm"
                >
                  <MapPin className="size-4" aria-hidden />
                  {tr("الموقع على الخريطة")}
                </a>
              )}

              {waNum ? (
                <a
                  className="btn bg-[#16A34A] text-white hover:bg-[#15803D] py-2.5 text-xs font-extrabold sm:text-sm"
                  href={`https://wa.me/${waNum}?text=${encodeURIComponent(`مرحباً ${place.name}، تواصلت معكم عبر دليل محلات رهط بوست`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  💬 {tr("واتساب المحل")}
                </a>
              ) : null}

              <a
                className="btn btn-ghost py-2.5 text-xs font-extrabold sm:text-sm"
                href={mapsUrl(place)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MapPin className="size-4" aria-hidden />
                {tr("الاتجاهات للفرع")}
              </a>

              {place.website ? (
                <a
                  className="btn btn-ghost py-2.5 text-xs font-extrabold sm:text-sm"
                  href={place.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Globe className="size-4" aria-hidden />
                  {tr("الموقع الإلكتروني")}
                </a>
              ) : null}
            </div>
          </div>
        </article>

        {/* SECTION 1: Promotional Campaigns & Offer Ads */}
        {activeCampaigns.length > 0 ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink sm:text-xl">
                <span className="grid size-9 place-items-center rounded-xl bg-alert/10 text-alert">
                  <Flame className="size-5" aria-hidden />
                </span>
                {tr("إعلانات وحملات العروض في")} {trv(place.name)}
              </h2>
              <span className="rounded-full bg-alert/10 px-3 py-1 text-xs font-extrabold text-alert">
                {trv(activeCampaigns.length)} {tr("عروض فعّالة")}
              </span>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              {activeCampaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="stamp relative overflow-hidden border-2 border-primary bg-gradient-to-br from-primary-soft/80 via-paper to-paper p-4 shadow-sm"
                >
                  {camp.imageKey ? (
                    <button
                      type="button"
                      onClick={() => setLightboxImg(shopImgSrc(camp.imageKey!))}
                      className="-mx-4 -mt-4 mb-3 block h-44 w-[calc(100%+2rem)] overflow-hidden bg-surface"
                    >
                      <img
                        src={shopImgSrc(camp.imageKey)}
                        alt={camp.title}
                        className="h-full w-full object-cover transition hover:scale-105"
                      />
                    </button>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-alert px-3 py-1 text-xs font-extrabold text-white shadow-2xs">
                      {trv(camp.discountBadge)}
                    </span>
                    {camp.validUntil ? (
                      <span className="rounded-lg bg-surface px-2.5 py-0.5 text-[11px] font-bold text-muted">
                        ⏳ {trv(camp.validUntil)}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-2.5 text-base font-extrabold text-ink sm:text-lg">
                    {trv(camp.title)}
                  </h3>
                  {camp.subtitle ? (
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-ink/85 sm:text-sm">
                      {trv(camp.subtitle)}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line/70">
                    {waNum ? (
                      <a
                        href={`https://wa.me/${waNum}?text=${encodeURIComponent(`مرحباً ${place.name}، أود الاستفادة من عرض: ${camp.title} (${camp.discountBadge})`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn py-1.5 px-4 text-xs font-extrabold"
                      >
                        💬 {tr("اطلب العرض الآن عبر واتساب")}
                      </a>
                    ) : place.phone ? (
                      <a href={`tel:${place.phone}`} className="btn py-1.5 px-4 text-xs font-extrabold">
                        <Phone className="size-3.5" aria-hidden />
                        {tr("اتصل للاستفادة من العرض")}
                      </a>
                    ) : null}

                    {canManage ? (
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setManageOpen(true);
                            setManageTab("campaigns");
                            setCampId(camp.id);
                            setCampTitle(camp.title);
                            setCampSubtitle(camp.subtitle);
                            setCampBadge(camp.discountBadge);
                            setCampValid(camp.validUntil || "");
                            setCampImgKey(camp.imageKey || "");
                            setCampActive(camp.active);
                          }}
                          className="btn btn-ghost py-1 px-2.5 text-xs font-bold"
                        >
                          {tr("تعديل")}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCampaign(camp.id)}
                          className="btn btn-ghost py-1 px-2.5 text-xs font-bold text-alert"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* SECTION 2: Shop Products Catalog */}
        {products.length > 0 ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink sm:text-xl">
                <span className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary-ink">
                  <ShoppingBag className="size-5" aria-hidden />
                </span>
                {tr("منتجات")} {trv(place.name)}
              </h2>
              <span className="rounded-full bg-surface px-3 py-1 text-xs font-extrabold text-ink">
                {trv(products.length)} {tr("منتج")}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className="stamp flex flex-col justify-between overflow-hidden border border-line bg-paper p-3 transition hover:border-primary"
                >
                  <div>
                    <div className="relative mb-2.5 aspect-square w-full overflow-hidden rounded-2xl bg-surface">
                      {prod.imageKey ? (
                        <img
                          src={shopImgSrc(prod.imageKey)}
                          alt={prod.name}
                          onClick={() => setLightboxImg(shopImgSrc(prod.imageKey!))}
                          className="h-full w-full cursor-zoom-in object-cover transition hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-muted">
                          <ShoppingBag className="size-10 opacity-40" aria-hidden />
                        </div>
                      )}
                      {prod.badge ? (
                        <span className="absolute top-2 start-2 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-extrabold text-ink shadow-xs">
                          {trv(prod.badge)}
                        </span>
                      ) : null}
                      {prod.inStock === false ? (
                        <span className="absolute top-2 end-2 rounded-full bg-ink/80 px-2 py-0.5 text-[10px] font-extrabold text-white">
                          {tr("نفد")}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="line-clamp-2 text-sm font-extrabold text-ink sm:text-base">
                      {trv(prod.name)}
                    </h3>
                    {prod.description ? (
                      <p className="mt-1 line-clamp-2 text-xs font-semibold text-muted">
                        {trv(prod.description)}
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-3 pt-2 border-t border-line/70 space-y-2">
                    {prod.price ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-base font-extrabold text-primary-ink">
                          {trv(prod.price)}
                        </span>
                        {prod.oldPrice ? (
                          <span className="text-xs font-bold text-muted line-through">
                            {trv(prod.oldPrice)}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    {waNum ? (
                      <a
                        href={`https://wa.me/${waNum}?text=${encodeURIComponent(`مرحباً ${place.name}، أريد طلب المنتج: ${prod.name}${prod.price ? ` (${prod.price})` : ""}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn w-full py-2 text-xs font-extrabold"
                      >
                        💬 {tr("اطلب المنتج")}
                      </a>
                    ) : place.phone ? (
                      <a
                        href={`tel:${place.phone}`}
                        className="btn btn-ghost w-full py-2 text-xs font-extrabold"
                      >
                        📞 {tr("اتصل للطلب")}
                      </a>
                    ) : null}

                    {canManage ? (
                      <div className="flex gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setManageOpen(true);
                            setManageTab("products");
                            setProdId(prod.id);
                            setProdName(prod.name);
                            setProdPrice(prod.price);
                            setProdOldPrice(prod.oldPrice || "");
                            setProdBadge(prod.badge || "");
                            setProdDesc(prod.description || "");
                            setProdImgKey(prod.imageKey || "");
                            setProdInStock(prod.inStock !== false);
                          }}
                          className="btn btn-ghost flex-1 py-1 text-[11px] font-bold"
                        >
                          {tr("تعديل")}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteProduct(prod.id)}
                          className="btn btn-ghost py-1 px-2.5 text-[11px] font-bold text-alert"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Empty State Prompt for Supervisor when no products/campaigns yet */}
        {canManage && products.length === 0 && activeCampaigns.length === 0 && !manageOpen ? (
          <div className="stamp border-2 border-dashed border-primary bg-primary-soft/30 p-5 text-center space-y-2">
            <p className="text-base font-extrabold text-ink">
              ✨ {tr("أنت مشرف هذا المحل! يمكنك الآن إضافة اللوجو والمنتجات وحملات العروض.")}
            </p>
            <button
              type="button"
              onClick={() => setManageOpen(true)}
              className="btn py-2 px-5 text-xs font-extrabold sm:text-sm"
            >
              🛠️ {tr("ابدأ بإضافة منتجات وعروض المحل الآن")}
            </button>
          </div>
        ) : null}

        {guidesForPlace(place.slug).map((g) => (
          <div key={g.slug}>
            <GuideCard guide={g} />
          </div>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          {place.source === "osm" && !canManage ? (
            <Link
              to="/submit"
              search={{ mode: "نشاط", name: place.name }}
              className="btn btn-ghost text-xs font-extrabold"
            >
              🏪 {tr("هل أنت صاحب هذا المحل؟ اطلب توثيقه وإدارته")}
            </Link>
          ) : null}
          {place.osm ? (
            <a
              className="inline-flex items-center gap-1 text-xs font-bold text-muted underline decoration-1 underline-offset-4"
              href={place.osm}
              target="_blank"
              rel="noopener noreferrer"
            >
              {tr("عرض الموقع في OpenStreetMap")}
              <ExternalLink className="size-3" aria-hidden />
            </a>
          ) : null}
        </div>

        {place.source === "osm" ? <OsmCredit /> : null}
        {place.source === "owner" ? (
          <ReportButton type="business" id={place.slug.replace(/^biz-/, "")} />
        ) : null}
      </div>
    </Shell>
  );
}
