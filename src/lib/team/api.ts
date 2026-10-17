import { createServerFn } from "@tanstack/react-start";
import type { AdminLevel } from "@/lib/admin-auth";

export type TeamRole = "moderator" | "writer";
export type Member = {
  id: string;
  name: string;
  email: string;
  image: string;
  role: TeamRole | "";
  createdAt: string;
};

/** Who is looking at /admin (null = show the login). */
export const adminWhoami = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ level: AdminLevel | null; name: string; signedIn: boolean }> => {
    const { getAdminAccess } = await import("@/lib/admin-auth");
    const a = await getAdminAccess();
    if (a) return { level: a.level, name: a.name, signedIn: true };
    let signedIn = false;
    try {
      const { getSessionUser } = await import("@/lib/auth/verify.server");
      signedIn = Boolean(await getSessionUser());
    } catch {
      /* no auth configured */
    }
    return { level: null, name: "", signedIn };
  },
);

/** Owner only: members (newest / matching `q`), role holders first. */
export const adminListMembers = createServerFn({ method: "POST" })
  .inputValidator((input: { q?: string }) => ({
    q: String(input?.q ?? "")
      .trim()
      .slice(0, 80),
  }))
  .handler(async ({ data }): Promise<{ authed: boolean; ok: boolean; items: Member[] }> => {
    const { isOwner } = await import("@/lib/admin-auth");
    if (!(await isOwner())) return { authed: false, ok: true, items: [] };
    try {
      const { getSql } = await import("@/lib/db");
      const sql = await getSql();
      const like = `%${data.q.replace(/[%_\\]/g, "\\$&")}%`;
      const rows = await sql.query<{
        id: string;
        name: string | null;
        email: string | null;
        image: string | null;
        role: string | null;
        created_at: Date | string;
      }>(
        `select u."id" as id, u."name" as name, u."email" as email, u."image" as image, r.role,
           u."createdAt" as created_at
         from "user" u left join admin_roles r on r.user_id = u."id"
         where ($1 = '' or u."name" ilike $2 or u."email" ilike $2)
         order by (r.role is null), u."createdAt" desc limit 200`,
        [data.q, like],
      );
      return {
        authed: true,
        ok: true,
        items: rows.map((r) => ({
          id: r.id,
          name: r.name?.trim() || "بدون اسم",
          email: r.email ?? "",
          image: r.image ?? "",
          role: r.role === "moderator" || r.role === "writer" ? r.role : "",
          createdAt: new Date(r.created_at).toISOString(),
        })),
      };
    } catch (error) {
      console.error("[team] list failed", error);
      return { authed: true, ok: false, items: [] };
    }
  });

/** Owner only: give a member a role, or remove it (role ""). */
export const adminSetRole = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; role: TeamRole | "" }) => ({
    userId: String(input?.userId ?? "").slice(0, 100),
    role: input?.role === "moderator" || input?.role === "writer" ? input.role : "",
  }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { isOwner } = await import("@/lib/admin-auth");
    if (!(await isOwner()) || !data.userId) return { ok: false };
    try {
      const { getSql } = await import("@/lib/db");
      const sql = await getSql();
      if (data.role)
        await sql`insert into admin_roles (user_id, role) values (${data.userId}, ${data.role})
          on conflict (user_id) do update set role = excluded.role`;
      else await sql`delete from admin_roles where user_id = ${data.userId}`;
      return { ok: true };
    } catch (error) {
      console.error("[team] set role failed", error);
      return { ok: false };
    }
  });
