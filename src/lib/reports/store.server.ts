import { createHash, randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import { AUTO_HIDE_AFTER, type ReportGroup, type ReportTarget } from "./types";

const TABLE: Record<ReportTarget, string> = {
  news: "reader_news",
  ad: "classifieds",
  business: "business_submissions",
  comment: "comments",
};

/** Status that takes a target off the site (posts go back to the moderation queue). */
const HIDDEN: Record<ReportTarget, string> = {
  news: "pending",
  ad: "pending",
  business: "pending",
  comment: "hidden",
};

const iso = (v: Date | string) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());

/** Salted hash of the reporter's user id or IP — enough to count distinct reporters. */
export function reporterKey(identity: string): string {
  const salt = process.env.BETTER_AUTH_SECRET ?? "rahatpost-reports";
  return createHash("sha256").update(`${salt}:report:${identity}`).digest("hex").slice(0, 32);
}

/** Only approved (public) posts can be reported. */
export async function isPublicTarget(type: ReportTarget, id: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql.query(
    `select 1 from ${TABLE[type]} where id = $1 and status = 'approved'`,
    [id],
  );
  return rows.length > 0;
}

/** Saves the report; returns true when the post was auto-hidden by this report. */
export async function createReport(r: {
  type: ReportTarget;
  id: string;
  reason: string;
  note: string;
  userId: string | null;
  key: string;
}): Promise<boolean> {
  const sql = await getSql();
  const dup = await sql`select 1 from content_reports where target_type = ${r.type}
    and target_id = ${r.id} and reporter_key = ${r.key} and status = 'pending'`;
  if (dup.length === 0) {
    await sql`insert into content_reports (id, target_type, target_id, reason, note, reporter_user_id, reporter_key)
      values (${randomBytes(8).toString("hex")}, ${r.type}, ${r.id}, ${r.reason}, ${r.note || null}, ${r.userId}, ${r.key})`;
  }
  const rows = await sql<{
    n: number;
  }>`select count(distinct reporter_key)::int as n from content_reports
    where target_type = ${r.type} and target_id = ${r.id} and status = 'pending'`;
  if (Number(rows[0]?.n ?? 0) >= AUTO_HIDE_AFTER) {
    // Back to the moderation queue (hidden from the public) without touching its dates.
    const hidden = await sql.query(
      `update ${TABLE[r.type]} set status = $2 where id = $1 and status = 'approved' returning id`,
      [r.id, HIDDEN[r.type]],
    );
    if (hidden.length > 0 && r.type === "comment") {
      const { invalidateCounts } = await import("@/lib/comments/store.server");
      invalidateCounts();
    }
    return hidden.length > 0;
  }
  return false;
}

type ReportRow = {
  id: string;
  target_type: ReportTarget;
  target_id: string;
  reason: string;
  note: string | null;
  created_at: Date | string;
};

async function describe(type: ReportTarget, id: string): Promise<ReportGroup["target"]> {
  const sql = await getSql();
  if (type === "comment") {
    const r = (
      await sql<{ body: string; status: string; article_key: string; name: string | null }>`
      select c.body, c.status, c.article_key, u."name" as name from comments c
      join "user" u on u."id" = c.user_id where c.id = ${id}`
    )[0];
    return r
      ? {
          title: `تعليق من ${(r.name ?? "").trim() || "قارئ"}`,
          excerpt: r.body.slice(0, 200),
          status: r.status === "hidden" ? "pending" : r.status,
          url: `/${r.article_key}#c-${id}`,
        }
      : null;
  }
  if (type === "news") {
    const r = (
      await sql<{ title: string; body: string; status: string }>`
      select title, body, status from reader_news where id = ${id}`
    )[0];
    return r
      ? {
          title: r.title,
          excerpt: r.body.slice(0, 200),
          status: r.status,
          url: `/news/reader-${id}`,
        }
      : null;
  }
  if (type === "ad") {
    const r = (
      await sql<{ title: string; description: string; status: string }>`
      select title, description, status from classifieds where id = ${id}`
    )[0];
    return r
      ? {
          title: r.title,
          excerpt: r.description.slice(0, 200),
          status: r.status,
          url: `/haraj/${id}`,
        }
      : null;
  }
  const r = (
    await sql<{ name: string; about: string; status: string }>`
    select name, about, status from business_submissions where id = ${id}`
  )[0];
  return r
    ? { title: r.name, excerpt: r.about, status: r.status, url: `/directory/biz-${id}` }
    : null;
}

export async function pendingGroups(): Promise<ReportGroup[]> {
  const sql = await getSql();
  const rows = await sql<ReportRow>`select id, target_type, target_id, reason, note, created_at
    from content_reports where status = 'pending' order by created_at desc limit 300`;
  const groups = new Map<string, ReportGroup>();
  for (const r of rows) {
    const key = `${r.target_type}:${r.target_id}`;
    let g = groups.get(key);
    if (!g) {
      g = { targetType: r.target_type, targetId: r.target_id, target: null, count: 0, reports: [] };
      groups.set(key, g);
    }
    g.count++;
    g.reports.push({
      id: r.id,
      reason: r.reason,
      note: r.note ?? "",
      createdAt: iso(r.created_at),
    });
  }
  const list = [...groups.values()];
  await Promise.all(list.map(async (g) => (g.target = await describe(g.targetType, g.targetId))));
  return list.sort((a, b) => b.count - a.count);
}

/** hide → back to pending (not public); delete → removes the post; dismiss → keeps it. */
export async function resolve(
  type: ReportTarget,
  id: string,
  action: "hide" | "delete" | "dismiss",
) {
  const sql = await getSql();
  if (action === "hide") {
    await sql.query(`update ${TABLE[type]} set status = $2 where id = $1`, [id, HIDDEN[type]]);
  } else if (action === "delete") {
    await sql.query(`delete from ${TABLE[type]} where id = $1`, [id]);
    if (type !== "news") {
      const { deleteOwnerMedia } = await import("@/lib/media/store.server");
      await deleteOwnerMedia(type === "ad" ? "ad" : "business", id);
    }
  } else {
    // Dismissed reports also restore a post that was auto-hidden.
    await sql.query(
      `update ${TABLE[type]} set status = 'approved' where id = $1 and status = $3
      and exists (select 1 from content_reports where target_type = $2 and target_id = $1 and status = 'pending')`,
      [id, type, HIDDEN[type]],
    );
  }
  await sql`update content_reports set status = ${action === "dismiss" ? "dismissed" : "actioned"},
    decided_at = now() where target_type = ${type} and target_id = ${id} and status = 'pending'`;
}

export async function countPending(): Promise<number> {
  const sql = await getSql();
  const rows = await sql<{ n: number }>`select count(distinct (target_type, target_id))::int as n
    from content_reports where status = 'pending'`;
  return Number(rows[0]?.n ?? 0);
}
