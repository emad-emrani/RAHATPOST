import { randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import { deleteOwnerMedia, mediaByOwner, setOwnerMedia } from "@/lib/media/store.server";
import type { AdInput, AdStatus, OwnAd, PublicAd } from "./types";

type Row = {
  id: string;
  type: string;
  title: string;
  description: string;
  price: string | null;
  neighborhood: string;
  phone: string;
  status: AdStatus;
  created_at: Date | string;
  updated_at: Date | string;
  poster_name: string | null;
};

const iso = (v: Date | string) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());

function toOwn(r: Row): OwnAd {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    description: r.description,
    price: r.price,
    neighborhood: r.neighborhood,
    phone: r.phone,
    posterName: r.poster_name?.trim() || "مستخدم",
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
    status: r.status,
    photos: [],
  };
}

/** Attach each ad's photo keys (one query for the whole list). */
async function withPhotos<T extends { id: string; photos: string[] }>(items: T[]): Promise<T[]> {
  const map = await mediaByOwner(
    "ad",
    items.map((i) => i.id),
  );
  return items.map((i) => ({ ...i, photos: map.get(i.id) ?? [] }));
}

function toPublic(r: Row): PublicAd {
  const { status: _s, updatedAt: _u, ...rest } = toOwn(r);
  return rest;
}

const SELECT = `select c.id, c.type, c.title, c.description, c.price, c.neighborhood, c.phone, c.status,
  c.created_at, c.updated_at, u."name" as poster_name
  from classifieds c join "user" u on u."id" = c.user_id`;

export async function listApproved(limit = 100): Promise<PublicAd[]> {
  const sql = await getSql();
  const rows = await sql.query<Row>(
    `${SELECT} where c.status = 'approved' order by c.updated_at desc limit $1`,
    [limit],
  );
  return withPhotos(rows.map(toPublic));
}

export async function getApproved(id: string): Promise<PublicAd | null> {
  const sql = await getSql();
  const rows = await sql.query<Row>(`${SELECT} where c.id = $1 and c.status = 'approved'`, [id]);
  return rows[0] ? (await withPhotos([toPublic(rows[0])]))[0] : null;
}

export async function listByUser(userId: string): Promise<OwnAd[]> {
  const sql = await getSql();
  const rows = await sql.query<Row>(
    `${SELECT} where c.user_id = $1 order by c.created_at desc limit 50`,
    [userId],
  );
  return withPhotos(rows.map(toOwn));
}

export async function countPendingByUser(userId: string): Promise<number> {
  const sql = await getSql();
  const rows = await sql.query<{ n: number }>(
    `select count(*)::int as n from classifieds where user_id = $1 and status = 'pending'`,
    [userId],
  );
  return Number(rows[0]?.n ?? 0);
}

export async function createAd(userId: string, input: AdInput): Promise<string> {
  const sql = await getSql();
  const id = randomBytes(8).toString("hex");
  await sql.query(
    `insert into classifieds (id, user_id, type, title, description, price, neighborhood, phone, status)
     values ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
    [
      id,
      userId,
      input.type,
      input.title,
      input.description,
      input.price || null,
      input.neighborhood,
      input.phone,
    ],
  );
  await setOwnerMedia(userId, "ad", id, input.photos);
  return id;
}

/** Owner edit — only the owner's row; any edit goes back to review. */
export async function updateOwnAd(userId: string, id: string, input: AdInput): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql.query<{ id: string }>(
    `update classifieds set type = $3, title = $4, description = $5, price = $6, neighborhood = $7, phone = $8,
       status = 'pending', updated_at = now()
     where id = $1 and user_id = $2 returning id`,
    [
      id,
      userId,
      input.type,
      input.title,
      input.description,
      input.price || null,
      input.neighborhood,
      input.phone,
    ],
  );
  if (rows.length > 0) await setOwnerMedia(userId, "ad", id, input.photos);
  return rows.length > 0;
}

export async function deleteOwnAd(userId: string, id: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql.query<{ id: string }>(
    `delete from classifieds where id = $1 and user_id = $2 returning id`,
    [id, userId],
  );
  if (rows.length > 0) await deleteOwnerMedia("ad", id);
  return rows.length > 0;
}

/* ------------------------------------------------------------- admin */

export async function listAll(): Promise<OwnAd[]> {
  const sql = await getSql();
  const rows = await sql.query<Row>(`${SELECT} order by c.updated_at desc limit 300`);
  return withPhotos(rows.map(toOwn));
}

export async function adminSetStatus(id: string, status: AdStatus | "delete"): Promise<void> {
  const sql = await getSql();
  if (status === "delete") {
    await sql.query(`delete from classifieds where id = $1`, [id]);
    await deleteOwnerMedia("ad", id);
  } else
    await sql.query(`update classifieds set status = $2, updated_at = now() where id = $1`, [
      id,
      status,
    ]);
}
