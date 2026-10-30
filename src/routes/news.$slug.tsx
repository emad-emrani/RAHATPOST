import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Comments } from "@/components/comments";
import { Shell } from "@/components/shell";
import { NewsUnavailable } from "@/components/news";
import { NewsImage } from "@/components/news-image";
import { newsCardUrl } from "@/lib/news/card-url";
import { getCustomSectionsNews, getNews, getSportsNews, getTechNews, type CustomSectionResult } from "@/lib/news/api";
import { relativeTimeAr, useNow } from "@/lib/news/format";
import type { NewsItem } from "@/lib/news/types";
import { breadcrumbLd, newsArticleLd, seo, snippet } from "@/lib/seo";
import { ReportButton } from "@/components/report";
import { AdSlots } from "@/components/google-services";
import { getLang, tr, trv } from "@/lib/i18n/core";
import { localizeTexts } from "@/lib/i18n/api";
import { localized } from "@/lib/i18n/localize";

const SECTION_DICT_SLUG: Record<string, { ar: string; he: string; en: string }> = {
  "فن و موضة": { ar: "فن و موضة", he: "אמנות ואופנה", en: "Art & Fashion" },
  "فن وموضة": { ar: "فن وموضة", he: "אמנות ואופנה", en: "Art & Fashion" },
  "ثقافة وفن": { ar: "ثقافة وفن", he: "תרבות ואמנות", en: "Culture & Art" },
  "فن وثقافة": { ar: "فن وثقافة", he: "אמנות ותרבות", en: "Art & Culture" },
  "موضة": { ar: "موضة", he: "אופנה", en: "Fashion" },
  "فن": { ar: "فن", he: "אמנות", en: "Art" },
  "مشاهير": { ar: "مشاهير", he: "סלבס ובידור", en: "Celebrities" },
};

function trSecLabel(raw: string, overrideLang?: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const emojiMatch = trimmed.match(/^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\s]+)(.+)$/u);
  const prefix = emojiMatch ? emojiMatch[1] : "";
  const core = (emojiMatch ? emojiMatch[2] : trimmed).trim();
  const lang = overrideLang || getLang() || "ar";
  const entry = SECTION_DICT_SLUG[core];
  if (entry && (lang === "ar" || lang === "he" || lang === "en")) {
    return `${prefix}${entry[lang]}`;
  }
  if (lang === "ar") return trimmed;
  const byDict = trv(core);
  if (byDict !== core) return `${prefix}${byDict}`;
  return trv(trimmed);
}

function detectSourceLang(text: string): "ar" | "he" | "en" {
  if (/[\u0590-\u05FF]/.test(text)) return "he";
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  return "en";
}

async function translateSingleTextClient(text: string, targetLang: "ar" | "he" | "en"): Promise<string> {
  const clean = text.trim();
  if (!clean) return "";
  const srcLang = detectSourceLang(clean);
  if (srcLang === targetLang) return clean;
  const cacheKey = `rp_tx_${srcLang}_${targetLang}_${clean.slice(0, 120)}`;
  if (typeof window !== "undefined") {
    try {
      const saved = window.localStorage.getItem(cacheKey);
      if (saved) return saved;
    } catch {}
  }
  if (srcLang === "ar" && targetLang !== "ar") {
    try {
      const srvOut = await localizeTexts({ data: { lang: targetLang, texts: [clean], kind: "auto" } });
      if (Array.isArray(srvOut) && srvOut[0] && srvOut[0].trim() !== clean) {
        const resText = srvOut[0].trim();
        if (typeof window !== "undefined") {
          try { window.localStorage.setItem(cacheKey, resText); } catch {}
        }
        return resText;
      }
    } catch {}
  }
  try {
    const params = new URLSearchParams({
      q: clean.slice(0, 450),
      langpair: `${srcLang}|${targetLang}`,
    });
    const res = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`);
    if (res.ok) {
      const json = (await res.json()) as { responseData?: { translatedText?: string } };
      const out = json?.responseData?.translatedText?.trim();
      if (out && !out.includes("MYMEMORY WARNING")) {
        if (typeof window !== "undefined") {
          try { window.localStorage.setItem(cacheKey, out); } catch {}
        }
        return out;
      }
    }
  } catch {}
  return clean;
}

export const Route = createFileRoute("/news/$slug")({
  loader: async ({ params }) => {
    let data = await localized(
      await getNews(),
      (d) => [{ items: d.items, fields: ["title", "summary", "body"] }],
      "auto",
    );
    if (!data.items.some((item) => item.slug === params.slug)) {
      // «أخبار تقنية», «رياضة», and custom sections like «فن و موضة» share the article page.
      const [techFeed, sportsFeed, customSecs] = await Promise.all([
        getTechNews().catch(() => null),
        getSportsNews().catch(() => null),
        getCustomSectionsNews().catch(() => [] as CustomSectionResult[]),
      ]);
      const customPool = customSecs.flatMap((cs) => cs.items);
      const customHit = customPool.find((item) => item.slug === params.slug);
      if (customHit) {
        const relatedPool = [
          customHit,
          ...customPool.filter((i) => i.slug !== customHit.slug).slice(0, 6),
        ];
        data = await localized(
          { ...data, items: relatedPool },
          (d) => [{ items: d.items, fields: ["title", "summary", "body"] }],
          "auto",
        );
      } else {
        const tech = techFeed?.items.some((item) => item.slug === params.slug)
          ? techFeed
          : sportsFeed;
        const hit = tech?.items.find((item) => item.slug === params.slug);
        if (tech && hit) {
          data = await localized(
            { ...tech, items: [hit, ...tech.items.filter((i) => i !== hit).slice(0, 6)] },
            (d) => [{ items: d.items, fields: ["title", "summary"] }],
            "auto",
          );
        }
      }
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
    const description = snippet(a.summary || a.body) || tr("{0} — أخبار رهط والنقب على رهط بوست.", a.title);
    const image = a.image ?? newsCardUrl(a);
    const crumbs = breadcrumbLd([
      { name: tr("أخبار رهط"), path: "/news" },
      { name: snippet(a.title, 80), path },
    ]);
    return seo({
      title: tr("{0} · رهط بوست", a.title),
      description,
      path,
      type: "article",
      image,
      publishedTime: a.publishedAt,
      section: a.category,
      keywords: [a.category, a.source, "أخبار رهط", "أخبار النقب", "رهط بوست"].filter(Boolean),
      robots: "index",
      jsonLd: [
        newsArticleLd({
          path,
          headline: a.title,
          description,
          datePublished: a.publishedAt,
          authorName: a.reader?.name ?? a.author,
          publisherName: a.reader || a.staff ? undefined : a.source,
          image,
          section: a.category,
          commentCount: a.comments,
        }),
        crumbs,
      ],
    });
  },
  component: ArticlePage,
});

function ArticlePage() {
  const { article, items, empty, now: serverNow } = Route.useLoaderData();
  const now = useNow(serverNow);
  const siteLang = getLang();
  const [txLang, setTxLang] = useState<"ar" | "he" | "en" | "orig">(
    siteLang === "he" ? "he" : siteLang === "en" ? "en" : "ar",
  );
  const [txArticle, setTxArticle] = useState<{ title: string; summary: string; body: string } | null>(null);
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    setTxLang(siteLang === "he" ? "he" : siteLang === "en" ? "en" : "ar");
    setTxArticle(null);
  }, [siteLang, article?.slug]);

  useEffect(() => {
    if (!article || txLang === "orig") {
      setTxArticle(null);
      return;
    }
    const srcLang = detectSourceLang(article.title);
    if (srcLang === txLang) {
      setTxArticle(null);
      return;
    }
    let active = true;
    setTranslating(true);
    void (async () => {
      const [tTitle, tSum, tBody] = await Promise.all([
        translateSingleTextClient(article.title, txLang),
        article.summary ? translateSingleTextClient(article.summary, txLang) : Promise.resolve(""),
        article.body ? translateSingleTextClient(article.body, txLang) : Promise.resolve(""),
      ]);
      if (active) {
        setTxArticle({
          title: tTitle || article.title,
          summary: tSum || article.summary || "",
          body: tBody || article.body || "",
        });
        setTranslating(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [article, txLang]);

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

  const shownArticle: NewsItem = txArticle
    ? {
        ...article,
        title: txArticle.title,
        summary: txArticle.summary,
        body: txArticle.body || article.body,
      }
    : article;

  const sameCategory = items.filter(
    (item) => item.slug !== article.slug && item.category === article.category,
  );
  const related = [
    ...sameCategory,
    ...items.filter((item) => item.slug !== article.slug && item.category !== article.category),
  ].slice(0, 3);
  const share = encodeURIComponent(tr("{0}\nرهط بوست", shownArticle.title));
  const url = `https://rahatpost.com/news/${article.slug}`;

  return (
    <Shell>
      <article className="stamp overflow-hidden">
        {shownArticle.image ? (
          <figure className="m-0">
            <NewsImage
              item={shownArticle}
              size="full"
              eager
              className="aspect-[16/9] w-full"
              iconClassName="size-12"
            />
            <figcaption className="px-4 pt-2 text-xs font-semibold text-muted">
              {tr("الصورة:")} {trv(shownArticle.source)}
            </figcaption>
          </figure>
        ) : null}
        <div className="p-4">
          <span className={shownArticle.breaking ? "chip chip-alert" : "chip chip-deep"}>
            {shownArticle.breaking
              ? tr("عاجل")
              : shownArticle.reader
                ? tr("من القراء")
                : trSecLabel(shownArticle.category, txLang === "orig" ? undefined : txLang)}
          </span>

          <h1 dir="auto" className="mt-3 text-2xl font-bold">
            {trv(shownArticle.title)}
          </h1>
          <p className="mt-1 font-semibold text-muted">
            <time dateTime={shownArticle.publishedAt}>{relativeTimeAr(shownArticle.publishedAt, now)}</time> ·{" "}
            {shownArticle.reader
              ? tr("نشره: {0} · {1}", shownArticle.reader.name, shownArticle.reader.neighborhood)
              : shownArticle.author
                ? tr("{0} · كتبه: {1}", shownArticle.source, shownArticle.author)
                : trv(shownArticle.source)}
          </p>
          {shownArticle.reader || shownArticle.staff ? (
            <ReaderBody article={shownArticle} />
          ) : (
            <>
              {shownArticle.summary ? (
                <p dir="auto" className="mt-4 text-lg">
                  {trv(shownArticle.summary)}
                </p>
              ) : null}
              <a
                className="btn mt-5 w-full"
                href={shownArticle.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                {tr("اقرأ الخبر كاملاً في المصدر")}
                <ExternalLink className="size-4" aria-hidden />
              </a>
              <p className="mt-3 text-sm font-semibold text-muted">
                {tr("مقتطف قصير من موقع")} {trv(shownArticle.source)}{tr(". الخبر الكامل وحقوقه لدى المصدر.")}
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
                  <span dir="auto" className="min-w-0 flex-1 leading-snug">{trv(item.title)}</span>
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
      <div dir="auto" className="mt-4 flex flex-col gap-3 text-lg">
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
