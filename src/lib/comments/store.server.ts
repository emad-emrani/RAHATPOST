import { randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import type {
  AdminComment,
  AdminCommentFilter,
  CommentOrder,
  CommentStatus,
  CommentView,
} from "./types";

const iso = (v: Date | string) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());

type Row = {
  id: string;
  parent_id: string | null;
  user_id: string;
  body: string;
  status: CommentStatus;
  created_at: Date | string;
  edited_at: Date | string | null;
  name: string | null;
  image: string | null;
};

function safeImage(v: string | null): string | null {
  return v && /^https:\/\/[^\s"'<>]+$/.test(v) && v.length < 500 ? v : null;
}

/**
 * Public thread of one article: approved comments, plus the viewer's own pending ones (so they
 * see "waiting for approval"). Replies are always oldest-first under their parent.
 */
export async function listForArticle(
  key: string,
  viewerId: string | null,
  order: CommentOrder,
): Promise<{ comments: CommentView[]; total: number }> {
  const sql = await getSql();
  const rows = await sql<Row>`
    select c.id, c.parent_id, c.user_id, c.body, c.status, c.created_at, c.edited_at,
      u."name" as name, u."image" as image
    from comments c join "user" u on u."id" = c.user_id
    where c.article_key = ${key}
      and (c.status = 'approved' or (c.status = 'pending' and c.user_id = ${viewerId ?? ""}))
    order by c.created_at asc
    limit 500`;
  const byId = new Map<string, CommentView>();
  const top: CommentView[] = [];
  let total = 0;
  for (const r of rows) {
    if (r.status === "approved") total++;
    const view: CommentView = {
      id: r.id,
      parentId: r.parent_id,
      body: r.body,
      createdAt: iso(r.created_at),
      editedAt: r.edited_at ? iso(r.edited_at) : null,
      status: r.status,
      author: { name: (r.name ?? "").trim() || "قارئ", image: safeImage(r.image) },
      mine: viewerId !== null && r.user_id === viewerId,
      replies: [],
    };
    byId.set(r.id, view);
  }
  for (const v of byId.values()) {
    if (!v.parentId) top.push(v);
    else byId.get(v.parentId)?.replies.push(v); // replies of hidden parents stay hidden
  }
  if (order === "newest") top.reverse();
  return { comments: top, total };
}

export async function getSetting(key: string): Promise<string | null> {
  const sql = await getSql();
  const rows = await sql<{ value: string }>`select value from app_settings where key = ${key}`;
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const sql = await getSql();
  await sql`insert into app_settings (key, value) values (${key}, ${value})
    on conflict (key) do update set value = excluded.value, updated_at = now()`;
}

export async function premodOn(): Promise<boolean> {
  return (await getSetting("comments_premod")) !== "off";
}

export async function isBlocked(userId: string): Promise<boolean> {
  const sql = await getSql();
  return (await sql`select 1 from comment_blocks where user_id = ${userId}`).length > 0;
}

/** Comments this user wrote in the last 10 minutes and the last day (deleted ones excluded). */
export async function recentCounts(userId: string): Promise<{ tenMin: number; day: number }> {
  const sql = await getSql();
  const rows = await sql<{ ten: number; day: number }>`
    select count(*) filter (where created_at > now() - interval '10 minutes')::int as ten,
      count(*)::int as day
    from comments where user_id = ${userId} and created_at > now() - interval '1 day'`;
  return { tenMin: Number(rows[0]?.ten ?? 0), day: Number(rows[0]?.day ?? 0) };
}

/** Parent must be a public top-level comment of the same article. Returns its author id. */
export async function replyTarget(key: string, parentId: string): Promise<string | null> {
  const sql = await getSql();
  const rows = await sql<{ user_id: string }>`select user_id from comments
    where id = ${parentId} and article_key = ${key} and parent_id is null and status = 'approved'`;
  return rows[0]?.user_id ?? null;
}

export async function createComment(c: {
  key: string;
  parentId: string | null;
  userId: string;
  body: string;
  status: CommentStatus;
}): Promise<string> {
  const sql = await getSql();
  const id = randomBytes(8).toString("hex");
  await sql`insert into comments (id, article_key, parent_id, user_id, body, status)
    values (${id}, ${c.key}, ${c.parentId}, ${c.userId}, ${c.body}, ${c.status})`;
  bumpCounts();
  return id;
}

export async function editOwn(
  userId: string,
  id: string,
  body: string,
  windowMs: number,
): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql`update comments set body = ${body}, edited_at = now()
    where id = ${id} and user_id = ${userId} and status <> 'hidden'
      and created_at > now() - make_interval(secs => ${Math.round(windowMs / 1000)})
    returning id`;
  return rows.length > 0;
}

export async function deleteOwn(userId: string, id: string): Promise<boolean> {
  const sql = await getSql();
  const rows =
    await sql`delete from comments where id = ${id} and user_id = ${userId} returning id`;
  if (rows.length) bumpCounts();
  return rows.length > 0;
}

/* ------------------------------------------------------------- counts */

type CountCache = { at: number; map: Map<string, number> };
const g = globalThis as typeof globalThis & { __rpCommentCounts__?: CountCache };
const COUNT_TTL_MS = 60_000;

function bumpCounts() {
  g.__rpCommentCounts__ = undefined;
}

/**
 * Approved comment counts per article key, cached in memory for a minute (one aggregated query
 * over the last 30 days — news items older than that have left the feeds anyway).
 */
export async function commentCounts(): Promise<Map<string, number>> {
  const cached = g.__rpCommentCounts__;
  if (cached && Date.now() - cached.at < COUNT_TTL_MS) return cached.map;
  const sql = await getSql();
  const rows = await sql<{ article_key: string; n: number }>`
    select article_key, count(*)::int as n from comments
    where status = 'approved' and created_at > now() - interval '30 days'
    group by article_key`;
  const map = new Map(rows.map((r) => [r.article_key, Number(r.n)]));
  g.__rpCommentCounts__ = { at: Date.now(), map };
  return map;
}

/* ------------------------------------------------------------- admin */

export async function adminList(filter: AdminCommentFilter): Promise<AdminComment[]> {
  const sql = await getSql();
  const where =
    filter === "reported"
      ? "where r.n > 0"
      : filter === "hidden"
        ? "where c.status = 'hidden'"
        : filter === "pending"
          ? "where c.status = 'pending'"
          : "";
  const rows = await sql.query<{
    id: string;
    article_key: string;
    parent_id: string | null;
    body: string;
    status: CommentStatus;
    created_at: Date | string;
    user_id: string;
    name: string | null;
    email: string | null;
    blocked: boolean;
    n: number | null;
  }>(
    `select c.id, c.article_key, c.parent_id, c.body, c.status, c.created_at, c.user_id,
       u."name" as name, u."email" as email, (b.user_id is not null) as blocked, coalesce(r.n, 0) as n
     from comments c
     join "user" u on u."id" = c.user_id
     left join comment_blocks b on b.user_id = c.user_id
     left join (select target_id, count(*)::int as n from content_reports
       where target_type = 'comment' and status = 'pending' group by target_id) r on r.target_id = c.id
     ${where}
     order by c.created_at desc limit 200`,
  );
  return rows.map((r) => ({
    id: r.id,
    articleKey: r.article_key,
    parentId: r.parent_id,
    body: r.body,
    status: r.status,
    createdAt: iso(r.created_at),
    userId: r.user_id,
    userName: (r.name ?? "").trim() || "قارئ",
    userEmail: r.email,
    userBlocked: Boolean(r.blocked),
    reports: Number(r.n ?? 0),
  }));
}

export async function adminCounts(): Promise<Record<AdminCommentFilter, number>> {
  const sql = await getSql();
  const rows = await sql<{ total: number; hidden: number; pending: number; reported: number }>`
    select count(*)::int as total,
      count(*) filter (where status = 'hidden')::int as hidden,
      count(*) filter (where status = 'pending')::int as pending,
      (select count(distinct target_id)::int from content_reports
        where target_type = 'comment' and status = 'pending') as reported
    from comments`;
  const r = rows[0];
  return {
    all: Number(r?.total ?? 0),
    hidden: Number(r?.hidden ?? 0),
    pending: Number(r?.pending ?? 0),
    reported: Number(r?.reported ?? 0),
  };
}

/** hide / restore (approve) / delete. Resolves the comment's pending reports. */
export async function adminAct(id: string, action: "hide" | "restore" | "delete"): Promise<void> {
  const sql = await getSql();
  if (action === "delete") await sql`delete from comments where id = ${id}`;
  else
    await sql`update comments set status = ${action === "hide" ? "hidden" : "approved"}
      where id = ${id}`;
  await sql`update content_reports set status = ${action === "restore" ? "dismissed" : "actioned"},
    decided_at = now() where target_type = 'comment' and target_id = ${id} and status = 'pending'`;
  bumpCounts();
}

export async function setBlocked(userId: string, blocked: boolean): Promise<void> {
  const sql = await getSql();
  if (blocked)
    await sql`insert into comment_blocks (user_id) values (${userId}) on conflict do nothing`;
  else await sql`delete from comment_blocks where user_id = ${userId}`;
}

export async function deleteAllOfUser(userId: string): Promise<void> {
  const sql = await getSql();
  await sql`delete from comments where user_id = ${userId}`;
  bumpCounts();
}

export function invalidateCounts() {
  bumpCounts();
}
