import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { Comments } from "@/components/comments";
import { Shell } from "@/components/shell";
import { NewsUnavailable } from "@/components/news";
import { NewsImage } from "@/components/news-image";
import { getNews, getTechNews } from "@/lib/news/api";
import { relativeTimeAr, useNow } from "@/lib/news/format";
import type { NewsItem } from "@/lib/news/types";
import { breadcrumbLd, newsArticleLd, seo, snippet } from "@/lib/seo";
import { ReportButton } from "@/components/report";
import { AdSlots } from "@/components/google-services";
import { tr, trv } from "@/lib/i18n/core";
import { localized, localizedIsrael } from "@/lib/i18n/localize";

export const Route = createFileRoute("/news/$slug")({
  loader: async ({ params }) => {
    let data = await localized(await getNews(), (d) => [{ items: d.items, fields: ["title", "summary", "body"] }], "auto");
    if (!data.items.some((item) => item.slug === params.slug)) {
      // «أخبار تقنية» items share the article page.
      const tech = await getTechNews().catch(() => null);
      const hit = tech?.items.find((item) => item.slug === params.slug);
      if (tech && hit) data = await localized({ ...tech, items: [hit, ...tech.items.filter((i) => i !== hit).slice(0, 6)] }, (d) => [{ items: d.items, fields: ["title", "summary"] }], "auto");
    }
    return {
      now: data.now,
      empty: data.items.length === 0,
      article: data.items.find((item) => item.slug === params.slug) ?? null,
      items: data.items,
    };
  },
  staleTime: 5 * 60_000,
  head: ({ loaderData, params }) => {
    const a = loaderData?.article;
    const path = `/news/${params.slug}`;
    if (!a) {
      return seo({
        title: tr("الخبر غير متوفر · رهط بوست"),
        description: tr("هذا الخبر لم يعد ضمن آخر أخبار رهط والنقب."),
        path,
        robots: "noindex",
      });
    }
    const description = snippet(a.summary) || tr("{0} — أخبار رهط والنقب.", a.title);
    const crumbs = breadcrumbLd([
      { name: tr("أخبار رهط"), path: "/news" },
      { name: snippet(a.title, 80), path },
    ]);
    return seo({
      title: tr("{0} · رهط بوست", a.title),
      description,
      path,
      type: "article",
      image: a.image,
      publishedTime: a.publishedAt,
      // Feed items are a headline + excerpt linking to the publisher (the original is the
      // canonical source), so keep them out of the index but let crawlers follow the links.
      // Reader posts are original content and are indexed with NewsArticle markup.
      robots: a.reader || a.staff ? "index" : "noindex",
      jsonLd: a.reader
        ? [
            newsArticleLd({
              path,
              headline: a.title,
              description,
              datePublished: a.publishedAt,
              authorName: a.reader.name,
              image: a.image,
              commentCount: a.comments,
            }),
            crumbs,
          ]
        : [crumbs],
    });
  },
  component: ArticlePage,
});

function ArticlePage() {
  const { article, items, empty, now: serverNow } = Route.useLoaderData();
  const now = useNow(serverNow);

  if (!article) {
    return (
      <Shell>
        {empty ? (
          <NewsUnavailable />
        ) : (
          <p className="stamp p-4 font-semibold">{tr("هذا الخبر لم يعد ضمن آخر الأخبار.")}</p>
        )}
        <Link to="/news" className="btn mt-4">
          {tr("رجوع للأخبار")}
        </Link>
      </Shell>
    );
  }

  const sameCategory = items.filter(
    (item) => item.slug !== article.slug && item.category === article.category,
  );
  const related = [
    ...sameCategory,
    ...items.filter((item) => item.slug !== article.slug && item.category !== article.category),
  ].slice(0, 3);
  const share = encodeURIComponent(tr("{0}\nرهط بوست", article.title));
  const url = `https://rahatpost.com/news/${article.slug}`;

  return (
    <Shell>
      <article className="stamp overflow-hidden">
        {article.image ? (
          <figure className="m-0">
            <NewsImage
              item={article}
              size="full"
              eager
              className="aspect-[16/9] w-full"
              iconClassName="size-12"
            />
            <figcaption className="px-4 pt-2 text-xs font-semibold text-muted">
              {tr("الصورة:")} {trv(article.source)}
            </figcaption>
          </figure>
        ) : null}
        <div className="p-4">
          <span className={article.breaking ? "chip chip-alert" : "chip chip-deep"}>
            {article.breaking ? tr("عاجل") : article.reader ? tr("من القراء") : trv(article.category)}
          </span>
          <h1 className="mt-3 text-2xl font-bold">{trv(article.title)}</h1>
          <p className="mt-1 font-semibold text-muted">
            <time dateTime={article.publishedAt}>{relativeTimeAr(article.publishedAt, now)}</time> ·{" "}
            {article.reader
              ? tr("نشره: {0} · {1}", article.reader.name, article.reader.neighborhood)
              : article.author
                ? tr("{0} · كتبه: {1}", article.source, article.author)
                : trv(article.source)}
          </p>
          {article.reader || article.staff ? (
            <ReaderBody article={article} />
          ) : (
            <>
              {article.summary ? <p className="mt-4 text-lg">{trv(article.summary)}</p> : null}
              <a
                className="btn mt-5 w-full"
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                {tr("اقرأ الخبر كاملاً في المصدر")}
                <ExternalLink className="size-4" aria-hidden />
              </a>
              <p className="mt-3 text-sm font-semibold text-muted">
                {tr("مقتطف قصير من موقع")} {trv(article.source)}{tr(". الخبر الكامل وحقوقه لدى المصدر.")}
              </p>
            </>
          )}
        </div>
      </article>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <a
          className="btn"
          href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${share}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {tr("تليجرام")}
        </a>
        <a
          className="btn btn-ghost"
          href={`https://wa.me/?text=${share}%0A${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {tr("واتساب")}
        </a>
      </div>
      <AdSlots placement="article" />
      <Comments key={article.slug} articleKey={`news/${article.slug}`} />
      {related.length > 0 ? (
        <>
          <h2 className="mt-8 mb-3 text-xl font-bold">{tr("ذات صلة")}</h2>
          <ul className="flex flex-col gap-3">
            {related.map((item) => (
              <li key={item.slug}>
                <Link
                  to="/news/$slug"
                  params={{ slug: item.slug }}
                  className="stamp press flex items-center gap-3 p-3 font-bold"
                >
                  <NewsImage item={item} className="size-16 rounded-xl" />
                  <span className="min-w-0 flex-1 leading-snug">{trv(item.title)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Shell>
  );
}

function ReaderBody({ article }: { article: NewsItem }) {
  const source = article.reader?.sourceUrl;
  return (
    <>
      <div className="mt-4 flex flex-col gap-3 text-lg">
        {(article.body ?? article.summary)
          .split(/\n{2,}/)
          .filter(Boolean)
          .map((para, i) => (
            <p key={i} className="whitespace-pre-line">
              {trv(para)}
            </p>
          ))}
      </div>
      {source ? (
        <a
          className="btn btn-ghost mt-5 w-full"
          href={source}
          target="_blank"
          rel="noopener noreferrer nofollow ugc"
        >
          {tr("المصدر الذي أرفقه الناشر")}
          <ExternalLink className="size-4" aria-hidden />
        </a>
      ) : null}
      {article.staff ? null : (
        <p className="mt-3 text-sm font-semibold text-muted">
          {tr("خبر أرسله أحد القرّاء وراجعه فريق رهط بوست قبل النشر. المسؤولية عن المحتوى على ناشره.")}
        </p>
      )}
      {article.staff ? null : (
        <ReportButton type="news" id={article.slug.replace(/^reader-/, "")} />
      )}
    </>
  );
}
