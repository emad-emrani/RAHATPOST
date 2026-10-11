import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { Shell } from "@/components/shell";
import { NewsImage } from "@/components/news-image";
import {
  IsraelNewsUnavailable,
  IsraelTitle,
  TranslationChip,
  imageItem,
} from "@/components/israel-news";
import { getIsraelNewsItem } from "@/lib/news/israel-api";
import { relativeTimeAr, useNow } from "@/lib/news/format";

export const Route = createFileRoute("/israel-news/$slug")({
  loader: async ({ params }) => {
    const { result, item } = await getIsraelNewsItem({ data: params.slug });
    return {
      now: result.now,
      empty: result.items.length === 0,
      article: item,
      related: result.items.filter((other) => other.slug !== params.slug).slice(0, 3),
    };
  },
  staleTime: 5 * 60_000,
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.article?.titleAr ?? loaderData?.article?.titleHe ?? "خبر"} · رهط بوست`,
      },
    ],
  }),
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
          <p className="stamp p-4 font-semibold">هذا الخبر لم يعد ضمن آخر أخبار إسرائيل.</p>
        )}
        <Link to="/israel-news" className="btn mt-4">
          رجوع لأخبار إسرائيل
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
              الصورة: {article.source} ({article.sourceHe})
            </figcaption>
          </figure>
        ) : null}
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip chip-ink">أخبار إسرائيل</span>
            <TranslationChip item={article} />
          </div>
          <h1 className="mt-3 text-2xl font-bold">
            <IsraelTitle item={article} />
          </h1>
          <p className="mt-1 font-semibold text-muted">
            <time dateTime={article.publishedAt}>{relativeTimeAr(article.publishedAt, now)}</time> ·{" "}
            {article.source} ({article.sourceHe})
          </p>
          {summary ? (
            article.summaryAr ? (
              <p lang="ar" className="mt-4 text-lg">
                {summary}
              </p>
            ) : (
              <p lang="he" dir="rtl" className="mt-4 text-lg">
                {summary}
              </p>
            )
          ) : null}
          {article.titleAr ? (
            <div className="mt-4 rounded-xl bg-primary-soft p-3">
              <p className="text-xs font-bold text-muted">العنوان الأصلي بالعبرية</p>
              <p lang="he" dir="rtl" className="mt-1 font-semibold">
                {article.titleHe}
              </p>
            </div>
          ) : null}
          <a
            className="btn mt-5 w-full"
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
          >
            الخبر الأصلي بالعبرية
            <ExternalLink className="size-4" aria-hidden />
          </a>
          <p className="mt-3 text-sm font-semibold text-muted">
            {article.titleAr
              ? `ترجمة آلية لعنوان ومقتطف قصير من موقع ${article.source}، وقد تحتوي أخطاء.`
              : `عنوان ومقتطف قصير من موقع ${article.source} كما نُشر بالعبرية.`}{" "}
            الخبر الكامل وحقوقه لدى المصدر.
          </p>
        </div>
      </article>
      {related.length > 0 ? (
        <>
          <h2 className="mt-8 mb-3 text-xl font-bold">المزيد من أخبار إسرائيل</h2>
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
