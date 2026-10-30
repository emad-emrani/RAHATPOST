import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Crown,
  Megaphone,
  MessageCircle,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
} from "lucide-react";
import { useMemo, useState } from "react";
import { HomePostCard } from "@/components/guide";
import { ListingCard } from "@/components/haraj";
import { Shell } from "@/components/shell";
import { ProductCard, SectionTile, StoreFooterLinks } from "@/components/store-parts";
import { getGuide } from "@/data/guides";
import { tr, trv } from "@/lib/i18n/core";
import { localized } from "@/lib/i18n/localize";
import { getListings } from "@/lib/market/api";
import type { Listing } from "@/lib/market/types";
import { seo } from "@/lib/seo";
import { getStore } from "@/lib/store/api";
import { waDigits } from "@/lib/store/types";

const postGuide = getGuide("post");

type StoreSecView = "all" | "store" | "merchants" | "individuals" | "packages";

export const Route = createFileRoute("/store/")({
  head: () =>
    seo({
      title: tr("المتجر وسوق التجار الموثّقين | رهط بوست"),
      description: tr(
        "متجر رهط بوست الموحّد: منتجات واشتراكات رقمية فورية، عروض متاجر وتجار رهط الموثّقين، وباقات تمييز الإعلانات في الحراج.",
      ),
      path: "/store",
    }),
  loader: async () => {
    const [rawStore, harajRes] = await Promise.all([
      getStore(),
      getListings().catch(() => ({ ok: false, items: [] as Listing[] })),
    ]);
    const store = await localized(rawStore, (d) => [
      { items: d.products, fields: ["name", "shortDesc", "description"] },
      { items: d.categories, fields: ["name", "description"] },
    ]);
    return {
      ...store,
      harajItems: harajRes.items ?? [],
    };
  },
  headers: () => ({
    "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  }),
  component: StorePage,
});

function isMerchantOffer(item: Listing): boolean {
  if (item.seller?.badge && item.seller.badge.trim().length > 0) return true;
  if (item.condition === "جديد") return true;
  if (/متجر|معرض|محل|شركة|وكيل|جملة|توصيل|كفالة/.test(`${item.title} ${item.description} ${item.seller?.name ?? ""}`)) {
    return true;
  }
  return false;
}

function StorePage() {
  const { products, categories, settings, ok, harajItems } = Route.useLoaderData();
  const [activeView, setActiveView] = useState<StoreSecView>("all");
  const top = categories.filter((c) => !c.parentId && c.active);

  const merchantOffers = useMemo(
    () => (harajItems ?? []).filter((i) => isMerchantOffer(i)),
    [harajItems],
  );
  const communityItems = useMemo(() => {
    const rest = (harajItems ?? []).filter((i) => !isMerchantOffer(i));
    return rest.length > 0 ? rest : (harajItems ?? []);
  }, [harajItems]);

  const storeWaPhone = settings?.whatsapp ? waDigits(settings.whatsapp) : "";
  const makePackageWaUrl = (pkgTitle: string, priceText: string) => {
    const text = `مرحباً إدارة رهط بوست، أرغب بالاشتراك في «${pkgTitle}» (${priceText}) في متجر وحراج رهط بوست.`;
    if (storeWaPhone) {
      return `https://wa.me/${storeWaPhone}?text=${encodeURIComponent(text)}`;
    }
    return `/haraj/new`;
  };

  return (
    <Shell wide>
      {/* Top Header & Section Switcher */}
      <div className="mb-5 rounded-3xl border border-line bg-paper p-4 shadow-2xs sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-ink shadow-xs">
              <ShoppingBag className="size-6" aria-hidden />
            </span>
            <div>
              <h1 className="text-xl font-extrabold sm:text-2xl">
                {tr("متجر رهط بوست وسوق التجار الموثّقين")}
              </h1>
              <p className="mt-0.5 text-xs font-semibold text-muted sm:text-sm">
                {tr(
                  "كل قسم مفصول بوضوح: المتجر الرسمي، باقات التجار وتثبيت VIP، عروض المحلات الموثّقة، وحراج الأهالي.",
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/cart"
              className="btn flex items-center gap-1.5 px-4 py-2.5 text-xs font-extrabold"
            >
              <ShoppingCart className="size-4" aria-hidden />
              {tr("سلة المشتريات")}
            </Link>
            <Link
              to="/orders"
              className="btn btn-ghost px-3.5 py-2.5 text-xs font-extrabold"
            >
              {tr("طلباتي")}
            </Link>
            <Link
              to="/haraj"
              className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs font-extrabold text-ink hover:bg-primary-soft"
            >
              {tr("بحث وفلاتر الحراج ↗")}
            </Link>
          </div>
        </div>

        <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
          {(
            [
              { key: "all", label: "📋 عرض كل الأقسام (مفصولة)" },
              { key: "store", label: "🛍️ 1. المتجر الرسمي" },
              { key: "packages", label: "👑 2. باقات التجار وتثبيت VIP" },
              { key: "merchants", label: "🏪 3. عروض المتاجر الموثّقة" },
              { key: "individuals", label: "📢 4. حراج الأفراد والمستعمل" },
            ] as { key: StoreSecView; label: string }[]
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveView(tab.key)}
              className={`rounded-2xl px-3.5 py-2 text-xs font-extrabold transition ${
                activeView === tab.key
                  ? "bg-ink text-paper shadow-xs"
                  : "border border-line bg-surface text-ink hover:bg-primary-soft"
              }`}
            >
              {tr(tab.label)}
            </button>
          ))}
        </div>
      </div>

      {!ok ? (
        <p className="stamp mb-4 p-3 font-bold">
          {tr("تعذّر تحميل المتجر الآن.")}
        </p>
      ) : null}

      <div className="space-y-8">
        {/* ===================================================================== */}
        {/* SECTION 1 (SEPARATED): المتجر الرسمي والاشتراكات الفورية              */}
        {/* ===================================================================== */}
        {activeView === "all" || activeView === "store" ? (
          <section
            aria-label={tr("المتجر الرسمي")}
            className="rounded-3xl border-2 border-primary/60 bg-paper p-4 shadow-xs sm:p-6"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3.5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-primary text-ink">
                  <ShoppingBag className="size-5" aria-hidden />
                </span>
                <div>
                  <span className="rounded-lg bg-ink px-2 py-0.5 text-[10px] font-extrabold text-paper">
                    {tr("القسم 1")}
                  </span>
                  <h2 className="mt-0.5 text-lg font-extrabold">
                    {tr("🛍️ المتجر الرسمي · منتجات واشتراكات رقمية فورية")}
                  </h2>
                </div>
              </div>
            </div>

            {top.length > 0 ? (
              <div className="mb-5">
                <h3 className="mb-2 text-sm font-extrabold text-muted">
                  {tr("أقسام المتجر:")}
                </h3>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {top.map((c) => (
                    <li key={c.id}>
                      <SectionTile c={c} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {products.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {products.map((p) => (
                  <li key={p.id}>
                    <ProductCard p={p} currency={settings.currency} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl bg-surface p-6 text-center">
                <p className="font-bold text-ink">
                  {tr("يمكنك تصفح باقات التجار وتثبيت الإعلانات بالأسفل أو إضافة منتجات من لوحة التحكم.")}
                </p>
              </div>
            )}

            {postGuide ? (
              <div className="mt-5 border-t border-line pt-4">
                <h3 className="mb-2 text-sm font-extrabold text-muted">
                  {tr("خدمة البريد والتوصيل في رهط:")}
                </h3>
                <HomePostCard guide={postGuide} />
              </div>
            ) : null}
          </section>
        ) : null}

        {/* ===================================================================== */}
        {/* SECTION 2 (SEPARATED): باقات التجار الموثّقين وتثبيت الإعلانات VIP     */}
        {/* ===================================================================== */}
        {activeView === "all" || activeView === "packages" ? (
          <section
            aria-label={tr("باقات متاجر رهط وتثبيت الإعلانات")}
            className="rounded-3xl border-2 border-ink/20 bg-gradient-to-br from-paper via-paper to-primary/10 p-4 shadow-xs sm:p-6"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3.5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-primary text-ink">
                  <Crown className="size-5" aria-hidden />
                </span>
                <div>
                  <span className="rounded-lg bg-primary px-2 py-0.5 text-[10px] font-extrabold text-ink">
                    {tr("القسم 2")}
                  </span>
                  <h2 className="mt-0.5 text-lg font-extrabold">
                    {tr("👑 باقات متاجر رهط وتثبيت الإعلانات (VIP)")}
                  </h2>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
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
                  desc: "ظهور دائم لعروض محلك في «قسم عروض المتاجر الموثّقة» مع شارة التوثيق الخضراء.",
                  perks: [
                    "شارة «تاجر موثّق ✓» على جميع إعلاناتك",
                    "قسم مستقل لعروض محلك",
                    "ربط مباشر مع دليل محلات رهط",
                  ],
                  featured: true,
                },
                {
                  badge: "🚀 للمعارض والشركات",
                  title: "باقة المعارض والوكالات الذهبية",
                  price: "₪199 / شهرياً",
                  desc: "لمعارض السيارات، مكاتب العقارات، ومحلات الإلكترونيات والأثاث الكبرى في رهط والنقب.",
                  perks: [
                    "نشر إعلانات عروض غير محدودة شهرياً",
                    "تثبيت 3 عروض VIP في نفس الوقت",
                    "دعم مباشر وتصميم بطاقة المتجر",
                  ],
                },
              ].map((pkg) => (
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
                        pkg.featured ? "bg-primary text-ink" : "bg-paper text-primary-ink"
                      }`}
                    >
                      {tr(pkg.badge)}
                    </span>
                    <h3 className="mt-2 text-base font-extrabold">{tr(pkg.title)}</h3>
                    <p
                      className={`mt-1 text-xl font-extrabold ${
                        pkg.featured ? "text-primary" : "text-ink"
                      }`}
                    >
                      {pkg.price}
                    </p>
                    <p
                      className={`mt-1.5 text-xs font-semibold ${
                        pkg.featured ? "text-white/80" : "text-muted"
                      }`}
                    >
                      {tr(pkg.desc)}
                    </p>
                    <ul className="mt-3 space-y-1.5 text-xs font-bold">
                      {pkg.perks.map((perk) => (
                        <li key={perk} className="flex items-center gap-1.5">
                          <Sparkles
                            className={`size-3.5 shrink-0 ${
                              pkg.featured ? "text-primary" : "text-[#16A34A]"
                            }`}
                            aria-hidden
                          />
                          <span>{tr(perk)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <a
                    href={makePackageWaUrl(pkg.title, pkg.price)}
                    target={storeWaPhone ? "_blank" : undefined}
                    rel={storeWaPhone ? "noopener noreferrer" : undefined}
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
        {/* SECTION 3 (SEPARATED): عروض المتاجر وتجار رهط الموثّقين              */}
        {/* ===================================================================== */}
        {activeView === "all" || activeView === "merchants" ? (
          <section
            aria-label={tr("عروض المتاجر الموثّقة")}
            className="rounded-3xl border-2 border-[#16A34A]/45 bg-paper p-4 shadow-xs sm:p-6"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3.5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-[#16A34A] text-white">
                  <Store className="size-5" aria-hidden />
                </span>
                <div>
                  <span className="rounded-lg bg-[#16A34A] px-2 py-0.5 text-[10px] font-extrabold text-white">
                    {tr("القسم 3")}
                  </span>
                  <h2 className="mt-0.5 text-lg font-extrabold">
                    {tr("🏪 عروض المتاجر وتجار رهط الموثّقين")}
                  </h2>
                </div>
              </div>
              <Link
                to="/haraj"
                search={{ sec: "merchants" }}
                className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-extrabold text-ink hover:bg-primary-soft"
              >
                {tr("عرض الكل مع الفلتر ↗")}
              </Link>
            </div>

            {merchantOffers.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {merchantOffers.slice(0, 8).map((item) => (
                  <li key={item.id} className="relative">
                    <span className="pointer-events-none absolute top-2 start-2 z-10 inline-flex items-center gap-1 rounded-full bg-[#16A34A] px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
                      <BadgeCheck className="size-3" aria-hidden />
                      {item.seller?.badge ? trv(item.seller.badge) : tr("عرض تاجر / جديد")}
                    </span>
                    <ListingCard item={item} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl bg-surface p-4 text-center text-xs font-bold text-muted">
                {tr("لا توجد عروض متاجر حالياً — يمكنك إضافة عرض جديد من زر «أضف إعلان».")}
              </p>
            )}
          </section>
        ) : null}

        {/* ===================================================================== */}
        {/* SECTION 4 (SEPARATED): حراج الأهالي · إعلانات الأفراد والمستعمل        */}
        {/* ===================================================================== */}
        {activeView === "all" || activeView === "individuals" ? (
          <section
            aria-label={tr("حراج الأهالي للمستعمل")}
            className="rounded-3xl border border-line bg-paper p-4 shadow-xs sm:p-6"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3.5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-ink text-paper">
                  <Megaphone className="size-5" aria-hidden />
                </span>
                <div>
                  <span className="rounded-lg bg-surface px-2 py-0.5 text-[10px] font-extrabold text-ink">
                    {tr("القسم 4")}
                  </span>
                  <h2 className="mt-0.5 text-lg font-extrabold">
                    {tr("📢 حراج الأهالي · إعلانات الأفراد وسوق المستعمل")}
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/haraj/new"
                  className="btn flex items-center gap-1 px-3 py-1.5 text-xs font-extrabold"
                >
                  <Plus className="size-4" aria-hidden />
                  {tr("أضف إعلان")}
                </Link>
                <Link
                  to="/haraj"
                  search={{ sec: "individuals" }}
                  className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-extrabold text-ink hover:bg-primary-soft"
                >
                  {tr("كل إعلانات الحراج ↗")}
                </Link>
              </div>
            </div>

            {communityItems.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {communityItems.slice(0, 8).map((item) => (
                  <li key={item.id}>
                    <ListingCard item={item} />
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
      </div>

      <div className="mt-6">
        <StoreFooterLinks />
      </div>
    </Shell>
  );
}
