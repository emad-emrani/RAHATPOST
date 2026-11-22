import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Building2,
  Bus,
  ChevronLeft,
  HeartPulse,
  Mail,
  Plus,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { OsmCredit } from "@/components/osm-credit";
import { Shell } from "@/components/shell";
import { guides } from "@/data/guides";
import { getApprovedEntries } from "@/lib/directory/api";
import { categoryOrder, osmEntries } from "@/lib/directory/types";
import { tr, trv } from "@/lib/i18n/core";
import { mediaUrl } from "@/lib/media/types";
import { breadcrumbLd, seo } from "@/lib/seo";

export const Route = createFileRoute("/directory/")({
  head: () =>
    seo({
      title: tr("دليل رهط: محلات ومطاعم وخدمات في رهط · رهط بوست"),
      description: tr(
        "دليل رهط للأعمال والخدمات: مطاعم ومقاهي، بقالات، عيادات وصحة، مدارس، مساجد، ورش وسيارات وغيرها في مدينة رهط بالنقب، مع العنوان والخريطة.",
      ),
      path: "/directory",
      keywords: [
        "دليل رهط",
        "محلات رهط",
        "مطاعم رهط",
        "صيدليات رهط",
        "عيادات رهط",
        "مدارس رهط",
        "مساجد رهط",
      ],
      jsonLd: [breadcrumbLd([{ name: tr("دليل رهط"), path: "/directory" }])],
    }),
  loader: () => getApprovedEntries(),
  staleTime: 60_000,
  component: DirectoryPage,
});

const GUIDE_META = [
  {
    match: ["post", "mail", "بريد"],
    fallbackLabel: "البريد",
    icon: Mail,
    circleClass:
      "bg-gradient-to-br from-rose-50 to-red-100 text-red-600 ring-red-200/80 dark:from-rose-950/60 dark:to-red-900/40 dark:text-red-400 dark:ring-red-800/50",
  },
  {
    match: ["municipality", "muni", "city", "بلدية"],
    fallbackLabel: "البلدية",
    icon: Building2,
    circleClass:
      "bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600 ring-blue-200/80 dark:from-blue-950/60 dark:to-indigo-900/40 dark:text-blue-400 dark:ring-blue-800/50",
  },
  {
    match: ["health", "clinic", "medical", "صحة"],
    fallbackLabel: "الصحة",
    icon: HeartPulse,
    circleClass:
      "bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-600 ring-emerald-200/80 dark:from-emerald-950/60 dark:to-teal-900/40 dark:text-emerald-400 dark:ring-emerald-800/50",
  },
  {
    match: ["bus", "buses", "transport", "باص", "مواصلات"],
    fallbackLabel: "الباصات",
    icon: Bus,
    circleClass:
      "bg-gradient-to-br from-amber-50 to-orange-100 text-amber-600 ring-amber-200/80 dark:from-amber-950/60 dark:to-orange-900/40 dark:text-amber-400 dark:ring-amber-800/50",
  },
] as const;

type GuideLike = {
  slug: string;
  title?: string;
  shortTitle?: string;
  name?: string;
  href?: string;
  path?: string;
};

function resolveGuideVisual(guide: GuideLike, index: number) {
  const haystack = `${guide.slug} ${guide.title ?? ""} ${guide.name ?? ""}`.toLowerCase();
  const matched =
    GUIDE_META.find((meta) => meta.match.some((token) => haystack.includes(token))) ??
    GUIDE_META[index % GUIDE_META.length];

  const label = guide.shortTitle || matched.fallbackLabel;
  // إذا كان مسار الأدلة في مشروعك مختلفاً عن /guides/ يمكنك تعديل السطر التالي
  const href = guide.href || guide.path || `/guides/${guide.slug}`;

  return {
    icon: matched.icon,
    circleClass: matched.circleClass,
    label,
    title: guide.title || guide.name || label,
    href,
  };
}

function DirectoryPage() {
  const approved = Route.useLoaderData();
  const all = useMemo(() => [...approved.entries, ...osmEntries()], [approved.entries]);
  const cats = useMemo(
    () => [tr("الكل"), ...categoryOrder.filter((c) => all.some((e) => e.category === c))],
    [all],
  );
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("الكل");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const list = useMemo(() => {
    const query = q.trim();
    return all.filter((item) => {
      const hay = [item.name, item.altName, item.category, item.address, item.area]
        .filter(Boolean)
        .join(" ");
      return (
        (!query || hay.includes(query)) &&
        (cat === "الكل" || item.category === cat) &&
        (!verifiedOnly || item.verified)
      );
    });
  }, [all, q, cat, verifiedOnly]);

  return (
    <Shell>
      {/* ترويسة الدليل المحدثة */}
      <section className="stamp mb-5 rounded-3xl p-4 sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{tr("الدليل")}</h1>
            <p className="mt-0.5 text-sm font-semibold text-muted">
              {trv(all.length)} {tr("مكاناً ونشاطاً في رهط.")}
            </p>
          </div>
          <Link
            to="/submit"
            search={{ mode: "نشاط" }}
            className="chip chip-deep inline-flex shrink-0 items-center gap-1.5"
          >
            <Plus className="size-4" aria-hidden />
            {tr("أضف نشاطك")}
          </Link>
        </div>

        {/* الأدلة الأربع كأيقونات دائرية في صف واحد */}
        <nav aria-label={tr("أدلة الخدمات")}>
          <ul className="grid grid-cols-4 gap-2 sm:gap-4">
            {guides.map((g, index) => {
              const visual = resolveGuideVisual(g as GuideLike, index);
              const Icon = visual.icon;
              return (
                <li key={g.slug} className="min-w-0">
                  <a
                    href={visual.href}
                    title={trv(visual.title)}
                    className="group flex flex-col items-center gap-2 rounded-2xl py-1.5 text-center transition-transform active:scale-95"
                  >
                    <span
                      className={`flex size-14 items-center justify-center rounded-full shadow-sm ring-1 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md sm:size-16 ${visual.circleClass}`}
                    >
                      <Icon className="size-6 transition-transform duration-200 group-hover:scale-110 sm:size-7" aria-hidden />
                    </span>
                    <span className="line-clamp-1 text-xs font-bold leading-tight sm:text-sm">
                      {tr(visual.label)}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </section>

      {/* شريط البحث السريع */}
      <div className="relative mb-4">
        <label className="search-field block">
          <span className="sr-only">{tr("بحث في الدليل")}</span>
          <Search className="size-5" aria-hidden />
          <input
            type="search"
            className="field"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder={tr("اسم النشاط أو الشارع أو الحي")}
          />
        </label>
        {q ? (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label={tr("مسح البحث")}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:opacity-80"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {/* شريط التصنيفات */}
      <div className="scroll-row -mx-4 mb-3 px-4 pb-1" role="group" aria-label={tr("التصنيفات")}>
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

      {/* شريط التصفية والعدّاد */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 ${verifiedOnly ? "chip chip-ink" : "chip"}`}
            onClick={() => setVerifiedOnly((value) => !value)}
          >
            <ShieldCheck className="size-4" aria-hidden />
            {tr("موثّق فقط")}
          </button>
          {cat !== "الكل" || q || verifiedOnly ? (
            <button
              type="button"
              className="chip"
              onClick={() => {
                setCat("الكل");
                setQ("");
                setVerifiedOnly(false);
              }}
            >
              {tr("إعادة ضبط")}
            </button>
          ) : null}
        </div>
        <span className="text-xs font-semibold text-muted">
          {trv(list.length)} {tr("نتيجة")}
        </span>
      </div>

      {/* قائمة الأنشطة */}
      {list.length === 0 ? (
        <div className="stamp rounded-3xl p-6 text-center font-semibold">
          {verifiedOnly && approved.entries.length === 0
            ? tr("لا توجد نشاطات موثّقة بعد. أضف نشاطك ليظهر هنا بعد المراجعة.")
            : tr("لا نشاط يطابق البحث.")}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((item) => (
            <li key={item.slug}>
              <Link
                to="/directory/$slug"
                params={{ slug: item.slug }}
                className="stamp press flex items-center gap-3.5 rounded-3xl p-3.5 transition-shadow hover:shadow-md"
              >
                {item.photo ? (
                  <img
                    src={mediaUrl(item.photo)}
                    alt={tr("صورة {0}", item.name)}
                    className="thumb size-14 rounded-2xl object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="icon-badge size-14 shrink-0 rounded-2xl">
                    <CategoryIcon category={item.category} className="size-7" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-bold leading-snug sm:text-lg">
                    {trv(item.name)}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-muted sm:text-sm">
                    {trv(item.category)}
                    {item.verified ? <span className="chip chip-ink">{tr("موثّق")}</span> : null}
                  </span>
                  {item.address || item.area || item.openingHours ? (
                    <span className="mt-1 block truncate text-xs font-semibold text-muted sm:text-sm">
                      {[item.address || item.area, item.openingHours].filter(Boolean).join(" · ")}
                    </span>
                  ) : null}
                </span>
                <ChevronLeft className="size-5 shrink-0 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!approved.ok ? (
        <p className="mt-3 text-sm font-semibold">{tr("تعذّر تحميل النشاطات الموثّقة الآن.")}</p>
      ) : null}
      <OsmCredit />
    </Shell>
  );
}
