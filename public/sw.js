/* رهط بوست service worker — app shell + static assets only.
 *
 * Never cached: auth (/api/), server functions (/_serverFn), admin, login, account and submit
 * pages, POSTs, and anything cross-origin (publisher images, Google sign-in).
 * Public pages are network-first (so news stays fresh) with the last copy as an offline
 * fallback; hashed build assets are cache-first; everything else falls back to /offline.html.
 */
const VERSION = "rp-v3";
const SHELL = `${VERSION}-shell`;
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon.svg",
];
const MAX_PAGES = 30;

const NEVER = [
  /^\/api\//,
  /^\/_serverFn/,
  /^\/__grok\//,
  /^\/admin/,
  /^\/login/,
  /^\/my-/,
  /^\/submit/,
];
const PUBLIC_PAGES = [
  /^\/$/,
  /^\/news(\/|$)/,
  /^\/israel-news(\/|$)/,
  /^\/today$/,
  /^\/buses$/,
  /^\/directory(\/|$)/,
  /^\/ads(\/|$)/,
  /^\/app$/,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER.some((re) => re.test(url.pathname))) {
    if (request.mode === "navigate") event.respondWith(fetch(request).catch(offline));
    return;
  }

  if (request.mode === "navigate") {
    if (PUBLIC_PAGES.some((re) => re.test(url.pathname)))
      event.respondWith(networkFirstPage(request));
    else event.respondWith(fetch(request).catch(offline));
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(request, ASSETS));
    return;
  }

  if (
    /^\/(icons\/|apple-touch-icon\.png$|favicon\.svg$|og\.jpg$|manifest\.webmanifest$)/.test(
      url.pathname,
    )
  ) {
    event.respondWith(staleWhileRevalidate(request, SHELL));
  }
});

async function offline() {
  return (await caches.match(OFFLINE_URL)) ?? new Response("offline", { status: 503 });
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      await cache.put(request, response.clone());
      trim(cache);
    }
    return response;
  } catch {
    return (await cache.match(request, { ignoreSearch: true })) ?? offline();
  }
}

async function cacheFirst(request, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => hit);
  return hit ?? network;
}

async function trim(cache) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_PAGES))) await cache.delete(key);
}

/* ------------------------------------------------------------ web push */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "رهط بوست";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      dir: "rtl",
      lang: "ar",
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      data: { url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
