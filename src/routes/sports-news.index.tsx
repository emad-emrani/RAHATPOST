import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { NewsLead, NewsUnavailable } from "@/components/news";
import { NewsImage } from "@/components/news-image";
import { FullMatchesBoard } from "@/components/matches";
import { getSportsNews } from "@/lib/news/api";
import { getMatchesBoard } from "@/lib/news/matches";
import { relativeTimeAr, useNow } from "@/lib/news/format";
import { breadcrumbLd, seo } from "@/lib/seo";
import { tr, trv } from "@/lib/i18n/core";
import { localized } from "@/lib/i18n/localize";

export const Route = createFileRoute("/sports-news/")({
  head: () =>
    seo({
      title: tr("نتائج المباريات المباشرة وأخبار الرياضة اليوم · رهط بوست"),
      description: tr(
        "نتائج المباريات المباشرة لحظة بلحظة (الدوري الإسباني لا ليغا، دوري أبطال أوروبا، الدوري الإنجليزي، والدوري المحلي) وآخر الأخبار الرياضية بالعربية على رهط بوست.",
      ),
      path: "/sports-news",
      keywords: [
        "نتائج المباريات مباشر",
        "نتائج مباريات اليوم",
        "الدوري الإسباني لا ليغا",
        "دوري أبطال أوروبا",
        "أخبار الرياضة رهط بوست",
      ],
      jsonLd: [breadcrumbLd([{ name: tr("نتائج المباريات والرياضة"), path: "/sports-news" }])],
    }),
  loader: async () => {
    const [sportsRaw, matches] = await Promise.all([
      getSportsNews(),
      getMatchesBoard().catch(() => null),
    ]);
    const sports = await localized(
      sportsRaw,
      (d) => [{ items: d.items, fields: ["title", "summary"] }],
      "auto",
    );
    return { ...sports, matches };
  },
  staleTime: 60_000,
  component: SportsNewsPage,
});

function SportsNewsPage() {
  const data = Route.useLoaderData();
  const now = useNow(data.now);
  return (
    <Shell>
      <h1 className="mb-1 text-2xl font-bold">{tr("نتائج المباريات المباشرة والرياضة")}</h1>
      <p className="mb-4 font-semibold text-muted">
        {tr("نتائج ومواعيد المباريات الحية في الدوريات العالمية والمحلية وآخر الأخبار الرياضية")}
      </p>

      <FullMatchesBoard initial={data.matches} />

      <h2 className="mb-3 text-xl font-extrabold">{tr("آخر الأخبار الرياضية")}</h2>
      {data.items.length === 0 ? (
        <NewsUnavailable />
      ) : (
        <>
          <NewsLead item={data.items[0]} now={now} />
          <ul className="flex flex-col gap-3">
            {data.items.slice(1).map((item) => (
              <li key={item.slug}>
                <Link
                  to="/news/$slug"
                  params={{ slug: item.slug }}
                  className="stamp press flex items-start gap-3 p-3"
                >
                  <NewsImage item={item} className="size-22 rounded-xl" iconClassName="size-7" />
                  <span className="min-w-0 flex-1">
                    <span className={item.fromHe ? "chip" : "chip chip-deep"}>
                      {item.fromHe
                        ? item.he
                          ? tr("بالعبرية")
                          : tr("ترجمة آلية")
                        : tr("رياضة")}
                    </span>
                    <span dir="auto" className="mt-1 line-clamp-3 block font-bold leading-snug">
                      {trv(item.title)}
                    </span>
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
