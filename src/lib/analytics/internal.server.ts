import { getSql } from "@/lib/db";

export type InternalStats = {
  members: number;
  newMembers7d: number;
  team: number;
  staffNews: number;
  readerNews: number;
  ads: number;
  businesses: number;
  comments: number;
  pending: {
    readerNews: number;
    ads: number;
    businesses: number;
    comments: number;
    reports: number;
  };
  store: {
    products: number;
    samples: number;
    orders: Record<string, number>;
    revenueAgorot: number;
    orders7d: number;
  };
  pushSubscribers: number;
};

/** Counts from our own database (each query isolated so one missing table can't break all). */
export async function internalStats(): Promise<InternalStats> {
  const sql = await getSql();
  const n = async (q: string) => {
    try {
      const r = await sql.query<{ n: number }>(q);
      return Number(r[0]?.n ?? 0);
    } catch {
      return 0;
    }
  };
  const orders: Record<string, number> = {};
  try {
    for (const r of await sql.query<{ status: string; n: number }>(
      "select status, count(*)::int as n from store_orders group by status",
    ))
      orders[r.status] = Number(r.n);
  } catch {
    /* table missing */
  }
  const [members, newMembers7d, team, staffNews, readerNews, ads, businesses, comments] =
    await Promise.all([
      n(`select count(*)::int as n from "user"`),
      n(`select count(*)::int as n from "user" where "createdAt" > now() - interval '7 days'`),
      n("select count(*)::int as n from admin_roles"),
      n("select count(*)::int as n from staff_news"),
      n("select count(*)::int as n from reader_news where status = 'approved'"),
      n("select count(*)::int as n from classifieds where status = 'approved'"),
      n("select count(*)::int as n from business_submissions where status = 'approved'"),
      n("select count(*)::int as n from comments where status = 'approved'"),
    ]);
  const [pRn, pAds, pBiz, pCom, pRep, products, samples, revenue, orders7d, push] =
    await Promise.all([
      n("select count(*)::int as n from reader_news where status = 'pending'"),
      n("select count(*)::int as n from classifieds where status = 'pending'"),
      n("select count(*)::int as n from business_submissions where status = 'pending'"),
      n("select count(*)::int as n from comments where status = 'pending'"),
      n("select count(*)::int as n from content_reports where status = 'pending'"),
      n("select count(*)::int as n from store_products where active and not is_sample"),
      n("select count(*)::int as n from store_products where is_sample"),
      n(
        "select coalesce(sum(total_agorot), 0)::int as n from store_orders where status in ('paid', 'delivered')",
      ),
      n("select count(*)::int as n from store_orders where created_at > now() - interval '7 days'"),
      n("select count(*)::int as n from push_subscriptions"),
    ]);
  return {
    members,
    newMembers7d,
    team,
    staffNews,
    readerNews,
    ads,
    businesses,
    comments,
    pending: { readerNews: pRn, ads: pAds, businesses: pBiz, comments: pCom, reports: pRep },
    store: { products, samples, orders, revenueAgorot: revenue, orders7d },
    pushSubscribers: push,
  };
}
