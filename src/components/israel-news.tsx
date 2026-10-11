import { Link } from "@tanstack/react-router";
import { NewsImage } from "@/components/news-image";
import { CommentCount } from "@/components/comment-count";
import { relativeTimeAr } from "@/lib/news/format";
import type { IsraelNewsItem, IsraelNewsResult } from "@/lib/news/types";

export const ISRAEL_NEWS_SOURCES = [
  { name: "واي نت", he: "ynet" },
  { name: "أخبار 12", he: "N12" },
  { name: "معاريف", he: "מעריב" },
  { name: "غلوبس", he: "גלובס" },
];

/** Image props for NewsImage (alt = the title the reader sees). */
export function imageItem(item: IsraelNewsItem) {
  return {
    image: item.image,
    thumb: item.thumb,
    title: item.titleAr ?? item.titleHe,
    category: item.category,
  };
}

/** The Arabic machine translation when there is one, otherwise the Hebrew original, marked as such. */
export function IsraelTitle({
  item,
  className = "",
}: {
  item: IsraelNewsItem;
  className?: string;
}) {
  return item.titleAr ? (
    <span lang="ar" className={className}>
      {item.titleAr}
    </span>
  ) : (
    <span lang="he" dir="rtl" className={className}>
      {item.titleHe}
    </span>
  );
}

export function TranslationChip({ item }: { item: IsraelNewsItem }) {
  return item.titleAr ? (
    <span className="chip chip-deep">ترجمة آلية</span>
  ) : (
    <span className="chip">بالعبرية</span>
  );
}

export function IsraelNewsRow({ item, now }: { item: IsraelNewsItem; now: number }) {
  return (
    <Link
      to="/israel-news/$slug"
      params={{ slug: item.slug }}
      className="flex items-start gap-3 px-4 py-3"
    >
      <NewsImage item={imageItem(item)} className="size-20 rounded-xl" iconClassName="size-7" />
      <span className="min-w-0 flex-1">
        <IsraelTitle item={item} className="line-clamp-3 block font-bold leading-snug" />
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-muted">
          <span>
            {relativeTimeAr(item.publishedAt, now)} · {item.source}
          </span>
          <TranslationChip item={item} />
          <CommentCount n={item.comments} />
        </span>
      </span>
    </Link>
  );
}

export function IsraelNewsLead({ item, now }: { item: IsraelNewsItem; now: number }) {
  return (
    <Link
      to="/israel-news/$slug"
      params={{ slug: item.slug }}
      className="stamp press mb-3 block overflow-hidden"
    >
      <NewsImage
        item={imageItem(item)}
        size="full"
        className="aspect-[16/9] w-full"
        iconClassName="size-10"
      />
      <span className="block p-4">
        <TranslationChip item={item} />
        <IsraelTitle item={item} className="mt-2 block text-xl font-bold leading-snug" />
        <span className="text-sm font-semibold text-muted">
          {relativeTimeAr(item.publishedAt, now)} · {item.source}
          <CommentCount n={item.comments} className="ms-2" />
        </span>
      </span>
    </Link>
  );
}

export function IsraelNewsUnavailable() {
  return (
    <div className="stamp p-4">
      <p className="text-lg font-bold">تعذّر جلب أخبار إسرائيل الآن</p>
      <p className="font-semibold text-muted">
        المواقع العبرية لا تستجيب حالياً. حاول مرة أخرى بعد قليل.
      </p>
    </div>
  );
}

export function IsraelNewsCredit({ data }: { data: Pick<IsraelNewsResult, "translation"> }) {
  return (
    <p className="mt-4 text-sm font-semibold text-muted">
      الأخبار من مواقع: {ISRAEL_NEWS_SOURCES.map((s) => `${s.name} (${s.he})`).join("، ")}.{" "}
      {data.translation === "off"
        ? "العناوين بالعبرية كما نشرها المصدر."
        : "العناوين مترجمة ترجمة آلية من العبرية وقد تحتوي أخطاء؛ ما لم يُترجم بعد يظهر بالعبرية."}{" "}
      الخبر الكامل وحقوقه لدى المصدر.
    </p>
  );
}
