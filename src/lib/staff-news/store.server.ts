import { randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import type { StaffNews, StaffNewsInput } from "./types";

type Row = {
  id: string;
  title: string;
  category: string;
  body: string;
  image_key: string | null;
  breaking: boolean;
  created_at: Date | string;
  author_id: string | null;
  author_name: string | null;
};
const iso = (v: Date | string) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());
const toItem = (r: Row): StaffNews => ({
  id: r.id,
  title: r.title,
  category: r.category,
  body: r.body,
  imageKey: r.image_key ?? "",
  breaking: Boolean(r.breaking),
  createdAt: iso(r.created_at),
  authorId: r.author_id ?? "",
  authorName: r.author_name ?? "",
});
const COLS = `id, title, category, body, image_key, breaking, created_at, author_id, author_name`;

/** Newest first; `authorId` limits to one writer's articles. */
export async function listStaffNews(limit = 50, authorId?: string): Promise<StaffNews[]> {
  const sql = await getSql();
  const rows = authorId
    ? await sql.query<Row>(
        `select ${COLS} from staff_news where author_id = $1 order by created_at desc limit $2`,
        [authorId, limit],
      )
    : await sql.query<Row>(`select ${COLS} from staff_news order by created_at desc limit $1`, [
        limit,
      ]);
  return rows.map(toItem);
}

export async function getStaffNews(id: string): Promise<StaffNews | null> {
  const sql = await getSql();
  const rows = await sql.query<Row>(`select ${COLS} from staff_news where id = $1`, [id]);
  return rows[0] ? toItem(rows[0]) : null;
}

export async function createStaffNews(
  input: StaffNewsInput,
  author: { id: string; name: string } | null,
): Promise<string> {
  const sql = await getSql();
  const id = randomBytes(8).toString("hex");
  await sql`
    insert into staff_news (id, title, category, body, image_key, breaking, author_id, author_name)
    values (${id}, ${input.title}, ${input.category}, ${input.body}, ${input.imageKey || null},
      ${input.breaking}, ${author?.id || null}, ${author?.name || null})`;
  return id;
}

export async function updateStaffNews(id: string, input: StaffNewsInput): Promise<void> {
  const sql = await getSql();
  const old = await getStaffNews(id);
  await sql`
    update staff_news set title = ${input.title}, category = ${input.category}, body = ${input.body},
      image_key = ${input.imageKey || null}, breaking = ${input.breaking}, updated_at = now()
    where id = ${id}`;
  if (old?.imageKey && old.imageKey !== input.imageKey) await dropImage(old.imageKey);
}

export async function setStaffBreaking(id: string, breaking: boolean): Promise<void> {
  const sql = await getSql();
  await sql`update staff_news set breaking = ${breaking}, updated_at = now() where id = ${id}`;
}

export async function deleteStaffNews(id: string): Promise<void> {
  const sql = await getSql();
  const rows = await sql<{ image_key: string | null }>`
    delete from staff_news where id = ${id} returning image_key`;
  if (rows[0]?.image_key) await dropImage(rows[0].image_key);
}

async function dropImage(key: string) {
  const { deleteMediaFiles } = await import("@/lib/media/storage.server");
  await deleteMediaFiles([key]).catch((e) => console.error("[staff-news] image delete failed", e));
}

/** Content type of a staff-news photo if `key` belongs to a published article (public). */
export async function staffImageType(key: string): Promise<string | null> {
  const sql = await getSql();
  const rows = await sql<{ n: number }>`select 1 as n from staff_news where image_key = ${key}`;
  if (!rows.length) return null;
  return key.endsWith(".jpg") ? "image/jpeg" : "image/webp";
}
