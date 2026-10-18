import { createServerFn } from "@tanstack/react-start";

/** Which sign-in buttons to show (provider env vars present). */
export const getAuthConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { authProviders } = await import("./server");
  const { getAuthMethods } = await import("./settings.server");
  const m = await getAuthMethods();
  return {
    ...authProviders,
    google: authProviders.google && m.google,
    facebook: authProviders.facebook && m.facebook,
    email: m.email,
  };
});
