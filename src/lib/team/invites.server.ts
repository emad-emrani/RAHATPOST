import { getSql } from "@/lib/db";

/** Apply (and consume) a pending invite for this user if their email is verified. Never throws. */
export async function applyInvite(userId: string): Promise<string | null> {
  try {
    const sql = await getSql();
    const rows = await sql<{ role: string }>`
      with u as (select lower("email") as email from "user" where "id" = ${userId} and "emailVerified" = true),
           inv as (delete from admin_invites where email = (select email from u) returning role)
      select role from inv`;
    const role = rows[0]?.role;
    if (role !== "moderator" && role !== "writer") return null;
    await sql`insert into admin_roles (user_id, role) values (${userId}, ${role})
      on conflict (user_id) do update set role = excluded.role`;
    return role;
  } catch (error) {
    console.error("[team] apply invite failed", error);
    return null;
  }
}
