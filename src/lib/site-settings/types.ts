/**
 * Owner-editable site settings («إعدادات الموقع»), stored as one JSON row (migration 0011).
 * Shared by client and server: defaults + a strict sanitizer (unknown keys dropped).
 */

export const DEFAULT_ADSENSE_PUB = "ca-pub-9063892572843254";

export function normalizeAdsensePub(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const m = raw.match(/(?:ca-)?pub-(\d{10,20})/i);
  return m ? `ca-pub-${m[1]}` : "";
}

export const HOME_SECTIONS = {
  weather: "الطقس ومواقيت الصلاة",
  slider: "السلايدر",
  search: "البحث",
  tiles: "أيقونات الأقسام",
  quicklinks: "روابط سريعة",
  news: "آخر الأخبار",
  matches: "جدول ونتائج المباريات",
  social: "سوشيال وتريند المشاهير",
  israel: "أخبار إسرائيل",
  sports: "رياضة",
  tech: "أخبار تقنية",
  post: "خدمة البريد",
  install: "تثبيت التطبيق والإشعارات",
  buses: "الباصات",
  directory: "دليل محلات وخدمات رهط",
  ads: "جديد الحراج",
  duty: "صيدلية المناوبة",
  emergency: "أرقام الطوارئ",
} as const;

export function isInternalQuickLinkConfig(
  l: { id?: string; title?: string; subtitle?: string; url?: string } | null | undefined,
): boolean {
  if (!l) return true;
  const id = String(l.id ?? "").trim();
  const title = String(l.title ?? "").trim();
  const sub = String(l.subtitle ?? "").trim();
  const url = String(l.url ?? "").trim();
  if (!id || !title || !url) return true;
  if (url.startsWith("/__") || url.includes("/__")) return true;
  if (
    id === "tilelive" ||
    id === "slidercfg" ||
    id === "topbarcfg" ||
    id === "topstylecfg" ||
    id === "botbarcfg" ||
    id === "botbarcss" ||
    id === "txsecscfg" ||
    id === "busemergcfg" ||
    id === "dirhubcfg" ||
    id === "socialhubcfg" ||
    id === "socialvipposts" ||
    id === "sociallocalfigs" ||
    id === "socialhub" ||
    id === "social2" ||
    id === "maintcfg" ||
    id === "maintmode" ||
    id === "wcfg" ||
    id === "citycfg" ||
    id.startsWith("sec") ||
    /(cfg|css|social|vip|dirhub|busemerg|topbar|topstyle|botbar|slider|txsecs|tilelive|maint|wcfg|svip|shcfg|city)/i.test(
      id,
    )
  ) {
    return true;
  }
  if (
    /^(busemergcfg|dirhubcfg|socialhub|social2|slidercfg|topbarcfg|topstylecfg|botbarcfg|botbarcss|txsecscfg|tilelive|animated_cards|neon_pulse|colorful_apps|glass_float|circles_ring|compact_pills)/i.test(
      title,
    ) ||
    /(^style:|^vip:|^count:|^json:|^eyJ|homeItems:|radar:|night-radar|fx:auto|int:medium|scope:global|scope:local|fbauto:|fb:auto|tt:auto|collapsible\|)/i.test(
      title,
    ) ||
    /(^style:|^vip:|^count:|^json:|^eyJ|homeItems:|radar:|night-radar|fx:auto|int:medium|scope:global|scope:local|fbauto:|fb:auto|tt:auto|^socialhub|^topstylecfg$|collapsible\|)/i.test(
      sub,
    )
  ) {
    return true;
  }
  return false;
}
export type HomeSectionId = keyof typeof HOME_SECTIONS;

export const NAV_ITEMS = {
  "/": "الرئيسية",
  "/news": "الأخبار",
  "/today": "اليوم",
  "/buses": "باصات",
  "/directory": "الدليل",
  "/store": "المتجر",
  "/haraj": "حراج",
} as const;
export type NavId = keyof typeof NAV_ITEMS;

export const TILE_ITEMS = {
  "/news": "الأخبار",
  "/buses": "الباصات",
  "/directory": "الدليل",
  "/store": "المتجر",
  "/haraj": "حراج",
  "/today": "اليوم",
  "/submit": "أضف",
} as const;
export type TileId = keyof typeof TILE_ITEMS;

export const BUILTIN_SLIDES = {
  news: "آخر خبر",
  buses: "متى يصل الباص؟",
  submit: "أضف نشاطك",
  today: "أرقام الطوارئ",
} as const;
export type BuiltinSlideId = keyof typeof BUILTIN_SLIDES;

export type Slide =
  | { type: "builtin"; id: BuiltinSlideId }
  | { type: "custom"; id: string; title: string; subtitle: string; link: string; imageKey: string };

export type QuickLink = { id: string; title: string; subtitle: string; url: string; emoji: string };
export type Toggle<T extends string> = { id: T; visible: boolean };

/** A charging point the owner added. The public page also keeps the OpenStreetMap point. */
export type RavKavPoint = {
  id: string;
  name: string;
  address: string;
  hours: string;
  lat: number;
  lon: number;
};

export type RavKavUi = {
  button: boolean;
  points: boolean;
  hidden: string[];
};

export const AD_PLACEMENTS = {
  home: "الصفحة الرئيسية (بين الأقسام)",
  newsList: "قائمة الأخبار",
  article: "صفحة الخبر",
} as const;
export type AdPlacement = keyof typeof AD_PLACEMENTS;
export type AdSlot = { id: string; slot: string; placement: AdPlacement };

export type GoogleSettings = {
  adsensePub: string;
  adsenseEnabled: boolean;
  autoAds: boolean;
  slots: AdSlot[];
  gaId: string;
  gaEnabled: boolean;
  gtmId: string;
  gscCode: string;
};

export type Announcement = {
  enabled: boolean;
  text: string;
  link: string;
  kind: "info" | "warning" | "urgent";
  scope: "all" | "buses";
  rev: string;
};

export const DEFAULT_ANNOUNCE: Announcement = {
  enabled: false,
  text: "",
  link: "",
  kind: "info",
  scope: "all",
  rev: "",
};

/** Keep slidercfg (/ __hord?) in sync whenever settings.home is updated from any Admin panel. */
export function syncHomeOrderToSliderCfg(
  quickLinks: QuickLink[] | undefined,
  home: Toggle<HomeSectionId>[],
): QuickLink[] {
  const list = Array.isArray(quickLinks) ? [...quickLinks] : [];
  const idx = list.findIndex((q) => q.id === "slidercfg");
  if (idx === -1) return list;
  const cur = list[idx];
  const existingCustomTokens: string[] = [];
  if (cur.url?.startsWith("/__hord?")) {
    for (const token of cur.url.slice(8).split("|").filter(Boolean)) {
      if (token.startsWith("csec~")) existingCustomTokens.push(token);
    }
  }
  const builtInTokens = home.map((h) => `${h.id}:${h.visible ? "1" : "0"}`);
  const mergedTokens = [...builtInTokens, ...existingCustomTokens];
  const nextUrl = ("/__hord?" + mergedTokens.join("|")).slice(0, 1200);
  list[idx] = { ...cur, url: nextUrl };
  return list;
}

export type SiteSettings = {
  google: GoogleSettings;
  theme: { primary: string; accent: string; background: string; ink: string };
  texts: {
    siteName: string;
    tagline: string;
    addButton: string;
    footer: string;
    contactEmail: string;
    harajName: string;
    harajNav: string;
  };
  logoKey: string;
  faviconKey: string;
  home: Toggle<HomeSectionId>[];
  slides: Slide[];
  nav: Toggle<NavId>[];
  tiles: Toggle<TileId>[];
  quickLinks: QuickLink[];
  announce: Announcement;
  ravkavPoints: RavKavPoint[];
  ravkavUi: RavKavUi;
};

export const THEME_DEFAULT = {
  primary: "#f2c94c",
  accent: "#b45309",
  background: "#f1f2f4",
  ink: "#263238",
};

export const THEME_PRESETS: { name: string; theme: SiteSettings["theme"] }[] = [
  { name: "أصفر رهط (الافتراضي)", theme: THEME_DEFAULT },
  {
    name: "أخضر",
    theme: { primary: "#6fcf97", accent: "#b45309", background: "#f1f4f2", ink: "#1f2d27" },
  },
  {
    name: "أزرق",
    theme: { primary: "#7cb7f2", accent: "#c2410c", background: "#f0f3f7", ink: "#1e2a3a" },
  },
  {
    name: "برتقالي",
    theme: { primary: "#f6a65a", accent: "#9a3412", background: "#f6f2ee", ink: "#2f2620" },
  },
  {
    name: "وردي",
    theme: { primary: "#f2a7c3", accent: "#9d174d", background: "#f7f1f4", ink: "#2e2229" },
  },
];

export const DEFAULT_SETTINGS: SiteSettings = {
  google: {
    adsensePub: DEFAULT_ADSENSE_PUB,
    adsenseEnabled: true,
    autoAds: true,
    slots: [],
    gaId: "",
    gaEnabled: false,
    gtmId: "",
    gscCode: "",
  },
  theme: THEME_DEFAULT,
  texts: {
    siteName: "رهط بوست",
    tagline: "رهط والنقب",
    addButton: "أضف",
    footer:
      "أرقام الطوارئ الوطنية حقيقية. الأخبار والدليل والباصات من مصادر حقيقية مذكورة في كل صفحة.",
    contactEmail: "",
    harajName: "حراج رهط",
    harajNav: "حراج",
  },
  logoKey: "",
  faviconKey: "",
  home: (Object.keys(HOME_SECTIONS) as HomeSectionId[]).map((id) => ({ id, visible: true })),
  slides: (Object.keys(BUILTIN_SLIDES) as BuiltinSlideId[]).map((id) => ({ type: "builtin", id })),
  nav: (Object.keys(NAV_ITEMS) as NavId[]).map((id) => ({ id, visible: true })),
  tiles: (Object.keys(TILE_ITEMS) as TileId[]).map((id) => ({ id, visible: true })),
  quickLinks: [],
  announce: DEFAULT_ANNOUNCE,
  ravkavPoints: [],
  ravkavUi: { button: true, points: true, hidden: [] },
};

const HEX = /^#[0-9a-f]{6}$/i;
const KEY = /^[a-f0-9]{32}\.(webp|jpg)$/;
const ID = /^[a-z0-9]{4,24}$/;

const str = (v: unknown, max: number, fallback = "") =>
  typeof v === "string"
    ? v.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max)
    : fallback;

/** Relative site path or https URL; anything else becomes "". */
export function safeUrl(v: unknown): string {
  const s = str(v, 8000).replace(/\s+/g, "%20");
  if (/^\/(?!\/)[^\s]*$/.test(s)) return s;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : "";
  } catch {
    return "";
  }
}
const safeEmail = (v: unknown) => {
  const s = str(v, 120);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : "";
};

/** Keep known ids once each, in the given order; append missing ones (visible). */
function toggles<T extends string>(input: unknown, all: readonly T[]): Toggle<T>[] {
  const out: Toggle<T>[] = [];
  if (Array.isArray(input))
    for (const x of input) {
      const raw = (x as { id?: unknown })?.id;
      const id = (raw === "/ads" ? "/haraj" : raw) as T;
      if (all.includes(id) && !out.some((o) => o.id === id))
        out.push({ id, visible: (x as { visible?: unknown }).visible !== false });
    }
  all.forEach((id, i) => {
    if (out.some((o) => o.id === id)) return;
    const prev = i > 0 ? out.findIndex((o) => o.id === all[i - 1]) : -1;
    out.splice(prev >= 0 ? prev + 1 : out.length, 0, { id, visible: true });
  });
  return out;
}

export function sanitizeSettings(input: unknown): SiteSettings {
  const d = DEFAULT_SETTINGS;
  const i = (input && typeof input === "object" ? input : {}) as Record<string, any>;
  const t = (i.theme ?? {}) as Record<string, unknown>;
  const color = (v: unknown, f: string) =>
    typeof v === "string" && HEX.test(v) ? v.toLowerCase() : f;
  const x = (i.texts ?? {}) as Record<string, unknown>;
  const slides: Slide[] = [];
  if (Array.isArray(i.slides))
    for (const s of i.slides.slice(0, 12)) {
      if (
        s?.type === "builtin" &&
        s.id in BUILTIN_SLIDES &&
        !slides.some((o) => o.type === "builtin" && o.id === s.id)
      )
        slides.push({ type: "builtin", id: s.id });
      else if (s?.type === "custom" && ID.test(String(s.id))) {
        const title = str(s.title, 90);
        if (title)
          slides.push({
            type: "custom",
            id: String(s.id),
            title,
            subtitle: str(s.subtitle, 140),
            link: safeUrl(s.link),
            imageKey: KEY.test(String(s.imageKey ?? "")) ? String(s.imageKey) : "",
          });
      }
    }
  const quickLinks: QuickLink[] = [];
  if (Array.isArray(i.quickLinks))
    for (const q of i.quickLinks.slice(0, 60)) {
      const idStr = String(q?.id ?? "");
      const isCfg =
        /(cfg|css|social|vip|dirhub|busemerg|topbar|topstyle|botbar|slider|txsecs|tilelive|maint|wcfg|svip|shcfg|^sec)/i.test(idStr) ||
        String(q?.url ?? "").startsWith("/__");
      const title = str(q?.title, isCfg ? 300 : 60);
      const url = safeUrl(q?.url);
      if (title && url && ID.test(idStr))
        quickLinks.push({
          id: idStr,
          title,
          subtitle: str(q.subtitle, isCfg ? 4000 : 300),
          url,
          emoji: str(q.emoji, 4),
        });
    }
  const g = (i.google ?? {}) as Record<string, any>;
  const pick = (v: unknown, re: RegExp) => {
    const t = typeof v === "string" ? v.trim() : "";
    return re.test(t) ? t : "";
  };
  const slotsOut: AdSlot[] = [];
  if (Array.isArray(g.slots))
    for (const a of g.slots.slice(0, 10)) {
      const slot = pick(a?.slot, /^\d{6,20}$/);
      if (slot && ID.test(String(a?.id)) && a?.placement in AD_PLACEMENTS)
        slotsOut.push({ id: String(a.id), slot, placement: a.placement });
    }
  const normPub = normalizeAdsensePub(g.adsensePub);
  return {
    google: {
      adsensePub: normPub || pick(g.adsensePub, /^ca-pub-\d{10,20}$/) || DEFAULT_ADSENSE_PUB,
      adsenseEnabled: g.adsenseEnabled !== false,
      autoAds: g.autoAds !== false,
      slots: slotsOut,
      gaId: pick(g.gaId, /^G-[A-Z0-9]{4,16}$/),
      gaEnabled: g.gaEnabled === true,
      gtmId: pick(g.gtmId, /^GTM-[A-Z0-9]{4,12}$/),
      gscCode: pick(g.gscCode, /^[A-Za-z0-9_-]{10,100}$/),
    },
    theme: {
      primary: color(t.primary, d.theme.primary),
      accent: color(t.accent, d.theme.accent),
      background: color(t.background, d.theme.background),
      ink: color(t.ink, d.theme.ink),
    },
    texts: {
      siteName: str(x.siteName, 40) || d.texts.siteName,
      tagline: str(x.tagline, 60),
      addButton: str(x.addButton, 16) || d.texts.addButton,
      footer: str(x.footer, 400),
      contactEmail: safeEmail(x.contactEmail),
      harajName: str(x.harajName, 40) || d.texts.harajName,
      harajNav: str(x.harajNav, 16) || d.texts.harajNav,
    },
    logoKey: KEY.test(String(i.logoKey ?? "")) ? String(i.logoKey) : "",
    faviconKey: KEY.test(String(i.faviconKey ?? "")) ? String(i.faviconKey) : "",
    home: toggles(i.home, Object.keys(HOME_SECTIONS) as HomeSectionId[]),
    slides: Array.isArray(i.slides) ? slides : d.slides,
    nav: toggles(i.nav, Object.keys(NAV_ITEMS) as NavId[]),
    tiles: toggles(i.tiles, Object.keys(TILE_ITEMS) as TileId[]),
    quickLinks,
    ravkavPoints: cleanRavkavPoints(i.ravkavPoints),
    ravkavUi: cleanRavkavUi(i.ravkavUi),
    announce: {
      enabled: i.announce?.enabled === true,
      text: str(i.announce?.text, 240),
      link: safeUrl(i.announce?.link),
      kind:
        i.announce?.kind === "warning" || i.announce?.kind === "urgent"
          ? i.announce.kind
          : "info",
      scope: i.announce?.scope === "buses" ? "buses" : "all",
      rev: str(i.announce?.rev, 32),
    },
  };
}

const RAV_ID = /^[a-z0-9_-]{2,40}$/;

function cleanRavkavPoints(input: unknown): RavKavPoint[] {
  if (!Array.isArray(input)) return [];
  const out: RavKavPoint[] = [];
  for (const raw of input.slice(0, 40)) {
    if (!raw || typeof raw !== "object") continue;
    const p = raw as Record<string, unknown>;
    const id = str(p.id, 40).toLowerCase();
    const name = str(p.name, 80);
    const lat = typeof p.lat === "number" ? p.lat : Number(p.lat);
    const lon = typeof p.lon === "number" ? p.lon : Number(p.lon);
    if (!RAV_ID.test(id) || !name || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (lat < 29.4 || lat > 33.5 || lon < 34.2 || lon > 35.95) continue;
    if (out.some((o) => o.id === id)) continue;
    out.push({
      id,
      name,
      address: str(p.address, 160),
      hours: str(p.hours, 80),
      lat: Math.round(lat * 1e6) / 1e6,
      lon: Math.round(lon * 1e6) / 1e6,
    });
  }
  return out;
}

function cleanRavkavUi(input: unknown): RavKavUi {
  const u = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const hidden: string[] = [];
  if (Array.isArray(u.hidden)) {
    for (const h of u.hidden.slice(0, 40)) {
      const id = str(h, 40).toLowerCase();
      if (RAV_ID.test(id) && !hidden.includes(id)) hidden.push(id);
    }
  }
  return { button: u.button !== false, points: u.points !== false, hidden };
}

/* ------------------------------------------------------------- theme → CSS variables */

function mix(hex: string, other: string, amount: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [p(hex), p(other)];
  return `#${a
    .map((v, i) =>
      Math.round(v + (b[i] - v) * amount)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** CSS custom properties for a theme (derived shades for hover/deep/soft/ink). */
export function themeVars(t: SiteSettings["theme"]): Record<string, string> {
  return {
    "--color-primary": t.primary,
    "--color-primary-hover": mix(t.primary, "#000000", 0.06),
    "--color-primary-deep": mix(t.primary, "#000000", 0.12),
    "--color-primary-soft": mix(t.primary, "#ffffff", 0.82),
    "--color-primary-ink": mix(t.primary, "#000000", 0.55),
    "--color-alert": t.accent,
    "--color-surface": t.background,
    "--color-ink": t.ink,
  };
}

export function themeCss(t: SiteSettings["theme"]): string {
  const same = (Object.keys(THEME_DEFAULT) as (keyof typeof THEME_DEFAULT)[]).every(
    (k) => t[k] === THEME_DEFAULT[k],
  );
  if (same) return "";
  return `:root{${Object.entries(themeVars(t))
    .map(([k, v]) => `${k}:${v}`)
    .join(";")}}`;
}

/** Every uploaded image key referenced by the settings (served publicly by /media). */
export function settingsImageKeys(s: SiteSettings): string[] {
  return [
    s.logoKey,
    s.faviconKey,
    ...s.slides.map((x) => (x.type === "custom" ? x.imageKey : "")),
  ].filter(Boolean);
}
