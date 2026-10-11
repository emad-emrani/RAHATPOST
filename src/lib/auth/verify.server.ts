import { getRequest } from "@tanstack/react-start/server";
import { auth } from "./server";

/**
 * Server-side session resolution (server-only). The user id ALWAYS comes from the
 * verified session cookie — never from anything the client sends.
 */
export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export type VerifiedUser = { id: string; name: string; email: string | null; image: string | null };

export async function getSessionUser(): Promise<VerifiedUser | null> {
  const request = getRequest();
  if (!request) return null;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;
  const u = session.user;
  return { id: u.id, name: u.name, email: u.email ?? null, image: u.image ?? null };
}

export async function requireUser(): Promise<VerifiedUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}
