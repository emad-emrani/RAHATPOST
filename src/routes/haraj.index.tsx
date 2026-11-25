import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  ExternalLink,
  Flame,
  LayoutGrid,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { ListingCard, useHarajName } from "@/components/haraj";
import { Shell } from "@/components/shell";
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
import { CONDITIONS } from "@/lib/market/types";
import { mediaUrl } from "@/lib/media/types";
import { breadcrumbLd, seo } from "@/lib/seo";
import { getStore } from "@/lib/store/api";
import { formatPrice, type Currency, type PublicProduct } from "@/lib/store/types";

type S = {
  q?: string;
  cat?: string;
  cond?: string;
  min?: number;
  max?: number;
  f?: SpecFilter;
};

export type MerchantPromoOffer = {
  id: string;
  title: string;
  merchantName: string;
  greenRibbonText: string;
  priceLabelText: string;
  targetUrl: string;
  imageKey: string | null;
};

export function extractMerchantPromoOffers(
  products: PublicProduct[],
  currency: Currency = "ILS",
  defaultRibbon = "عرض تاجر موثّق ✓",
): MerchantPromoOffer[] {
  return products
    .filter((p) => p.slug.startsWith("offer-"))
    .map((p) => {
      const customUrl = p.shortDesc?.trim() || "/store";
      const ribbon = p.badges?.[0]?.trim() || defaultRibbon;
      const customPrice =
        p.badges?.[1]?.trim() ||
        (p.priceAgorot > 0
          ? formatPrice(p.saleAgorot ?? p.priceAgorot, currency)
          : "");
      return {
        id: p.id,
        title: p.name,
        merchantName: p.description?.trim() || "متجر معتمد في رهط",
        greenRibbonText: ribbon,
        priceLabelText: customPrice,
        targetUrl: customUrl,
        imageKey: p.imageKey,
      };
    });
}

export function extractHubConfig(products: PublicProduct[]): {
  greenSectionTitle: string;
  greenBadgeDefault: string;
  merchantUsers: string[];
} {
  const cfgRow = products.find((p) => p.slug === "hub-cfg-main");
  const fallback = {
    greenSectionTitle: "عروض المتاجر وتجار رهط الموثّقين",
    greenBadgeDefault: "عرض تاجر موثّق ✓",
    merchantUsers: [] as string[],
  };
  if (!cfgRow?.description) return fallback;
  try {
    const parsed = JSON.parse(cfgRow.description) as Partial<typeof fallback>;
    return {
      greenSectionTitle:
        parsed.greenSectionTitle?.trim() || fallback.greenSectionTitle,
      greenBadgeDefault:
        parsed.greenBadgeDefault?.trim() || fallback.greenBadgeDefault,
      merchantUsers: Array.isArray(parsed.merchantUsers)
        ? parsed.merchantUsers.map((x) => String(x).trim().toLowerCase())
        : [],
    };
  } catch {
    return fallback;
  }
}

export const Route = createFileRoute("/haraj/")({
  validateSearch: (s: Record<string, unknown>): S => ({
    q: typeof s.q === "string" && s.q ? s.q.slice(0, 60) : undefined,
    cat: typeof s.cat === "string" && s.cat ? s.cat.slice(0, 30) : undefined,
    cond: (CONDITIONS as readonly string[]).includes(String(s.cond))
      ? String(s.cond)
      : undefined,
    min: Number(s.min) > 0 ? Number(s.min) : undefined,
    max: Number(s.max) > 0 ? Number(s.max) : undefined,
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
      title: tr("حراج رهط · إعلانات الأفراد وسوق المستعمل وعروض المتاجر | رهط بوست"),
      description: tr(
        "بيع واشترِ أغراضاً مستعملة وجديدة في رهط والنقب: سيارات، هواتف، إلكترونيات، أثاث، أجهزة منزلية وعقارات مع عروض المتاجر الموثّقة.",
      ),
      path: "/haraj",
      jsonLd: [breadcrumbLd([{ name: tr("حراج رهط"), path: "/haraj" }])],
    }),
  component: HarajPage,
});

function HarajPage() {
  const { items, ok, cats, store } = Route.useLoaderData();
  const s = Route.useSearch();
  const nav = Route.useNavigate();
  const name = useHarajName();
  const [q, setQ] = useState(s.q ?? "");

  const set = (patch: Partial<S>) =>
    nav({ search: (p: S) => ({ ...p, ...patch }), replace: true });

  const hubCfg = useMemo(
    () => extractHubConfig(store?.products ?? []),
    [store?.products],
  );
  const merchantOffers = useMemo(
    () =>
      extractMerchantPromoOffers(
        store?.products ?? [],
        store?.settings?.currency ?? "ILS",
        hubCfg.greenBadgeDefault,
      ),
    [store?.products, store?.settings?.currency, hubCfg.greenBadgeDefault],
  );

  const hasActiveOffers = merchantOffers.length > 0;
  const isOffersTab = s.cat === "__offers__";

  const list = useMemo(() => {
    const needle = (s.q ?? "").trim().toLowerCase();
    return items.filter(
      (i) =>
        (!s.cat || s.cat === "__offers__" || i.category === s.cat) &&
        (!s.cond || i.condition === s.cond) &&
        (!s.min || (i.price ?? 0) >= s.min) &&
        (!s.max || (i.priceMode === "free" ? 0 : i.price ?? 0) <= s.max) &&
        (!s.cat ||
          s.cat === "__offers__" ||
          matchesSpecs(findCat(cats, s.cat), i.specs, s.f)) &&
        (!needle ||
          `${i.title} ${i.description} ${i.area}`
            .toLowerCase()
            .includes(needle)),
    );
  }, [items, s, cats]);

  return (
    <Shell wide>
      {/* Top Haraj Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-line bg-paper p-4 shadow-2xs">
        <div>
          <h1 className="text-xl font-extrabold sm:text-2xl">
            {trv(name)} · {tr("إعلانات الأفراد وسوق المستعمل")}
          </h1>
          <p className="text-xs font-semibold text-muted sm:text-sm">
            {tr("بيع واشترِ مباشرة في رهط والنقب — اختر القسم من القائمة الدائرية بالأسفل")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/haraj/new"
            className="btn flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold"
          >
            <Plus className="size-4" aria-hidden />
            {tr("أضف إعلان")}
          </Link>
          <Link
            to="/store"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-line bg-surface px-3.5 py-2 text-xs font-extrabold text-ink hover:bg-primary-soft"
          >
            <ShoppingBag className="size-4 text-primary-ink" aria-hidden />
            {tr("المتجر الرسمي")}
          </Link>
          <Link
            to="/my-orders"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-line bg-surface px-3 py-2 text-xs font-extrabold text-ink hover:bg-primary-soft"
          >
            <Package className="size-4" aria-hidden />
            {tr("طلباتي")}
          </Link>
          <Link
            to="/haraj/mine"
            className="rounded-2xl border border-line bg-surface px-3 py-2 text-xs font-extrabold text-ink hover:bg-primary-soft"
          >
            {tr("إعلاناتي")}
          </Link>
        </div>
      </div>

      {/* Circular Horizontal Category List (قائمة دائرية تحمل أيقونة واسم القسم + قسم عروض يتوهج بالأصفر) */}
      <div className="mb-4 rounded-3xl border border-line bg-paper p-4 shadow-2xs">
        <p className="mb-3 text-xs font-extrabold text-muted">
          {tr("أقسام الحراج وعروض المتاجر:")}
        </p>
        <div className="scroll-row -mx-2 gap-3.5 px-2 pb-1">
          {/* 1. "الكل" Circle */}
          <button
            type="button"
            onClick={() => set({ cat: undefined, f: undefined })}
            className="group flex shrink-0 flex-col items-center gap-1.5"
          >
            <span
              className={`grid size-16 place-items-center rounded-full border-2 text-xl transition ${
                !s.cat
                  ? "border-ink bg-ink text-paper shadow-md scale-105"
                  : "border-line bg-surface text-ink group-hover:border-primary group-hover:bg-primary/20"
              }`}
            >
              <LayoutGrid className="size-6" aria-hidden />
            </span>
            <span
              className={`text-xs font-extrabold ${
                !s.cat ? "text-ink" : "text-muted"
              }`}
            >
              {tr("الكل")}
            </span>
          </button>

          {/* 2. "عروض" Circle — Glows in Bright Yellow (#f2c94c) when Merchant Offers exist! */}
          <button
            type="button"
            onClick={() =>
              set({
                cat: isOffersTab ? undefined : "__offers__",
                f: undefined,
              })
            }
            className="group relative flex shrink-0 flex-col items-center gap-1.5"
          >
            <span
              className={`relative grid size-16 place-items-center rounded-full border-2 text-xl transition ${
                isOffersTab
                  ? "border-ink bg-[#f2c94c] text-ink shadow-[0_0_24px_rgba(242,201,76,0.95)] scale-105"
                  : hasActiveOffers
                    ? "border-[#f2c94c] bg-[#f2c94c]/30 text-ink ring-4 ring-[#f2c94c]/60 shadow-[0_0_20px_rgba(242,201,76,0.85)] animate-pulse"
                    : "border-line bg-surface text-ink group-hover:border-primary"
              }`}
            >
              <Flame
                className={`size-6 ${
                  hasActiveOffers ? "text-amber-600" : "text-muted"
                }`}
                aria-hidden
              />
              {hasActiveOffers ? (
                <span className="absolute -top-1 -end-1 grid min-w-5 place-items-center rounded-full bg-[#16A34A] px-1.5 py-0.5 text-[10px] font-extrabold text-white shadow-2xs">
                  {merchantOffers.length}
                </span>
              ) : null}
            </span>
            <span
              className={`flex items-center gap-0.5 text-xs font-extrabold ${
                hasActiveOffers || isOffersTab
                  ? "text-amber-800"
                  : "text-muted"
              }`}
            >
              <Sparkles className="size-3 text-amber-500" aria-hidden />
              {tr("عروض")}
            </span>
          </button>

          {/* 3. All Haraj Categories (سيارات، هواتف، أجهزة، أثاث...) as Circular Icons */}
          {cats
            .filter((c) => c.enabled)
            .map((c) => {
              const active = s.cat === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() =>
                    set({
                      cat: active ? undefined : c.key,
                      f: undefined,
                    })
                  }
                  className="group flex shrink-0 flex-col items-center gap-1.5"
                >
                  <span
                    className={`grid size-16 place-items-center rounded-full border-2 text-2xl transition ${
                      active
                        ? "border-ink bg-primary text-ink shadow-md scale-105"
                        : "border-line bg-surface text-ink group-hover:border-primary group-hover:bg-primary/20"
                    }`}
                  >
                    {c.icon}
                  </span>
                  <span
                    className={`max-w-20 truncate text-xs font-extrabold ${
                      active ? "text-ink" : "text-muted"
                    }`}
                  >
                    {catName(c)}
                  </span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Promotional Merchant Offers Section (Shown at top or when "عروض" circle is clicked) */}
      {(hasActiveOffers && (!s.cat || isOffersTab)) || isOffersTab ? (
        <section
          aria-label={trv(hubCfg.greenSectionTitle)}
          className="mb-5 rounded-3xl border-2 border-[#16A34A]/50 bg-paper p-4 shadow-xs"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#16A34A] px-4 py-2.5 text-white shadow-2xs">
            <div className="flex items-center gap-2">
              <BadgeCheck className="size-5 shrink-0" aria-hidden />
              <h2 className="text-sm font-extrabold sm:text-base">
                {trv(hubCfg.greenSectionTitle)}
              </h2>
            </div>
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-extrabold">
              {tr("عرض إعلاني معتمد")}
            </span>
          </div>

          {merchantOffers.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {merchantOffers.map((offer) => {
                const isExternal = /^https?:\/\//i.test(offer.targetUrl);
                return (
                  <a
                    key={offer.id}
                    href={offer.targetUrl}
                    target={isExternal ? "_blank" : undefined}
                    rel={isExternal ? "noopener noreferrer" : undefined}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border-2 border-[#16A34A]/35 bg-surface transition hover:-translate-y-0.5 hover:border-[#16A34A] hover:shadow-md"
                  >
                    {/* Customizable Green Ribbon */}
                    <div className="flex items-center justify-between gap-2 bg-[#16A34A] px-3 py-1.5 text-xs font-extrabold text-white">
                      <span className="inline-flex items-center gap-1 truncate">
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
                        <div className="grid size-full place-items-center bg-gradient-to-br from-[#16A34A]/15 to-primary/25 p-4 text-center">
                          <span className="text-lg font-extrabold text-ink">
                            {trv(offer.title)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-1 items-center justify-between gap-2 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-extrabold text-ink">
                          {trv(offer.title)}
                        </p>
                        <p className="truncate text-xs font-bold text-muted">
                          {trv(offer.merchantName)}
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[#16A34A]/10 px-2.5 py-1.5 text-xs font-extrabold text-[#16A34A] group-hover:bg-[#16A34A] group-hover:text-white">
                        <span>{tr("فتح العرض")}</span>
                        <ExternalLink className="size-3.5" aria-hidden />
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="rounded-2xl bg-surface p-4 text-center text-xs font-bold text-muted">
              {tr("لا توجد عروض متاجر إعلانية مضافة حالياً.")}
            </p>
          )}
        </section>
      ) : null}

      {/* Search & Filters for Individual Haraj Listings */}
      {!isOffersTab ? (
        <>
          <form
            className="relative mb-3"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              set({ q: q.trim() || undefined });
            }}
          >
            <Search
              className="pointer-events-none absolute inset-y-0 start-3 my-auto size-5 text-muted"
              aria-hidden
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              type="search"
              className="field ps-10"
              placeholder={tr("ابحث في الحراج…")}
              aria-label={tr("ابحث في الحراج…")}
            />
          </form>

          <div className="mb-4 grid grid-cols-3 gap-2">
            <select
              className="field"
              value={s.cond ?? ""}
              onChange={(e) => set({ cond: e.target.value || undefined })}
              aria-label={tr("الحالة")}
            >
              <option value="">{tr("كل الحالات")}</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {trv(c)}
                </option>
              ))}
            </select>
            <input
              className="field"
              inputMode="numeric"
              placeholder={tr("من ₪")}
              defaultValue={s.min ?? ""}
              onBlur={(e) => set({ min: Number(e.target.value) || undefined })}
              aria-label={tr("أقل سعر")}
            />
            <input
              className="field"
              inputMode="numeric"
              placeholder={tr("إلى ₪")}
              defaultValue={s.max ?? ""}
              onBlur={(e) => set({ max: Number(e.target.value) || undefined })}
              aria-label={tr("أعلى سعر")}
            />
          </div>

          {s.cat ? (
            <SpecFilters
              key={s.cat}
              cat={findCat(cats, s.cat)}
              f={s.f ?? {}}
              onChange={(f) =>
                set({ f: Object.keys(f).length ? f : undefined })
              }
            />
          ) : null}

          {!ok ? (
            <p className="stamp mb-3 p-3 font-semibold">
              {tr("تعذّر تحميل الإعلانات الآن.")}
            </p>
          ) : null}

          {list.length ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {list.map((i) => (
                <li key={i.id}>
                  <ListingCard item={i} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="stamp flex flex-col items-center gap-3 p-6 text-center">
              <p className="font-bold">
                {items.length
                  ? tr("لا نتائج تطابق البحث.")
                  : tr("لا إعلانات بعد. كن أول من يعرض غرضاً للبيع!")}
              </p>
              <Link to="/haraj/new" className="btn">
                {tr("أضف إعلان")}
              </Link>
            </div>
          )}
        </>
      ) : null}
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
      className="field"
      inputMode="numeric"
      placeholder={ph}
      aria-label={ph}
      defaultValue={f[k] ?? ""}
      onBlur={(e) => put(k, e.target.value.replace(/[^\d]/g, ""))}
    />
  );
  return (
    <div
      className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-paper p-2 sm:grid-cols-4"
      aria-label={tr("فلاتر {0}", catName(cat))}
    >
      {fields.flatMap((x) =>
        x.type === "select"
          ? [
              <select
                key={x.key}
                className="field"
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
