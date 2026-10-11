import { randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import type { OwnReaderNews, ReaderNewsInput, ReaderNewsStatus } from "./types";

type Row = {
  id: string;
  title: string;
  body: string;
  source_url: string | null;
  neighborhood: string;
  status: ReaderNewsStatus;
  created_at: Date | string;
  updated_at: Date | string;
  poster_name: string | null;
};

const iso = (v: Date | string) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());

function toOwn(r: Row): OwnReaderNews {
  return {
    id: r.id,
    title: r.title,
    body: r.body,
    sourceUrl: r.source_url ?? "",
    neighborhood: r.neighborhood,
    status: r.status,
    posterName: r.poster_name?.trim() || "قارئ",
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

const SELECT = `select n.id, n.title, n.body, n.source_url, n.neighborhood, n.status, n.created_at,
  n.updated_at, u."name" as poster_name
  from reader_news n join "user" u on u."id" = n.user_id`;

export async function listApproved(limit = 30): Promise<OwnReaderNews[]> {
  const sql = await getSql();
  const rows = await sql.query<Row>(
    `${SELECT} where n.status = 'approved' order by n.updated_at desc limit $1`,
    [limit],
  );
  return rows.map(toOwn);
}

export async function listByUser(userId: string): Promise<OwnReaderNews[]> {
  const sql = await getSql();
  const rows = await sql.query<Row>(
    `${SELECT} where n.user_id = $1 order by n.created_at desc limit 100`,
    [userId],
  );
  return rows.map(toOwn);
}

export async function countPendingByUser(userId: string): Promise<number> {
  const sql = await getSql();
  const rows = await sql<{ n: number }>`
    select count(*)::int as n from reader_news where user_id = ${userId} and status = 'pending'`;
  return Number(rows[0]?.n ?? 0);
}

export async function createNews(userId: string, input: ReaderNewsInput): Promise<string> {
  const id = randomBytes(8).toString("hex");
  const sql = await getSql();
  await sql`
    insert into reader_news (id, user_id, title, body, source_url, neighborhood)
    values (${id}, ${userId}, ${input.title}, ${input.body}, ${input.sourceUrl || null},
      ${input.neighborhood})`;
  return id;
}

export async function deleteOwnNews(userId: string, id: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql<{ id: string }>`
    delete from reader_news where id = ${id} and user_id = ${userId} returning id`;
  return rows.length > 0;
}

export async function listAll(): Promise<OwnReaderNews[]> {
  const sql = await getSql();
  const rows = await sql.query<Row>(`${SELECT} order by n.updated_at desc limit 500`);
  return rows.map(toOwn);
}

export async function adminSetStatus(id: string, action: ReaderNewsStatus | "delete") {
  const sql = await getSql();
  if (action === "delete") await sql`delete from reader_news where id = ${id}`;
  else await sql`update reader_news set status = ${action}, updated_at = now() where id = ${id}`;
}
