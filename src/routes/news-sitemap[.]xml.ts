import { createFileRoute } from "@tanstack/react-router";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

/** Google News sitemap: our own (indexable) news from the last 48 hours. */
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Item = { path: string; title: string; date: string };

async function items(): Promise<Item[]> {
  const cutoff = Date.now() - 48 * 3600 * 1000;
  const out: Item[] = [];
  try {
    const staff = await (await import("@/lib/staff-news/store.server")).listStaffNews(200);
    for (const n of staff) out.push({ path: `/news/rp-${n.id}`, title: n.title, date: n.createdAt });
  } catch (e) {
    console.error("[news-sitemap] staff", e);
  }
  try {
    const reader = await (await import("@/lib/reader-news/store.server")).listApproved(200);
    for (const n of reader)
      out.push({ path: `/news/reader-${n.id}`, title: n.title, date: n.createdAt });
  } catch (e) {
    console.error("[news-sitemap] reader", e);
  }
  return out
    .filter((i) => Number.isFinite(Date.parse(i.date)) && Date.parse(i.date) >= cutoff)
    .slice(0, 1000);
}

function render(list: Item[]): string {
  const urls = list
    .map(
      (i) => `  <url>
    <loc>${esc(SITE_URL + i.path)}</loc>
    <news:news>
      <news:publication><news:name>${esc(SITE_NAME)}</news:name><news:language>ar</news:language></news:publication>
      <news:publication_date>${new Date(i.date).toISOString()}</news:publication_date>
      <news:title>${esc(i.title)}</news:title>
    </news:news>
  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${urls}\n</urlset>\n`;
}

export const Route = createFileRoute("/news-sitemap.xml")({
  server: {
    handlers: {
      GET: async () =>
        new Response(render(await items()), {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=0, s-maxage=600, stale-while-revalidate=3600",
          },
        }),
    },
  },
});
