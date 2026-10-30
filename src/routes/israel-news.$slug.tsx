import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, ChevronLeft, ChevronRight, ExternalLink, Maximize2, Minimize2, RefreshCw, X, ZoomIn } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { breadcrumbLd, newsArticleLd, seo, snippet } from "@/lib/seo";
import { getLang, tr, trv } from "@/lib/i18n/core";
import { localizedIsrael } from "@/lib/i18n/localize";

function IsraelImageLightbox({
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
    const description = a
      ? snippet(a.summaryAr) ||
        tr("ترجمة إلى العربية لخبر من {0}: {1}", a.source, snippet(title, 100))
      : tr("هذا الخبر لم يعد ضمن آخر أخبار إسرائيل.");
    const image = a
      ? (a.image ?? newsCardUrl({ title: a.titleAr ?? a.titleHe, category: a.category, source: a.source }))
      : undefined;
    return seo({
      title: tr("{0} · أخبار إسرائيل بالعربية · رهط بوست", title),
      description,
      path,
      type: "article",
      image,
      publishedTime: a?.publishedAt,
      section: tr("أخبار إسرائيل"),
      keywords: [a?.source ?? "", "أخبار إسرائيل بالعربية", "رهط بوست", "أخبار النقب"].filter(Boolean),
      robots: a ? "index" : "noindex",
      jsonLd: a
        ? [
            newsArticleLd({
              path,
              headline: title,
              description,
              datePublished: a.publishedAt,
              publisherName: a.source,
              image,
              section: tr("أخبار إسرائيل"),
            }),
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
  const siteLang = getLang();
  const wantLang = siteLang === "he" ? "he" : siteLang === "en" ? "en" : "ar";

  const [fullParagraphs, setFullParagraphs] = useState<string[]>([]);
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [extraVideos, setExtraVideos] = useState<{ type: "video" | "iframe"; src: string; poster?: string }[]>([]);
  const [loadingFull, setLoadingFull] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  useEffect(() => {
    setFullParagraphs([]);
    setExtraImages([]);
    setExtraVideos([]);
    setShowFull(false);
    setLightboxOpen(false);
    setLightboxIdx(0);
  }, [article?.slug]);

  useEffect(() => {
    if (!article?.link) return;
    let active = true;
    setLoadingFull(true);
    void (async () => {
      try {
        const res = await fetch(
          `/api/news-image?full=1&url=${encodeURIComponent(article.link)}&lang=${encodeURIComponent(wantLang)}`,
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
          setFullParagraphs(data.paragraphs);
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
  }, [article?.link, wantLang]);

  const allGalleryImages = useMemo(() => {
    const list: string[] = [];
    const add = (u?: string) => {
      if (u && !list.includes(u)) list.push(u);
    };
    add(article?.image);
    for (const im of extraImages) add(im);
    return list;
  }, [article?.image, extraImages]);

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

  const heroImageUrl = allGalleryImages[0] ?? article.image;
  const summary = article.summaryAr ?? article.summaryHe;
  const titleText = article.titleAr ?? article.titleHe;

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
                alt={trv(titleText)}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                referrerPolicy="no-referrer"
                className="mx-auto max-h-[72vh] w-full object-contain transition duration-300 group-hover:scale-[1.01]"
              />
              <span className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-xs font-extrabold text-white shadow-md backdrop-blur-xs transition group-hover:bg-black/85">
                <ZoomIn className="size-3.5" aria-hidden />
                <span>{tr("تكبير الصورة بالحجم الأصلي")}</span>
                {allGalleryImages.length > 1 ? (
                  <span className="opacity-80">({allGalleryImages.length})</span>
                ) : null}
              </span>
            </button>
            <figcaption className="flex items-center justify-between gap-2 px-4 pt-2 text-xs font-semibold text-muted">
              <span>
                {tr("الصورة:")} {trv(article.source)} ({trv(article.sourceHe)})
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
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip chip-ink">{tr("أخبار إسرائيل")}</span>
            <TranslationChip item={article} />
          </div>
          <h1 className="mt-3 text-2xl leading-snug font-extrabold sm:text-3xl">
            <IsraelTitle item={article} />
          </h1>
          <p className="mt-1.5 text-sm font-semibold text-muted">
            <time dateTime={article.publishedAt}>{relativeTimeAr(article.publishedAt, now)}</time> ·{" "}
            {trv(article.source)} ({trv(article.sourceHe)})
          </p>

          {summary && (!showFull || fullParagraphs.length === 0) ? (
            article.summaryAr ? (
              <p lang="ar" className="mt-4 text-lg leading-8">
                {trv(summary)}
              </p>
            ) : (
              <p lang="he" dir="rtl" className="mt-4 text-lg leading-8">
                {trv(summary)}
              </p>
            )
          ) : null}

          {showFull && fullParagraphs.length > 0 ? (
            <div dir="auto" className="mt-5 space-y-4 rounded-2xl border border-line/70 bg-surface/40 p-4 text-base leading-relaxed font-medium text-ink sm:text-lg">
              {fullParagraphs.map((para, idx) => (
                <p key={idx} className="whitespace-pre-line leading-8">
                  {trv(para)}
                </p>
              ))}
            </div>
          ) : null}

          {/* Interactive Button: "الخبر كامل" */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowFull((v) => !v)}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl border-2 px-5 py-3 text-sm font-extrabold shadow-xs transition sm:w-auto ${
                showFull
                  ? "border-line bg-surface text-ink hover:bg-paper"
                  : "border-ink bg-ink text-paper hover:opacity-90"
              }`}
            >
              {showFull && loadingFull && fullParagraphs.length === 0 ? (
                <>
                  <RefreshCw className="size-4 animate-spin text-primary" />
                  <span>{tr("جاري فتح الخبر كامل…")}</span>
                </>
              ) : (
                <>
                  <span>📖 {showFull ? tr("إخفاء التفاصيل") : tr("الخبر كامل")}</span>
                  <ChevronDown className={`size-4 transition-transform ${showFull ? "rotate-180" : ""}`} />
                </>
              )}
            </button>
          </div>

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
                      alt={trv(titleText)}
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

          {article.titleAr ? (
            <div className="mt-5 rounded-xl bg-primary-soft p-3">
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
            {tr("الخبر الأصلي بالعبرية")}
            <ExternalLink className="size-4" aria-hidden />
          </a>
          <p className="mt-3 text-sm font-semibold text-muted">
            {article.titleAr
              ? tr("ترجمة آلية للخبر من موقع {0}، وقد تحتوي أخطاء.", article.source)
              : tr("الخبر من موقع {0} كما نُشر بالعبرية.", article.source)}{" "}
            {tr("حقوق النشر لدى المصدر.")}
          </p>
        </div>
      </article>

      {lightboxOpen && allGalleryImages.length > 0 ? (
        <IsraelImageLightbox
          images={allGalleryImages}
          activeIndex={lightboxIdx}
          title={titleText}
          source={article.source}
          onClose={() => setLightboxOpen(false)}
          onSelectIndex={(idx) => setLightboxIdx(idx)}
        />
      ) : null}

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
