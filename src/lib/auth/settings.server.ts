import { getSql } from "@/lib/db";

export type AuthMethods = { google: boolean; facebook: boolean; email: boolean };
export const DEFAULT_METHODS: AuthMethods = { google: true, facebook: true, email: true };

let cache: { at: number; v: AuthMethods } | null = null;

/** Admin on/off switches for each sign-in method (all on by default). */
export async function getAuthMethods(): Promise<AuthMethods> {
  if (cache && Date.now() - cache.at < 15_000) return cache.v;
  let v = DEFAULT_METHODS;
  try {
    const sql = await getSql();
    const rows = await sql.query<{ value: unknown }>(`select value from auth_settings where key = 'methods'`);
    const raw = rows[0]?.value;
    const o = (typeof raw === "string" ? JSON.parse(raw) : raw) as Partial<AuthMethods> | undefined;
    if (o) v = { google: o.google !== false, facebook: o.facebook !== false, email: o.email !== false };
  } catch (error) {
    console.error("[auth] settings read failed", error);
  }
  cache = { at: Date.now(), v };
  return v;
}

export async function setAuthMethods(v: AuthMethods): Promise<void> {
  const sql = await getSql();
  await sql.query(
    `insert into auth_settings (key, value, updated_at) values ('methods', $1::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [JSON.stringify(v)],
  );
  cache = { at: Date.now(), v };
}

export async function isBlocked(userId: string): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql.query<{ user_id: string }>(`select user_id from user_blocks where user_id = $1`, [userId]);
  return rows.length > 0;
}

export type Member = { id: string; name: string; email: string; image: string | null; methods: string[]; joined: string; blocked: boolean; role: string };

export async function listMembers(q = ""): Promise<Member[]> {
  const sql = await getSql();
  const rows = await sql.query<{ id: string; name: string; email: string; image: string | null; createdAt: Date | string; methods: string[] | null; blocked: boolean; role: string | null }>(
    `select u."id", u."name", u."email", u."image", u."createdAt",
       (select array_agg(distinct a."providerId") from "account" a where a."userId" = u."id") as methods,
       exists (select 1 from user_blocks b where b.user_id = u."id") as blocked,
       case when lower(u."email") = $2 and u."emailVerified" then 'adminmaster'
            else (select r.role from admin_roles r where r.user_id = u."id") end as role
     from "user" u
     where u."id" <> 'haraj-sample-seller' and ($1 = '' or u."name" ilike $3 or u."email" ilike $3)
     order by u."createdAt" desc limit 300`,
    [q, (await import("@/lib/admin-auth")).masterEmail(), `%${q.replace(/[%_\\]/g, "\\$&")}%`],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    image: r.image,
    methods: r.methods ?? [],
    joined: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString(),
    blocked: Boolean(r.blocked),
    role: r.role ?? "member",
  }));
}

/** Block = can't sign in again and every open session ends now. */
export async function setBlocked(userId: string, blocked: boolean): Promise<void> {
  const sql = await getSql();
  if (blocked) {
    await sql.query(`insert into user_blocks (user_id) values ($1) on conflict do nothing`, [userId]);
    await sql.query(`delete from "session" where "userId" = $1`, [userId]);
  } else await sql.query(`delete from user_blocks where user_id = $1`, [userId]);
}
