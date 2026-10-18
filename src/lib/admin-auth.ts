/**
 * Admin access levels (server-side only, call inside server handlers):
 *   adminmaster — the signed-in account whose VERIFIED email is ADMIN_MASTER_EMAIL (default amad.wwf@gmail.com):
 *                 everything, and the only one who edits roles / grants admin. Never assignable.
 *   owner     — password login (rp_admin cookie) or a member with «مدير»: everything except role management
 *               (unless adminmaster gave their role manage_roles)
 *   moderator — signed-in member with role 'moderator' (admin_roles): moderation tabs + publishing
 *   writer    — signed-in member with role 'writer': publishes / edits / deletes own news only
 */
export type AdminLevel = "owner" | "moderator" | "writer";
export type AdminAccess = { level: AdminLevel; userId: string; name: string; perms: string[]; master?: boolean } | null;

export const masterEmail = () => (process.env.ADMIN_MASTER_EMAIL?.trim() || "amad.wwf@gmail.com").toLowerCase();

/** True only for the master account with a provider-verified email (password sign-ups are never verified). */
export async function isMasterUser(userId: string): Promise<boolean> {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql.query<{ id: string }>(`select "id" from "user" where "id" = $1 and lower("email") = $2 and "emailVerified" = true`, [userId, masterEmail()]);
  return rows.length > 0;
}

export async function getAdminAccess(): Promise<AdminAccess> {
  const { getCookie } = await import("@tanstack/react-start/server");
  const { ADMIN_COOKIE, verifySession } = await import("@/lib/directory/auth.server");
  const passwordLogin = verifySession(getCookie(ADMIN_COOKIE));
  const PASSWORD_ADMIN: AdminAccess = { level: "owner", userId: "", name: "الإدارة", perms: ["manage_all"] };
  try {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const user = await getSessionUser();
    if (!user) return passwordLogin ? PASSWORD_ADMIN : null;
    if (await isMasterUser(user.id))
      return { level: "owner", userId: user.id, name: user.name?.trim() || "adminmaster", perms: ["manage_all", "manage_roles"], master: true };
    if (passwordLogin) return PASSWORD_ADMIN;
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{
      role: string;
    }>`select role from admin_roles where user_id = ${user.id}`;
    let role: string | undefined = rows[0]?.role;
    if (!role) {
      // Session predates the invite: apply it now.
      const { applyInvite } = await import("@/lib/team/invites.server");
      role = (await applyInvite(user.id)) ?? undefined;
    }
    if (role) {
      const { loadRoles } = await import("@/lib/team/roles.server");
      const { MODERATION_PERMS } = await import("@/lib/team/roles");
      const perms: string[] = (await loadRoles()).find((r) => r.key === role)?.perms ?? [];
      const name = user.name?.trim() || "عضو";
      // Signed-in «مدير» = full access like the password login.
      if (perms.includes("manage_all")) return { level: "owner", userId: user.id, name, perms };
      if (MODERATION_PERMS.some((p) => perms.includes(p))) return { level: "moderator", userId: user.id, name, perms };
      if (perms.includes("write_news")) return { level: "writer", userId: user.id, name, perms };
    }
  } catch (error) {
    console.error("[admin-auth] role lookup failed", error);
    if (passwordLogin) return PASSWORD_ADMIN;
  }
  return null;
}

/** Owner or moderator (all moderation server functions). */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) throw new Error("unauthorized");
}

/** Same check, as a boolean. */
export async function isAdmin(): Promise<boolean> {
  const a = await getAdminAccess();
  return a?.level === "owner" || a?.level === "moderator";
}

/** Owner only (role management). */
export async function isOwner(): Promise<boolean> {
  return (await getAdminAccess())?.level === "owner";
}

/** Fine-grained check (owner / «مدير» always pass). Throws when missing. */
export async function requirePerm(perm: import("@/lib/team/roles").Permission): Promise<void> {
  const a = await getAdminAccess();
  if (!a || !(a.perms.includes("manage_all") || a.perms.includes(perm))) throw new Error("unauthorized");
}

/** Who may change members' roles: adminmaster, or a role adminmaster gave manage_roles. */
export async function roleManager(): Promise<{ master: boolean } | null> {
  const a = await getAdminAccess();
  if (!a) return null;
  if (a.master) return { master: true };
  return a.perms.includes("manage_roles") ? { master: false } : null;
}
