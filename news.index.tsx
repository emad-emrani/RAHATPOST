import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AdSlots } from "@/components/google-services";
import { Shell } from "@/components/shell";
import { NewsCredit, NewsLead, NewsUnavailable } from "@/components/news";
import { NewsImage } from "@/components/news-image";
import { CommentCount } from "@/components/comment-count";
import { getNews } from "@/lib/news/api";
import { newsByline, relativeTimeAr, useNow } from "@/lib/news/format";
import { newsCategories } from "@/lib/news/types";
import { absoluteUrl, breadcrumbLd, seo } from "@/lib/seo";
import { tr, trv } from "@/lib/i18n/core";
import { localized } from "@/lib/i18n/localize";

export const Route = createFileRoute("/news/")({
  head: ({ loaderData }) => {
    const items = (loaderData?.items ?? []).slice(0, 15);
    const listLd = items.length
      ? {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: tr("أخبار رهط والنقب اليوم · رهط بوست"),
          url: absoluteUrl("/news"),
          inLanguage: "ar",
          mainEntity: {
            "@type": "ItemList",
            itemListElement: items.map((item, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: item.title,
              url: absoluteUrl(`/news/${item.slug}`),
            })),
          },
        }
      : null;
    return seo({
      title: tr("أخبار رهط والنقب اليوم · رهط بوست"),
      description:
        tr("آخر أخبار رهط والنقب على مدار اليوم: بلدية رهط، التعليم، الصحة، الرياضة والمجتمع من المواقع العربية المحلية، وأخبار يكتبها أهالي رهط في «من القراء»."),
      path: "/news",
      keywords: [
        "أخبار رهط",
        "أخبار النقب",
        "رهط بوست",
        "بلدية رهط",
        "أخبار رهط اليوم",
        "عاجل رهط",
      ],
      jsonLd: [
        breadcrumbLd([{ name: tr("أخبار رهط"), path: "/news" }]),
        ...(listLd ? [listLd] : []),
      ],
    });
  },
  loader: async () => localized(await getNews(), (d) => [{ items: d.items, fields: ["title", "summary", "body"] }], "auto"),
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
      <h1 className="mb-1 text-2xl font-bold">{tr("أخبار رهط والنقب")}</h1>
      <p className="mb-3 font-semibold text-muted">
        {tr("تغطية مستمرة لأخبار مدينة رهط وبلدات النقب والمجتمع المحلي على مدار الساعة.")}
      </p>
      {data.items.length === 0 ? (
        <NewsUnavailable />
      ) : (
        <>
          <div className="scroll-row -mx-4 mb-4 px-4">
            {[tr("الكل"), LOCAL, ...newsCategories].map((item) => (
              <button
                key={item}
                type="button"
                className={item === cat ? "chip chip-ink shrink-0" : "chip shrink-0"}
                onClick={() => setCat(item)}
              >
                {trv(item)}
              </button>
            ))}
          </div>
          {list.length === 0 ? (
            <p className="stamp p-4 font-semibold">{tr("لا خبر في هذا التصنيف الآن.")}</p>
          ) : (
            <>
            <NewsLead item={list[0]} now={now} />
            <ul className="flex flex-col gap-3">
              {list.slice(1).map((item, i) => (
                <li key={item.slug}>
                  {i === 4 ? (
                    <div className="mb-3">
                      <AdSlots placement="newsList" />
                    </div>
                  ) : null}
                  <Link
                    to="/news/$slug"
                    params={{ slug: item.slug }}
                    className="stamp press flex items-start gap-3 p-3"
                  >
                    <NewsImage item={item} className="size-22 rounded-xl" iconClassName="size-7" />
                    <span className="min-w-0 flex-1">
                      <span className={item.breaking ? "chip chip-alert" : "chip chip-deep"}>
                        {item.breaking ? tr("عاجل") : item.reader ? tr("من القراء") : trv(item.category)}
                      </span>
                      <span className="mt-1 line-clamp-3 block font-bold leading-snug">
                        {trv(item.title)}
                      </span>
                      <span className="text-sm font-semibold text-muted">
                        {relativeTimeAr(item.publishedAt, now)} · {newsByline(item)}
                        <CommentCount n={item.comments} className="ms-2" />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            </>
          )}
        </>
      )}
      <NewsCredit />
    </Shell>
  );
}
