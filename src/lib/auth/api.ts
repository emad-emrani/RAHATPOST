import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

/** Which sign-in buttons to show (provider env vars present). */
export const getAuthConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { authProviders } = await import("./server");
  const { getAuthMethods } = await import("./settings.server");
  const m = await getAuthMethods();
  let nativeShell = false;
  try {
    nativeShell = /RahatPostApp\//.test(getRequest()?.headers.get("user-agent") ?? "");
  } catch {
    nativeShell = false;
  }
  return {
    ...authProviders,
    google: authProviders.google && m.google,
    facebook: authProviders.facebook && m.facebook,
    email: m.email,
    /** Capacitor store app. Guideline 4.8: no Google/Facebook button unless Apple is offered too. */
    nativeShell,
  };
});
