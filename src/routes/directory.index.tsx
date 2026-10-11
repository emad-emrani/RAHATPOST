import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { OsmCredit } from "@/components/osm-credit";
import { Shell } from "@/components/shell";
import { getApprovedEntries } from "@/lib/directory/api";
import { categoryOrder, osmEntries } from "@/lib/directory/types";

export const Route = createFileRoute("/directory/")({
  head: () => ({ meta: [{ title: "الدليل · رهط بوست" }] }),
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
      const hay = [item.name, item.altName, item.category, item.address, item.area].filter(Boolean).join(" ");
      return (
        (!query || hay.includes(query)) &&
        (cat === "الكل" || item.category === cat) &&
        (!verifiedOnly || item.verified)
      );
    });
  }, [all, q, cat, verifiedOnly]);

  return (
    <Shell>
      <h1 className="mb-1 text-3xl font-bold">الدليل</h1>
      <p className="mb-3 font-semibold text-muted">{all.length} مكاناً ونشاطاً في رهط.</p>
      <input
        className="field mb-3"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="اسم النشاط أو الشارع أو الحي"
      />
      <div className="scroll-row mb-3">
        {cats.map((item) => (
          <button
            key={item}
            type="button"
            className={item === cat ? "chip chip-ink shrink-0" : "chip shrink-0 bg-paper"}
            onClick={() => setCat(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={verifiedOnly ? "chip chip-ink" : "chip bg-paper"}
          onClick={() => setVerifiedOnly((value) => !value)}
        >
          موثّق فقط
        </button>
        <Link to="/submit" search={{ mode: "نشاط" }} className="chip bg-paper">
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
              <Link to="/directory/$slug" params={{ slug: item.slug }} className="stamp press block p-4">
                <span className="chip">{item.category}</span>
                {item.verified ? <span className="chip chip-ink ms-2">موثّق</span> : null}
                <span className="mt-2 block text-xl font-bold">{item.name}</span>
                {item.address || item.area || item.openingHours ? (
                  <span className="font-semibold text-muted">
                    {[item.address || item.area, item.openingHours].filter(Boolean).join(" · ")}
                  </span>
                ) : null}
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
