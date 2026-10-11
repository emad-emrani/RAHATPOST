import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/shell";
import { NewsCredit, NewsUnavailable } from "@/components/news";
import { NewsImage } from "@/components/news-image";
import { getNews } from "@/lib/news/api";
import { newsByline, relativeTimeAr, useNow } from "@/lib/news/format";
import { newsCategories } from "@/lib/news/types";
import { breadcrumbLd, seo } from "@/lib/seo";

export const Route = createFileRoute("/news/")({
  head: () =>
    seo({
      title: "أخبار رهط والنقب اليوم · رهط بوست",
      description:
        "آخر أخبار رهط والنقب على مدار اليوم: بلدية رهط، التعليم، الصحة، الرياضة والمجتمع من المواقع العربية المحلية، وأخبار يكتبها أهالي رهط في «من القراء».",
      path: "/news",
      jsonLd: [breadcrumbLd([{ name: "أخبار رهط", path: "/news" }])],
    }),
  loader: () => getNews(),
  staleTime: 5 * 60_000,
  component: NewsPage,
});

const LOCAL = "رهط والنقب";

function NewsPage() {
  const data = Route.useLoaderData();
  const now = useNow(data.now);
  const [cat, setCat] = useState("الكل");
  const list = data.items.filter((item) =>
    cat === "الكل" ? true : cat === LOCAL ? item.local : item.category === cat,
  );

  return (
    <Shell>
      <h1 className="mb-3 text-2xl font-bold">الأخبار</h1>
      {data.items.length === 0 ? (
        <NewsUnavailable />
      ) : (
        <>
          <div className="scroll-row -mx-4 mb-4 px-4">
            {["الكل", LOCAL, ...newsCategories].map((item) => (
              <button
                key={item}
                type="button"
                className={item === cat ? "chip chip-ink shrink-0" : "chip shrink-0"}
                onClick={() => setCat(item)}
              >
                {item}
              </button>
            ))}
          </div>
          {list.length === 0 ? (
            <p className="stamp p-4 font-semibold">لا خبر في هذا التصنيف الآن.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {list.map((item) => (
                <li key={item.slug}>
                  <Link
                    to="/news/$slug"
                    params={{ slug: item.slug }}
                    className="stamp press flex items-start gap-3 p-3"
                  >
                    <NewsImage item={item} className="size-22 rounded-xl" iconClassName="size-7" />
                    <span className="min-w-0 flex-1">
                      <span className={item.breaking ? "chip chip-alert" : "chip chip-deep"}>
                        {item.breaking ? "عاجل" : item.reader ? "من القراء" : item.category}
                      </span>
                      <span className="mt-1 line-clamp-3 block font-bold leading-snug">
                        {item.title}
                      </span>
                      <span className="text-sm font-semibold text-muted">
                        {relativeTimeAr(item.publishedAt, now)} · {newsByline(item)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <NewsCredit />
    </Shell>
  );
}
