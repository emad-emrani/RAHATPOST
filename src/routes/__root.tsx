import {
  createRootRoute,
  HeadContent,
  Link,
  Outlet,
  Scripts,
  useLocation,
} from "@tanstack/react-router";
import {
  Bus,
  Cpu,
  Globe,
  House,
  MapPin,
  Megaphone,
  Newspaper,
  Plus,
  Siren,
  Sparkles,
  Store,
  Trophy,
  Tv,
  type LucideIcon,
} from "lucide-react";
import { useMemo, type CSSProperties } from "react";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { ServiceWorkerRegistration } from "@/components/install-app";
import { SiteAnalytics } from "@/components/analytics";
import appCss from "../styles.css?url";
import { GoogleServices } from "@/components/google-services";
import { getSiteSettings } from "@/lib/site-settings/api";
import { SiteSettingsProvider, useSiteSettings } from "@/lib/site-settings/context";
import { DEFAULT_ADSENSE_PUB, DEFAULT_SETTINGS, themeCss } from "@/lib/site-settings/types";
import { mediaUrl } from "@/lib/media/types";
import { getI18n } from "@/lib/i18n/api";
import { BUILTIN_LANGS, getI18nState, setI18nState, tr, trv, type I18nState } from "@/lib/i18n/core";

const ARABIC_STATE: I18nState = { lang: "ar", dir: "rtl", dict: {}, langs: BUILTIN_LANGS };

const BOT_ICON_MAP: Record<string, LucideIcon> = {
  home: House,
  news: Newspaper,
  tv: Tv,
  trophy: Trophy,
  bus: Bus,
  ad: Megaphone,
  siren: Siren,
  pin: MapPin,
  store: Store,
  globe: Globe,
  cpu: Cpu,
  sparkles: Sparkles,
  plus: Plus,
};

const DEFAULT_BOT_TILES: { icon: string; label: string; to: string }[] = [
  { icon: "home", label: "الرئيسية", to: "/" },
  { icon: "news", label: "الأخبار", to: "/news" },
  { icon: "tv", label: "بث مباريات", to: "/sports-news" },
  { icon: "bus", label: "باصات", to: "/buses" },
  { icon: "ad", label: "حراج", to: "/haraj" },
  { icon: "siren", label: "اليوم", to: "/today" },
];

const NAV_TO_BOT_ITEM: Record<string, { icon: string; label: string; to: string }> = {
  "/": { icon: "home", label: "الرئيسية", to: "/" },
  "/news": { icon: "news", label: "الأخبار", to: "/news" },
  "/buses": { icon: "bus", label: "باصات", to: "/buses" },
  "/directory": { icon: "pin", label: "الدليل", to: "/directory" },
  "/haraj": { icon: "ad", label: "حراج", to: "/haraj" },
  "/today": { icon: "siren", label: "اليوم", to: "/today" },
  "/store": { icon: "store", label: "المتجر", to: "/store" },
};

function fromBase64Url(b64u: string): string {
  try {
    const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const bin = typeof atob === "function" ? atob(b64 + pad) : "";
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}


const SECTION_DICT_ROOT: Record<string, { he: string; en: string }> = {
  "فن و موضة": { he: "אמנות ואופנה", en: "Art & Fashion" },
  "فن وموضة": { he: "אמנות ואופנה", en: "Art & Fashion" },
  "ثقافة وفن": { he: "תרבות ואמנות", en: "Culture & Art" },
  "فن وثقافة": { he: "אמנות ותרבות", en: "Art & Culture" },
  "موضة": { he: "אופנה", en: "Fashion" },
  "فن": { he: "אמנות", en: "Art" },
  "مشاهير": { he: "סלבס ובידור", en: "Celebrities" },
  "الذكاء": { he: "בינה מלאכותית", en: "AI" },
  "ذكاء اصطناعي": { he: "בינה מלאכותית", en: "Artificial Intelligence" },
  "نتفليكس": { he: "נטפליקס", en: "Netflix" },
  "أخبار محلية": { he: "חדשות מקומיות", en: "Local News" },
};

function trSecLabel(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const emojiMatch = trimmed.match(/^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\s]+)(.+)$/u);
  const prefix = emojiMatch ? emojiMatch[1] : "";
  const core = (emojiMatch ? emojiMatch[2] : trimmed).trim();
  const lang = getI18nState().lang;
  if (lang === "ar") return trimmed;
  const entry = SECTION_DICT_ROOT[core];
  if (entry && (lang === "he" || lang === "en")) {
    return `${prefix}${entry[lang]}`;
  }
  const byDict = trv(core);
  if (byDict !== core) return `${prefix}${byDict}`;
  return trv(trimmed);
}

function GlobalCustomBottomBar() {
  const st = useSiteSettings();
  const location = useLocation();
  const pathname = location.pathname || "/";

  // Hide on admin, login, reset-password, and app-auth screens
  const isSystemScreen =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/app-auth");

  const botItem = (st.quickLinks ?? []).find((q) => q.id === "botbarcfg");
  const cssItem = (st.quickLinks ?? []).find((q) => q.id === "botbarcss");

  const { style, btns } = useMemo(() => {
    if (!botItem || !botItem.url.startsWith("/__bot?")) {
      // Preserve exact order from st.nav if configured, otherwise DEFAULT_BOT_TILES
      const navOrdered = (st.nav ?? [])
        .filter((n) => n.visible)
        .map((n) => NAV_TO_BOT_ITEM[n.id])
        .filter(Boolean);
      return {
        style: "classic",
        btns: navOrdered.length > 0 ? navOrdered : DEFAULT_BOT_TILES,
      };
    }
    const rawStyle = botItem.title.trim();
    const validStyle =
      rawStyle === "floating" ||
      rawStyle === "dark" ||
      rawStyle === "dock" ||
      rawStyle === "minimal" ||
      rawStyle === "neon" ||
      rawStyle === "glass" ||
      rawStyle === "custom" ||
      rawStyle === "hidden"
        ? rawStyle
        : "classic";
    const labels = (botItem.subtitle ?? "").split("|");
    const pairs = botItem.url.slice(7).split("|").filter(Boolean);
    const parsedBtns = pairs.map((p, idx) => {
      const colon = p.indexOf(":");
      const icon = colon > 0 ? p.slice(0, colon) : "home";
      const rawTo = colon > 0 ? p.slice(colon + 1) : p;
      const to = rawTo.replace(/%20/g, " ");
      return {
        icon: icon || "home",
        to: to || "/",
        label: (labels[idx] ?? "").trim() || "زر",
      };
    });
    return {
      style: validStyle,
      btns: parsedBtns.length > 0 ? parsedBtns : DEFAULT_BOT_TILES,
    };
  }, [botItem, st.nav]);

  const customCfg = useMemo(() => {
    let bg = "#111827";
    let fg = "#9ca3af";
    let ab = "#f2c94c";
    let af = "#111827";
    let r = 24;
    let m = 10;
    let rawCss = "";
    if (cssItem) {
      for (const part of (cssItem.title ?? "").split("|")) {
        if (part.startsWith("bg:")) bg = part.slice(3) || bg;
        else if (part.startsWith("fg:")) fg = part.slice(3) || fg;
        else if (part.startsWith("ab:")) ab = part.slice(3) || ab;
        else if (part.startsWith("af:")) af = part.slice(3) || af;
        else if (part.startsWith("r:")) r = Number(part.slice(2)) || 0;
        else if (part.startsWith("m:")) m = Number(part.slice(2)) || 0;
      }
      const b64Part1 = cssItem.url?.startsWith("/__bcss?") ? cssItem.url.slice(8) : "";
      const b64Part2 = cssItem.subtitle && cssItem.subtitle !== "css" ? cssItem.subtitle : "";
      if (b64Part1) rawCss = fromBase64Url(b64Part1 + b64Part2);
    }
    return { bg, fg, ab, af, r, m, rawCss };
  }, [cssItem]);

  if (isSystemScreen) return null;

  const hideLegacyCss = `
    nav.edge-t.fixed.bottom-0:not(.custom-botbar) { display: none !important; }
    nav.custom-botbar:not(#rp-global-bottom-bar) { display: none !important; }
  `;

  if (style === "hidden") {
    return <style>{hideLegacyCss}</style>;
  }

  const userExtraCss = customCfg.rawCss.trim()
    ? customCfg.rawCss.includes("{")
      ? customCfg.rawCss
      : `#rp-global-bottom-bar { ${customCfg.rawCss} }`
    : "";

  const navWrapCls =
    style === "floating"
      ? "custom-botbar fixed inset-x-3 bottom-3 z-40 rounded-full border border-line bg-paper/95 px-2 py-1.5 shadow-xl backdrop-blur-md md:hidden"
      : style === "dark"
        ? "custom-botbar fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#111827]/95 pb-[env(safe-area-inset-bottom)] text-white shadow-xl backdrop-blur-md md:hidden"
        : style === "dock"
          ? "custom-botbar fixed inset-x-2 bottom-2 z-40 rounded-3xl border border-line bg-paper/95 p-1.5 shadow-lg backdrop-blur-md md:hidden"
          : style === "minimal"
            ? "custom-botbar fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
            : style === "neon"
              ? "custom-botbar fixed inset-x-3 bottom-3 z-40 rounded-3xl border border-[#f2c94c]/60 bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] px-2 py-1.5 text-white shadow-[0_10px_30px_rgba(242,201,76,0.25)] backdrop-blur-md md:hidden"
              : style === "glass"
                ? "custom-botbar fixed inset-x-3 bottom-3 z-40 rounded-3xl border border-white/40 bg-white/75 px-2 py-1.5 text-ink shadow-[0_8px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl md:hidden"
                : style === "custom"
                  ? "custom-botbar fixed z-40 px-2 py-1.5 shadow-xl backdrop-blur-md md:hidden"
                  : "custom-botbar edge-t fixed inset-x-0 bottom-0 z-40 bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden";

  const customNavStyle: CSSProperties | undefined =
    style === "custom"
      ? {
          backgroundColor: customCfg.bg,
          color: customCfg.fg,
          borderRadius: `${customCfg.r}px`,
          bottom: `${customCfg.m}px`,
          left: customCfg.m > 0 ? `${customCfg.m}px` : "0px",
          right: customCfg.m > 0 ? `${customCfg.m}px` : "0px",
        }
      : undefined;

  return (
    <>
      <style>{hideLegacyCss + "\n" + userExtraCss}</style>
      <nav
        id="rp-global-bottom-bar"
        className={navWrapCls}
        style={customNavStyle}
        aria-label={tr("التنقل السفلي")}
      >
        <div className="mx-auto flex max-w-xl items-center justify-around">
          {btns.map((item, idx) => {
            const Icon = BOT_ICON_MAP[item.icon] ?? House;
            const hasQuery = item.to.includes("?q=");
            const linkTo = (hasQuery ? item.to.split("?q=")[0] || "/" : item.to) as "/";
            const linkSearch = hasQuery
              ? { q: decodeURIComponent(item.to.split("?q=")[1] ?? "") }
              : undefined;
            const exact = item.to === "/";
            const isActive = exact
              ? pathname === "/" && !hasQuery
              : pathname === item.to || pathname.startsWith(`${item.to}/`);

            if (style === "custom") {
              return (
                <Link
                  key={`${item.to}-${idx}`}
                  to={linkTo}
                  search={linkSearch}
                  activeOptions={{ exact }}
                  data-active={isActive ? "true" : "false"}
                  className="custom-botbar-item flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-extrabold transition"
                  style={
                    isActive
                      ? {
                          backgroundColor: customCfg.ab,
                          color: customCfg.af,
                          borderRadius: `${Math.max(8, customCfg.r - 6)}px`,
                        }
                      : { color: customCfg.fg }
                  }
                >
                  <Icon className="size-5" aria-hidden />
                  <span className="truncate">
                    {item.to === "/haraj" ? trv(st.texts.harajNav) : trSecLabel(item.label)}
                  </span>
                </Link>
              );
            }
            if (style === "dark" || style === "neon") {
              return (
                <Link
                  key={`${item.to}-${idx}`}
                  to={linkTo}
                  search={linkSearch}
                  activeOptions={{ exact }}
                  className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-bold text-white/70 transition"
                  activeProps={{
                    className:
                      "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-extrabold text-[#FDB700]",
                  }}
                >
                  <Icon className="size-5" aria-hidden />
                  <span className="truncate">
                    {item.to === "/haraj" ? trv(st.texts.harajNav) : trSecLabel(item.label)}
                  </span>
                </Link>
              );
            }
            if (style === "floating" || style === "glass") {
              return (
                <Link
                  key={`${item.to}-${idx}`}
                  to={linkTo}
                  search={linkSearch}
                  activeOptions={{ exact }}
                  className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 text-[11px] font-bold text-muted transition"
                  activeProps={{
                    className:
                      "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full bg-ink py-1.5 text-[11px] font-extrabold text-paper shadow-xs",
                  }}
                >
                  <Icon className="size-4" aria-hidden />
                  <span className="truncate">
                    {item.to === "/haraj" ? trv(st.texts.harajNav) : trSecLabel(item.label)}
                  </span>
                </Link>
              );
            }
            if (style === "dock") {
              return (
                <Link
                  key={`${item.to}-${idx}`}
                  to={linkTo}
                  search={linkSearch}
                  activeOptions={{ exact }}
                  className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 text-[11px] font-bold text-muted transition"
                  activeProps={{
                    className:
                      "flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-primary py-1.5 text-[11px] font-extrabold text-ink shadow-xs",
                  }}
                >
                  <span className="grid size-8 place-items-center rounded-xl bg-surface/80">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="truncate">
                    {item.to === "/haraj" ? trv(st.texts.harajNav) : trSecLabel(item.label)}
                  </span>
                </Link>
              );
            }
            if (style === "minimal") {
              return (
                <Link
                  key={`${item.to}-${idx}`}
                  to={linkTo}
                  search={linkSearch}
                  activeOptions={{ exact }}
                  className="flex flex-1 flex-col items-center justify-center gap-0.5 border-t-2 border-transparent py-1.5 text-[11px] font-bold text-muted transition"
                  activeProps={{
                    className:
                      "flex flex-1 flex-col items-center justify-center gap-0.5 border-t-2 border-ink py-1.5 text-[11px] font-extrabold text-ink",
                  }}
                >
                  <Icon className="size-4" aria-hidden />
                  <span className="truncate">
                    {item.to === "/haraj" ? trv(st.texts.harajNav) : trSecLabel(item.label)}
                  </span>
                </Link>
              );
            }
            return (
              <Link
                key={`${item.to}-${idx}`}
                to={linkTo}
                search={linkSearch}
                activeOptions={{ exact }}
                className="tabbar-link"
              >
                <span className="tab-icon">
                  <Icon className="size-5" aria-hidden />
                </span>
                {item.to === "/haraj" ? trv(st.texts.harajNav) : trSecLabel(item.label)}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

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
    const adsensePub = st.google.adsensePub || DEFAULT_ADSENSE_PUB;
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
        { name: "google-adsense-account", content: adsensePub },
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

const NO_ADSENSE_PATHS = /^\/(admin|login|reset-password|app-auth|my-|cart|orders|store|haraj|ads|submit)/;

function RootComponent() {
  const { settings, i18n } = Route.useLoaderData();
  const location = useLocation();
  const pathname = location.pathname || "/";
  setI18nState(i18n);
  const css = themeCss(settings.theme);
  const defLang = i18n.langs.find((l) => l.isDefault)?.code ?? "ar";
  const adsensePub = settings.google.adsensePub || DEFAULT_ADSENSE_PUB;
  const allowAdsOnPage = !NO_ADSENSE_PATHS.test(pathname);
  return (
    <html lang={i18n.lang} dir={i18n.dir} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: langRedirectScript(i18n.lang, defLang, i18n.langs.map((l) => l.code)) }} />
        {allowAdsOnPage ? (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsensePub}`}
            crossOrigin="anonymous"
          />
        ) : (
          <style id="no-adsense-on-route">{`.adsbygoogle, ins.adsbygoogle, amp-auto-ads, [aria-label="إعلان"] { display: none !important; }`}</style>
        )}
        <HeadContent />
        {css ? <style id="site-theme" dangerouslySetInnerHTML={{ __html: css }} /> : null}
      </head>
      <body>
        <SiteSettingsProvider value={settings}>
          <PreviewHostBridge />
          <ServiceWorkerRegistration />
          <AuthProvider>
            <Outlet />
            <GlobalCustomBottomBar />
          </AuthProvider>
          <SiteAnalytics />
          {allowAdsOnPage ? <GoogleServices /> : null}
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
      { rel: "icon", href: "/favicon.ico", sizes: "32x32" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/icons/favicon-32.png" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/icons/favicon-16.png" },
      { rel: "stylesheet", href: appCss },
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
