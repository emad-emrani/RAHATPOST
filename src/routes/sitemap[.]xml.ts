import { createFileRoute } from "@tanstack/react-router";
import { busSchedule } from "@/data/bus-schedule";
import { busLines } from "@/data/buses";
import { guidePath, guides } from "@/data/guides";
import { osmEntries } from "@/lib/directory/types";
import { SITE_URL } from "@/lib/seo";

type Entry = { path: string; lastmod?: string; changefreq?: string; priority?: number };

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const day = (iso: string | undefined) => {
  const t = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(t) ? new Date(t).toISOString() : undefined;
};

const newest = (dates: (string | undefined)[]) =>
  dates
    .map(day)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);

/** Never let one failing table drop the whole sitemap. */
async function safe<T>(label: string, load: () => Promise<T[]>): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    console.error(`[sitemap] ${label} failed`, error);
    return [];
  }
}

async function entries(): Promise<Entry[]> {
  const [
    businesses,
    ads,
    readerNews,
    staffNews,
    feedNews,
    sportsNews,
    techNews,
    israelNews,
    products,
    sections,
  ] = await Promise.all([
    safe("directory", async () => (await import("@/lib/directory/store.server")).getApproved()),
    safe("ads", async () => (await import("@/lib/market/store.server")).listPublic(1000)),
    safe("reader news", async () =>
      (await import("@/lib/reader-news/store.server")).listApproved(1000),
    ),
    safe("staff news", async () =>
      (await import("@/lib/staff-news/store.server")).listStaffNews(1000),
    ),
    safe("feed news", async () => (await import("@/lib/news/feeds.server")).loadNews().then((r) => r.items)),
    safe("sports news", async () =>
      (await import("@/lib/news/feeds.server")).loadSportsNews().then((r) => r.items),
    ),
    safe("tech news", async () =>
      (await import("@/lib/news/feeds.server")).loadTechNews().then((r) => r.items),
    ),
    safe("israel news", async () =>
      (await import("@/lib/news/israel.server")).getIsraelNews().then((r) => r.items),
    ),
    safe("store", async () => (await import("@/lib/store/store.server")).listPublicProducts(500)),
    safe("store sections", async () =>
      (await import("@/lib/store/store.server"))
        .listCategories()
        .then((all) => all.filter((c) => c.active && c.productCount > 0)),
    ),
  ]);
  const now = new Date().toISOString();
  const busLastMod = day(busSchedule.generatedAt);
  const raw: Entry[] = [
    // Live pages (feeds refresh every few minutes), so "now" is their real last change.
    { path: "/", lastmod: now, changefreq: "hourly", priority: 1 },
    { path: "/news", lastmod: now, changefreq: "hourly", priority: 0.9 },
    { path: "/today", lastmod: now, changefreq: "hourly", priority: 0.8 },
    { path: "/israel-news", lastmod: now, changefreq: "hourly", priority: 0.7 },
    { path: "/sports-news", lastmod: now, changefreq: "hourly", priority: 0.7 },
    { path: "/tech-news", lastmod: now, changefreq: "hourly", priority: 0.7 },
    { path: "/buses", lastmod: busLastMod, changefreq: "daily", priority: 0.9 },
    ...busLines.map((l) => ({
      path: `/buses/map/${l.number}`,
      lastmod: busLastMod,
      changefreq: "daily",
      priority: 0.7,
    })),
    {
      path: "/directory",
      lastmod: newest(businesses.map((b) => b.decidedAt ?? b.createdAt)) ?? now,
      changefreq: "weekly",
      priority: 0.9,
    },
    { path: "/store", lastmod: now, changefreq: "daily", priority: 0.8 },
    ...sections.map((c) => ({ path: `/store/c/${c.slug}`, changefreq: "weekly", priority: 0.6 })),
    ...products
      .filter((p) => !p.isSample)
      .map((p) => ({ path: `/store/${p.slug}`, changefreq: "weekly", priority: 0.6 })),
    {
      path: "/haraj",
      lastmod: newest(ads.map((a) => a.renewedAt)) ?? now,
      changefreq: "daily",
      priority: 0.8,
    },
    ...guides.map((g) => ({
      path: guidePath(g),
      lastmod: day(g.checkedAt),
      changefreq: "monthly",
      priority: 0.8,
    })),
    { path: "/app", changefreq: "monthly", priority: 0.4 },
    { path: "/privacy", changefreq: "yearly", priority: 0.2 },
    { path: "/terms", changefreq: "yearly", priority: 0.2 },
    ...staffNews.map((n) => ({
      path: `/news/rp-${n.id}`,
      lastmod: day(n.createdAt),
      changefreq: "monthly",
      priority: 0.8,
    })),
    ...readerNews.map((n) => ({
      path: `/news/reader-${n.id}`,
      lastmod: day(n.updatedAt),
      changefreq: "monthly",
      priority: 0.7,
    })),
    ...[...feedNews, ...sportsNews, ...techNews].map((n) => ({
      path: `/news/${n.slug}`,
      lastmod: day(n.publishedAt),
      changefreq: "weekly",
      priority: 0.7,
    })),
    ...israelNews.map((n) => ({
      path: `/israel-news/${n.slug}`,
      lastmod: day(n.publishedAt),
      changefreq: "weekly",
      priority: 0.6,
    })),
    ...ads.filter((a) => !a.sold && !a.sample).map((a) => ({
      path: `/haraj/${a.id}`,
      lastmod: day(a.createdAt),
      changefreq: "weekly",
      priority: 0.6,
    })),
    ...businesses.map((b) => ({
      path: `/directory/biz-${b.id}`,
      lastmod: day(b.decidedAt ?? b.createdAt),
      changefreq: "monthly",
      priority: 0.7,
    })),
    // OpenStreetMap places: no reliable per-place change date, so no lastmod.
    ...osmEntries().map((p) => ({
      path: `/directory/${p.slug}`,
      changefreq: "monthly",
      priority: 0.5,
    })),
  ];

  // Deduplicate by path while preserving order.
  const seen = new Set<string>();
  return raw.filter((e) => {
    if (seen.has(e.path)) return false;
    seen.add(e.path);
    return true;
  });
}

function render(list: Entry[]): string {
  const urls = list
    .map((e) =>
      [
        "  <url>",
        `    <loc>${xmlEscape(`${SITE_URL}${e.path === "/" ? "/" : encodeURI(e.path)}`)}</loc>`,
        e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : "",
        e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : "",
        e.priority !== undefined ? `    <priority>${e.priority.toFixed(1)}</priority>` : "",
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () =>
        new Response(render(await entries()), {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
          },
        }),
    },
  },
});
