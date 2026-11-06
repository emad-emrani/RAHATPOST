import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeCheck,
  ChevronLeft,
  Clock,
  Flame,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { GuideCard } from "@/components/guide";
import { OsmCredit } from "@/components/osm-credit";
import { Shell } from "@/components/shell";
import { guides } from "@/data/guides";
import { getApprovedEntries } from "@/lib/directory/api";
import { categoryOrder, osmEntries, type DirectoryEntry } from "@/lib/directory/types";
import { tr, trv } from "@/lib/i18n/core";
import { mediaUrl } from "@/lib/media/types";
import { breadcrumbLd, seo } from "@/lib/seo";

type DirectoryStyleMode = "cards" | "showcase" | "grid" | "carousel" | "compact" | "dark_gold";

type ShopHubSummaryEntry = {
  slug: string;
  isCustomShop?: boolean;
  customName?: string;
  customCategory?: string;
  customArea?: string;
  customAddress?: string;
  customPhone?: string;
  customOpeningHours?: string;
  customDescription?: string;
  logoKey?: string;
  coverKey?: string;
  verified?: boolean;
  featured?: boolean;
  supervisorName?: string;
  products: { id: string; name: string; price: string; imageKey?: string }[];
  campaigns: {
    id: string;
    title: string;
    subtitle: string;
    discountBadge: string;
    validUntil?: string;
    imageKey?: string;
    active: boolean;
  }[];
};

export const Route = createFileRoute("/directory/")({
  head: () =>
    seo({
      title: tr("دليل محلات وخدمات رهط: المتاجر، العروض، والمطاعم · رهط بوست"),
      description:
        tr("دليل محلات وخدمات مدينة رهط بالنقب: تصفح المتاجر الموثقة، المنتجات، حملات العروض والتخفيضات، المطاعم، البقالات، العيادات والخدمات مع الخريطة والتواصل المباشر."),
      path: "/directory",
      keywords: [
        "دليل رهط",
        "محلات رهط",
        "عروض رهط",
        "مطاعم رهط",
        "صيدليات رهط",
        "عيادات رهط",
        "مدارس رهط",
        "مساجد رهط",
      ],
      jsonLd: [breadcrumbLd([{ name: tr("دليل محلات وخدمات رهط"), path: "/directory" }])],
    }),
  loader: () => getApprovedEntries(),
  staleTime: 60_000,
  component: DirectoryPage,
});

function shopImgSrc(v?: string | null): string {
  if (!v) return "";
  if (v.startsWith("data:image/") || v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/")) return v;
  return mediaUrl(v);
}

function DirectoryPage() {
  const approved = Route.useLoaderData();
  const [hubMap, setHubMap] = useState<Record<string, ShopHubSummaryEntry>>({});
  const [styleMode, setStyleMode] = useState<DirectoryStyleMode>("cards");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("الكل");
  const [filterMode, setFilterMode] = useState<"all" | "verified" | "offers" | "products">("all");
  const [showGuides, setShowGuides] = useState(false);

  useEffect(() => {
    let active = true;
    try {
      const cached = window.localStorage.getItem("rp_latest_shop_hub");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.shops) setHubMap(parsed.shops);
        if (parsed?.globalSettings?.directoryStyle) {
          setStyleMode(parsed.globalSettings.directoryStyle);
        }
      }
    } catch {}
    const load = () => {
      fetch(`/api/media?kind=shop-hub&_t=${Date.now()}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!active || !d?.ok) return;
          if (d.shops) setHubMap(d.shops);
          if (d.globalSettings?.directoryStyle) {
            setStyleMode(d.globalSettings.directoryStyle);
          }
        })
        .catch(() => {});
    };
    load();
    window.addEventListener("rp-shop-hub-updated", load);
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.removeEventListener("rp-shop-hub-updated", load);
      window.removeEventListener("focus", load);
    };
  }, []);

  const all = useMemo(() => {
    const baseList = [...approved.entries, ...osmEntries()];
    const seen = new Set<string>();
    const merged: (DirectoryEntry & {
      coverKey?: string;
      featured?: boolean;
      supervisorName?: string;
      productsCount: number;
      activeCampaigns: ShopHubSummaryEntry["campaigns"];
    })[] = [];

    for (const item of baseList) {
      seen.add(item.slug);
      const cfg = hubMap[item.slug];
      const activeCamps = (cfg?.campaigns ?? []).filter((c) => c.active);
      merged.push({
        ...item,
        name: cfg?.customName || item.name,
        category: cfg?.customCategory || item.category,
        area: cfg?.customArea || item.area,
        address: cfg?.customAddress || item.address,
        phone: cfg?.customPhone || item.phone,
        openingHours: cfg?.customOpeningHours || item.openingHours,
        description: cfg?.customDescription || item.description,
        photo: cfg?.logoKey || item.photo,
        coverKey: cfg?.coverKey,
        verified: cfg?.verified !== undefined ? cfg.verified : item.verified,
        featured: cfg?.featured,
        supervisorName: cfg?.supervisorName,
        productsCount: cfg?.products?.length ?? 0,
        activeCampaigns: activeCamps,
      });
    }

    for (const [slug, cfg] of Object.entries(hubMap)) {
      if (seen.has(slug) || !cfg.isCustomShop || !cfg.customName) continue;
      const activeCamps = (cfg.campaigns ?? []).filter((c) => c.active);
      merged.push({
        slug,
        name: cfg.customName,
        category: cfg.customCategory || "خدمات",
        source: "owner",
        verified: cfg.verified !== false,
        area: cfg.customArea,
        address: cfg.customAddress,
        phone: cfg.customPhone,
        openingHours: cfg.customOpeningHours,
        description: cfg.customDescription,
        photo: cfg.logoKey,
        coverKey: cfg.coverKey,
        featured: cfg.featured,
        supervisorName: cfg.supervisorName,
        productsCount: cfg.products?.length ?? 0,
        activeCampaigns: activeCamps,
      });
    }

    return merged.sort((a, b) => {
      const score = (x: (typeof merged)[number]) =>
        (x.featured ? 100 : 0) +
        (x.activeCampaigns.length > 0 ? 50 : 0) +
        (x.productsCount > 0 ? 30 : 0) +
        (x.photo ? 15 : 0) +
        (x.verified ? 10 : 0);
      return score(b) - score(a);
    });
  }, [approved.entries, hubMap]);

  const activeOffersAcrossShops = useMemo(() => {
    const out: {
      shopSlug: string;
      shopName: string;
      shopLogo?: string;
      camp: ShopHubSummaryEntry["campaigns"][number];
    }[] = [];
    for (const shop of all) {
      for (const camp of shop.activeCampaigns) {
        out.push({
          shopSlug: shop.slug,
          shopName: shop.name,
          shopLogo: shop.photo,
          camp,
        });
      }
    }
    return out.slice(0, 8);
  }, [all]);

  const cats = useMemo(
    () => [tr("الكل"), ...categoryOrder.filter((c) => all.some((e) => e.category === c))],
    [all],
  );

  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    return all.filter((item) => {
      const hay = [item.name, item.altName, item.category, item.address, item.area, item.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (query && !hay.includes(query)) return false;
      if (cat !== "الكل" && item.category !== cat) return false;
      if (filterMode === "verified" && !item.verified) return false;
      if (filterMode === "offers" && item.activeCampaigns.length === 0) return false;
      if (filterMode === "products" && item.productsCount === 0) return false;
      return true;
    });
  }, [all, q, cat, filterMode]);

  const isDarkGold = styleMode === "dark_gold";

  return (
    <Shell>
      <div className="flex flex-col gap-5">
        {/* Hero Header Banner */}
        <header className="stamp overflow-hidden border-2 border-primary bg-gradient-to-b from-primary-soft/75 via-paper to-paper p-4 sm:p-5 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-13 shrink-0 place-items-center rounded-2xl bg-ink text-primary shadow-sm">
                <Store className="size-7" aria-hidden />
              </span>
              <div>
                <h1 className="text-xl font-extrabold text-ink sm:text-2xl">
                  {tr("دليل محلات وخدمات رهط")}
                </h1>
                <p className="mt-0.5 text-xs font-semibold text-muted sm:text-sm">
                  {trv(all.length)} {tr("محل ومصلحة تجارية وخدمية في رهط · تصفح المنتجات وحملات العروض")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowGuides((v) => !v)}
                className="btn btn-ghost py-2 text-xs font-extrabold"
              >
                📮 {showGuides ? tr("إخفاء أدلة الخدمات") : tr("أدلة البريد والخدمات")}
              </button>
              <Link
                to="/submit"
                search={{ mode: "نشاط" }}
                className="btn py-2 text-xs font-extrabold"
              >
                <Plus className="size-4" aria-hidden />
                {tr("أضف محلك مجاناً")}
              </Link>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative mt-4">
            <Search
              className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              type="search"
              className="field w-full ps-10 text-sm"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder={tr("ابحث باسم المحل، المطعم، الصيدلية، الحي أو نوع الخدمة...")}
            />
          </div>

          {/* Filter Mode Pills */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all" as const, label: "🏪 كل المحلات" },
                { id: "verified" as const, label: "✓ محلات موثّقة" },
                { id: "offers" as const, label: "🔥 حملات عروض وتخفيضات" },
                { id: "products" as const, label: "🛍️ محلات تعرض منتجاتها" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterMode(f.id)}
                  className={`press rounded-full px-3 py-1.5 text-xs font-extrabold transition ${
                    filterMode === f.id
                      ? "bg-ink text-paper shadow-2xs"
                      : "border border-line bg-paper text-ink hover:border-primary"
                  }`}
                >
                  {trv(f.label)}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Expandable Official Service Guides */}
        {showGuides ? (
          <section aria-label={tr("أدلة الخدمات")}>
            <ul className="grid gap-3 sm:grid-cols-2">
              {guides.map((g) => (
                <li key={g.slug}>
                  <GuideCard guide={g} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Active Promotional Campaigns Across Rahat Shops */}
        {activeOffersAcrossShops.length > 0 ? (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-base font-extrabold text-ink sm:text-lg">
                <Flame className="size-5 text-alert" aria-hidden />
                {tr("حملات العروض والتخفيضات في محلات رهط")}
              </h2>
              <span className="rounded-full bg-alert/10 px-2.5 py-0.5 text-xs font-extrabold text-alert">
                {trv(activeOffersAcrossShops.length)} {tr("عرض")}
              </span>
            </div>

            <div className="scroll-row -mx-4 px-4 pb-2 sm:mx-0 sm:px-0">
              {activeOffersAcrossShops.map(({ shopSlug, shopName, shopLogo, camp }) => (
                <Link
                  key={`${shopSlug}-${camp.id}`}
                  to="/directory/$slug"
                  params={{ slug: shopSlug }}
                  className="stamp press w-72 shrink-0 border-2 border-primary bg-gradient-to-br from-primary-soft/70 via-paper to-paper p-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {shopLogo ? (
                        <img
                          src={shopImgSrc(shopLogo)}
                          alt={shopName}
                          className="size-8 shrink-0 rounded-xl border border-line object-cover"
                        />
                      ) : (
                        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-primary text-ink">
                          <Store className="size-4" />
                        </span>
                      )}
                      <span className="truncate text-xs font-extrabold text-ink">{trv(shopName)}</span>
                    </div>
                    <span className="shrink-0 rounded-full bg-alert px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                      {trv(camp.discountBadge)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-1 text-sm font-extrabold text-ink">{trv(camp.title)}</p>
                  {camp.subtitle ? (
                    <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-muted">
                      {trv(camp.subtitle)}
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* Category Filter Tiles */}
        <div className="scroll-row -mx-4 px-4 pb-1" role="group" aria-label={tr("التصنيفات")}>
          {cats.map((item) => (
            <button
              key={item}
              type="button"
              className="tile"
              aria-pressed={item === cat}
              onClick={() => setCat(item)}
            >
              <span className="tile-icon">
                <CategoryIcon category={item} className="size-7" />
              </span>
              {trv(item)}
            </button>
          ))}
        </div>

        {/* Shops List / Grid according to selected styleMode */}
        {list.length === 0 ? (
          <div className="stamp p-6 text-center space-y-2">
            <p className="font-extrabold text-ink">
              {filterMode !== "all"
                ? tr("لا توجد محلات مطابقة لهذا الفلتر حالياً.")
                : tr("لا يوجد محل يطابق بحثك.")}
            </p>
            <button
              type="button"
              onClick={() => {
                setQ("");
                setCat("الكل");
                setFilterMode("all");
              }}
              className="btn btn-ghost py-1.5 text-xs font-extrabold"
            >
              {tr("عرض جميع المحلات")}
            </button>
          </div>
        ) : styleMode === "showcase" ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((item) => {
              const hasOffer = item.activeCampaigns.length > 0;
              return (
                <li key={item.slug}>
                  <Link
                    to="/directory/$slug"
                    params={{ slug: item.slug }}
                    className="stamp press group flex h-full flex-col overflow-hidden p-0 transition hover:border-primary"
                  >
                    <div className="relative h-28 w-full bg-gradient-to-l from-ink via-[#1e293b] to-ink overflow-hidden">
                      {item.coverKey ? (
                        <img
                          src={shopImgSrc(item.coverKey)}
                          alt={item.name}
                          className="size-full object-cover opacity-85 transition group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="size-full bg-[radial-gradient(circle_at_80%_20%,#f2c94c40,transparent_65%)]" />
                      )}
                      {hasOffer ? (
                        <span className="absolute top-3 end-3 rounded-full bg-alert px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
                          🔥 {trv(item.activeCampaigns[0].discountBadge)}
                        </span>
                      ) : null}
                      {item.verified ? (
                        <span className="absolute top-3 start-3 rounded-full bg-ink/85 px-2.5 py-0.5 text-[10px] font-extrabold text-primary backdrop-blur-xs">
                          ✓ {tr("موثّق")}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col justify-between p-4 pt-2.5">
                      <div className="flex items-start gap-3">
                        <div className="-mt-8 shrink-0">
                          {item.photo ? (
                            <img
                              src={shopImgSrc(item.photo)}
                              alt={item.name}
                              className="size-16 rounded-2xl border-2 border-paper bg-paper object-cover shadow-md"
                              loading="lazy"
                            />
                          ) : (
                            <span className="grid size-16 place-items-center rounded-2xl border-2 border-paper bg-primary text-ink shadow-md">
                              <CategoryIcon category={item.category} className="size-7" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-base font-extrabold text-ink">{trv(item.name)}</h3>
                          <p className="truncate text-xs font-bold text-muted">
                            {trv(item.category)}
                            {item.address || item.area ? ` · ${trv(item.address || item.area || "")}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5 text-xs font-extrabold">
                        <span className="text-muted">
                          {item.productsCount > 0
                            ? `🛍️ ${trv(item.productsCount)} ${tr("منتج")}`
                            : tr("صفحة المحل والخدمات")}
                        </span>
                        <span className="text-primary-ink">{tr("زيارة المحل ←")}</span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : styleMode === "grid" ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((item) => {
              const hasOffer = item.activeCampaigns.length > 0;
              return (
                <li key={item.slug}>
                  <Link
                    to="/directory/$slug"
                    params={{ slug: item.slug }}
                    className={`stamp press flex h-full flex-col items-center justify-between p-4 text-center transition ${
                      item.featured || hasOffer
                        ? "border-2 border-primary bg-primary-soft/35"
                        : "hover:border-primary"
                    }`}
                  >
                    <div className="relative">
                      {item.photo ? (
                        <img
                          src={shopImgSrc(item.photo)}
                          alt={item.name}
                          className="size-18 rounded-2xl border-2 border-primary/60 bg-paper object-cover shadow-2xs"
                          loading="lazy"
                        />
                      ) : (
                        <span className="icon-badge size-18 rounded-2xl bg-primary-soft text-primary-ink">
                          <CategoryIcon category={item.category} className="size-8" />
                        </span>
                      )}
                      {item.verified ? (
                        <span className="absolute -bottom-1 -end-1 grid size-5 place-items-center rounded-full bg-ink text-[10px] font-extrabold text-primary">
                          ✓
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2.5 w-full space-y-0.5">
                      <p className="truncate text-sm font-extrabold text-ink">{trv(item.name)}</p>
                      <p className="truncate text-xs font-bold text-muted">{trv(item.category)}</p>
                    </div>
                    {hasOffer ? (
                      <span className="mt-2 rounded-full bg-alert px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                        🔥 {trv(item.activeCampaigns[0].discountBadge)}
                      </span>
                    ) : item.productsCount > 0 ? (
                      <span className="mt-2 rounded-full bg-primary-soft px-2.5 py-0.5 text-[10px] font-extrabold text-primary-ink">
                        🛍️ {trv(item.productsCount)} {tr("منتج")}
                      </span>
                    ) : (
                      <span className="mt-2 rounded-full bg-surface px-2.5 py-0.5 text-[10px] font-bold text-muted">
                        {tr("فتح المحل")}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : styleMode === "compact" ? (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper shadow-2xs">
            {list.map((item) => {
              const hasOffer = item.activeCampaigns.length > 0;
              return (
                <li key={item.slug}>
                  <Link
                    to="/directory/$slug"
                    params={{ slug: item.slug }}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-surface/70"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {item.photo ? (
                        <img
                          src={shopImgSrc(item.photo)}
                          alt={item.name}
                          className="size-11 shrink-0 rounded-xl border border-line object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="icon-badge size-11 shrink-0 rounded-xl bg-primary-soft text-primary-ink">
                          <CategoryIcon category={item.category} className="size-5" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-extrabold text-ink sm:text-base">
                            {trv(item.name)}
                          </span>
                          {item.verified ? (
                            <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-extrabold text-paper">
                              ✓ {tr("موثّق")}
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-xs font-semibold text-muted">
                          {trv(item.category)}
                          {item.address || item.area ? ` · ${trv(item.address || item.area || "")}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {hasOffer ? (
                        <span className="rounded-full bg-alert px-2 py-0.5 text-[10px] font-extrabold text-white">
                          🔥 {trv(item.activeCampaigns[0].discountBadge)}
                        </span>
                      ) : null}
                      {item.productsCount > 0 ? (
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-extrabold text-primary-ink">
                          🛍️ {trv(item.productsCount)}
                        </span>
                      ) : null}
                      <ChevronLeft className="size-5 text-muted" aria-hidden />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul
            className={`grid gap-3.5 sm:grid-cols-2 ${
              isDarkGold ? "rounded-3xl bg-[#111827] p-4 border-2 border-[#f2c94c]" : ""
            }`}
          >
            {list.map((item) => {
              const hasOffer = item.activeCampaigns.length > 0;
              return (
                <li key={item.slug}>
                  <Link
                    to="/directory/$slug"
                    params={{ slug: item.slug }}
                    className={`stamp press flex items-center gap-3.5 p-3.5 transition ${
                      isDarkGold
                        ? "border-[#f2c94c]/45 bg-[#1e293b] text-white hover:border-[#f2c94c]"
                        : item.featured || hasOffer
                          ? "border-2 border-primary bg-gradient-to-l from-primary-soft/40 to-paper"
                          : "hover:border-primary"
                    }`}
                  >
                    {item.photo ? (
                      <img
                        src={shopImgSrc(item.photo)}
                        alt={tr("لوجو {0}", item.name)}
                        className="size-16 shrink-0 rounded-2xl border-2 border-primary/60 bg-paper object-cover shadow-2xs"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="icon-badge size-16 shrink-0 rounded-2xl bg-primary-soft text-primary-ink">
                        <CategoryIcon category={item.category} className="size-8" />
                      </span>
                    )}

                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`truncate text-base font-extrabold leading-snug sm:text-lg ${
                            isDarkGold ? "text-white" : "text-ink"
                          }`}
                        >
                          {trv(item.name)}
                        </span>
                        {item.verified ? (
                          <span
                            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                              isDarkGold ? "bg-[#f2c94c] text-[#111827]" : "bg-ink text-paper"
                            }`}
                            title={tr("محل موثّق")}
                          >
                            <BadgeCheck className="size-3 text-primary" aria-hidden />
                            {tr("موثّق")}
                          </span>
                        ) : null}
                      </span>

                      <span className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-muted">
                        <span
                          className={`rounded-lg px-2 py-0.5 ${
                            isDarkGold ? "bg-white/10 text-slate-200" : "bg-surface text-ink"
                          }`}
                        >
                          {trv(item.category)}
                        </span>
                        {hasOffer ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-alert px-2 py-0.5 text-[10px] font-extrabold text-white">
                            <Flame className="size-3" aria-hidden />
                            {trv(item.activeCampaigns[0].discountBadge)}
                          </span>
                        ) : null}
                        {item.productsCount > 0 ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-extrabold text-primary-ink">
                            <ShoppingBag className="size-3" aria-hidden />
                            {trv(item.productsCount)} {tr("منتج")}
                          </span>
                        ) : null}
                        {item.supervisorName ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-[#16A34A]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#15803D]">
                            <ShieldCheck className="size-3" aria-hidden />
                            {tr("إشراف معتمد")}
                          </span>
                        ) : null}
                      </span>

                      {item.address || item.area || item.openingHours ? (
                        <span
                          className={`flex flex-wrap items-center gap-x-2 text-xs font-semibold ${
                            isDarkGold ? "text-slate-300" : "text-muted"
                          }`}
                        >
                          {item.address || item.area ? (
                            <span className="inline-flex items-center gap-1 truncate">
                              <MapPin className="size-3.5 shrink-0 text-primary-ink" aria-hidden />
                              {trv(item.address || item.area || "")}
                            </span>
                          ) : null}
                          {item.openingHours ? (
                            <span className="inline-flex items-center gap-1" dir="ltr">
                              <Clock className="size-3 shrink-0" aria-hidden />
                              {trv(item.openingHours)}
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </span>

                    <ChevronLeft
                      className={`size-5 shrink-0 ${isDarkGold ? "text-[#f2c94c]" : "text-muted"}`}
                      aria-hidden
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {!approved.ok ? (
          <p className="text-sm font-semibold text-muted">{tr("تعذّر تحميل النشاطات الموثّقة الآن.")}</p>
        ) : null}
        <OsmCredit />
      </div>
    </Shell>
  );
}
