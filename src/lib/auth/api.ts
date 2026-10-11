import { createServerFn } from "@tanstack/react-start";

/** Which sign-in buttons to show (provider env vars present). */
export const getAuthConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { authProviders } = await import("./server");
  return { ...authProviders };
});
