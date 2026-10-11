import { createMiddleware } from "@tanstack/react-start";

/**
 * Server-function middleware: rejects scripted cross-site requests, then resolves
 * the signed-in user from the session cookie. Scope every per-user query by
 * `context.user.id`.
 */
export const authMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const { assertSameSiteRequest } = await import("./isolation.server");
  const { requireUser } = await import("./verify.server");
  assertSameSiteRequest();
  const user = await requireUser();
  return next({ context: { user } });
});
