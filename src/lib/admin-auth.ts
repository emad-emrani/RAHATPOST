/**
 * Admin access levels (server-side only, call inside server handlers):
 *   owner     — password login (rp_admin cookie): everything, incl. managing roles
 *   moderator — signed-in member with role 'moderator' (admin_roles): moderation tabs + publishing
 *   writer    — signed-in member with role 'writer': publishes / edits / deletes own news only
 */
export type AdminLevel = "owner" | "moderator" | "writer";
export type AdminAccess = { level: AdminLevel; userId: string; name: string } | null;

export async function getAdminAccess(): Promise<AdminAccess> {
  const { getCookie } = await import("@tanstack/react-start/server");
  const { ADMIN_COOKIE, verifySession } = await import("@/lib/directory/auth.server");
  if (verifySession(getCookie(ADMIN_COOKIE)))
    return { level: "owner", userId: "", name: "الإدارة" };
  try {
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const user = await getSessionUser();
    if (!user) return null;
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{
      role: string;
    }>`select role from admin_roles where user_id = ${user.id}`;
    const role = rows[0]?.role;
    if (role === "moderator" || role === "writer")
      return { level: role, userId: user.id, name: user.name?.trim() || "عضو" };
  } catch (error) {
    console.error("[admin-auth] role lookup failed", error);
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
