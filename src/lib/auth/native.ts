/**
 * Sign-in inside the store app (Capacitor wrapper of https://rahatpost.com).
 *
 * Google (and Facebook) refuse OAuth inside an embedded WebView ("disallowed_useragent"), so:
 *  1. In the app, the sign-in button opens /app-auth/start in the SYSTEM browser
 *     (Custom Tab / SFSafariViewController) via the Capacitor Browser plugin.
 *  2. The browser does the normal Google sign-in and lands on /app-auth/done, which asks our
 *     server for a single-use token (Better Auth one-time-token plugin: hashed, 3 minutes) and
 *     opens the app's deep link  com.rahatpost.app://auth?token=…&redirect=…
 *  3. The app receives the link (App plugin "appUrlOpen"), closes the browser and loads
 *     /app-auth/finish in its WebView, which redeems the token → session cookie in the WebView.
 *
 * Plugins are reached through the bridge Capacitor injects into the page (window.Capacitor), so
 * the website needs no Capacitor npm packages; on the open web all of this is inert.
 */

export const APP_SCHEME = "com.rahatpost.app";

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: {
    Browser?: { open: (o: { url: string }) => Promise<void>; close: () => Promise<void> };
    App?: {
      addListener: (event: "appUrlOpen", cb: (e: { url: string }) => void) => unknown;
    };
  };
};

function cap(): CapacitorGlobal | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { Capacitor?: CapacitorGlobal }).Capacitor;
}

export function isNativeApp(): boolean {
  return Boolean(cap()?.isNativePlatform?.());
}

/** Same-site relative path only (defaults to /my-posts). */
export function safeAppRedirect(value: unknown): string {
  const s = typeof value === "string" ? value : "";
  return /^\/(?!\/)[^\s\\]*$/.test(s) && !s.startsWith("/api/") ? s : "/my-posts";
}

export async function nativeSignIn(provider: string, redirect: string): Promise<void> {
  const browser = cap()?.Plugins?.Browser;
  const url = `${window.location.origin}/app-auth/start?${new URLSearchParams({
    provider,
    redirect: safeAppRedirect(redirect),
  })}`;
  if (browser) await browser.open({ url });
  else window.open(url, "_blank");
}

let listening = false;

/** In the app: turn the deep link from the system browser into a signed-in WebView. */
export function listenForNativeAuth(): void {
  if (listening || !isNativeApp()) return;
  const app = cap()?.Plugins?.App;
  if (!app) return;
  listening = true;
  app.addListener("appUrlOpen", ({ url }) => {
    let link: URL;
    try {
      link = new URL(url);
    } catch {
      return;
    }
    if (link.protocol !== `${APP_SCHEME}:`) return;
    const token = link.searchParams.get("token") ?? "";
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(token)) return;
    const redirect = safeAppRedirect(link.searchParams.get("redirect"));
    void cap()
      ?.Plugins?.Browser?.close()
      .catch(() => {});
    window.location.href = `/app-auth/finish?${new URLSearchParams({ token, redirect })}`;
  });
}
