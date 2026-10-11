import { getSql } from "@/lib/db";
import { deleteMediaFiles } from "./storage.server";
import type { MediaKind } from "./types";

/** Photo records (migration 0005). The bytes live in storage.server.ts. */

const ORPHAN_HOURS = 24;
/** Unsaved uploads one user may hold at a time (stops filling the store without posting). */
export const MAX_UNSAVED_PER_USER = 12;

export async function recordUpload(row: {
  key: string;
  userId: string;
  kind: MediaKind;
  contentType: string;
  size: number;
  width: number;
  height: number;
}) {
  const sql = await getSql();
  await sql`
    insert into media_uploads (key, user_id, kind, content_type, size, width, height)
    values (${row.key}, ${row.userId}, ${row.kind}, ${row.contentType}, ${row.size}, ${row.width}, ${row.height})`;
}

export async function countUnsaved(userId: string): Promise<number> {
  const sql = await getSql();
  const rows = await sql<{ n: number }>`
    select count(*)::int as n from media_uploads where user_id = ${userId} and owner_id is null`;
  return Number(rows[0]?.n ?? 0);
}

/**
 * Make `keys` (in order) the photos of one ad / business request. Only the user's own uploads of
 * that kind that are unsaved or already belong to this owner are taken; photos of this owner not
 * in `keys` are deleted (row + file).
 */
export async function setOwnerMedia(
  userId: string,
  kind: MediaKind,
  ownerId: string,
  keys: string[],
): Promise<void> {
  const sql = await getSql();
  const current = await sql<{ key: string }>`
    select key from media_uploads where kind = ${kind} and owner_id = ${ownerId}`;
  const removed = current.map((r) => r.key).filter((k) => !keys.includes(k));
  for (const [position, key] of keys.entries()) {
    await sql`
      update media_uploads set owner_id = ${ownerId}, position = ${position}
      where key = ${key} and user_id = ${userId} and kind = ${kind}
        and (owner_id is null or owner_id = ${ownerId})`;
  }
  if (removed.length) await deleteKeys(removed);
}

/** Delete every photo of one ad / business request (row + file). */
export async function deleteOwnerMedia(kind: MediaKind, ownerId: string): Promise<void> {
  const sql = await getSql();
  const rows = await sql<{ key: string }>`
    select key from media_uploads where kind = ${kind} and owner_id = ${ownerId}`;
  await deleteKeys(rows.map((r) => r.key));
}

/** Delete one unsaved upload of this user (removed from the form before saving). */
export async function deleteUnsaved(userId: string, key: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql<{ key: string }>`
    select key from media_uploads where key = ${key} and user_id = ${userId} and owner_id is null`;
  if (!rows.length) return false;
  await deleteKeys([key]);
  return true;
}

/**
 * Every photo a user uploaded (for account deletion: call before deleting the user row, since the
 * rows cascade but the files would stay in the store).
 */
export async function deleteAllMediaOfUser(userId: string): Promise<void> {
  const sql = await getSql();
  const rows = await sql<{ key: string }>`select key from media_uploads where user_id = ${userId}`;
  await deleteKeys(rows.map((r) => r.key));
}

/** Uploads never saved with a post, older than a day. Cheap; run opportunistically. */
export async function cleanupOrphans(limit = 25): Promise<void> {
  const sql = await getSql();
  const rows = await sql<{ key: string }>`
    select key from media_uploads
    where owner_id is null and created_at < now() - make_interval(hours => ${ORPHAN_HOURS})
    order by created_at limit ${limit}`;
  await deleteKeys(rows.map((r) => r.key));
}

async function deleteKeys(keys: string[]) {
  if (!keys.length) return;
  // Files first: if that fails the rows stay and a later cleanup can retry.
  await deleteMediaFiles(keys);
  const sql = await getSql();
  await sql.query(`delete from media_uploads where key = any($1::text[])`, [keys]);
}

export type MediaAccess = {
  contentType: string;
  /** Attached to approved content: anyone may see it (and CDNs may cache it). */
  isPublic: boolean;
  userId: string;
};

/** Who may see one photo: public once its ad/business is approved, else uploader or admin only. */
export async function mediaAccess(key: string): Promise<MediaAccess | null> {
  const sql = await getSql();
  const rows = await sql<{ content_type: string; user_id: string; approved: boolean }>`
    select m.content_type, m.user_id,
      coalesce(
        (m.kind = 'ad' and exists (select 1 from classifieds c where c.id = m.owner_id and c.status = 'approved'))
        or (m.kind = 'business' and exists (select 1 from business_submissions b where b.id = m.owner_id and b.status = 'approved')),
        false) as approved
    from media_uploads m where m.key = ${key}`;
  const r = rows[0];
  return r
    ? { contentType: r.content_type, isPublic: Boolean(r.approved), userId: r.user_id }
    : null;
}

/** Photo keys per owner id, in order. */
export async function mediaByOwner(
  kind: MediaKind,
  ownerIds: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!ownerIds.length) return map;
  const sql = await getSql();
  const rows = await sql.query<{ owner_id: string; key: string }>(
    `select owner_id, key from media_uploads where kind = $1 and owner_id = any($2::text[])
     order by owner_id, position, created_at`,
    [kind, ownerIds],
  );
  for (const r of rows) map.set(r.owner_id, [...(map.get(r.owner_id) ?? []), r.key]);
  return map;
}
