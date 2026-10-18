import { createServerFn } from "@tanstack/react-start";
import type { AdminLevel } from "@/lib/admin-auth";

/** Any role key from «الأعضاء والصلاحيات» (built-in: member, verified, writer, moderator, admin). */
export type TeamRole = string;
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
  async (): Promise<{ level: AdminLevel | null; name: string; signedIn: boolean; perms: string[] }> => {
    const { getAdminAccess } = await import("@/lib/admin-auth");
    const a = await getAdminAccess();
    if (a) return { level: a.level, name: a.name, signedIn: true, perms: a.perms };
    let signedIn = false;
    try {
      const { getSessionUser } = await import("@/lib/auth/verify.server");
      signedIn = Boolean(await getSessionUser());
    } catch {
      /* no auth configured */
    }
    return { level: null, name: "", signedIn, perms: [] };
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
          role: r.role ?? "",
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
    role: typeof input?.role === "string" && /^[a-z0-9_-]{1,20}$/.test(input.role) && input.role !== "member" ? input.role : "",
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    const check = await canAssign(data.userId, data.role || "member");
    if (check) return { ok: false, error: check };
    try {
      const { getSql } = await import("@/lib/db");
      const sql = await getSql();
      if (data.role)
        await sql`insert into admin_roles (user_id, role) values (${data.userId}, ${data.role})
          on conflict (user_id) do update set role = excluded.role`;
      else await sql`delete from admin_roles where user_id = ${data.userId}`;
      const { loadRoles } = await import("./roles.server");
      const r = (await loadRoles()).find((x) => x.key === (data.role || "member"));
      const { notifyUser } = await import("@/lib/email/send.server");
      await notifyUser("role_changed", data.userId, "/", r?.name ?? data.role ?? "member");
      return { ok: true };
    } catch (error) {
      console.error("[team] set role failed", error);
      return { ok: false };
    }
  });

export type Invite = { email: string; role: TeamRole; createdAt: string };
const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[a-z]{2,}$/i;

/** Owner only: pending invites. */
export const adminListInvites = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ authed: boolean; items: Invite[] }> => {
    const { isOwner } = await import("@/lib/admin-auth");
    if (!(await isOwner())) return { authed: false, items: [] };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ email: string; role: TeamRole; created_at: string | Date }>`
      select email, role, created_at from admin_invites order by created_at desc limit 200`;
    return {
      authed: true,
      items: rows.map((r) => ({
        email: r.email,
        role: r.role,
        createdAt: new Date(r.created_at).toISOString(),
      })),
    };
  },
);

/** Owner only: add a team member by email. Existing user → role now; otherwise a pending invite. */
export const adminInviteByEmail = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; role: TeamRole }) => ({
    email: String(input?.email ?? "")
      .trim()
      .toLowerCase()
      .slice(0, 254),
    role: typeof input?.role === "string" && /^[a-z0-9_-]{1,20}$/.test(input.role) && input.role !== "member" ? input.role : null,
  }))
  .handler(
    async ({ data }): Promise<{ ok: boolean; result?: "assigned" | "invited"; error?: string }> => {
      if (!EMAIL_RE.test(data.email)) return { ok: false, error: "بريد إلكتروني غير صالح." };
      if (!data.role) return { ok: false, error: "اختر الصلاحية." };
      const { masterEmail } = await import("@/lib/admin-auth");
      if (data.email === masterEmail()) return { ok: false, error: "لا يمكن تغيير دور adminmaster." };
      const check = await canAssign(null, data.role);
      if (check) return { ok: false, error: check };
      try {
        const { getSql } = await import("@/lib/db");
        const sql = await getSql();
        const users = await sql<{ id: string }>`
          select "id" as id from "user" where lower("email") = ${data.email} and "emailVerified" = true limit 1`;
        if (users[0]) {
          const again = await canAssign(users[0].id, data.role);
          if (again) return { ok: false, error: again };
          await sql`insert into admin_roles (user_id, role) values (${users[0].id}, ${data.role})
            on conflict (user_id) do update set role = excluded.role`;
          await sql`delete from admin_invites where email = ${data.email}`;
          return { ok: true, result: "assigned" };
        }
        await sql`insert into admin_invites (email, role, invited_by)
          values (${data.email}, ${data.role}, ${(await (await import("@/lib/admin-auth")).getAdminAccess())?.userId || "owner"})
          on conflict (email) do update set role = excluded.role, created_at = now()`;
        return { ok: true, result: "invited" };
      } catch (error) {
        console.error("[team] invite failed", error);
        return { ok: false, error: "تعذّر الحفظ." };
      }
    },
  );

/** Owner only: cancel a pending invite. */
export const adminCancelInvite = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string }) => ({
    email: String(input?.email ?? "")
      .trim()
      .toLowerCase()
      .slice(0, 254),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { roleManager } = await import("@/lib/admin-auth");
    if (!(await roleManager()) || !data.email) return { ok: false };
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`delete from admin_invites where email = ${data.email}`;
    return { ok: true };
  });

/* ------------------------------------------------- sign-in methods, members, roles (owner only) */

async function ownerOnly(): Promise<boolean> {
  const { isOwner } = await import("@/lib/admin-auth");
  return isOwner();
}

export type AuthAdminData = {
  authed: boolean;
  methods: { google: boolean; facebook: boolean; email: boolean };
  configured: { google: boolean; facebook: boolean; resetEmail: boolean };
  roles: import("./roles").MemberRole[];
  master: boolean;
  canManageRoles: boolean;
};

export const adminGetAuthAdmin = createServerFn({ method: "POST" }).handler(async (): Promise<AuthAdminData> => {
  const { DEFAULT_ROLES } = await import("./roles");
  if (!(await ownerOnly()))
    return { authed: false, methods: { google: true, facebook: true, email: true }, configured: { google: false, facebook: false, resetEmail: false }, roles: DEFAULT_ROLES, master: false, canManageRoles: false };
  const { getAuthMethods } = await import("@/lib/auth/settings.server");
  const { authProviders } = await import("@/lib/auth/server");
  const { loadRoles } = await import("./roles.server");
  return {
    authed: true,
    methods: await getAuthMethods(),
    configured: { google: authProviders.google, facebook: authProviders.facebook, resetEmail: authProviders.resetEmail },
    roles: await loadRoles(),
    ...(await (async () => {
      const { roleManager } = await import("@/lib/admin-auth");
      const rm = await roleManager();
      return { master: Boolean(rm?.master), canManageRoles: Boolean(rm) };
    })()),
  };
});

export const adminSetAuthMethods = createServerFn({ method: "POST" })
  .inputValidator((i: { google: boolean; facebook: boolean; email: boolean }) => ({ google: i?.google !== false, facebook: i?.facebook !== false, email: i?.email !== false }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    if (!(await ownerOnly())) return { ok: false };
    const { setAuthMethods } = await import("@/lib/auth/settings.server");
    await setAuthMethods(data);
    return { ok: true };
  });

export const adminSaveRoles = createServerFn({ method: "POST" })
  .inputValidator((i: { roles: unknown }) => i)
  .handler(async ({ data }): Promise<{ ok: boolean; roles: import("./roles").MemberRole[] }> => {
    const { roleManager } = await import("@/lib/admin-auth");
    if (!(await roleManager())?.master) return { ok: false, roles: [] };
    const { saveRoles } = await import("./roles.server");
    return { ok: true, roles: await saveRoles(data.roles) };
  });

export const adminListAllMembers = createServerFn({ method: "POST" })
  .inputValidator((i: { q?: string }) => ({ q: String(i?.q ?? "").trim().slice(0, 80) }))
  .handler(async ({ data }): Promise<{ authed: boolean; items: import("@/lib/auth/settings.server").Member[] }> => {
    if (!(await ownerOnly())) return { authed: false, items: [] };
    const { listMembers } = await import("@/lib/auth/settings.server");
    return { authed: true, items: await listMembers(data.q) };
  });

export const adminBlockMember = createServerFn({ method: "POST" })
  .inputValidator((i: { userId: string; blocked: boolean }) => ({ userId: String(i?.userId ?? "").slice(0, 100), blocked: i?.blocked === true }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    if (!(await ownerOnly()) || !data.userId) return { ok: false };
    const { isMasterUser, roleManager } = await import("@/lib/admin-auth");
    if (await isMasterUser(data.userId)) return { ok: false };
    const { roleOf } = await import("./roles.server");
    const { isPrivileged } = await import("./roles");
    if (isPrivileged(await roleOf(data.userId)) && !(await roleManager())?.master) return { ok: false };
    const { setBlocked } = await import("@/lib/auth/settings.server");
    const was = (await import("@/lib/auth/settings.server")).isBlocked;
    const changed = (await was(data.userId)) !== data.blocked;
    await setBlocked(data.userId, data.blocked);
    if (changed) {
      const { notifyUser } = await import("@/lib/email/send.server");
      await notifyUser(data.blocked ? "blocked" : "unblocked", data.userId, data.blocked ? "/" : "/login");
    }
    return { ok: true };
  });

/**
 * Role assignment rules (server-side): only adminmaster, or a role with manage_roles; nobody touches
 * adminmaster; only adminmaster grants/revokes privileged roles (manage_all / manage_roles).
 * Returns an error message, or null when allowed.
 */
async function canAssign(targetUserId: string | null, newRole: string): Promise<string | null> {
  const { roleManager, isMasterUser } = await import("@/lib/admin-auth");
  const rm = await roleManager();
  if (!rm) return "تغيير الأدوار لـ adminmaster فقط (أو من منحه صلاحية تعيين الأدوار).";
  const { loadRoles, roleOf } = await import("./roles.server");
  const { isPrivileged } = await import("./roles");
  const roles = await loadRoles();
  const next = roles.find((r) => r.key === newRole);
  if (!next) return "دور غير موجود.";
  if (targetUserId) {
    if (await isMasterUser(targetUserId)) return "لا يمكن تغيير دور adminmaster.";
    if (!rm.master && isPrivileged(await roleOf(targetUserId))) return "تغيير دور مدير لـ adminmaster فقط.";
  }
  if (!rm.master && isPrivileged(next)) return "منح دور المدير لـ adminmaster فقط.";
  return null;
}
