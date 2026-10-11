/**
 * Sign-in inside the store app (Capacitor wrapper of https://rahatpost.com).
 *
 * Google (and Facebook) refuse OAuth inside an embedded WebView ("disallowed_useragent"), so:
 *  1. In the app, the sign-in button opens /app-auth/start in the SYSTEM browser
 *     (Custom Tab / SFSafariViewController) via the Capacitor Browser plugin.
 *  2. The browser does the normal Google sign-in and lands on /app-auth/done, which asks our
 *     server for a single-use token (Better Auth one-time-token plugin: hashed, 3 minutes) and
 *     opens the app's deep link  com.rahatpost.app://auth?token=…&redirect=…  — on Android as an
 *     intent:// URL pinned to package com.rahatpost.app, so no other installed app can catch it.
 *  3. The app receives the link (App plugin "appUrlOpen"), closes the browser and loads
 *     /app-auth/finish in its WebView, which redeems the token → session cookie in the WebView.
 *
 * Plugins are reached through the bridge Capacitor injects into the page (window.Capacitor), so
 * the website needs no Capacitor npm packages; on the open web all of this is inert.
 */

export const APP_SCHEME = "com.rahatpost.app";
export const APP_PACKAGE = "com.rahatpost.app";
const SITE_HOSTS = new Set(["rahatpost.com", "www.rahatpost.com"]);

/**
 * The sign-in hand-back link for the system browser. Android gets an intent:// URL with an explicit
 * package (only our signed app can receive it); iOS gets the custom scheme.
 */
export function appReturnUrl(params: URLSearchParams, userAgent: string): string {
  const query = params.toString();
  if (/Android/i.test(userAgent)) {
    return `intent://auth?${query}#Intent;scheme=${APP_SCHEME};package=${APP_PACKAGE};end`;
  }
  return `${APP_SCHEME}://auth?${query}`;
}

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: {
    Browser?: { open: (o: { url: string }) => Promise<void>; close: () => Promise<void> };
    App?: {
      addListener: ((event: "appUrlOpen", cb: (e: { url: string }) => void) => unknown) &
        ((event: "backButton", cb: (e: { canGoBack: boolean }) => void) => unknown);
      getLaunchUrl?: () => Promise<{ url?: string } | undefined>;
      minimizeApp?: () => Promise<void>;
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

/** Verified App Link / Universal Link (https://rahatpost.com/…) → same-site path, else null. */
export function sitePathFromLink(url: string): string | null {
  let link: URL;
  try {
    link = new URL(url);
  } catch {
    return null;
  }
  if (link.protocol !== "https:" || !SITE_HOSTS.has(link.hostname)) return null;
  const path = `${link.pathname}${link.search}${link.hash}`;
  return safeAppRedirect(link.pathname) === link.pathname ? path : null;
}

function handleLink(url: string): void {
  let link: URL;
  try {
    link = new URL(url);
  } catch {
    return;
  }
  if (link.protocol === `${APP_SCHEME}:`) {
    const token = link.searchParams.get("token") ?? "";
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(token)) return;
    const redirect = safeAppRedirect(link.searchParams.get("redirect"));
    void cap()
      ?.Plugins?.Browser?.close()
      .catch(() => {});
    window.location.href = `/app-auth/finish?${new URLSearchParams({ token, redirect })}`;
    return;
  }
  // A rahatpost.com link opened from WhatsApp / SMS / search: show that page in the app.
  const path = sitePathFromLink(url);
  if (
    path &&
    path !== `${window.location.pathname}${window.location.search}${window.location.hash}`
  ) {
    window.location.href = path;
  }
}

/**
 * In the app: sign-in deep link → signed-in WebView; rahatpost.com links → that page; Android back
 * button → previous page, or send the app to the background on the first page (instead of doing
 * nothing). Lives on the website so it can change without a store release.
 */
export function listenForNativeAuth(): void {
  if (listening || !isNativeApp()) return;
  const app = cap()?.Plugins?.App;
  if (!app) return;
  listening = true;
  app.addListener("appUrlOpen", ({ url }) => handleLink(url));
  app.addListener("backButton", ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else void app.minimizeApp?.().catch(() => {});
  });
  // Cold start from a link: Capacitor always loads the home page first.
  const LAUNCH_KEY = "rp-launch-link-handled";
  try {
    if (!sessionStorage.getItem(LAUNCH_KEY)) {
      sessionStorage.setItem(LAUNCH_KEY, "1");
      void app
        .getLaunchUrl?.()
        .then((r) => {
          if (r?.url) handleLink(r.url);
        })
        .catch(() => {});
    }
  } catch {
    // sessionStorage unavailable: skip cold-start links rather than loop.
  }
}
