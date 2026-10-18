/** URL of the branded fallback image for a news item without a photo (/api/news-image). */
export function sectionOf(category: string, source?: string): string {
  if (category === "إسرائيل") return "israel";
  if (category === "تقنية") return "tech";
  if (category === "رياضة") return "sports";
  if (source === "من القراء") return "reader";
  return "news";
}

export function newsCardUrl(item: { title: string; category: string; source?: string }): string {
  const q = new URLSearchParams({
    s: sectionOf(item.category, item.source),
    t: item.title.replace(/\s+/g, " ").trim().slice(0, 220),
  });
  if (item.source) q.set("src", item.source.slice(0, 40));
  q.set("v", "3");
  return `/api/news-image?${q.toString()}`;
}
