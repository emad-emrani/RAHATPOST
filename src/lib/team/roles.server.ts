import { getSql } from "@/lib/db";
import { DEFAULT_ROLES, sanitizeRoles, type MemberRole } from "./roles";

let cache: { at: number; roles: MemberRole[] } | null = null;

export async function loadRoles(): Promise<MemberRole[]> {
  if (cache && Date.now() - cache.at < 15_000) return cache.roles;
  let roles = DEFAULT_ROLES;
  try {
    const sql = await getSql();
    const rows = await sql.query<{ data: unknown }>(`select data from member_roles order by sort, key`);
    if (rows.length) roles = sanitizeRoles(rows.map((r) => (typeof r.data === "string" ? JSON.parse(r.data) : r.data)));
  } catch (error) {
    console.error("[roles] load failed", error);
  }
  cache = { at: Date.now(), roles };
  return roles;
}

export async function saveRoles(input: unknown): Promise<MemberRole[]> {
  const roles = sanitizeRoles(input);
  const sql = await getSql();
  await sql.query(`delete from member_roles where not (key = any($1::text[]))`, [roles.map((r) => r.key)]);
  for (const [i, r] of roles.entries())
    await sql.query(
      `insert into member_roles (key, sort, data, updated_at) values ($1, $2, $3::jsonb, now())
       on conflict (key) do update set sort = excluded.sort, data = excluded.data, updated_at = now()`,
      [r.key, i, JSON.stringify(r)],
    );
  // Members whose role was deleted fall back to «عضو».
  await sql.query(`delete from admin_roles where not (role = any($1::text[]))`, [roles.map((r) => r.key)]);
  cache = { at: Date.now(), roles };
  return roles;
}

export async function roleOf(userId: string): Promise<MemberRole> {
  const roles = await loadRoles();
  const sql = await getSql();
  const rows = await sql.query<{ role: string }>(`select role from admin_roles where user_id = $1`, [userId]);
  return roles.find((r) => r.key === rows[0]?.role) ?? roles.find((r) => r.key === "member")!;
}

/** Badge text per user (only users whose role has a badge). */
export async function badgesFor(userIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!userIds.length) return out;
  const roles = await loadRoles();
  const sql = await getSql();
  const rows = await sql.query<{ user_id: string; role: string }>(`select user_id, role from admin_roles where user_id = any($1::text[])`, [userIds]);
  for (const r of rows) {
    const b = roles.find((x) => x.key === r.role)?.badge;
    if (b) out.set(r.user_id, b);
  }
  return out;
}
