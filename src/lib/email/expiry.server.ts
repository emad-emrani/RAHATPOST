import { getSql } from "@/lib/db";
import { LISTING_DAYS } from "@/lib/market/types";
import { notifyUser } from "./send.server";

let last = 0;
/** Listing expiring (5 days left) / expired e-mails, once per renewal cycle. Throttled; piggybacks on haraj traffic. */
export async function sweepExpiry(): Promise<void> {
  if (Date.now() - last < 3_600_000) return;
  last = Date.now();
  try {
    const sql = await getSql();
    const rows = await sql.query<{ id: string; user_id: string; title: string; base: Date | string; expired: boolean }>(
      `select id, user_id, title, coalesce(renewed_at, created_at) as base,
              coalesce(renewed_at, created_at) < now() - make_interval(days => $1) as expired
         from classifieds
        where status = 'approved' and not is_sample and sold_at is null
          and coalesce(renewed_at, created_at) < now() - make_interval(days => $1 - 5)
          and coalesce(renewed_at, created_at) > now() - make_interval(days => $1 + 30)
        limit 50`,
      [LISTING_DAYS],
    );
    for (const r of rows) {
      const kind = r.expired ? "listing_expired" : "listing_expiring";
      const key = `${kind}:${r.id}:${new Date(r.base).toISOString()}`;
      const ins = await sql.query(`insert into email_log (key) values ($1) on conflict do nothing returning key`, [key]);
      if (ins.length) await notifyUser(kind, r.user_id, "/haraj/mine", r.title);
    }
  } catch (error) {
    console.error("[email] expiry sweep failed", error);
  }
}
