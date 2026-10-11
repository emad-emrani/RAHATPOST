import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/shell";
import { articles, categories } from "@/data/content";

export const Route = createFileRoute("/news")({
  head: () => ({ meta: [{ title: "الأخبار · رهط بوست" }] }),
  component: NewsPage,
});

function NewsPage() {
  const [cat, setCat] = useState("الكل");
  const list = articles.filter((item) => cat === "الكل" || item.category === cat);

  return (
    <Shell>
      <h1 className="mb-3 text-3xl font-bold">الأخبار</h1>
      <div className="scroll-row mb-4">
        {["الكل", ...categories].map((item) => (
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
      {list.length === 0 ? (
        <p className="stamp p-4 font-semibold">لا خبر في هذا التصنيف اليوم.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((item) => (
            <li key={item.slug}>
              <Link to="/news/$slug" params={{ slug: item.slug }} className="stamp press block p-4">
                <span className={item.breaking ? "chip chip-deep" : "chip"}>{item.breaking ? "عاجل" : item.category}</span>
                <span className="mt-2 block text-xl font-bold">{item.title}</span>
                <span className="text-sm font-semibold text-muted">
                  {item.time} · {item.source}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
