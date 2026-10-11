import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Shell } from "@/components/shell";
import { businessCategories, businesses } from "@/data/content";

export const Route = createFileRoute("/directory")({
  head: () => ({ meta: [{ title: "الدليل · رهط بوست" }] }),
  component: DirectoryPage,
});

function DirectoryPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("الكل");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const list = useMemo(() => {
    return businesses.filter((item) => {
      const query = q.trim();
      const matchesQuery =
        !query || item.name.includes(query) || item.neighborhood.includes(query) || item.category.includes(query);
      const matchesCat = cat === "الكل" || item.category === cat;
      const matchesVerified = !verifiedOnly || item.verified;
      return matchesQuery && matchesCat && matchesVerified;
    });
  }, [q, cat, verifiedOnly]);

  return (
    <Shell>
      <h1 className="mb-3 text-3xl font-bold">الدليل</h1>
      <input
        className="field mb-3"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        placeholder="اسم النشاط أو الحي"
      />
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="scroll-row">
          {businessCategories.map((item) => (
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
      </div>
      <button
        type="button"
        className={verifiedOnly ? "chip chip-ink mb-4" : "chip mb-4 bg-paper"}
        onClick={() => setVerifiedOnly((value) => !value)}
      >
        موثّق فقط
      </button>
      {list.length === 0 ? (
        <p className="stamp p-4 font-semibold">لا نشاط يطابق البحث.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((item) => (
            <li key={item.slug}>
              <Link to="/directory/$slug" params={{ slug: item.slug }} className="stamp press block p-4">
                <span className="chip">{item.category}</span>
                {item.verified ? <span className="chip chip-ink ms-2">موثّق</span> : null}
                <span className="mt-2 block text-xl font-bold">{item.name}</span>
                <span className="font-semibold text-muted">
                  {item.neighborhood} · {item.open ? "مفتوح" : "مغلق الآن"} · {item.hours}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
