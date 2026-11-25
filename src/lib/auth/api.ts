import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { isNativeUserAgent } from "./native";

/** True when the request comes from the iOS/Android WebView. */
export const getNativeShell = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return isNativeUserAgent(getRequest()?.headers.get("user-agent"));
  } catch {
    return false;
  }
});

/** Which sign-in buttons to show (provider env vars present). */
export const getAuthConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { authProviders } = await import("./server");
  const { getAuthMethods } = await import("./settings.server");
  const m = await getAuthMethods();
  let nativeShell = false;
  let iosApp = false;
  try {
    const ua = getRequest()?.headers.get("user-agent") ?? "";
    nativeShell = /RahatPostApp\//.test(ua);
    iosApp = nativeShell && !/Android/i.test(ua);
  } catch {
    nativeShell = false;
    iosApp = false;
  }
  return {
    ...authProviders,
    google: authProviders.google && m.google,
    facebook: authProviders.facebook && m.facebook,
    email: m.email,
    /** Capacitor store app. */
    nativeShell,
    /** iPhone/iPad wrapper. Google and Facebook stay hidden here unless Apple is shown. */
    iosApp,
  };
});
