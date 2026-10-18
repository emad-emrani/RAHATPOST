import { randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import { deleteOwnerMedia, mediaByOwner, setOwnerMedia } from "@/lib/media/store.server";
import { LISTING_DAYS, type Specs, type Listing, type ListingInput, type ListingStatus, type OwnListing, type PriceMode } from "./types";

type Row = {
  id: string;
  user_id: string;
  title: string;
  category: string;
  price_mode: PriceMode;
  price_num: number | null;
  condition: string;
  neighborhood: string;
  description: string;
  specs: Specs | string | null;
  phone: string;
  hide_phone: boolean;
  status: ListingStatus;
  sold_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  renewed_at: Date | string | null;
  seller_name: string | null;
  seller_image: string | null;
  seller_since: Date | string;
};

const iso = (v: Date | string) => (v instanceof Date ? v : new Date(v)).toISOString();
const expiredAt = (r: Row) => Date.now() - Date.parse(iso(r.renewed_at ?? r.created_at)) > LISTING_DAYS * 86_400_000;

function toOwn(r: Row): OwnListing {
  return {
    id: r.id,
    title: r.title,
    category: r.category,
    priceMode: r.price_mode,
    price: r.price_num,
    condition: r.condition,
    area: r.neighborhood,
    description: r.description,
    specs: (typeof r.specs === "string" ? JSON.parse(r.specs) : r.specs) ?? {},
    photos: [],
    phone: r.phone,
    hidePhone: r.hide_phone,
    sold: Boolean(r.sold_at),
    expired: expiredAt(r),
    createdAt: iso(r.created_at),
    renewedAt: iso(r.renewed_at ?? r.created_at),
    updatedAt: iso(r.updated_at),
    status: r.status,
    seller: { id: r.user_id, name: r.seller_name?.trim() || "عضو", image: r.seller_image, since: iso(r.seller_since) },
  };
}

function toPublic(r: Row): Listing {
  const { status: _s, hidePhone, updatedAt: _u, ...rest } = toOwn(r);
  return { ...rest, phone: hidePhone ? null : rest.phone };
}

async function withPhotos<T extends { id: string; photos: string[] }>(items: T[]): Promise<T[]> {
  const map = await mediaByOwner("ad", items.map((i) => i.id));
  return items.map((i) => ({ ...i, photos: map.get(i.id) ?? [] }));
}

const SELECT = `select c.id, c.user_id, c.title, c.category, c.price_mode, c.price_num, c.condition, c.neighborhood,
  c.description, c.specs, c.phone, c.hide_phone, c.status, c.sold_at, c.created_at, c.updated_at, c.renewed_at,
  u."name" as seller_name, u."image" as seller_image, u."createdAt" as seller_since
  from classifieds c join "user" u on u."id" = c.user_id`;
const LIVE = `c.status = 'approved' and coalesce(c.renewed_at, c.created_at) > now() - interval '${LISTING_DAYS} days'`;

/** Public grid: approved, not expired; unsold first, newest first. */
export async function listPublic(limit = 200): Promise<Listing[]> {
  const sql = await getSql();
  const rows = await sql.query<Row>(`${SELECT} where ${LIVE} order by (c.sold_at is not null), coalesce(c.renewed_at, c.created_at) desc limit $1`, [limit]);
  return withPhotos(rows.map(toPublic));
}

export async function getPublic(id: string): Promise<Listing | null> {
  const sql = await getSql();
  const rows = await sql.query<Row>(`${SELECT} where c.id = $1 and c.status = 'approved'`, [id]);
  return rows[0] ? (await withPhotos([toPublic(rows[0])]))[0] : null;
}

/** Only for the WhatsApp redirect (works even when the seller hides the number). */
export async function getPhone(id: string): Promise<{ phone: string; title: string } | null> {
  const sql = await getSql();
  const rows = await sql.query<{ phone: string; title: string }>(`select phone, title from classifieds where id = $1 and status = 'approved' and sold_at is null`, [id]);
  return rows[0] ?? null;
}

export async function listBySeller(userId: string): Promise<{ seller: Listing["seller"] | null; items: Listing[] }> {
  const sql = await getSql();
  const rows = await sql.query<Row>(`${SELECT} where c.user_id = $1 and ${LIVE} order by (c.sold_at is not null), coalesce(c.renewed_at, c.created_at) desc limit 100`, [userId]);
  let seller = rows[0] ? toOwn(rows[0]).seller : null;
  if (!seller) {
    const u = await sql.query<{ id: string; name: string; image: string | null; createdAt: Date | string }>(`select "id", "name", "image", "createdAt" from "user" where "id" = $1`, [userId]);
    if (u[0]) seller = { id: u[0].id, name: u[0].name?.trim() || "عضو", image: u[0].image, since: iso(u[0].createdAt) };
  }
  return { seller, items: await withPhotos(rows.map(toPublic)) };
}

export async function listMine(userId: string): Promise<OwnListing[]> {
  const sql = await getSql();
  const rows = await sql.query<Row>(`${SELECT} where c.user_id = $1 order by c.created_at desc limit 60`, [userId]);
  return withPhotos(rows.map(toOwn));
}

export async function countPending(userId: string): Promise<number> {
  const sql = await getSql();
  const rows = await sql.query<{ n: number }>(`select count(*)::int as n from classifieds where user_id = $1 and status = 'pending'`, [userId]);
  return Number(rows[0]?.n ?? 0);
}

const VALUES = (i: ListingInput) => [i.title, i.category, i.priceMode, i.price, i.condition, i.area, i.description, i.phone, i.hidePhone, JSON.stringify(i.specs)];

export async function createListing(userId: string, input: ListingInput): Promise<string> {
  const sql = await getSql();
  const id = randomBytes(8).toString("hex");
  await sql.query(
    `insert into classifieds (id, user_id, title, category, price_mode, price_num, condition, neighborhood, description, phone, hide_phone, specs, status, renewed_at, price)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, 'pending', now(), null)`,
    [id, userId, ...VALUES(input)],
  );
  await setOwnerMedia(userId, "ad", id, input.photos);
  return id;
}

/** Owner edit — any edit goes back to review. */
export async function updateListing(userId: string, id: string, input: ListingInput): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql.query<{ id: string }>(
    `update classifieds set title = $3, category = $4, price_mode = $5, price_num = $6, condition = $7, neighborhood = $8,
       description = $9, phone = $10, hide_phone = $11, specs = $12::jsonb, status = case when status = 'hidden' then 'hidden' else 'pending' end, updated_at = now()
     where id = $1 and user_id = $2 returning id`,
    [id, userId, ...VALUES(input)],
  );
  if (rows.length) await setOwnerMedia(userId, "ad", id, input.photos);
  return rows.length > 0;
}

export async function setSold(userId: string, id: string, sold: boolean): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql.query<{ id: string }>(`update classifieds set sold_at = ${sold ? "now()" : "null"}, updated_at = now() where id = $1 and user_id = $2 returning id`, [id, userId]);
  return rows.length > 0;
}

export async function renewListing(userId: string, id: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql.query<{ id: string }>(`update classifieds set renewed_at = now(), sold_at = null where id = $1 and user_id = $2 returning id`, [id, userId]);
  return rows.length > 0;
}

export async function deleteListing(userId: string, id: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql.query<{ id: string }>(`delete from classifieds where id = $1 and user_id = $2 returning id`, [id, userId]);
  if (rows.length) await deleteOwnerMedia("ad", id);
  return rows.length > 0;
}

/* ------------------------------------------------------------- admin */

export async function listAll(): Promise<OwnListing[]> {
  const sql = await getSql();
  const rows = await sql.query<Row>(`${SELECT} order by c.updated_at desc limit 300`);
  return withPhotos(rows.map(toOwn));
}

export async function adminSet(id: string, action: ListingStatus | "delete"): Promise<void> {
  const sql = await getSql();
  if (action === "delete") {
    await sql.query(`delete from classifieds where id = $1`, [id]);
    await deleteOwnerMedia("ad", id);
  } else await sql.query(`update classifieds set status = $2, updated_at = now() where id = $1`, [id, action]);
}
