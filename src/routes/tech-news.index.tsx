import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { NewsLead, NewsUnavailable } from "@/components/news";
import { NewsImage } from "@/components/news-image";
import { getTechNews } from "@/lib/news/api";
import { relativeTimeAr, useNow } from "@/lib/news/format";
import { breadcrumbLd, seo } from "@/lib/seo";
import { tr, trv } from "@/lib/i18n/core";
import { localized } from "@/lib/i18n/localize";

export const Route = createFileRoute("/tech-news/")({
  head: () =>
    seo({
      title: tr("أخبار تقنية اليوم · آخر أخبار التكنولوجيا · رهط بوست"),
      description: tr("آخر أخبار التقنية والتكنولوجيا بالعربية: الهواتف الذكية، الذكاء الاصطناعي، التطبيقات والأجهزة، من أبرز المواقع التقنية العربية مع رابط المصدر."),
      path: "/tech-news",
      jsonLd: [breadcrumbLd([{ name: tr("أخبار تقنية"), path: "/tech-news" }])],
    }),
  loader: async () => localized(await getTechNews(), (d) => [{ items: d.items, fields: ["title", "summary"] }], "auto"),
  staleTime: 4 * 60_000,
  component: TechNewsPage,
});

function TechNewsPage() {
  const data = Route.useLoaderData();
  const now = useNow(data.now);
  return (
    <Shell>
      <h1 className="mb-1 text-2xl font-bold">{tr("أخبار تقنية")}</h1>
      <p className="mb-4 font-semibold text-muted">{tr("آخر أخبار التقنية والتكنولوجيا من المواقع التقنية العربية")}</p>
      {data.items.length === 0 ? (
        <NewsUnavailable />
      ) : (
        <>
        <NewsLead item={data.items[0]} now={now} />
        <ul className="flex flex-col gap-3">
          {data.items.slice(1).map((item) => (
            <li key={item.slug}>
              <Link to="/news/$slug" params={{ slug: item.slug }} className="stamp press flex items-start gap-3 p-3">
                <NewsImage item={item} className="size-22 rounded-xl" iconClassName="size-7" />
                <span className="min-w-0 flex-1">
                  <span className="chip chip-deep">{tr("تقنية")}</span>
                  <span className="mt-1 line-clamp-3 block font-bold leading-snug">{trv(item.title)}</span>
                  <span className="text-sm font-semibold text-muted">
                    {relativeTimeAr(item.publishedAt, now)} · {trv(item.source)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        </>
      )}
      <p className="mt-4 text-sm font-semibold text-muted">
        {tr("العناوين ومقتطفات قصيرة من مصادرها، مع رابط للخبر الأصلي.")}
      </p>
    </Shell>
  );
}
