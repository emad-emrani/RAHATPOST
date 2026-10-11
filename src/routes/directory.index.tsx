import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { GuideCard } from "@/components/guide";
import { guides } from "@/data/guides";
import { mediaUrl } from "@/lib/media/types";
import { OsmCredit } from "@/components/osm-credit";
import { Shell } from "@/components/shell";
import { getApprovedEntries } from "@/lib/directory/api";
import { categoryOrder, osmEntries } from "@/lib/directory/types";
import { breadcrumbLd, seo } from "@/lib/seo";

export const Route = createFileRoute("/directory/")({
  head: () =>
    seo({
      title: "دليل رهط: محلات ومطاعم وخدمات في رهط · رهط بوست",
      description:
        "دليل رهط للأعمال والخدمات: مطاعم ومقاهي، بقالات، عيادات وصحة، مدارس، مساجد، ورش وسيارات وغيرها في مدينة رهط بالنقب، مع العنوان والخريطة.",
      path: "/directory",
      jsonLd: [breadcrumbLd([{ name: "دليل رهط", path: "/directory" }])],
    }),
  loader: () => getApprovedEntries(),
  staleTime: 60_000,
  component: DirectoryPage,
});

function DirectoryPage() {
  const approved = Route.useLoaderData();
  const all = useMemo(() => [...approved.entries, ...osmEntries()], [approved.entries]);
  const cats = useMemo(
    () => ["الكل", ...categoryOrder.filter((c) => all.some((e) => e.category === c))],
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
      <h1 className="mb-1 text-2xl font-bold">الدليل</h1>
      <p className="mb-3 font-semibold text-muted">{all.length} مكاناً ونشاطاً في رهط.</p>
      <ul className="mb-4 flex flex-col gap-3" aria-label="أدلة الخدمات">
        {guides.map((g) => (
          <li key={g.slug}>
            <GuideCard guide={g} />
          </li>
        ))}
      </ul>
      <label className="search-field mb-4 block">
        <span className="sr-only">بحث في الدليل</span>
        <Search className="size-5" aria-hidden />
        <input
          type="search"
          className="field"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="اسم النشاط أو الشارع أو الحي"
        />
      </label>
      <div className="scroll-row -mx-4 mb-3 px-4 pb-1" role="group" aria-label="التصنيفات">
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
            {item}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={verifiedOnly ? "chip chip-ink" : "chip"}
          onClick={() => setVerifiedOnly((value) => !value)}
        >
          موثّق فقط
        </button>
        <Link to="/submit" search={{ mode: "نشاط" }} className="chip chip-deep">
          أضف نشاطك
        </Link>
      </div>
      {list.length === 0 ? (
        <p className="stamp p-4 font-semibold">
          {verifiedOnly && approved.entries.length === 0
            ? "لا توجد نشاطات موثّقة بعد. أضف نشاطك ليظهر هنا بعد المراجعة."
            : "لا نشاط يطابق البحث."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((item) => (
            <li key={item.slug}>
              <Link
                to="/directory/$slug"
                params={{ slug: item.slug }}
                className="stamp press flex items-center gap-3 p-3"
              >
                {item.photo ? (
                  <img
                    src={mediaUrl(item.photo)}
                    alt=""
                    className="thumb size-14 rounded-2xl"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="icon-badge size-14 rounded-2xl">
                    <CategoryIcon category={item.category} className="size-7" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold leading-snug">{item.name}</span>
                  <span className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-muted">
                    {item.category}
                    {item.verified ? <span className="chip chip-ink">موثّق</span> : null}
                  </span>
                  {item.address || item.area || item.openingHours ? (
                    <span className="block text-sm font-semibold text-muted">
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
        <p className="mt-3 text-sm font-semibold">تعذّر تحميل النشاطات الموثّقة الآن.</p>
      ) : null}
      <OsmCredit />
    </Shell>
  );
}
