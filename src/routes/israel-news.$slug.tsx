import { createFileRoute, Link } from "@tanstack/react-router";
import { PushCta, ShareWhatsApp } from "@/components/growth";
import { ExternalLink } from "lucide-react";
import { Comments } from "@/components/comments";
import { Shell } from "@/components/shell";
import { NewsImage } from "@/components/news-image";
import { newsCardUrl } from "@/lib/news/card-url";
import {
  IsraelNewsUnavailable,
  IsraelTitle,
  TranslationChip,
  imageItem,
} from "@/components/israel-news";
import { getIsraelNewsItem } from "@/lib/news/israel-api";
import { relativeTimeAr, useNow } from "@/lib/news/format";
import { breadcrumbLd, seo, snippet } from "@/lib/seo";
import { tr, trv } from "@/lib/i18n/core";
import { localized, localizedIsrael } from "@/lib/i18n/localize";

export const Route = createFileRoute("/israel-news/$slug")({
  loader: async ({ params }) => {
    const { result, item } = await localizedIsrael(
      await getIsraelNewsItem({ data: params.slug }),
      (d) => [d.item, ...d.result.items],
    );
    return {
      now: result.now,
      empty: result.items.length === 0,
      article: item,
      related: result.items.filter((other) => other.slug !== params.slug).slice(0, 3),
    };
  },
  staleTime: 5 * 60_000,
  head: ({ loaderData, params }) => {
    const a = loaderData?.article;
    const path = `/israel-news/${params.slug}`;
    const title = a?.titleAr ?? a?.titleHe ?? tr("خبر");
    return seo({
      title: tr("{0} · رهط بوست", title),
      description: a
        ? snippet(a.summaryAr) ||
          tr("ترجمة آلية إلى العربية لخبر من {0}: {1}", a.source, snippet(title, 100))
        : tr("هذا الخبر لم يعد ضمن آخر أخبار إسرائيل."),
      path,
      type: "article",
      image: a ? (a.image ?? newsCardUrl({ title: a.titleAr ?? a.titleHe, category: a.category, source: a.source })) : undefined,
      publishedTime: a?.publishedAt,
      // Machine-translated headline + excerpt of another outlet's story: not indexed (thin /
      // duplicate), links followed. The /israel-news list stays indexable.
      robots: "noindex",
      jsonLd: a
        ? [
            breadcrumbLd([
              { name: tr("أخبار إسرائيل"), path: "/israel-news" },
              { name: snippet(title, 80), path },
            ]),
          ]
        : [],
    });
  },
  component: IsraelArticlePage,
});

function IsraelArticlePage() {
  const { article, related, empty, now: serverNow } = Route.useLoaderData();
  const now = useNow(serverNow);

  if (!article) {
    return (
      <Shell>
        {empty ? (
          <IsraelNewsUnavailable />
        ) : (
          <p className="stamp p-4 font-semibold">{tr("هذا الخبر لم يعد ضمن آخر أخبار إسرائيل.")}</p>
        )}
        <Link to="/israel-news" className="btn mt-4">
          {tr("رجوع لأخبار إسرائيل")}
        </Link>
      </Shell>
    );
  }

  const summary = article.summaryAr ?? article.summaryHe;
  return (
    <Shell>
      <article className="stamp overflow-hidden">
        {article.image ? (
          <figure className="m-0">
            <NewsImage
              item={imageItem(article)}
              size="full"
              eager
              className="aspect-[16/9] w-full"
              iconClassName="size-12"
            />
            <figcaption className="px-4 pt-2 text-xs font-semibold text-muted">
              {tr("الصورة:")} {trv(article.source)} ({trv(article.sourceHe)})
            </figcaption>
          </figure>
        ) : null}
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip chip-ink">{tr("أخبار إسرائيل")}</span>
            <TranslationChip item={article} />
          </div>
          <h1 className="mt-3 text-2xl font-bold">
            <IsraelTitle item={article} />
          </h1>
          <p className="mt-1 font-semibold text-muted">
            <time dateTime={article.publishedAt}>{relativeTimeAr(article.publishedAt, now)}</time> ·{" "}
            {trv(article.source)} ({trv(article.sourceHe)})
          </p>
          {summary ? (
            article.summaryAr ? (
              <p lang="ar" className="mt-4 text-lg">
                {trv(summary)}
              </p>
            ) : (
              <p lang="he" dir="rtl" className="mt-4 text-lg">
                {trv(summary)}
              </p>
            )
          ) : null}
          {article.titleAr ? (
            <div className="mt-4 rounded-xl bg-primary-soft p-3">
              <p className="text-xs font-bold text-muted">{tr("العنوان الأصلي بالعبرية")}</p>
              <p lang="he" dir="rtl" className="mt-1 font-semibold">
                {trv(article.titleHe)}
              </p>
            </div>
          ) : null}
          <a
            className="btn mt-5 w-full"
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            {tr("اقرأ الخبر كاملاً من المصدر · {0}", article.source)}
            <ExternalLink className="size-4" aria-hidden />
          </a>
          <p className="mt-3 text-sm font-semibold text-muted">
            {article.titleAr
              ? tr("ترجمة آلية لعنوان ومقتطف قصير من موقع {0}، وقد تحتوي أخطاء.", article.source)
              : tr("عنوان ومقتطف قصير من موقع {0} كما نُشر بالعبرية.", article.source)}{" "}
            {tr("الخبر الكامل وحقوقه لدى المصدر.")}
          </p>
        </div>
      </article>
      <ShareWhatsApp className="mt-4" title={article.titleAr ?? article.titleHe} path={`/israel-news/${article.slug}`} />
      <PushCta className="mt-3" />
      <Comments key={article.slug} articleKey={`israel-news/${article.slug}`} />
      {related.length > 0 ? (
        <>
          <h2 className="mt-8 mb-3 text-xl font-bold">{tr("المزيد من أخبار إسرائيل")}</h2>
          <ul className="flex flex-col gap-3">
            {related.map((item) => (
              <li key={item.slug}>
                <Link
                  to="/israel-news/$slug"
                  params={{ slug: item.slug }}
                  className="stamp press flex items-center gap-3 p-3 font-bold"
                >
                  <NewsImage item={imageItem(item)} className="size-16 rounded-xl" />
                  <IsraelTitle item={item} className="min-w-0 flex-1 leading-snug" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Shell>
  );
}
