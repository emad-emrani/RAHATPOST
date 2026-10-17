import { Link } from "@tanstack/react-router";
import { NewsImage } from "@/components/news-image";
import { CommentCount } from "@/components/comment-count";
import { relativeTimeAr } from "@/lib/news/format";
import type { IsraelNewsItem, IsraelNewsResult } from "@/lib/news/types";
import { tr, trv } from "@/lib/i18n/core";
import { getLang } from "@/lib/i18n/core";

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
    <span lang={getLang()} className={className}>
      {trv(item.titleAr)}
    </span>
  ) : (
    <span lang="he" dir="rtl" className={className}>
      {trv(item.titleHe)}
    </span>
  );
}

export function TranslationChip({ item }: { item: IsraelNewsItem }) {
  if (getLang() === "he") return null;
  return item.titleAr ? (
    <span className="chip chip-deep">{tr("ترجمة آلية")}</span>
  ) : (
    <span className="chip">{tr("بالعبرية")}</span>
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
            {relativeTimeAr(item.publishedAt, now)} · {trv(item.source)}
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
          {relativeTimeAr(item.publishedAt, now)} · {trv(item.source)}
          <CommentCount n={item.comments} className="ms-2" />
        </span>
      </span>
    </Link>
  );
}

export function IsraelNewsUnavailable() {
  return (
    <div className="stamp p-4">
      <p className="text-lg font-bold">{tr("تعذّر جلب أخبار إسرائيل الآن")}</p>
      <p className="font-semibold text-muted">
        {tr("المواقع العبرية لا تستجيب حالياً. حاول مرة أخرى بعد قليل.")}
      </p>
    </div>
  );
}

export function IsraelNewsCredit({ data }: { data: Pick<IsraelNewsResult, "translation"> }) {
  return (
    <p className="mt-4 text-sm font-semibold text-muted">
      {tr("الأخبار من مواقع:")} {ISRAEL_NEWS_SOURCES.map((s) => `${s.name} (${s.he})`).join(tr("، "))}.{" "}
      {data.translation === "off"
        ? tr("العناوين بالعبرية كما نشرها المصدر.")
        : tr("العناوين مترجمة ترجمة آلية من العبرية وقد تحتوي أخطاء؛ ما لم يُترجم بعد يظهر بالعبرية.")}{" "}
      {tr("الخبر الكامل وحقوقه لدى المصدر.")}
    </p>
  );
}
