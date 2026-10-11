/** Server-side check for the admin cookie (call inside server-function handlers only). */
export async function requireAdmin(): Promise<void> {
  const { getCookie } = await import("@tanstack/react-start/server");
  const { ADMIN_COOKIE, verifySession } = await import("@/lib/directory/auth.server");
  if (!verifySession(getCookie(ADMIN_COOKIE))) throw new Error("unauthorized");
}

/** Same check, as a boolean. */
export async function isAdmin(): Promise<boolean> {
  try {
    await requireAdmin();
    return true;
  } catch {
    return false;
  }
}
