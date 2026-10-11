import type { NewsItem } from "@/lib/news/types";

export const NEWS_SOURCES = ["جنوب", "عرب 48", "الصنارة", "حيفا نت"];

/** Local (Rahat/Negev) items first, each group newest first. */
/** Newest first by publish time (stable for equal times). */
export function newestFirst(items: NewsItem[]): NewsItem[] {
  const time = (item: NewsItem) => Date.parse(item.publishedAt) || 0;
  return [...items].sort((a, b) => time(b) - time(a));
}

export function NewsUnavailable() {
  return (
    <div className="stamp p-4">
      <p className="text-lg font-bold">تعذّر جلب الأخبار الآن</p>
      <p className="font-semibold text-muted">
        مصادر الأخبار لا تستجيب حالياً. حاول مرة أخرى بعد قليل.
      </p>
    </div>
  );
}

export function NewsCredit() {
  return (
    <p className="mt-6 text-sm font-semibold text-muted">
      الأخبار من مواقع: {NEWS_SOURCES.join("، ")}. العناوين والمقتطفات لأصحابها، والخبر الكامل في
      موقع المصدر.
    </p>
  );
}
