import { createServerFn } from "@tanstack/react-start";

export type Dashboard = {
  authed: boolean;
  pending: { haraj: number | null; comments: number | null; news: number | null; reports: number | null };
  membersToday: number | null;
  membersTotal: number | null;
  days: string[];
  listings7: number[];
  members7: number[];
  topCategories: { key: string; n: number }[];
  liveListings: number | null;
  sold30: number | null;
  /** Real GA4 numbers when configured; null = card hidden. */
  visits: { today: number; views7: number[]; users7: number } | null;
  visitsNote: string;
  today: { listings: number; comments: number; news: number; members: number | null };
};
export type ReviewType = "haraj" | "news" | "comment";
export type ReviewItem = {
  type: ReviewType;
  id: string;
  title: string;
  body: string;
  author: string;
  authorImage: string | null;
  createdAt: string;
  photo: string | null;
  link: string;
};
export type SearchHit = { type: "haraj" | "news" | "member"; id: string; title: string; meta: string; section: string };

async function access() {
  const { getAdminAccess } = await import("@/lib/admin-auth");
  const a = await getAdminAccess();
  if (!a || (a.level !== "owner" && a.level !== "moderator")) return null;
  const all = a.level === "owner" || a.perms.includes("manage_all");
  const can = (p: string) => all || a.perms.includes(p);
  return { owner: a.level === "owner", haraj: can("moderate_haraj"), news: can("moderate_news"), comments: can("moderate_comments") };
}
const n = (r: unknown) => Number((r as { n?: number }[])[0]?.n ?? 0);

const dashCache = new Map<string, { at: number; v: Dashboard }>();
export const adminDashboard = createServerFn({ method: "POST" }).handler(async (): Promise<Dashboard> => {
  const acc = await access();
  const ck = acc ? JSON.stringify(acc) : "";
  const hit = ck ? dashCache.get(ck) : undefined;
  if (hit && Date.now() - hit.at < 30_000) return hit.v;
  const v = await buildDashboard();
  if (ck && v.authed) dashCache.set(ck, { at: Date.now(), v });
  return v;
});

async function buildDashboard(): Promise<Dashboard> {
  const empty: Dashboard = { authed: false, pending: { haraj: null, comments: null, news: null, reports: null }, membersToday: null, membersTotal: null, days: [], listings7: [], members7: [], topCategories: [], liveListings: null, sold30: null, visits: null, visitsNote: "", today: { listings: 0, comments: 0, news: 0, members: null } };
  const a = await access();
  if (!a) return empty;
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const q = (s: string, p: unknown[] = []) => sql.query<Record<string, unknown>>(s, p);
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * 86_400_000).toISOString().slice(0, 10));
  const series = async (table: string, col: string) => {
    const rows = await q(
      `select to_char(${col} at time zone 'Asia/Jerusalem', 'YYYY-MM-DD') as d, count(*)::int as n from ${table}
        where ${col} > now() - interval '7 days' group by 1`,
    );
    const m = new Map(rows.map((r) => [String(r.d), Number(r.n)]));
    return days.map((d) => m.get(d) ?? 0);
  };
  const H = a.haraj || a.owner;
  const visitsP = (async () => {
    if (!a.owner) return { v: null, note: "" };
    try {
      const ga = await import("@/lib/analytics/ga.server");
      const d = await ga.dashboard("6daysAgo", "today");
      if (!d) return { v: null, note: "Google Analytics غير مضبوط" };
      const m = new Map(d.series.map((x) => [x.date.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3"), x.views]));
      return { v: { today: d.quick.today.views, views7: days.map((x) => m.get(x) ?? 0), users7: d.totals.users }, note: "" };
    } catch (error) {
      return { v: null, note: error instanceof Error ? error.message.slice(0, 120) : "GA" };
    }
  })();
  const [haraj, comments, news, reports, today, total, l7, m7, top, live, sold, visits] = await Promise.all([
    a.haraj ? q(`select count(*)::int as n from classifieds where status = 'pending' and not is_sample`).then(n) : null,
    a.comments ? q(`select count(*)::int as n from comments where status = 'pending'`).then(n) : null,
    a.news ? q(`select count(*)::int as n from reader_news where status = 'pending'`).then(n) : null,
    a.news ? q(`select count(*)::int as n from content_reports where status = 'pending'`).then(n).catch(() => 0) : null,
    a.owner ? q(`select count(*)::int as n from "user" where "createdAt" > date_trunc('day', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem'`).then(n) : null,
    a.owner ? q(`select count(*)::int as n from "user"`).then(n) : null,
    a.haraj || a.owner ? series("(select created_at from classifieds where not is_sample) c", "created_at") : [],
    a.owner ? series(`"user"`, `"createdAt"`) : [],
    a.haraj || a.owner
      ? q(`select category as key, count(*)::int as n from classifieds where status = 'approved' and not is_sample and category is not null group by 1 order by 2 desc limit 5`)
      : [],
    H ? q(`select count(*)::int as n from classifieds where status = 'approved' and not is_sample and sold_at is null and coalesce(renewed_at, created_at) > now() - interval '60 days'`).then(n) : null,
    H ? q(`select count(*)::int as n from classifieds where not is_sample and sold_at > now() - interval '30 days'`).then(n) : null,
    visitsP,
  ]);
  const since = `date_trunc('day', now() at time zone 'Asia/Jerusalem') at time zone 'Asia/Jerusalem'`;
  const [tl, tc, tn] = await Promise.all([
    q(`select count(*)::int as n from classifieds where not is_sample and created_at > ${since}`).then(n),
    q(`select count(*)::int as n from comments where created_at > ${since}`).then(n),
    q(`select count(*)::int as n from reader_news where created_at > ${since}`).then(n),
  ]);
  return {
    authed: true,
    pending: { haraj, comments, news, reports },
    membersToday: today,
    membersTotal: total,
    days,
    listings7: l7,
    members7: m7,
    liveListings: live,
    sold30: sold,
    visits: visits.v,
    visitsNote: visits.note,
    today: { listings: tl, comments: tc, news: tn, members: today },
    topCategories: (top as Record<string, unknown>[]).map((r) => ({ key: String(r.key), n: Number(r.n) })),
  };
}

export const adminReviewQueue = createServerFn({ method: "POST" }).handler(async (): Promise<{ authed: boolean; items: ReviewItem[] }> => {
  const a = await access();
  if (!a) return { authed: false, items: [] };
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const q = (s: string) => sql.query<Record<string, unknown>>(s);
  const iso = (v: unknown) => new Date(v as string).toISOString();
  const items: ReviewItem[] = [];
  if (a.haraj) {
    const rows = await q(`select c.id, c.title, c.description, c.created_at, u.name, u.image from classifieds c join "user" u on u.id = c.user_id
      where c.status = 'pending' and not c.is_sample order by c.created_at limit 50`);
    const { mediaByOwner } = await import("@/lib/media/store.server");
    const photos = await mediaByOwner("ad", rows.map((r) => String(r.id)));
    for (const r of rows)
      items.push({ type: "haraj", id: String(r.id), title: String(r.title), body: String(r.description ?? ""), author: String(r.name), authorImage: (r.image as string) ?? null, createdAt: iso(r.created_at), photo: photos.get(String(r.id))?.[0] ?? null, link: `/haraj/${r.id}` });
  }
  if (a.news) {
    const rows = await q(`select n.id, n.title, n.body, n.created_at, u.name, u.image from reader_news n join "user" u on u.id = n.user_id
      where n.status = 'pending' order by n.created_at limit 50`);
    for (const r of rows)
      items.push({ type: "news", id: String(r.id), title: String(r.title), body: String(r.body ?? ""), author: String(r.name), authorImage: (r.image as string) ?? null, createdAt: iso(r.created_at), photo: null, link: `/news/reader-${r.id}` });
  }
  if (a.comments) {
    const rows = await q(`select c.id, c.body, c.article_key, c.created_at, u.name, u.image from comments c join "user" u on u.id = c.user_id
      where c.status = 'pending' order by c.created_at limit 50`);
    for (const r of rows)
      items.push({ type: "comment", id: String(r.id), title: "", body: String(r.body), author: String(r.name), authorImage: (r.image as string) ?? null, createdAt: iso(r.created_at), photo: null, link: String(r.article_key ?? "").startsWith("/") ? String(r.article_key) : "/news" });
  }
  items.sort((x, y) => x.createdAt.localeCompare(y.createdAt));
  return { authed: true, items };
});

export const adminSearch = createServerFn({ method: "POST" })
  .inputValidator((i: { q: string }) => ({ q: String(i?.q ?? "").trim().slice(0, 60) }))
  .handler(async ({ data }): Promise<SearchHit[]> => {
    const a = await access();
    if (!a || data.q.length < 2) return [];
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const like = `%${data.q.replace(/[%_\\]/g, (c) => "\\" + c)}%`;
    const hits: SearchHit[] = [];
    if (a.haraj)
      for (const r of await sql.query<Record<string, unknown>>(`select id, title, status from classifieds where title ilike $1 order by created_at desc limit 8`, [like]))
        hits.push({ type: "haraj", id: String(r.id), title: String(r.title), meta: String(r.status), section: "ads" });
    if (a.news)
      for (const r of await sql.query<Record<string, unknown>>(`select id, title, status from reader_news where title ilike $1 order by created_at desc limit 8`, [like]))
        hits.push({ type: "news", id: String(r.id), title: String(r.title), meta: String(r.status), section: "news" });
    if (a.owner)
      for (const r of await sql.query<Record<string, unknown>>(`select id, name, email from "user" where name ilike $1 or email ilike $1 order by "createdAt" desc limit 8`, [like]))
        hits.push({ type: "member", id: String(r.id), title: String(r.name), meta: String(r.email), section: "members" });
    return hits;
  });
