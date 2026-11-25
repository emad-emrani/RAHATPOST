import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Crown,
  ExternalLink,
  Flame,
  LayoutGrid,
  Megaphone,
  MessageCircle,
  Package,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { HomePostCard } from "@/components/guide";
import { Shell } from "@/components/shell";
import {
  ProductCard,
  SectionCover,
  SectionTile,
  StoreFooterLinks,
} from "@/components/store-parts";
import { getGuide } from "@/data/guides";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { tr, trv } from "@/lib/i18n/core";
import { localized } from "@/lib/i18n/localize";
import { getHarajCategories } from "@/lib/market/api";
import { catName, type HarajCategory } from "@/lib/market/categories";
import { mediaUrl } from "@/lib/media/types";
import { seo } from "@/lib/seo";
import { getStore } from "@/lib/store/api";
import { cartCount, useCart } from "@/lib/store/cart";
import {
  formatPrice,
  waDigits,
  type Currency,
  type PublicProduct,
} from "@/lib/store/types";
import { adminWhoami } from "@/lib/team/api";

const postGuide = getGuide("post");

type StoreSecView = "all" | "store" | "packages" | "merchants";

type MerchantPromoOffer = {
  id: string;
  title: string;
  merchantName: string;
  greenRibbonText: string;
  priceLabelText: string;
  targetUrl: string;
  imageKey: string | null;
};

type VipPackageConfig = {
  badge: string;
  title: string;
  price: string;
  desc: string;
  perks: string[];
  customUrl?: string;
  featured?: boolean;
};

const DEFAULT_VIP_PACKAGES: VipPackageConfig[] = [
  {
    badge: "⭐ للأفراد والتجار",
    title: "تثبيت إعلان VIP في الصدارة",
    price: "₪29 / أسبوع",
    desc: "يثبّت إعلانك في أعلى الحراج وفي الصفحة الرئيسية مع إطار ذهبي مميز.",
    perks: [
      "ظهور في أول الصفوف لمدة 7 أيام",
      "شارة «إعلان مميز VIP»",
      "أولوية في نتائج البحث",
    ],
  },
  {
    badge: "🏪 للمحلات والتجار",
    title: "عضوية «متجر / تاجر موثّق ✓»",
    price: "₪99 / شهرياً",
    desc: "ظهور دائم لعروض محلك في «قسم عروض المتاجر الموثّقة» في أعلى الصفحة مع شارة التوثيق الخضراء.",
    perks: [
      "شارة «تاجر موثّق ✓» قابلة للتخصيص",
      "عرض إعلاني برابط مخصّص لمحلك أو واتسابك",
      "توهّج قسم العروض بالأصفر في الحراج",
    ],
    featured: true,
  },
  {
    badge: "🚀 للمعارض والشركات",
    title: "باقة المعارض والوكالات الذهبية",
    price: "₪199 / شهرياً",
    desc: "لمعارض السيارات، مكاتب العقارات، ومحلات الإلكترونيات والأثاث الكبرى في رهط والنقب.",
    perks: [
      "نشر عروض إعلانية غير محدودة شهرياً",
      "تثبيت 3 عروض VIP في نفس الوقت",
      "دعم مباشر وتصميم بطاقة المتجر",
    ],
  },
];

function parseHubData(
  allProducts: PublicProduct[],
  currency: Currency = "ILS",
) {
  const cfgRow = allProducts.find((p) => p.slug === "hub-cfg-main");
  let greenSectionTitle = "عروض المتاجر وتجار رهط الموثّقين";
  let greenBadgeDefault = "عرض تاجر موثّق ✓";
  let merchantUsers: string[] = [];
  let vipPackages: VipPackageConfig[] = DEFAULT_VIP_PACKAGES;

  if (cfgRow?.description) {
    try {
      const parsed = JSON.parse(cfgRow.description) as {
        greenSectionTitle?: string;
        greenBadgeDefault?: string;
        merchantUsers?: string[];
        vipPackages?: VipPackageConfig[];
      };
      if (parsed.greenSectionTitle?.trim()) {
        greenSectionTitle = parsed.greenSectionTitle.trim();
      }
      if (parsed.greenBadgeDefault?.trim()) {
        greenBadgeDefault = parsed.greenBadgeDefault.trim();
      }
      if (Array.isArray(parsed.merchantUsers)) {
        merchantUsers = parsed.merchantUsers.map((x) =>
          String(x).trim().toLowerCase(),
        );
      }
      if (Array.isArray(parsed.vipPackages) && parsed.vipPackages.length > 0) {
        vipPackages = parsed.vipPackages;
      }
    } catch {
      /* ignore invalid json */
    }
  }

  const promoOffers: MerchantPromoOffer[] = allProducts
    .filter((p) => p.slug.startsWith("offer-"))
    .map((p) => ({
      id: p.id,
      title: p.name,
      merchantName: p.description?.trim() || "متجر معتمد في رهط",
      greenRibbonText: p.badges?.[0]?.trim() || greenBadgeDefault,
      priceLabelText:
        p.badges?.[1]?.trim() ||
        (p.priceAgorot > 0
          ? formatPrice(p.saleAgorot ?? p.priceAgorot, currency)
          : ""),
      targetUrl: p.shortDesc?.trim() || "/store",
      imageKey: p.imageKey,
    }));

  const storeProducts = allProducts.filter(
    (p) =>
      p.slug !== "hub-cfg-main" &&
      !p.slug.startsWith("offer-") &&
      !p.slug.startsWith("vip-pkg-"),
  );

  return {
    greenSectionTitle,
    greenBadgeDefault,
    merchantUsers,
    vipPackages,
    promoOffers,
    storeProducts,
  };
}

export const Route = createFileRoute("/store/")({
  head: () =>
    seo({
      title: tr("متجر رهط بوست وسوق التجار الموثّقين | رهط بوست"),
      description: tr(
        "متجر رهط بوست وسوق التجار الموثّقين: عروض المتاجر الموثّقة، المتجر الرسمي للاشتراكات والمنتجات الرقمية الفورية، وحراج الأهالي.",
      ),
      path: "/store",
    }),
  loader: async () => {
    const [rawStore, harajCats] = await Promise.all([
      getStore(),
      getHarajCategories().catch(() => [] as HarajCategory[]),
    ]);
    const store = await localized(rawStore, (d) => [
      { items: d.products, fields: ["name", "shortDesc", "description"] },
      { items: d.categories, fields: ["name", "description"] },
    ]);
    return {
      ...store,
      harajCats,
    };
  },
  headers: () => ({
    "Cache-Control":
      "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  }),
  component: StorePage,
});

/** Horizontal moving/scrollable square product slider used in the Overview Hub. */
function HorizontalProductSlider({
  products,
  currency,
}: {
  products: PublicProduct[];
  currency: Currency;
}) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);

  const scrollByDir = (dir: -1 | 1) => {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 260, behavior: "smooth" });
  };

  useEffect(() => {
    if (paused || products.length <= 2) return;
    const id = setInterval(() => {
      const el = rowRef.current;
      if (!el) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 10) return;
      if (Math.abs(el.scrollLeft) >= maxScroll - 20) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: -240, behavior: "smooth" });
      }
    }, 3800);
    return () => clearInterval(id);
  }, [paused, products.length]);

  if (products.length === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="text-xs font-extrabold text-muted">
          {tr("منتجات المتجر الرسمي (سلايدر أفقي متحرك):")}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scrollByDir(1)}
            className="grid size-8 place-items-center rounded-full border border-line bg-surface text-ink shadow-2xs hover:bg-primary"
            aria-label={tr("السابق")}
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => scrollByDir(-1)}
            className="grid size-8 place-items-center rounded-full border border-line bg-surface text-ink shadow-2xs hover:bg-primary"
            aria-label={tr("التالي")}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div
        ref={rowRef}
        className="scroll-row -mx-2 gap-3 px-2 pb-2"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {products.map((p) => (
          <div
            key={p.id}
            className="w-52 shrink-0 sm:w-60"
            style={{ scrollSnapAlign: "start" }}
          >
            <ProductCard p={p} currency={currency} />
          </div>
        ))}
      </div>
    </div>
  );
}

function StorePage() {
  const { products: rawProducts, categories, settings, ok, harajCats } =
    Route.useLoaderData();
  const navigate = useNavigate();
  const { user } = useCurrentUserState();
  const cartItemsCount = cartCount(useCart());
  const [activeView, setActiveView] = useState<StoreSecView>("all");
  const [selectedCatId, setSelectedCatId] = useState<string>("all");
  const [isAdminOrMerchantRole, setIsAdminOrMerchantRole] = useState(false);

  const {
    greenSectionTitle,
    merchantUsers,
    vipPackages,
    promoOffers,
    storeProducts,
  } = useMemo(
    () => parseHubData(rawProducts ?? [], settings?.currency ?? "ILS"),
    [rawProducts, settings?.currency],
  );

  // Check if current logged-in user is Owner/Admin or has Merchant role/permission
  useEffect(() => {
    if (!user) {
      setIsAdminOrMerchantRole(false);
      return;
    }
    void adminWhoami()
      .then((me) => {
        if (
          me.level === "owner" ||
          me.level === "moderator" ||
          me.perms.includes("verified_badge") ||
          me.perms.includes("auto_approve")
        ) {
          setIsAdminOrMerchantRole(true);
        }
      })
      .catch(() => {});
  }, [user]);

  const hasMerchantPermission = useMemo(() => {
    if (!user) return false;
    if (isAdminOrMerchantRole) return true;
    const uid = user.id.trim().toLowerCase();
    const uemail = (user.email ?? "").trim().toLowerCase();
    return (
      merchantUsers.includes(uid) ||
      (Boolean(uemail) && merchantUsers.includes(uemail))
    );
  }, [user, isAdminOrMerchantRole, merchantUsers]);

  const topCategories = useMemo(
    () => categories.filter((c) => !c.parentId && c.active),
    [categories],
  );

  const hasActiveOffers = promoOffers.length > 0;
  const storeWaPhone = settings?.whatsapp ? waDigits(settings.whatsapp) : "";

  const makePackageUrl = (pkg: VipPackageConfig) => {
    if (pkg.customUrl?.trim()) return pkg.customUrl.trim();
    const text = `مرحباً إدارة رهط بوست، أرغب بتفعيل باقة التاجر: «${pkg.title}» (${pkg.price}).`;
    if (storeWaPhone) {
      return `https://wa.me/${storeWaPhone}?text=${encodeURIComponent(text)}`;
    }
    return `/haraj/new`;
  };

  return (
    <Shell wide>
      {/* ======================================================================= */}
      {/* TOP HEADER: Profile Avatar + Cart + My Orders + Circular Horizontal Bar */}
      {/* ======================================================================= */}
      <div className="mb-6 rounded-3xl border border-line bg-paper p-4 shadow-2xs sm:p-5">
        {/* Row 1: User Profile Picture + Title + Cart & My Orders Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/my-orders"
                className="group relative shrink-0"
                title={user.displayName}
              >
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.displayName}
                    referrerPolicy="no-referrer"
                    className="size-13 rounded-full border-2 border-primary object-cover shadow-xs transition group-hover:scale-105"
                  />
                ) : (
                  <span className="grid size-13 place-items-center rounded-full border-2 border-primary bg-primary/25 text-lg font-extrabold text-ink shadow-xs">
                    {user.displayName.slice(0, 1)}
                  </span>
                )}
                {hasMerchantPermission ? (
                  <span
                    className="absolute -bottom-1 -end-1 grid size-5 place-items-center rounded-full bg-[#16A34A] text-white shadow-2xs"
                    title={tr("مشترك بصلاحية تاجر معتمد")}
                  >
                    <BadgeCheck className="size-3.5" aria-hidden />
                  </span>
                ) : null}
              </Link>
            ) : (
              <Link
                to="/login"
                search={{ redirect: "/store" }}
                className="grid size-13 shrink-0 place-items-center rounded-full border-2 border-dashed border-line bg-surface text-muted transition hover:border-primary hover:text-ink"
                title={tr("تسجيل الدخول")}
              >
                <UserRound className="size-6" aria-hidden />
              </Link>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-extrabold sm:text-2xl">
                  {tr("متجر رهط بوست وسوق التجار الموثّقين")}
                </h1>
                {hasMerchantPermission ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#16A34A]/15 px-2.5 py-0.5 text-[11px] font-extrabold text-[#16A34A]">
                    <Crown className="size-3.5" aria-hidden />
                    {tr("حساب تاجر معتمد ✓")}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs font-semibold text-muted">
                {user
                  ? `${tr("أهلاً بك،")} ${user.displayName}`
                  : tr("تصفّح عروض المتاجر الموثّقة، المتجر الرسمي، وحراج الأهالي")}
              </p>
            </div>
          </div>

          {/* Cart & My Orders prominent action pills */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/cart"
              className="btn relative flex items-center gap-1.5 px-4 py-2.5 text-xs font-extrabold"
            >
              <ShoppingCart className="size-4" aria-hidden />
              <span>{tr("سلة المشتريات")}</span>
              {cartItemsCount > 0 ? (
                <span className="ms-1 grid min-w-5 place-items-center rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-extrabold text-paper">
                  {cartItemsCount}
                </span>
              ) : null}
            </Link>
            <Link
              to="/my-orders"
              className="inline-flex items-center gap-1.5 rounded-2xl border-2 border-ink/15 bg-surface px-4 py-2.5 text-xs font-extrabold text-ink transition hover:border-primary hover:bg-primary/20"
            >
              <Package className="size-4 text-primary-ink" aria-hidden />
              <span>{tr("طلباتي")}</span>
            </Link>
          </div>
        </div>

        {/* Row 2: Horizontal Circular Navigation Bar (بشكل دائري أفقي) */}
        <div className="mt-4 border-t border-line pt-4">
          <div className="scroll-row -mx-2 gap-4 px-2 pb-1 sm:justify-center sm:gap-6">
            {/* Circle 0: عرض كل الأقسام (مفصولة) */}
            <button
              type="button"
              onClick={() => setActiveView("all")}
              className="group flex shrink-0 flex-col items-center gap-1.5"
            >
              <span
                className={`grid size-16 place-items-center rounded-full border-2 text-2xl transition ${
                  activeView === "all"
                    ? "border-ink bg-ink text-paper shadow-md scale-105"
                    : "border-line bg-surface text-ink group-hover:border-primary group-hover:bg-primary/20"
                }`}
              >
                📋
              </span>
              <span
                className={`text-center text-[11px] font-extrabold ${
                  activeView === "all" ? "text-ink" : "text-muted"
                }`}
              >
                {tr("عرض كل الأقسام")}
              </span>
            </button>

            {/* Circle 1: المتجر الرسمي */}
            <button
              type="button"
              onClick={() => setActiveView("store")}
              className="group flex shrink-0 flex-col items-center gap-1.5"
            >
              <span
                className={`grid size-16 place-items-center rounded-full border-2 text-2xl transition ${
                  activeView === "store"
                    ? "border-ink bg-primary text-ink shadow-md scale-105"
                    : "border-line bg-surface text-ink group-hover:border-primary group-hover:bg-primary/20"
                }`}
              >
                🛍️
              </span>
              <span
                className={`text-center text-[11px] font-extrabold ${
                  activeView === "store" ? "text-ink" : "text-muted"
                }`}
              >
                {tr("1. المتجر الرسمي")}
              </span>
            </button>

            {/* Circle 2: باقات التجار وتثبيت VIP — ONLY shown if logged-in subscriber has "صلاحية تاجر" */}
            {hasMerchantPermission ? (
              <button
                type="button"
                onClick={() => setActiveView("packages")}
                className="group flex shrink-0 flex-col items-center gap-1.5"
              >
                <span
                  className={`grid size-16 place-items-center rounded-full border-2 text-2xl transition ${
                    activeView === "packages"
                      ? "border-ink bg-primary text-ink shadow-md scale-105"
                      : "border-primary bg-primary/20 text-ink group-hover:bg-primary"
                  }`}
                >
                  👑
                </span>
                <span
                  className={`text-center text-[11px] font-extrabold ${
                    activeView === "packages" ? "text-ink" : "text-primary-ink"
                  }`}
                >
                  {tr("2. باقات التجار VIP")}
                </span>
              </button>
            ) : null}

            {/* Circle 3: عروض المتاجر الموثّقة */}
            <button
              type="button"
              onClick={() => setActiveView("merchants")}
              className="group relative flex shrink-0 flex-col items-center gap-1.5"
            >
              <span
                className={`relative grid size-16 place-items-center rounded-full border-2 text-2xl transition ${
                  activeView === "merchants"
                    ? "border-[#16A34A] bg-[#16A34A] text-white shadow-md scale-105"
                    : hasActiveOffers
                      ? "border-[#f2c94c] bg-[#f2c94c]/25 text-ink ring-4 ring-[#f2c94c]/55 shadow-[0_0_18px_rgba(242,201,76,0.85)]"
                      : "border-line bg-surface text-ink group-hover:border-[#16A34A]"
                }`}
              >
                🏪
                {hasActiveOffers ? (
                  <span className="absolute -top-1 -end-1 grid min-w-5 place-items-center rounded-full bg-[#16A34A] px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                    {promoOffers.length}
                  </span>
                ) : null}
              </span>
              <span
                className={`text-center text-[11px] font-extrabold ${
                  activeView === "merchants" ? "text-[#16A34A]" : "text-muted"
                }`}
              >
                {tr("3. عروض المتاجر")}
              </span>
            </button>

            {/* Circle 4: حراج الأفراد والمستعمل — Enters the dedicated Haraj page with circular categories */}
            <button
              type="button"
              onClick={() => void navigate({ to: "/haraj" })}
              className="group flex shrink-0 flex-col items-center gap-1.5"
            >
              <span className="grid size-16 place-items-center rounded-full border-2 border-line bg-surface text-2xl text-ink transition group-hover:scale-105 group-hover:border-ink group-hover:bg-ink group-hover:text-paper">
                📢
              </span>
              <span className="text-center text-[11px] font-extrabold text-muted group-hover:text-ink">
                {tr("4. حراج الأفراد")}
              </span>
            </button>
          </div>
        </div>
      </div>

      {!ok ? (
        <p className="stamp mb-4 p-3 font-bold">
          {tr("تعذّر تحميل المتجر الآن.")}
        </p>
      ) : null}

      <div className="space-y-8">
        {/* ===================================================================== */}
        {/* 1. FIRST AT TOP OF PAGE: عروض المتاجر وتجار رهط الموثّقين (عرض إعلاني) */}
        {/* ===================================================================== */}
        {activeView === "all" || activeView === "merchants" ? (
          <section
            id="section-merchant-ads-top"
            aria-label={trv(greenSectionTitle)}
            className="rounded-3xl border-2 border-[#16A34A]/50 bg-paper p-4 shadow-xs sm:p-6"
          >
            {/* Customizable Green Ribbon Bar */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#16A34A] px-4 py-3 text-white shadow-2xs">
              <div className="flex items-center gap-2.5">
                <Store className="size-5 shrink-0" aria-hidden />
                <div>
                  <h2 className="text-base font-extrabold sm:text-lg">
                    {trv(greenSectionTitle)}
                  </h2>
                  <p className="text-[11px] font-semibold text-white/85">
                    {tr("عروض إعلانية مباشرة من المتاجر والمحلات الموثّقة — اضغط على الإعلان للانتقال المباشر للعرض")}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-extrabold">
                {tr("إعلانات المتاجر الموثّقة ✓")}
              </span>
            </div>

            {promoOffers.length > 0 ? (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {promoOffers.map((offer) => {
                  const isExternal = /^https?:\/\//i.test(offer.targetUrl);
                  return (
                    <a
                      key={offer.id}
                      href={offer.targetUrl}
                      target={isExternal ? "_blank" : undefined}
                      rel={isExternal ? "noopener noreferrer" : undefined}
                      className="group flex flex-col overflow-hidden rounded-2xl border-2 border-[#16A34A]/35 bg-surface transition hover:-translate-y-0.5 hover:border-[#16A34A] hover:shadow-md"
                    >
                      {/* Custom Green Ribbon per Ad */}
                      <div className="flex items-center justify-between gap-2 bg-[#16A34A] px-3.5 py-1.5 text-xs font-extrabold text-white">
                        <span className="inline-flex items-center gap-1.5 truncate">
                          <BadgeCheck className="size-3.5 shrink-0" aria-hidden />
                          <span>{trv(offer.greenRibbonText)}</span>
                        </span>
                        {offer.priceLabelText ? (
                          <span className="shrink-0 rounded-lg bg-[#f2c94c] px-2 py-0.5 text-[11px] font-extrabold text-ink">
                            {trv(offer.priceLabelText)}
                          </span>
                        ) : null}
                      </div>

                      <div className="relative aspect-[16/9] w-full bg-paper">
                        {offer.imageKey ? (
                          <img
                            src={mediaUrl(offer.imageKey)}
                            alt={trv(offer.title)}
                            className="size-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="grid size-full place-items-center bg-gradient-to-br from-[#16A34A]/15 to-primary/30 p-4 text-center">
                            <span className="text-lg font-extrabold text-ink">
                              {trv(offer.title)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 items-center justify-between gap-2 p-3.5">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-extrabold text-ink">
                            {trv(offer.title)}
                          </h3>
                          <p className="mt-0.5 truncate text-xs font-bold text-muted">
                            {trv(offer.merchantName)}
                          </p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#16A34A] px-3 py-1.5 text-xs font-extrabold text-white transition group-hover:brightness-95">
                          <span>{tr("زيارة العرض")}</span>
                          <ExternalLink className="size-3.5" aria-hidden />
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl bg-surface p-5 text-center">
                <p className="text-sm font-bold text-muted">
                  {tr("لا توجد عروض متاجر إعلانية حالياً. يمكن للإدارة إضافة العروض والروابط المخصّصة من لوحة التحكم ← إدارة المتجر والمتاجر.")}
                </p>
              </div>
            )}
          </section>
        ) : null}

        {/* ===================================================================== */}
        {/* 2. المتجر الرسمي · منتجات واشتراكات رقمية فورية                        */}
        {/*    - In "all" mode: Categories on top + Horizontal Square Slider below */}
        {/*    - In "store" mode: Square Categories on top + Panel per Category!   */}
        {/* ===================================================================== */}
        {activeView === "all" ? (
          <section
            id="section-official-store-overview"
            aria-label={tr("المتجر الرسمي · منتجات واشتراكات رقمية فورية")}
            className="rounded-3xl border-2 border-primary/60 bg-paper p-4 shadow-xs sm:p-6"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3.5">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-ink shadow-2xs">
                  <ShoppingBag className="size-5" aria-hidden />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold text-ink sm:text-xl">
                    {tr("🛍️ المتجر الرسمي · منتجات واشتراكات رقمية فورية")}
                  </h2>
                  <p className="mt-0.5 text-xs font-semibold text-muted">
                    {tr("أقسام المتجر ومن تحتها المنتجات في مربعات متحركة أفقية — اضغط «عرض المتجر بالكامل» لتصفّح لوحة كل قسم.")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveView("store")}
                className="btn px-4 py-2 text-xs font-extrabold"
              >
                {tr("فتح المتجر الرسمي ولوحات الأقسام ↗")}
              </button>
            </div>

            {/* Store Categories Row */}
            {topCategories.length > 0 ? (
              <div className="mb-5">
                <h3 className="mb-2.5 text-xs font-extrabold text-muted">
                  {tr("أقسام المتجر الرسمي:")}
                </h3>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {topCategories.map((c) => (
                    <li key={c.id}>
                      <SectionTile c={c} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Horizontal Moving Square Cards Slider */}
            {storeProducts.length > 0 ? (
              <HorizontalProductSlider
                products={storeProducts}
                currency={settings.currency}
              />
            ) : (
              <div className="rounded-2xl bg-surface p-5 text-center text-sm font-bold text-muted">
                {tr("أضف منتجات أو اشتراكات (مثل نتفليكس أو الذكاء الاصطناعي) من لوحة التحكم لتظهر هنا في السلايدر المتحرك.")}
              </div>
            )}
          </section>
        ) : null}

        {activeView === "store" ? (
          <div className="space-y-6">
            {/* Top Box: Store Categories as Square Tiles */}
            <section
              aria-label={tr("أقسام المتجر الرسمي")}
              className="rounded-3xl border-2 border-primary/60 bg-paper p-4 shadow-xs sm:p-6"
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-10 place-items-center rounded-2xl bg-primary text-ink">
                    <ShoppingBag className="size-5" aria-hidden />
                  </span>
                  <div>
                    <h2 className="text-lg font-extrabold">
                      {tr("أقسام المتجر الرسمي")}
                    </h2>
                    <p className="text-xs font-semibold text-muted">
                      {tr("اختر قسماً للانتقال إلى لوحته مباشرة أو تصفّح لوحة كل قسم بالأسفل")}
                    </p>
                  </div>
                </div>
                {selectedCatId !== "all" ? (
                  <button
                    type="button"
                    onClick={() => setSelectedCatId("all")}
                    className="rounded-xl bg-ink px-3 py-1.5 text-xs font-extrabold text-paper"
                  >
                    {tr("إظهار لوحات جميع الأقسام")}
                  </button>
                ) : null}
              </div>

              {topCategories.length > 0 ? (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {topCategories.map((c) => {
                    const isSelected = selectedCatId === c.id;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCatId(isSelected ? "all" : c.id)
                          }
                          className={`stamp press flex h-full w-full flex-col overflow-hidden text-start transition ${
                            isSelected ? "ring-3 ring-ink" : ""
                          }`}
                        >
                          <SectionCover c={c} className="aspect-[4/3] w-full" />
                          <span className="flex flex-col gap-0.5 p-3">
                            <span className="font-extrabold leading-snug text-ink">
                              {trv(c.name)}
                            </span>
                            <span className="text-xs font-semibold text-muted">
                              {c.description
                                ? trv(c.description)
                                : tr("تصفّح منتجات القسم ▾")}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="rounded-2xl bg-surface p-4 text-center text-xs font-bold text-muted">
                  {tr("لا توجد أقسام مضافة بعد — يمكنك إضافة قسم «الذكاء الاصطناعي» و«نتفليكس» بضغطة زر من لوحة التحكم.")}
                </p>
              )}
            </section>

            {/* Below: A Dedicated Board/Panel for EACH Store Category (لوحة لكل قسم) */}
            {topCategories
              .filter((c) => selectedCatId === "all" || c.id === selectedCatId)
              .map((cat) => {
                const subCatIds = categories
                  .filter((sub) => sub.parentId === cat.id)
                  .map((sub) => sub.id);
                const catProducts = storeProducts.filter(
                  (p) =>
                    p.categoryId === cat.id ||
                    (p.categoryId && subCatIds.includes(p.categoryId)),
                );
                return (
                  <section
                    key={cat.id}
                    id={`store-cat-board-${cat.slug}`}
                    aria-label={trv(cat.name)}
                    className="rounded-3xl border border-line bg-paper p-4 shadow-xs sm:p-6"
                  >
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3.5">
                      <div className="flex items-center gap-3">
                        <SectionCover
                          c={cat}
                          className="size-12 shrink-0 rounded-2xl"
                        />
                        <div>
                          <h3 className="text-lg font-extrabold text-ink">
                            {tr("لوحة قسم:")} {trv(cat.name)}
                          </h3>
                          {cat.description ? (
                            <p className="text-xs font-semibold text-muted">
                              {trv(cat.description)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <Link
                        to="/store/c/$slug"
                        params={{ slug: cat.slug }}
                        className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-extrabold text-ink hover:bg-primary-soft"
                      >
                        {tr("صفحة القسم المستقلة ↗")}
                      </Link>
                    </div>

                    {catProducts.length > 0 ? (
                      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {catProducts.map((p) => (
                          <li key={p.id}>
                            <ProductCard p={p} currency={settings.currency} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="rounded-2xl bg-surface p-5 text-center text-xs font-bold text-muted">
                        {tr("هذا القسم مفعّل وجاهز — ستظهر منتجاته هنا فور إضافتها وربطها بقسم «{0}» من لوحة التحكم.", cat.name)}
                      </p>
                    )}
                  </section>
                );
              })}

            {/* Uncategorized Products Board (if any) */}
            {selectedCatId === "all" &&
            storeProducts.some((p) => !p.categoryId) ? (
              <section className="rounded-3xl border border-line bg-paper p-4 shadow-xs sm:p-6">
                <h3 className="mb-3 text-lg font-extrabold">
                  {tr("منتجات وعروض عامة أخرى")}
                </h3>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {storeProducts
                    .filter((p) => !p.categoryId)
                    .map((p) => (
                      <li key={p.id}>
                        <ProductCard p={p} currency={settings.currency} />
                      </li>
                    ))}
                </ul>
              </section>
            ) : null}

            {postGuide ? (
              <section className="rounded-3xl border border-line bg-paper p-4 shadow-xs">
                <h3 className="mb-2 text-base font-extrabold">
                  {tr("خدمة البريد في رهط")}
                </h3>
                <HomePostCard guide={postGuide} />
              </section>
            ) : null}
          </div>
        ) : null}

        {/* ===================================================================== */}
        {/* 3. باقات متاجر رهط وتثبيت الإعلانات (VIP) — ONLY FOR MERCHANT ROLE!     */}
        {/* ===================================================================== */}
        {hasMerchantPermission &&
        (activeView === "all" || activeView === "packages") ? (
          <section
            id="section-merchant-vip-packages"
            aria-label={tr("باقات متاجر رهط وتثبيت الإعلانات (VIP)")}
            className="rounded-3xl border-2 border-ink/20 bg-gradient-to-br from-paper via-paper to-primary/15 p-4 shadow-xs sm:p-6"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3.5">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-ink">
                  <Crown className="size-5" aria-hidden />
                </span>
                <div>
                  <span className="rounded-full bg-[#16A34A] px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                    {tr("خاص بالمشتركين بصلاحية تاجر ✓")}
                  </span>
                  <h2 className="mt-0.5 text-lg font-extrabold sm:text-xl">
                    {tr("👑 باقات متاجر رهط وتثبيت الإعلانات (VIP)")}
                  </h2>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {vipPackages.map((pkg) => (
                <div
                  key={pkg.title}
                  className={`flex flex-col justify-between rounded-2xl border p-4 ${
                    pkg.featured
                      ? "border-ink bg-ink text-paper shadow-md"
                      : "border-line bg-surface text-ink"
                  }`}
                >
                  <div>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                        pkg.featured
                          ? "bg-primary text-ink"
                          : "bg-paper text-primary-ink"
                      }`}
                    >
                      {trv(pkg.badge)}
                    </span>
                    <h3 className="mt-2 text-base font-extrabold">
                      {trv(pkg.title)}
                    </h3>
                    <p
                      className={`mt-1 text-xl font-extrabold ${
                        pkg.featured ? "text-primary" : "text-ink"
                      }`}
                    >
                      {trv(pkg.price)}
                    </p>
                    <p
                      className={`mt-1.5 text-xs font-semibold ${
                        pkg.featured ? "text-white/80" : "text-muted"
                      }`}
                    >
                      {trv(pkg.desc)}
                    </p>
                    <ul className="mt-3 space-y-1.5 text-xs font-bold">
                      {(pkg.perks ?? []).map((perk) => (
                        <li key={perk} className="flex items-center gap-1.5">
                          <Sparkles
                            className={`size-3.5 shrink-0 ${
                              pkg.featured ? "text-primary" : "text-[#16A34A]"
                            }`}
                            aria-hidden
                          />
                          <span>{trv(perk)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <a
                    href={makePackageUrl(pkg)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-extrabold transition ${
                      pkg.featured
                        ? "bg-primary text-ink hover:brightness-95"
                        : "bg-ink text-paper hover:opacity-90"
                    }`}
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    {tr("تفعيل الباقة الآن")}
                  </a>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* ===================================================================== */}
        {/* 4. حراج الأهالي · إعلانات الأفراد وسوق المستعمل                        */}
        {/*    Clicking it or any circular category enters the classic Haraj page! */}
        {/* ===================================================================== */}
        {activeView === "all" ? (
          <section
            id="section-haraj-portal-card"
            aria-label={tr("حراج الأهالي · إعلانات الأفراد وسوق المستعمل")}
            className="rounded-3xl border border-line bg-paper p-4 shadow-xs sm:p-6"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3.5">
              <Link
                to="/haraj"
                className="group flex items-center gap-3 text-start"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ink text-paper transition group-hover:bg-primary group-hover:text-ink">
                  <Megaphone className="size-5" aria-hidden />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold text-ink group-hover:underline sm:text-xl">
                    {tr("📢 حراج الأهالي · إعلانات الأفراد وسوق المستعمل")}
                  </h2>
                  <p className="mt-0.5 text-xs font-semibold text-muted">
                    {tr("اضغط هنا أو اختر أي قسم دائري للدخول إلى صفحة الحراج الكاملة بالأقسام والفلاتر")}
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-2">
                <Link
                  to="/haraj/new"
                  className="btn flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold"
                >
                  <Plus className="size-4" aria-hidden />
                  {tr("أضف إعلانك")}
                </Link>
                <Link
                  to="/haraj"
                  className="rounded-xl bg-ink px-4 py-2 text-xs font-extrabold text-paper hover:opacity-90"
                >
                  {tr("دخول صفحة الحراج ↗")}
                </Link>
              </div>
            </div>

            {/* Circular Category List with Glowing Yellow "عروض" Circle */}
            <div className="scroll-row -mx-2 gap-3.5 px-2 pb-1">
              <Link
                to="/haraj"
                className="group flex shrink-0 flex-col items-center gap-1.5"
              >
                <span className="grid size-16 place-items-center rounded-full border-2 border-ink bg-ink text-paper shadow-sm transition group-hover:scale-105">
                  <LayoutGrid className="size-6" aria-hidden />
                </span>
                <span className="text-xs font-extrabold text-ink">
                  {tr("كل الحراج")}
                </span>
              </Link>

              {/* Glowing Yellow "عروض" Circle */}
              <Link
                to="/haraj"
                search={{ cat: "__offers__" }}
                className="group relative flex shrink-0 flex-col items-center gap-1.5"
              >
                <span
                  className={`relative grid size-16 place-items-center rounded-full border-2 text-xl transition group-hover:scale-105 ${
                    hasActiveOffers
                      ? "border-[#f2c94c] bg-[#f2c94c]/35 text-ink ring-4 ring-[#f2c94c]/65 shadow-[0_0_22px_rgba(242,201,76,0.95)] animate-pulse"
                      : "border-line bg-surface text-ink"
                  }`}
                >
                  <Flame
                    className={`size-6 ${
                      hasActiveOffers ? "text-amber-600" : "text-muted"
                    }`}
                    aria-hidden
                  />
                  {hasActiveOffers ? (
                    <span className="absolute -top-1 -end-1 grid min-w-5 place-items-center rounded-full bg-[#16A34A] px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                      {promoOffers.length}
                    </span>
                  ) : null}
                </span>
                <span className="flex items-center gap-0.5 text-xs font-extrabold text-amber-800">
                  <Sparkles className="size-3 text-amber-500" aria-hidden />
                  {tr("عروض")}
                </span>
              </Link>

              {(harajCats ?? [])
                .filter((c) => c.enabled)
                .map((c) => (
                  <Link
                    key={c.key}
                    to="/haraj"
                    search={{ cat: c.key }}
                    className="group flex shrink-0 flex-col items-center gap-1.5"
                  >
                    <span className="grid size-16 place-items-center rounded-full border-2 border-line bg-surface text-2xl text-ink transition group-hover:scale-105 group-hover:border-primary group-hover:bg-primary/25">
                      {c.icon}
                    </span>
                    <span className="max-w-20 truncate text-xs font-extrabold text-muted group-hover:text-ink">
                      {catName(c)}
                    </span>
                  </Link>
                ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="mt-6">
        <StoreFooterLinks />
      </div>
    </Shell>
  );
}
