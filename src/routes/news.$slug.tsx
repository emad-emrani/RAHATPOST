import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { articles, getArticle } from "@/data/content";

export const Route = createFileRoute("/news/$slug")({
  head: ({ params }) => ({
    meta: [{ title: `${getArticle(params.slug)?.title ?? "الخبر"} · رهط بوست` }],
  }),
  component: ArticlePage,
});

function ArticlePage() {
  const { slug } = Route.useParams();
  const article = getArticle(slug);

  if (!article) {
    return (
      <Shell>
        <p className="stamp p-4 font-semibold">هذا الخبر غير موجود.</p>
        <Link to="/news" className="btn mt-4">
          رجوع للأخبار
        </Link>
      </Shell>
    );
  }

  const related = articles.filter((item) => item.slug !== article.slug).slice(0, 3);
  const share = encodeURIComponent(`${article.title}\nرهط بوست`);

  return (
    <Shell>
      <article className="stamp p-4">
        <span className={article.breaking ? "chip chip-deep" : "chip"}>
          {article.breaking ? "عاجل" : article.category}
        </span>
        <h1 className="mt-3 text-3xl font-bold">{article.title}</h1>
        <p className="mt-1 font-semibold text-muted">
          {article.time} · {article.source}
        </p>
        <div className="mt-4 flex flex-col gap-3 text-lg">
          {article.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </article>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <a
          className="btn"
          href={`https://t.me/share/url?url=https://rahatpost.com/news/${article.slug}&text=${share}`}
          target="_blank"
          rel="noreferrer"
        >
          تليجرام
        </a>
        <a
          className="btn btn-ghost"
          href={`https://wa.me/?text=${share}%0Ahttps://rahatpost.com/news/${article.slug}`}
          target="_blank"
          rel="noreferrer"
        >
          واتساب
        </a>
      </div>
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
    </Shell>
  );
}
