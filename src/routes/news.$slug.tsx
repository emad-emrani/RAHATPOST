import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ExternalLink, Maximize2, Minimize2, RefreshCw, X, ZoomIn } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Comments } from "@/components/comments";
import { Shell } from "@/components/shell";
import { NewsUnavailable } from "@/components/news";
import { NewsImage } from "@/components/news-image";
import { newsCardUrl } from "@/lib/news/card-url";
import {
  getCustomSectionsNews,
  getNews,
  getSportsNews,
  getTechNews,
  type CustomSectionResult,
} from "@/lib/news/api";
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
          try {
            window.localStorage.setItem(cacheKey, resText);
          } catch {}
        }
        return resText;
      }
    } catch {}
  }
  try {
    const params = new URLSearchParams({
      q: clean.slice(0, 480),
      langpair: `${srcLang}|${targetLang}`,
    });
    const res = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`);
    if (res.ok) {
      const json = (await res.json()) as { responseData?: { translatedText?: string } };
      const out = json?.responseData?.translatedText?.trim();
      if (out && !out.includes("MYMEMORY WARNING")) {
        if (typeof window !== "undefined") {
          try {
            window.localStorage.setItem(cacheKey, out);
          } catch {}
        }
        return out;
      }
    }
  } catch {}
  return clean;
}

/** Responsive Full-Screen Original-Size Image Lightbox for all devices & screen orientations. */
function ArticleImageLightbox({
  images,
  activeIndex,
  title,
  source,
  onClose,
  onSelectIndex,
}: {
  images: string[];
  activeIndex: number;
  title: string;
  source?: string;
  onClose: () => void;
  onSelectIndex: (idx: number) => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const currentSrc = images[activeIndex] ?? images[0];

  useEffect(() => {
    setZoomed(false);
  }, [activeIndex]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && images.length > 1) {
        onSelectIndex((activeIndex + 1) % images.length);
      } else if (e.key === "ArrowRight" && images.length > 1) {
        onSelectIndex((activeIndex - 1 + images.length) % images.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onSelectIndex, activeIndex, images.length]);

  if (!currentSrc) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={trv(title)}
      className="fixed inset-0 z-[120] flex flex-col bg-black/95 text-white backdrop-blur-md"
      onClick={onClose}
    >
      {/* Top Controls Bar */}
      <div
        className="flex items-center justify-between gap-2 border-b border-white/10 bg-black/60 px-3 py-2.5 sm:px-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-extrabold sm:text-sm">{trv(title)}</p>
          {source ? (
            <p className="truncate text-[11px] font-semibold text-white/70">
              {tr("المصدر:")} {trv(source)}
              {images.length > 1 ? ` · (${activeIndex + 1} / ${images.length})` : ""}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoomed((v) => !v)}
            className="inline-flex items-center gap-1 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-white/25"
            title={zoomed ? tr("ملائمة الشاشة") : tr("تكبير بالحجم الأصلي")}
          >
            {zoomed ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            <span>{zoomed ? tr("ملائمة الشاشة") : tr("الحجم الأصلي 100%")}</span>
          </button>

          <a
            href={currentSrc}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-white/25 sm:inline-flex"
          >
            <ExternalLink className="size-3.5" />
            <span>{tr("فتح الأصلية")}</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            aria-label={tr("إغلاق")}
            className="grid size-9 place-items-center rounded-xl bg-white/20 text-white transition hover:bg-white/30"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* Main Responsive Image Viewport */}
      <div
        className={`relative flex flex-1 items-center justify-center p-2 sm:p-4 ${
          zoomed ? "overflow-auto" : "overflow-hidden"
        }`}
        onClick={onClose}
      >
        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectIndex((activeIndex - 1 + images.length) % images.length);
              }}
              aria-label={tr("الصورة السابقة")}
              className="absolute right-2 z-10 grid size-10 place-items-center rounded-full bg-black/65 text-white shadow-lg transition hover:bg-black/85 sm:right-4"
            >
              <ChevronRight className="size-6" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectIndex((activeIndex + 1) % images.length);
              }}
              aria-label={tr("الصورة التالية")}
              className="absolute left-2 z-10 grid size-10 place-items-center rounded-full bg-black/65 text-white shadow-lg transition hover:bg-black/85 sm:left-4"
            >
              <ChevronLeft className="size-6" />
            </button>
          </>
        ) : null}

        <img
          src={currentSrc}
          alt={trv(title)}
          referrerPolicy="no-referrer"
          onClick={(e) => {
            e.stopPropagation();
            setZoomed((v) => !v);
          }}
          className={
            zoomed
              ? "max-w-none cursor-zoom-out select-none rounded-lg shadow-2xl transition-all duration-200"
              : "max-h-[82dvh] max-w-[96vw] w-auto h-auto cursor-zoom-in select-none rounded-xl object-contain shadow-2xl transition-all duration-200"
          }
          style={zoomed ? { minWidth: "min(100%, 900px)" } : undefined}
        />
      </div>

      {/* Thumbnail Strip when multiple images exist */}
      {images.length > 1 ? (
        <div
          className="flex items-center justify-center gap-2 overflow-x-auto border-t border-white/10 bg-black/70 px-3 py-2.5"
          onClick={(e) => e.stopPropagation()}
        >
          {images.map((imgUrl, idx) => (
            <button
              key={imgUrl}
              type="button"
              onClick={() => onSelectIndex(idx)}
              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                idx === activeIndex ? "border-primary scale-105" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img
                src={imgUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
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
    const description =
      snippet(a.summary || a.body) || tr("{0} — أخبار رهط والنقب على رهط بوست.", a.title);
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
  const targetLang: "ar" | "he" | "en" =
    siteLang === "he" ? "he" : siteLang === "en" ? "en" : "ar";

  const [txArticle, setTxArticle] = useState<{
    title: string;
    summary: string;
    body: string;
  } | null>(null);

  // Full article paragraphs & gallery images fetched from publisher URL
  const [fullParagraphs, setFullParagraphs] = useState<string[]>([]);
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [extraVideos, setExtraVideos] = useState<{ type: "video" | "iframe"; src: string; poster?: string }[]>([]);
  const [loadingFull, setLoadingFull] = useState(false);

  // Lightbox state for viewing original-size images
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  useEffect(() => {
    setTxArticle(null);
    setFullParagraphs([]);
    setExtraImages([]);
    setExtraVideos([]);
    setLightboxOpen(false);
    setLightboxIdx(0);
  }, [article?.slug]);

  // Fetch full article paragraphs & original images from /api/news-image?full=1&url=...
  useEffect(() => {
    if (!article?.link || article.reader || article.staff) return;
    let active = true;
    setLoadingFull(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/news-image?full=1&url=${encodeURIComponent(article.link)}&lang=${encodeURIComponent(targetLang)}`,
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          ok?: boolean;
          paragraphs?: string[];
          images?: string[];
          videos?: { type: "video" | "iframe"; src: string; poster?: string }[];
        };
        if (!active) return;
        if (Array.isArray(data.paragraphs) && data.paragraphs.length > 0) {
          // Translate paragraphs if needed when viewing in he/en
          if (targetLang !== "ar") {
            const translated = await Promise.all(
              data.paragraphs.slice(0, 14).map((p) => translateSingleTextClient(p, targetLang)),
            );
            if (active) setFullParagraphs(translated.filter(Boolean));
          } else {
            setFullParagraphs(data.paragraphs);
          }
        }
        if (Array.isArray(data.images) && data.images.length > 0) {
          setExtraImages(data.images);
        }
        if (Array.isArray(data.videos) && data.videos.length > 0) {
          setExtraVideos(data.videos);
        }
      } catch {
        // fallback to summary
      } finally {
        if (active) setLoadingFull(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [article?.link, article?.reader, article?.staff, targetLang]);

  // Translate title/summary/body if source language differs from active site language
  useEffect(() => {
    if (!article) {
      setTxArticle(null);
      return;
    }
    const srcLang = detectSourceLang(article.title);
    if (srcLang === targetLang) {
      setTxArticle(null);
      return;
    }
    let active = true;
    void (async () => {
      const [tTitle, tSum, tBody] = await Promise.all([
        translateSingleTextClient(article.title, targetLang),
        article.summary ? translateSingleTextClient(article.summary, targetLang) : Promise.resolve(""),
        article.body ? translateSingleTextClient(article.body, targetLang) : Promise.resolve(""),
      ]);
      if (active) {
        setTxArticle({
          title: tTitle || article.title,
          summary: tSum || article.summary || "",
          body: tBody || article.body || "",
        });
      }
    })();
    return () => {
      active = false;
    };
  }, [article, targetLang]);

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

  // Combine hero image + any additional article images for the full-size lightbox
  const allGalleryImages = useMemo(() => {
    const list: string[] = [];
    const add = (u?: string) => {
      if (u && !list.includes(u)) list.push(u);
    };
    add(shownArticle.image);
    for (const im of extraImages) add(im);
    return list;
  }, [shownArticle.image, extraImages]);

  const heroImageUrl = allGalleryImages[0] ?? shownArticle.image;

  // Build full paragraphs list (merge summary + extracted full paragraphs without duplication)
  const displayParagraphs = useMemo(() => {
    if (fullParagraphs.length > 0) {
      return fullParagraphs;
    }
    if (shownArticle.body) {
      return shownArticle.body
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean);
    }
    if (shownArticle.summary) {
      return [shownArticle.summary];
    }
    return [];
  }, [fullParagraphs, shownArticle.body, shownArticle.summary]);

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
        {heroImageUrl ? (
          <figure className="m-0">
            <button
              type="button"
              onClick={() => {
                setLightboxIdx(0);
                setLightboxOpen(true);
              }}
              aria-label={tr("اضغط لتكبير صورة الخبر بالحجم الأصلي")}
              className="group relative block w-full cursor-zoom-in overflow-hidden bg-black/5 focus:outline-none"
            >
              <img
                src={heroImageUrl}
                alt={trv(shownArticle.title)}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                referrerPolicy="no-referrer"
                className="mx-auto max-h-[72vh] w-full object-contain transition duration-300 group-hover:scale-[1.01]"
              />
              <span className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs font-extrabold text-white shadow-md backdrop-blur-xs transition group-hover:bg-black/85">
                <ZoomIn className="size-3.5" aria-hidden />
                <span>{tr("تكبير الصورة بالحجم الأصلي")}</span>
                              {/* Extracted Article Videos from Feed / Publisher Page */}
              {extraVideos.length > 0 ? (
                <div className="mt-6 space-y-4">
                  <p className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
                    <span>🎬</span>
                    <span>{tr("فيديو مرفق بالخبر")}</span>
                  </p>
                  {extraVideos.map((vid, vIdx) => (
                    <div
                      key={`vid-${vIdx}-${vid.src}`}
                      className="overflow-hidden rounded-2xl border border-line bg-black shadow-md"
                    >
                      <div className="relative aspect-video w-full bg-black">
                        {vid.type === "video" ? (
                          <video
                            src={vid.src}
                            poster={vid.poster || heroImageUrl}
                            controls
                            playsInline
                            preload="metadata"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <iframe
                            src={vid.src}
                            title={`video-${vIdx + 1}`}
                            className="h-full w-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                            allowFullScreen
                          />
                        )}
                      </div>
                      <div className="flex items-center justify-between bg-ink px-3 py-2 text-[11px] font-bold text-paper">
                        <span>🎬 {tr("مشغّل الفيديو المباشر")}</span>
                        <a
                          href={vid.src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 text-white hover:bg-white/25"
                        >
                          <span>{tr("فتح الفيديو في نافذة مستقلة")}</span>
                          <ExternalLink className="size-3" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {allGalleryImages.length > 1 ? (
                  <span className="opacity-80">({allGalleryImages.length})</span>
                ) : null}
              </span>
            </button>
            <figcaption className="flex items-center justify-between gap-2 px-4 pt-2 text-xs font-semibold text-muted">
              <span>
                {tr("الصورة:")} {trv(shownArticle.source)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setLightboxIdx(0);
                  setLightboxOpen(true);
                }}
                className="inline-flex items-center gap-1 font-extrabold text-primary-ink hover:underline"
              >
                <Maximize2 className="size-3" />
                <span>{tr("عرض بالحجم الكامل")}</span>
              </button>
            </figcaption>
          </figure>
        ) : null}

        <div className="p-4 sm:p-6">
          <span className={shownArticle.breaking ? "chip chip-alert" : "chip chip-deep"}>
            {shownArticle.breaking
              ? tr("عاجل")
              : shownArticle.reader
                ? tr("من القراء")
                : trSecLabel(shownArticle.category, targetLang)}
          </span>

          <h1 dir="auto" className="mt-3 text-2xl leading-snug font-extrabold sm:text-3xl">
            {trv(shownArticle.title)}
          </h1>
          <p className="mt-1.5 text-sm font-semibold text-muted">
            <time dateTime={shownArticle.publishedAt}>
              {relativeTimeAr(shownArticle.publishedAt, now)}
            </time>{" "}
            ·{" "}
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
              {/* Full Multi-Paragraph Article Content */}
              {displayParagraphs.length > 0 ? (
                <div dir="auto" className="mt-5 space-y-4 text-base leading-relaxed font-medium text-ink sm:text-lg">
                  {displayParagraphs.map((para, idx) => (
                    <p key={idx} className="whitespace-pre-line leading-8">
                      {trv(para)}
                    </p>
                  ))}
                </div>
              ) : null}

              {loadingFull && fullParagraphs.length === 0 ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-xs font-bold text-muted">
                  <RefreshCw className="size-3.5 animate-spin text-primary-ink" />
                  <span>{tr("جاري جلب تفاصيل الخبر الكامل…")}</span>
                </div>
              ) : null}

              {/* Additional In-Article Images (Clickable to open in Original-Size Lightbox) */}
              {allGalleryImages.length > 1 ? (
                <div className="mt-6">
                  <p className="mb-2.5 text-xs font-extrabold text-muted">
                    {tr("صور إضافية من الخبر (اضغط على أي صورة لتكبيرها بحجمها الأصلي):")}
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {allGalleryImages.slice(1).map((imgUrl, i) => (
                      <button
                        key={imgUrl}
                        type="button"
                        onClick={() => {
                          setLightboxIdx(i + 1);
                          setLightboxOpen(true);
                        }}
                        className="group relative overflow-hidden rounded-2xl border border-line bg-surface focus:outline-none"
                      >
                        <img
                          src={imgUrl}
                          alt={trv(shownArticle.title)}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                        <span className="pointer-events-none absolute right-2 bottom-2 rounded-lg bg-black/65 px-2 py-0.5 text-[10px] font-bold text-white">
                          🔍 {tr("تكبير")}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <a
                className="btn mt-6 w-full"
                href={shownArticle.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                {tr("اقرأ الخبر كاملاً في المصدر")}
                <ExternalLink className="size-4" aria-hidden />
              </a>
              <p className="mt-3 text-sm font-semibold text-muted">
                {tr("المصدر:")} {trv(shownArticle.source)}
                {tr(". حقوق النشر محفوظة للمصدر الأصلي.")}
              </p>
            </>
          )}
        </div>
      </article>

      {lightboxOpen && allGalleryImages.length > 0 ? (
        <ArticleImageLightbox
          images={allGalleryImages}
          activeIndex={lightboxIdx}
          title={shownArticle.title}
          source={shownArticle.source}
          onClose={() => setLightboxOpen(false)}
          onSelectIndex={(idx) => setLightboxIdx(idx)}
        />
      ) : null}

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
                  <span dir="auto" className="min-w-0 flex-1 leading-snug">
                    {trv(item.title)}
                  </span>
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
            <p key={i} className="whitespace-pre-line leading-8">
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
