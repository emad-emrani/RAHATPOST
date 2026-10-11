import { randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import type { BusinessSubmission, SubmissionStatus } from "./types";

/**
 * Business submissions live in Postgres (`business_submissions`, migration 0004), each linked to
 * the signed-in user who sent it. They used to live in a private Vercel Blob store; anything
 * found there is imported once (idempotently, keeping its id and status) so nothing is lost.
 */

type Row = {
  id: string;
  user_id: string | null;
  name: string;
  category: string;
  area: string;
  about: string;
  phone: string;
  status: SubmissionStatus;
  legacy: boolean;
  created_at: Date | string;
  decided_at: Date | string | null;
  poster_name: string | null;
};

const iso = (v: Date | string) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());

function toSubmission(r: Row): BusinessSubmission {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    area: r.area,
    about: r.about,
    phone: r.phone,
    status: r.status,
    createdAt: iso(r.created_at),
    ...(r.decided_at ? { decidedAt: iso(r.decided_at) } : {}),
    ...(r.user_id ? { userId: r.user_id } : {}),
    posterName: r.poster_name?.trim() || (r.legacy ? "طلب قديم" : "مستخدم"),
  };
}

const SELECT = `select b.id, b.user_id, b.name, b.category, b.area, b.about, b.phone, b.status,
  b.legacy, b.created_at, b.decided_at, u."name" as poster_name
  from business_submissions b left join "user" u on u."id" = b.user_id`;

export async function listSubmissions(): Promise<BusinessSubmission[]> {
  await importLegacyBlob();
  const sql = await getSql();
  const rows = await sql.query<Row>(`${SELECT} order by b.created_at desc limit 500`);
  return rows.map(toSubmission);
}

export async function listByUser(userId: string): Promise<BusinessSubmission[]> {
  const sql = await getSql();
  const rows = await sql.query<Row>(
    `${SELECT} where b.user_id = $1 order by b.created_at desc limit 100`,
    [userId],
  );
  return rows.map(toSubmission);
}

export async function countPendingByUser(userId: string): Promise<number> {
  const sql = await getSql();
  const rows = await sql<{ n: number }>`
    select count(*)::int as n from business_submissions where user_id = ${userId} and status = 'pending'`;
  return Number(rows[0]?.n ?? 0);
}

export async function countPending(): Promise<number> {
  const sql = await getSql();
  const rows = await sql<{ n: number }>`
    select count(*)::int as n from business_submissions where status = 'pending'`;
  return Number(rows[0]?.n ?? 0);
}

export async function createSubmission(
  userId: string,
  input: Pick<BusinessSubmission, "name" | "category" | "area" | "about" | "phone">,
): Promise<string> {
  const id = randomBytes(8).toString("hex");
  const sql = await getSql();
  await sql`
    insert into business_submissions (id, user_id, name, category, area, about, phone)
    values (${id}, ${userId}, ${input.name}, ${input.category}, ${input.area}, ${input.about}, ${input.phone})`;
  approvedCache = null;
  return id;
}

/** The submitter may withdraw their own request (any status). */
export async function deleteOwnSubmission(userId: string, id: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql<{ id: string }>`
    delete from business_submissions where id = ${id} and user_id = ${userId} returning id`;
  approvedCache = null;
  return rows.length > 0;
}

let approvedCache: { at: number; items: BusinessSubmission[] } | null = null;

export async function getApproved(): Promise<BusinessSubmission[]> {
  if (approvedCache && Date.now() - approvedCache.at < 60_000) return approvedCache.items;
  await importLegacyBlob();
  const sql = await getSql();
  const rows = await sql.query<Row>(
    `${SELECT} where b.status = 'approved' order by b.decided_at desc nulls last limit 500`,
  );
  const items = rows.map(toSubmission);
  approvedCache = { at: Date.now(), items };
  return items;
}

export async function decide(id: string, action: SubmissionStatus | "delete") {
  if (!/^[a-f0-9]{16}$/.test(id)) throw new Error("bad id");
  const sql = await getSql();
  if (action === "delete") {
    await sql`delete from business_submissions where id = ${id}`;
  } else {
    await sql`
      update business_submissions set status = ${action}, decided_at = now(), updated_at = now()
      where id = ${id}`;
  }
  approvedCache = null;
}

/* ------------------------------------------------------- legacy Blob import */

type LegacySubmission = Omit<BusinessSubmission, "posterName" | "userId">;

let legacyImport: Promise<void> | null = null;

/** Copy any submissions left in the old Blob store into Postgres, once per server instance. */
function importLegacyBlob(): Promise<void> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Promise.resolve();
  legacyImport ??= runLegacyImport().catch((error) => {
    console.error("[directory] legacy Blob import failed (will retry)", error);
    legacyImport = null;
  });
  return legacyImport;
}

async function runLegacyImport(): Promise<void> {
  const { list, get } = await import("@vercel/blob");
  const paths: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "submissions/", cursor, limit: 1000 });
    paths.push(...page.blobs.map((b) => b.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  if (paths.length === 0) return;

  const sql = await getSql();
  let imported = 0;
  for (const path of paths) {
    const res = await get(path, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200) continue;
    const s = JSON.parse(await new Response(res.stream).text()) as LegacySubmission;
    if (!s?.id || !/^[a-f0-9]{16}$/.test(s.id)) continue;
    const seen = await sql`
      insert into legacy_blob_imports (id) values (${s.id}) on conflict (id) do nothing returning id`;
    if (seen.length === 0) continue; // already imported earlier (maybe since deleted by the admin)
    try {
      const rows = await sql`
        insert into business_submissions
          (id, user_id, name, category, area, about, phone, status, legacy, created_at, decided_at)
        values (${s.id}, null, ${s.name}, ${s.category}, ${s.area}, ${s.about}, ${s.phone},
          ${s.status ?? "pending"}, true, ${s.createdAt ?? new Date().toISOString()},
          ${s.decidedAt ?? null})
        on conflict (id) do nothing
        returning id`;
      imported += rows.length;
    } catch (error) {
      console.error("[directory] skipped legacy submission", s.id, error);
    }
  }
  if (imported > 0) {
    approvedCache = null;
    console.log(`[directory] imported ${imported} legacy Blob submission(s) into Postgres`);
  }
}
