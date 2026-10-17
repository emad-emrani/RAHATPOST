import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { ServiceWorkerRegistration } from "@/components/install-app";
import { SiteAnalytics } from "@/components/analytics";
import appCss from "../styles.css?url";
import { GoogleServices } from "@/components/google-services";
import { getSiteSettings } from "@/lib/site-settings/api";
import { SiteSettingsProvider } from "@/lib/site-settings/context";
import { DEFAULT_SETTINGS, themeCss } from "@/lib/site-settings/types";
import { mediaUrl } from "@/lib/media/types";
import { getI18n } from "@/lib/i18n/api";
import { BUILTIN_LANGS, setI18nState, tr, type I18nState } from "@/lib/i18n/core";

const ARABIC_STATE: I18nState = { lang: "ar", dir: "rtl", dict: {}, langs: BUILTIN_LANGS };

export const Route = createRootRoute({
  loader: async ({ location }) => {
    const want = new URLSearchParams(location.searchStr ?? "").get("lang") ?? "";
    const [settings, i18n] = await Promise.all([
      getSiteSettings().catch(() => DEFAULT_SETTINGS),
      getI18n({ data: want }).catch(() => ARABIC_STATE),
    ]);
    setI18nState(i18n);
    return { settings, i18n };
  },
  staleTime: 30_000,
  shouldReload: false,
  head: ({ loaderData }) => {
    const st = loaderData?.settings ?? DEFAULT_SETTINGS;
    const base = baseHead();
    const gsc = st.google.gscCode;
    const i18n = loaderData?.i18n ?? ARABIC_STATE;
    const nonDefault = i18n.langs.find((l) => l.isDefault)?.code !== i18n.lang;
    return {
      meta: [
        ...base.meta.map((m) =>
          "name" in m && m.name === "theme-color" ? { ...m, content: st.theme.primary } : m,
        ),
        // Translated views are for visitors; the Arabic pages stay the canonical, indexed ones.
        ...(nonDefault ? [{ name: "robots", content: "noindex, follow" }] : []),
        ...(gsc && gsc !== __SITE_VERIFICATION__.google
          ? [{ name: "google-site-verification", content: gsc }]
          : []),
      ],
      links: st.faviconKey
        ? [
            { rel: "icon", href: mediaUrl(st.faviconKey) },
            ...base.links.filter((l) => l.rel !== "icon"),
          ]
        : base.links,
    };
  },
  component: RootComponent,
});

function RootComponent() {
  const { settings, i18n } = Route.useLoaderData();
  setI18nState(i18n);
  const css = themeCss(settings.theme);
  const defLang = i18n.langs.find((l) => l.isDefault)?.code ?? "ar";
  return (
    <html lang={i18n.lang} dir={i18n.dir} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: langRedirectScript(i18n.lang, defLang, i18n.langs.map((l) => l.code)) }} />
        <HeadContent />
        {css ? <style id="site-theme" dangerouslySetInnerHTML={{ __html: css }} /> : null}
      </head>
      <body>
        <SiteSettingsProvider value={settings}>
          <PreviewHostBridge />
          <ServiceWorkerRegistration />
          <AuthProvider>
            <Outlet />
          </AuthProvider>
          <SiteAnalytics />
          <GoogleServices />
        </SiteSettingsProvider>
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Pages are cached per URL, so the server picks the language only from `?lang=`. If the visitor
 * chose another language (cookie) and landed on a URL without it, switch once to the right URL.
 */
function langRedirectScript(lang: string, def: string, codes: string[]) {
  return `(function(){try{var m=document.cookie.match(/(?:^|; )lang=([^;]+)/);var w=m?decodeURIComponent(m[1]):"";var ok=${JSON.stringify(codes)};if(!w||ok.indexOf(w)<0||w===${JSON.stringify(lang)})return;var u=new URL(location.href);if(u.searchParams.has("lang"))return;if(w===${JSON.stringify(def)})return;u.searchParams.set("lang",w);location.replace(u.toString());}catch(e){}})();`;
}

function baseHead() {
  return {
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      // Fallbacks; every public route sets its own title/description/canonical via seo().
      { title: tr("رهط بوست | أخبار رهط والنقب") },
      {
        name: "description",
        content:
          tr("رهط بوست: أخبار رهط والنقب، مواعيد باصات رهط، دليل محلات وخدمات رهط، إعلانات مبوبة وأرقام الطوارئ."),
      },
      { property: "og:locale", content: "ar_AR" },
      ...(__SITE_VERIFICATION__.google
        ? [{ name: "google-site-verification", content: __SITE_VERIFICATION__.google }]
        : []),
      ...(__SITE_VERIFICATION__.bing
        ? [{ name: "msvalidate.01", content: __SITE_VERIFICATION__.bing }]
        : []),
      { name: "theme-color", content: "#F2C94C" },
      // iOS home-screen app: own name, light status bar over the white app bar, standalone.
      { name: "apple-mobile-web-app-title", content: tr("رهط بوست") },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "application-name", content: tr("رهط بوست") },
      { name: "format-detection", content: "telephone=no" },
    ],
    links: [
      // The رهط بوست logo plate on yellow: .ico (16/32/48) for legacy and default /favicon.ico
      // requests, SVG for modern browsers, PNG fallbacks.
      { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/icons/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/icons/favicon-16.png" },
      { rel: "stylesheet", href: appCss },
      // Our own manifest and icons (the platform's /__grok/ defaults are generic on a
      // self-hosted domain; see nitro routeRules in vite.config.ts).
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      {
        rel: "apple-touch-startup-image",
        href: "/splash/apple-splash-1290x2796.png",
        media:
          "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/splash/apple-splash-1179x2556.png",
        media:
          "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/splash/apple-splash-1170x2532.png",
        media:
          "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/splash/apple-splash-1284x2778.png",
        media:
          "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/splash/apple-splash-1125x2436.png",
        media:
          "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/splash/apple-splash-828x1792.png",
        media:
          "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/splash/apple-splash-1242x2688.png",
        media:
          "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/splash/apple-splash-750x1334.png",
        media:
          "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/splash/apple-splash-640x1136.png",
        media:
          "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/splash/apple-splash-2048x2732.png",
        media:
          "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/splash/apple-splash-1668x2388.png",
        media:
          "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/splash/apple-splash-1640x2360.png",
        media:
          "(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
      {
        rel: "apple-touch-startup-image",
        href: "/splash/apple-splash-1536x2048.png",
        media:
          "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
    ],
  };
}
