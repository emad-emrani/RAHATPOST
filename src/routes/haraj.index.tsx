import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  Crown,
  Megaphone,
  MessageCircle,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ListingCard, useHarajName } from "@/components/haraj";
import { Shell } from "@/components/shell";
import { ProductCard, SectionTile, StoreFooterLinks } from "@/components/store-parts";
import { tr, trv } from "@/lib/i18n/core";
import { localized } from "@/lib/i18n/localize";
import { getHarajCategories, getListings } from "@/lib/market/api";
import {
  catName,
  fieldLabel,
  findCat,
  matchesSpecs,
  optionLabel,
  type HarajCategory,
  type SpecFilter,
} from "@/lib/market/categories";
import { CONDITIONS, type Listing } from "@/lib/market/types";
import { breadcrumbLd, seo } from "@/lib/seo";
import { getStore } from "@/lib/store/api";
import { waDigits } from "@/lib/store/types";

type HubSectionMode = "all" | "store" | "merchants" | "individuals" | "packages";

type S = {
  q?: string;
  cat?: string;
  cond?: string;
  min?: number;
  max?: number;
  sec?: HubSectionMode;
  f?: SpecFilter;
};

const VALID_SECS: readonly HubSectionMode[] = [
  "all",
  "store",
  "merchants",
  "individuals",
  "packages",
];

export const Route = createFileRoute("/haraj/")({
  validateSearch: (s: Record<string, unknown>): S => ({
    q: typeof s.q === "string" && s.q ? s.q.slice(0, 60) : undefined,
    cat: typeof s.cat === "string" && s.cat ? s.cat.slice(0, 30) : undefined,
    cond: (CONDITIONS as readonly string[]).includes(String(s.cond))
      ? String(s.cond)
      : undefined,
    min: Number(s.min) > 0 ? Number(s.min) : undefined,
    max: Number(s.max) > 0 ? Number(s.max) : undefined,
    sec: VALID_SECS.includes(s.sec as HubSectionMode)
      ? (s.sec as HubSectionMode)
      : undefined,
    f: cleanFilter(s.f),
  }),
  loader: async () => {
    const [res, cats, rawStore] = await Promise.all([
      getListings(),
      getHarajCategories(),
      getStore(),
    ]);
    const store = await localized(rawStore, (d) => [
      { items: d.products, fields: ["name", "shortDesc", "description"] },
      { items: d.categories, fields: ["name", "description"] },
    ]);
    return { ...res, cats, store };
  },
  head: () =>
    seo({
      title: tr("سوق ومتجر رهط · عروض التجار الموثّقين وحراج الأهالي | رهط بوست"),
      description: tr(
        "سوق ومتجر رهط بوست الموحّد: المتجر الرسمي، عروض المتاجر وتجار رهط الموثّقين، وحراج الأهالي لبيع وشراء السيارات والإلكترونيات والأثاث والعقارات في رهط والنقب.",
      ),
      path: "/haraj",
      jsonLd: [breadcrumbLd([{ name: tr("سوق ومتجر رهط"), path: "/haraj" }])],
    }),
  component: HarajAndStoreHubPage,
});

function isVerifiedMerchantListing(item: Listing): boolean {
  if (item.seller?.badge && item.seller.badge.trim().length > 0) return true;
  if (item.condition === "جديد") return true;
  if (/متجر|معرض|محل|شركة|وكيل|جملة|توصيل|كفالة/.test(`${item.title} ${item.description} ${item.seller?.name ?? ""}`)) {
    return true;
  }
  return false;
}

function HarajAndStoreHubPage() {
  const { items, ok, cats, store } = Route.useLoaderData();
  const s = Route.useSearch();
  const nav = Route.useNavigate();
  const name = useHarajName();
  const [q, setQ] = useState(s.q ?? "");
  const activeSec: HubSectionMode = s.sec ?? "all";

  const set = (patch: Partial<S>) =>
    nav({ search: (p: S) => ({ ...p, ...patch }), replace: true });

  const needle = (s.q ?? "").trim().toLowerCase();

  // Filter Haraj items according to search, category, condition, price, and specs
  const filteredListings = useMemo(() => {
    return items.filter(
      (i) =>
        (!s.cat || i.category === s.cat) &&
        (!s.cond || i.condition === s.cond) &&
        (!s.min || (i.price ?? 0) >= s.min) &&
        (!s.max || (i.priceMode === "free" ? 0 : i.price ?? 0) <= s.max) &&
        (!s.cat || matchesSpecs(findCat(cats, s.cat), i.specs, s.f)) &&
        (!needle ||
          `${i.title} ${i.description} ${i.area} ${i.seller?.name ?? ""}`
            .toLowerCase()
            .includes(needle)),
    );
  }, [items, s, cats, needle]);

  // Separate Haraj items into: Verified Merchant/New Offers vs Individual Community Ads
  const merchantListings = useMemo(
    () => filteredListings.filter((i) => isVerifiedMerchantListing(i)),
    [filteredListings],
  );
  const individualListings = useMemo(() => {
    const rest = filteredListings.filter((i) => !isVerifiedMerchantListing(i));
    return rest.length > 0 ? rest : filteredListings;
  }, [filteredListings]);

  // Filter Store products by search query if present
  const filteredStoreProducts = useMemo(() => {
    const list = store?.products ?? [];
    if (!needle) return list;
    return list.filter((p) =>
      `${p.name} ${p.shortDesc} ${p.description}`.toLowerCase().includes(needle),
    );
  }, [store?.products, needle]);

  const topStoreCats = useMemo(
    () => (store?.categories ?? []).filter((c) => !c.parentId && c.active),
    [store?.categories],
  );

  const storeWaPhone = store?.settings?.whatsapp
    ? waDigits(store.settings.whatsapp)
    : "";

  const makePackageWaUrl = (pkgTitle: string, priceText: string) => {
    const text = `مرحباً إدارة رهط بوست، أرغب بالاشتراك في «${pkgTitle}» (${priceText}) في سوق ومتجر رهط بوست.`;
    if (storeWaPhone) {
      return `https://wa.me/${storeWaPhone}?text=${encodeURIComponent(text)}`;
    }
    return `/haraj/new`;
  };

  return (
    <Shell wide>
      {/* Top Unified Hub Banner */}
      <div className="mb-5 rounded-3xl border border-line bg-paper p-4 shadow-2xs sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-ink shadow-xs">
              <Store className="size-6" aria-hidden />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-extrabold sm:text-2xl">
                  {trv(name)} {tr("ومتجر رهط الموحّد")}
                </h1>
                <span className="rounded-full bg-primary/30 px-2.5 py-0.5 text-xs font-extrabold text-ink">
                  {tr("كل قسم مفصول بوضوح")}
                </span>
              </div>
              <p className="mt-0.5 text-xs font-semibold text-muted sm:text-sm">
                {tr(
                  "بوابة موحّدة تجمع المتجر الرسمي، عروض المتاجر والتجار الموثّقين في رهط، وإعلانات الأهالي للمستعمل — كل قسم مستقل ومنظّم في الصفحة.",
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/haraj/new"
              className="btn flex items-center gap-1.5 px-4 py-2.5 text-xs font-extrabold"
            >
              <Plus className="size-4" aria-hidden />
              {tr("أضف إعلانك في الحراج")}
            </Link>
            <Link
              to="/cart"
              className="btn btn-ghost flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-extrabold"
            >
              <ShoppingCart className="size-4" aria-hidden />
              {tr("سلة المتجر")}
            </Link>
            <Link
              to="/haraj/mine"
              className="rounded-xl border border-line bg-surface px-3 py-2.5 text-xs font-extrabold text-ink hover:bg-primary-soft"
            >
              {tr("إعلاناتي")}
            </Link>
          </div>
        </div>

        {/* Unified Search Bar */}
        <form
          className="relative mt-4"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            set({ q: q.trim() || undefined });
          }}
        >
          <Search
            className="pointer-events-none absolute inset-y-0 start-3.5 my-auto size-5 text-muted"
            aria-hidden
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            className="field ps-11 pe-24"
            placeholder={tr("ابحث في المتجر، عروض التجار الموثّقين، وإعلانات الحراج…")}
            aria-label={tr("ابحث في المتجر والحراج")}
          />
          <button
            type="submit"
            className="absolute inset-y-1.5 end-1.5 rounded-xl bg-ink px-4 text-xs font-extrabold text-paper transition hover:opacity-90"
          >
            {tr("بحث")}
          </button>
        </form>

        {/* Section Mode Switcher (Show All Separated Sections or Focus on One Section) */}
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
          <span className="me-1 text-xs font-extrabold text-muted">
            {tr("أقسام الصفحة:")}
          </span>
          {(
            [
              {
                key: "all",
                label: "📋 عرض كل الأقسام (مفصولة)",
                count:
                  filteredStoreProducts.length +
                  merchantListings.length +
                  individualListings.length,
              },
              {
                key: "store",
                label: "🛍️ 1. المتجر الرسمي",
                count: filteredStoreProducts.length,
              },
              {
                key: "merchants",
                label: "🏪 2. عروض المتاجر الموثّقة",
                count: merchantListings.length,
              },
              {
                key: "individuals",
                label: "📢 3. حراج الأفراد والمستعمل",
                count: individualListings.length,
              },
              {
                key: "packages",
                label: "👑 4. باقات التجار وتثبيت VIP",
                count: 3,
              },
            ] as { key: HubSectionMode; label: string; count: number }[]
          ).map((tab) => {
            const active = activeSec === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() =>
                  set({ sec: tab.key === "all" ? undefined : tab.key })
                }
                className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-extrabold transition ${
                  active
                    ? "bg-ink text-paper shadow-xs"
                    : "border border-line bg-surface text-ink hover:bg-primary-soft"
                }`}
              >
                <span>{tr(tab.label)}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    active ? "bg-primary text-ink" : "bg-paper text-muted"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Category & Price Filters Bar */}
      <div className="mb-5 rounded-3xl border border-line bg-paper p-3.5 shadow-2xs">
        <div className="scroll-row -mx-2 mb-2.5 px-2">
          <button
            type="button"
            className={!s.cat ? "chip chip-ink" : "chip bg-surface"}
            onClick={() => set({ cat: undefined, f: undefined })}
          >
            {tr("كل الفئات")}
          </button>
          {cats.map((c) => (
            <button
              key={c.key}
              type="button"
              className={
                s.cat === c.key
                  ? "chip chip-ink shrink-0"
                  : "chip shrink-0 bg-surface"
              }
              onClick={() =>
                set({ cat: s.cat === c.key ? undefined : c.key, f: undefined })
              }
            >
              {c.icon} {catName(c)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <select
            className="field text-xs font-bold"
            value={s.cond ?? ""}
            onChange={(e) => set({ cond: e.target.value || undefined })}
            aria-label={tr("الحالة")}
          >
            <option value="">{tr("كل الحالات (جديد ومستعمل)")}</option>
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {trv(c)}
              </option>
            ))}
          </select>
          <input
            className="field text-xs"
            inputMode="numeric"
            placeholder={tr("السعر من ₪")}
            defaultValue={s.min ?? ""}
            onBlur={(e) => set({ min: Number(e.target.value) || undefined })}
            aria-label={tr("أقل سعر")}
          />
          <input
            className="field text-xs"
            inputMode="numeric"
            placeholder={tr("السعر إلى ₪")}
            defaultValue={s.max ?? ""}
            onBlur={(e) => set({ max: Number(e.target.value) || undefined })}
            aria-label={tr("أعلى سعر")}
          />
        </div>

        {s.cat ? (
          <div className="mt-2.5">
            <SpecFilters
              key={s.cat}
              cat={findCat(cats, s.cat)}
              f={s.f ?? {}}
              onChange={(f) => set({ f: Object.keys(f).length ? f : undefined })}
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-8">
        {/* ===================================================================== */}
        {/* SECTION 1 (SEPARATED): المتجر الرسمي والمنتجات الجاهزة               */}
        {/* ===================================================================== */}
        {activeSec === "all" || activeSec === "store" ? (
          <section
            id="section-official-store"
            aria-label={tr("المتجر الرسمي والمنتجات الجاهزة")}
            className="rounded-3xl border-2 border-primary/60 bg-paper p-4 shadow-xs sm:p-6"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3.5">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-ink shadow-2xs">
                  <ShoppingBag className="size-5" aria-hidden />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-ink px-2 py-0.5 text-[11px] font-extrabold text-paper">
                      {tr("القسم 1")}
                    </span>
                    <h2 className="text-lg font-extrabold text-ink sm:text-xl">
                      {tr("🛍️ المتجر الرسمي · منتجات واشتراكات فورية")}
                    </h2>
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-muted">
                    {tr(
                      "منتجات رسمية واشتراكات رقمية مضمونة من إدارة رهط بوست — دفع آمن أو عبر واتساب وتسليم فوري في حسابك.",
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/orders"
                  className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-extrabold text-ink hover:bg-primary-soft"
                >
                  {tr("طلباتي")}
                </Link>
                <Link
                  to="/cart"
                  className="rounded-xl bg-ink px-3.5 py-1.5 text-xs font-extrabold text-paper hover:opacity-90"
                >
                  {tr("السلة 🛒")}
                </Link>
              </div>
            </div>

            {topStoreCats.length > 0 ? (
              <div className="mb-4">
                <p className="mb-2 text-xs font-extrabold text-muted">
                  {tr("أقسام المتجر الرسمي:")}
                </p>
                <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                  {topStoreCats.map((c) => (
                    <li key={c.id}>
                      <SectionTile c={c} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {filteredStoreProducts.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {filteredStoreProducts.map((p) => (
                  <li key={p.id}>
                    <ProductCard
                      p={p}
                      currency={store?.settings?.currency ?? "ILS"}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl bg-surface p-5 text-center">
                <p className="text-sm font-bold text-ink">
                  {needle
                    ? tr("لا توجد منتجات في المتجر الرسمي تطابق بحثك الحالي.")
                    : tr("تصفّح باقات التجار والخدمات الرقمية في القسم الرابع بالأسفل أو أضف منتجات من لوحة التحكم.")}
                </p>
              </div>
            )}
          </section>
        ) : null}

        {/* ===================================================================== */}
        {/* SECTION 2 (SEPARATED): عروض المتاجر وتجار رهط الموثّقين              */}
        {/* ===================================================================== */}
        {activeSec === "all" || activeSec === "merchants" ? (
          <section
            id="section-verified-merchants"
            aria-label={tr("عروض المتاجر وتجار رهط الموثّقين")}
            className="rounded-3xl border-2 border-[#16A34A]/45 bg-paper p-4 shadow-xs sm:p-6"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3.5">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#16A34A] text-white shadow-2xs">
                  <BadgeCheck className="size-5" aria-hidden />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-[#16A34A] px-2 py-0.5 text-[11px] font-extrabold text-white">
                      {tr("القسم 2")}
                    </span>
                    <h2 className="text-lg font-extrabold text-ink sm:text-xl">
                      {tr("🏪 عروض المتاجر والمحلات الموثّقة في رهط والنقب")}
                    </h2>
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-muted">
                    {tr(
                      "سلع جديدة وعروض تجارية مباشرة من محلات ومعارض رهط الموثّقة — تواصل مباشر مع المحل عبر واتساب.",
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => set({ sec: "packages" })}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#16A34A]/40 bg-[#16A34A]/10 px-3 py-1.5 text-xs font-extrabold text-[#16A34A] hover:bg-[#16A34A] hover:text-white"
                >
                  <Crown className="size-3.5" aria-hidden />
                  {tr("وثّق متجرك هنا")}
                </button>
                <Link
                  to="/directory"
                  className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-extrabold text-ink hover:bg-primary-soft"
                >
                  {tr("دليل المحلات")}
                </Link>
              </div>
            </div>

            {merchantListings.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {merchantListings.map((item) => (
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
              <div className="flex flex-col items-center justify-between gap-3 rounded-2xl bg-surface p-5 sm:flex-row">
                <div>
                  <p className="text-sm font-extrabold text-ink">
                    {tr("هل تملك محلاً أو معرضاً في رهط والنقب؟")}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-muted">
                    {tr(
                      "اعرض بضاعتك الجديدة في قسم «عروض المتاجر الموثّقة» بشارة التوثيق الخضراء ليراها آلاف الزوار يومياً.",
                    )}
                  </p>
                </div>
                <Link
                  to="/haraj/new"
                  className="btn shrink-0 bg-[#16A34A] text-xs text-white hover:opacity-95"
                >
                  <Plus className="size-4" aria-hidden />
                  {tr("أضف عرض متجرك الآن")}
                </Link>
              </div>
            )}
          </section>
        ) : null}

        {/* ===================================================================== */}
        {/* SECTION 3 (SEPARATED): حراج الأهالي · إعلانات الأفراد والمستعمل        */}
        {/* ===================================================================== */}
        {activeSec === "all" || activeSec === "individuals" ? (
          <section
            id="section-community-haraj"
            aria-label={tr("حراج الأهالي وإعلانات الأفراد")}
            className="rounded-3xl border border-line bg-paper p-4 shadow-xs sm:p-6"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3.5">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ink text-paper shadow-2xs">
                  <Megaphone className="size-5" aria-hidden />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-surface px-2 py-0.5 text-[11px] font-extrabold text-ink">
                      {tr("القسم 3")}
                    </span>
                    <h2 className="text-lg font-extrabold text-ink sm:text-xl">
                      {tr("📢 حراج الأهالي · إعلانات الأفراد وسوق المستعمل")}
                    </h2>
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-muted">
                    {tr(
                      "بيع واشترِ مباشرة من أهالي رهط والنقب بدون وسيط — سيارات، هواتف، أثاث، عقارات ومقتنيات.",
                    )}
                  </p>
                </div>
              </div>

              <Link
                to="/haraj/new"
                className="btn flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold"
              >
                <Plus className="size-4" aria-hidden />
                {tr("أضف إعلان مجاني")}
              </Link>
            </div>

            {!ok ? (
              <p className="stamp mb-3 p-3 font-semibold">
                {tr("تعذّر تحميل الإعلانات الآن.")}
              </p>
            ) : null}

            {individualListings.length > 0 ? (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {individualListings.map((i) => (
                  <li key={i.id}>
                    <ListingCard item={i} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl bg-surface p-6 text-center">
                <p className="font-bold">
                  {items.length
                    ? tr("لا نتائج تطابق البحث في إعلانات الأفراد.")
                    : tr("لا إعلانات بعد. كن أول من يعرض غرضاً للبيع!")}
                </p>
                <Link to="/haraj/new" className="btn mt-3 inline-flex">
                  {tr("أضف إعلان")}
                </Link>
              </div>
            )}
          </section>
        ) : null}

        {/* ===================================================================== */}
        {/* SECTION 4 (SEPARATED): باقات التجار الموثّقين وتثبيت الإعلانات VIP     */}
        {/* ===================================================================== */}
        {activeSec === "all" || activeSec === "packages" ? (
          <section
            id="section-merchant-vip-packages"
            aria-label={tr("باقات التجار وتثبيت الإعلانات في المتجر والحراج")}
            className="rounded-3xl border-2 border-ink/20 bg-gradient-to-br from-paper via-paper to-primary/10 p-4 shadow-xs sm:p-6"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3.5">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-ink shadow-2xs">
                  <Crown className="size-5" aria-hidden />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-primary px-2 py-0.5 text-[11px] font-extrabold text-ink">
                      {tr("القسم 4")}
                    </span>
                    <h2 className="text-lg font-extrabold text-ink sm:text-xl">
                      {tr("👑 باقات متاجر رهط وتثبيت الإعلانات (VIP)")}
                    </h2>
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-muted">
                    {tr(
                      "ضاعف مبيعاتك في رهط والنقب: وثّق متجرك بشارة التاجر المعتمد أو ثبّت إعلانك في صدارة الحراج والصفحة الرئيسية.",
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                {
                  badge: "⭐ الأكثر طلباً للأفراد",
                  title: "تثبيت إعلان VIP في الصدارة",
                  price: "₪29 / أسبوع",
                  desc: "يثبّت إعلانك (سيارة، عقار، أو جهاز) في أعلى قسم الحراج وفي الصفحة الرئيسية مع إطار ذهبي مميز.",
                  perks: [
                    "ظهور في أول الصفوف لمدة 7 أيام",
                    "شارة «إعلان مميز VIP» تجذب المشترين",
                    "أولوية الظهور في نتائج بحث الموقع",
                  ],
                },
                {
                  badge: "🏪 للمحلات والتجار",
                  title: "عضوية «متجر / تاجر موثّق ✓»",
                  price: "₪99 / شهرياً",
                  desc: "خصّص لمحلك مكاناً دائماً في «القسم 2: عروض المتاجر الموثّقة» مع شارة التوثيق الخضراء.",
                  perks: [
                    "شارة «تاجر موثّق ✓» على جميع إعلاناتك",
                    "ظهور مستقل في قسم المتاجر الموثّقة",
                    "ربط مباشر مع صفحة محلك في دليل رهط",
                  ],
                  featured: true,
                },
                {
                  badge: "🚀 للمعارض والشركات",
                  title: "باقة المعارض والوكالات الذهبية",
                  price: "₪199 / شهرياً",
                  desc: "مخصّصة لمعارض السيارات، مكاتب العقارات، ومحلات الإلكترونيات والأثاث الكبرى في رهط والنقب.",
                  perks: [
                    "نشر إعلانات عروض غير محدودة شهرياً",
                    "تثبيت 3 عروض VIP في نفس الوقت",
                    "دعم مباشر وتصميم بطاقة المتجر",
                  ],
                },
              ].map((pkg) => (
                <div
                  key={pkg.title}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
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
                      {tr(pkg.badge)}
                    </span>
                    <h3 className="mt-2 text-base font-extrabold">
                      {tr(pkg.title)}
                    </h3>
                    <p
                      className={`mt-1 text-xl font-extrabold ${
                        pkg.featured ? "text-primary" : "text-ink"
                      }`}
                    >
                      {pkg.price}
                    </p>
                    <p
                      className={`mt-1.5 text-xs font-semibold leading-relaxed ${
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
      </div>

      <div className="mt-6">
        <StoreFooterLinks />
      </div>
    </Shell>
  );
}

function cleanFilter(v: unknown): SpecFilter | undefined {
  if (!v || typeof v !== "object") return undefined;
  const out: SpecFilter = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>).slice(
    0,
    20,
  ))
    if (
      /^[a-z]{2,16}(_min|_max)?$/.test(k) &&
      (typeof val === "string" || typeof val === "number") &&
      String(val)
    )
      out[k] = String(val).slice(0, 40);
  return Object.keys(out).length ? out : undefined;
}

/** Filters built from the category's spec config (select → dropdown, number → range / max). */
function SpecFilters({
  cat,
  f,
  onChange,
}: {
  cat: HarajCategory | undefined;
  f: SpecFilter;
  onChange: (f: SpecFilter) => void;
}) {
  const fields = (cat?.fields ?? []).filter((x) => x.filter);
  if (!fields.length) return null;
  const put = (k: string, v: string) => {
    const next = { ...f };
    if (v) next[k] = v;
    else delete next[k];
    onChange(next);
  };
  const num = (k: string, ph: string) => (
    <input
      key={k}
      className="field text-xs"
      inputMode="numeric"
      placeholder={ph}
      aria-label={ph}
      defaultValue={f[k] ?? ""}
      onBlur={(e) => put(k, e.target.value.replace(/[^\d]/g, ""))}
    />
  );
  return (
    <div
      className="grid grid-cols-2 gap-2 rounded-xl bg-surface p-2.5 sm:grid-cols-4"
      aria-label={tr("فلاتر {0}", catName(cat))}
    >
      {fields.flatMap((x) =>
        x.type === "select"
          ? [
              <select
                key={x.key}
                className="field text-xs"
                value={f[x.key] ?? ""}
                onChange={(e) => put(x.key, e.target.value)}
                aria-label={fieldLabel(x)}
              >
                <option value="">{tr("{0}: الكل", fieldLabel(x))}</option>
                {(x.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {optionLabel(x, o)}
                  </option>
                ))}
              </select>,
            ]
          : x.filter === "max"
            ? [num(`${x.key}_max`, tr("{0} حتى", fieldLabel(x)))]
            : [
                num(`${x.key}_min`, tr("{0} من", fieldLabel(x))),
                num(`${x.key}_max`, tr("{0} إلى", fieldLabel(x))),
              ],
      )}
    </div>
  );
}
