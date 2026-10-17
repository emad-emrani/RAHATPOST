import type { NewsItem } from "@/lib/news/types";
import { tr } from "@/lib/i18n/core";

export const NEWS_SOURCES = ["جنوب", "عرب 48", "الصنارة", "حيفا نت"];

/** Local (Rahat/Negev) items first, each group newest first. */
/** Newest first by publish time (stable for equal times). */
export function newestFirst(items: NewsItem[]): NewsItem[] {
  const time = (item: NewsItem) => Date.parse(item.publishedAt) || 0;
  return [...items].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || time(b) - time(a));
}

export function NewsUnavailable() {
  return (
    <div className="stamp p-4">
      <p className="text-lg font-bold">{tr("تعذّر جلب الأخبار الآن")}</p>
      <p className="font-semibold text-muted">
        {tr("مصادر الأخبار لا تستجيب حالياً. حاول مرة أخرى بعد قليل.")}
      </p>
    </div>
  );
}

export function NewsCredit() {
  return (
    <p className="mt-6 text-sm font-semibold text-muted">
      {tr("الأخبار من مواقع:")} {NEWS_SOURCES.join(tr("، "))}{tr(". العناوين والمقتطفات لأصحابها، والخبر الكامل في موقع المصدر.")}
    </p>
  );
}
