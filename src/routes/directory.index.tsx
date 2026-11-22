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
import { useEffect, useMemo, useState } from "react";
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
};

type DirectoryStyle = "list" | "grid" | "compact" | "featured";

function normalizeDirectoryStyle(raw: unknown): DirectoryStyle {
  if (typeof raw !== "string") return "list";
  const value = raw.trim().toLowerCase();
  if (["grid", "cards", "card", "grid-2", "2-col", "tiles", "gallery"].includes(value)) {
    return "grid";
  }
  if (["compact", "dense", "mini", "slim", "minimal"].includes(value)) {
    return "compact";
  }
  if (["featured", "showcase", "magazine", "large", "hero", "wide", "modern"].includes(value)) {
    return "featured";
  }
  return "list";
}

function tryParseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function extractDirectoryStyle(payload: unknown, depth = 0): DirectoryStyle | null {
  if (depth > 4 || payload == null) return null;
  const parsed = tryParseJson(payload);

  if (typeof parsed === "string") {
    const lower = parsed.trim().toLowerCase();
    if (
      [
        "list",
        "default",
        "rows",
        "classic",
        "grid",
        "cards",
        "card",
        "tiles",
        "gallery",
        "compact",
        "dense",
        "mini",
        "slim",
        "minimal",
        "featured",
        "showcase",
        "magazine",
        "large",
        "hero",
        "wide",
        "modern",
      ].includes(lower)
    ) {
      return normalizeDirectoryStyle(lower);
    }
    return null;
  }

  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      const found = extractDirectoryStyle(entry, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    const directKeys = ["directoryStyle", "directory_style", "directoryLayout", "directory_layout"];
    for (const key of directKeys) {
      if (typeof obj[key] === "string" && obj[key].trim()) {
        return normalizeDirectoryStyle(obj[key]);
      }
    }

    const nestedKeys = [
      "data",
      "config",
      "settings",
      "appearance",
      "theme",
      "layout",
      "shopHub",
      "shop_hub",
      "payload",
      "meta",
      "metadata",
      "content",
      "value",
      "caption",
      "item",
      "items",
      "entries",
      "media",
    ];
    for (const key of nestedKeys) {
      if (key in obj && obj[key] != null) {
        const found = extractDirectoryStyle(obj[key], depth + 1);
        if (found) return found;
      }
    }
  }

  return null;
}

function resolveGuideVisual(guide: GuideLike, index: number) {
  const haystack = `${guide.slug} ${guide.title ?? ""} ${guide.name ?? ""}`.toLowerCase();
  const matched =
    GUIDE_META.find((meta) => meta.match.some((token) => haystack.includes(token))) ??
    GUIDE_META[index % GUIDE_META.length];

  const label = guide.shortTitle || matched.fallbackLabel;

  return {
    icon: matched.icon,
    circleClass: matched.circleClass,
    label,
    title: guide.title || guide.name || label,
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
  const [directoryStyle, setDirectoryStyle] = useState<DirectoryStyle>("list");

  useEffect(() => {
    const controller = new AbortController();

    async function loadShopHubStyle() {
      try {
        const response = await fetch("/api/media?kind=shop-hub", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const contentType = response.headers.get("content-type") ?? "";
        const data = contentType.includes("application/json")
          ? await response.json()
          : await response.text();
        const detected = extractDirectoryStyle(data);
        if (detected) {
          setDirectoryStyle(detected);
        }
      } catch {
        // الإبقاء على العرض الافتراضي (list) عند تعذّر جلب الإعدادات
      }
    }

    void loadShopHubStyle();
    return () => controller.abort();
  }, []);

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

  const listContainerClass =
    directoryStyle === "grid"
      ? "grid grid-cols-2 gap-3 sm:grid-cols-3"
      : directoryStyle === "featured"
        ? "grid grid-cols-1 gap-4 sm:grid-cols-2"
        : directoryStyle === "compact"
          ? "flex flex-col gap-2"
          : "flex flex-col gap-3";

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

        {/* الأدلة الأربع كأيقونات دائرية في صف واحد مع توجيه صحيح إلى /directory/guide/$guide */}
        <nav aria-label={tr("أدلة الخدمات")}>
          <ul className="grid grid-cols-4 gap-2 sm:gap-4">
            {guides.map((g, index) => {
              const visual = resolveGuideVisual(g as GuideLike, index);
              const Icon = visual.icon;
              return (
                <li key={g.slug} className="min-w-0">
                  <Link
                    to="/directory/guide/$guide"
                    params={{ guide: g.slug }}
                    title={trv(visual.title)}
                    className="group flex flex-col items-center gap-2 rounded-2xl py-1.5 text-center transition-transform active:scale-95"
                  >
                    <span
                      className={`flex size-14 items-center justify-center rounded-full shadow-sm ring-1 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md sm:size-16 ${visual.circleClass}`}
                    >
                      <Icon
                        className="size-6 transition-transform duration-200 group-hover:scale-110 sm:size-7"
                        aria-hidden
                      />
                    </span>
                    <span className="line-clamp-1 text-xs font-bold leading-tight sm:text-sm">
                      {tr(visual.label)}
                    </span>
                  </Link>
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

      {/* قائمة الأنشطة (تتغير ديناميكياً حسب directoryStyle) */}
      {list.length === 0 ? (
        <div className="stamp rounded-3xl p-6 text-center font-semibold">
          {verifiedOnly && approved.entries.length === 0
            ? tr("لا توجد نشاطات موثّقة بعد. أضف نشاطك ليظهر هنا بعد المراجعة.")
            : tr("لا نشاط يطابق البحث.")}
        </div>
      ) : (
        <ul className={listContainerClass} data-directory-style={directoryStyle}>
          {list.map((item) => {
            const metaLine = [item.address || item.area, item.openingHours]
              .filter(Boolean)
              .join(" · ");

            if (directoryStyle === "grid") {
              return (
                <li key={item.slug} className="min-w-0">
                  <Link
                    to="/directory/$slug"
                    params={{ slug: item.slug }}
                    className="stamp press flex h-full flex-col overflow-hidden rounded-3xl transition-shadow hover:shadow-md"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/5">
                      {item.photo ? (
                        <img
                          src={mediaUrl(item.photo)}
                          alt={tr("صورة {0}", item.name)}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className="icon-badge flex h-full w-full items-center justify-center rounded-none">
                          <CategoryIcon category={item.category} className="size-10" />
                        </span>
                      )}
                      {item.verified ? (
                        <span className="chip chip-ink absolute right-2 top-2 text-[11px]">
                          {tr("موثّق")}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col p-3">
                      <span className="line-clamp-1 text-sm font-bold leading-snug sm:text-base">
                        {trv(item.name)}
                      </span>
                      <span className="mt-0.5 line-clamp-1 text-xs font-semibold text-muted">
                        {trv(item.category)}
                      </span>
                      {metaLine ? (
                        <span className="mt-1.5 line-clamp-1 text-[11px] font-semibold text-muted">
                          {metaLine}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              );
            }

            if (directoryStyle === "featured") {
              return (
                <li key={item.slug} className="min-w-0">
                  <Link
                    to="/directory/$slug"
                    params={{ slug: item.slug }}
                    className="stamp press flex h-full flex-col overflow-hidden rounded-3xl transition-shadow hover:shadow-md"
                  >
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/5">
                      {item.photo ? (
                        <img
                          src={mediaUrl(item.photo)}
                          alt={tr("صورة {0}", item.name)}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className="icon-badge flex h-full w-full items-center justify-center rounded-none">
                          <CategoryIcon category={item.category} className="size-12" />
                        </span>
                      )}
                      {item.verified ? (
                        <span className="chip chip-ink absolute right-3 top-3">
                          {tr("موثّق")}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-1 items-center justify-between gap-3 p-4">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-base font-extrabold leading-snug sm:text-lg">
                          {trv(item.name)}
                        </span>
                        <span className="mt-0.5 block truncate text-xs font-semibold text-muted sm:text-sm">
                          {trv(item.category)}
                        </span>
                        {metaLine ? (
                          <span className="mt-1 block truncate text-xs font-semibold text-muted">
                            {metaLine}
                          </span>
                        ) : null}
                      </span>
                      <ChevronLeft className="size-5 shrink-0 text-muted" aria-hidden />
                    </div>
                  </Link>
                </li>
              );
            }

            if (directoryStyle === "compact") {
              return (
                <li key={item.slug}>
                  <Link
                    to="/directory/$slug"
                    params={{ slug: item.slug }}
                    className="stamp press flex items-center gap-2.5 rounded-2xl px-3 py-2.5 transition-shadow hover:shadow-sm"
                  >
                    {item.photo ? (
                      <img
                        src={mediaUrl(item.photo)}
                        alt={tr("صورة {0}", item.name)}
                        className="thumb size-10 shrink-0 rounded-xl object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="icon-badge size-10 shrink-0 rounded-xl">
                        <CategoryIcon category={item.category} className="size-5" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-bold leading-snug sm:text-base">
                          {trv(item.name)}
                        </span>
                        {item.verified ? (
                          <span className="chip chip-ink shrink-0 text-[10px]">
                            {tr("موثّق")}
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-xs font-semibold text-muted">
                        {[trv(item.category), item.address || item.area]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <ChevronLeft className="size-4 shrink-0 text-muted" aria-hidden />
                  </Link>
                </li>
              );
            }

            return (
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
                    {metaLine ? (
                      <span className="mt-1 block truncate text-xs font-semibold text-muted sm:text-sm">
                        {metaLine}
                      </span>
                    ) : null}
                  </span>
                  <ChevronLeft className="size-5 shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {!approved.ok ? (
        <p className="mt-3 text-sm font-semibold">{tr("تعذّر تحميل النشاطات الموثّقة الآن.")}</p>
      ) : null}
      <OsmCredit />
    </Shell>
  );
}
