import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { Shell } from "@/components/shell";
import { NewsUnavailable } from "@/components/news";
import { getNews } from "@/lib/news/api";
import { relativeTimeAr, useNow } from "@/lib/news/format";

export const Route = createFileRoute("/news/$slug")({
  loader: async ({ params }) => {
    const data = await getNews();
    return {
      now: data.now,
      empty: data.items.length === 0,
      article: data.items.find((item) => item.slug === params.slug) ?? null,
      items: data.items,
    };
  },
  staleTime: 5 * 60_000,
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.article?.title ?? "الخبر"} · رهط بوست` }],
  }),
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
          <p className="stamp p-4 font-semibold">هذا الخبر لم يعد ضمن آخر الأخبار.</p>
        )}
        <Link to="/news" className="btn mt-4">
          رجوع للأخبار
        </Link>
      </Shell>
    );
  }

  const sameCategory = items.filter((item) => item.slug !== article.slug && item.category === article.category);
  const related = [...sameCategory, ...items.filter((item) => item.slug !== article.slug && item.category !== article.category)].slice(0, 3);
  const share = encodeURIComponent(`${article.title}\nرهط بوست`);
  const url = `https://rahatpost.com/news/${article.slug}`;

  return (
    <Shell>
      <article className="stamp p-4">
        <span className={article.breaking ? "chip chip-alert" : "chip chip-deep"}>
          {article.breaking ? "عاجل" : article.category}
        </span>
        <h1 className="mt-3 text-2xl font-bold">{article.title}</h1>
        <p className="mt-1 font-semibold text-muted">
          <time dateTime={article.publishedAt}>{relativeTimeAr(article.publishedAt, now)}</time> ·{" "}
          {article.source}
        </p>
        {article.summary ? <p className="mt-4 text-lg">{article.summary}</p> : null}
        <a className="btn mt-5 w-full" href={article.link} target="_blank" rel="noopener noreferrer">
          اقرأ الخبر كاملاً في المصدر
          <ExternalLink className="size-4" aria-hidden />
        </a>
        <p className="mt-3 text-sm font-semibold text-muted">مقتطف قصير من موقع {article.source}. الخبر الكامل وحقوقه لدى المصدر.</p>
      </article>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <a
          className="btn"
          href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${share}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          تليجرام
        </a>
        <a
          className="btn btn-ghost"
          href={`https://wa.me/?text=${share}%0A${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          واتساب
        </a>
      </div>
      {related.length > 0 ? (
        <>
          <h2 className="mt-8 mb-3 text-xl font-bold">ذات صلة</h2>
          <ul className="flex flex-col gap-3">
            {related.map((item) => (
              <li key={item.slug}>
                <Link to="/news/$slug" params={{ slug: item.slug }} className="stamp press block px-4 py-3 font-bold">
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </Shell>
  );
}
