/**
 * Owner-editable site settings («إعدادات الموقع»), stored as one JSON row (migration 0011).
 * Shared by client and server: defaults + a strict sanitizer (unknown keys dropped).
 */

export const HOME_SECTIONS = {
  weather: "الطقس ومواقيت الصلاة",
  slider: "السلايدر",
  search: "البحث",
  tiles: "أيقونات الأقسام",
  quicklinks: "روابط سريعة",
  news: "آخر الأخبار",
  matches: "نتائج المباريات المباشرة",
  post: "أدلة خدمات رهط",
  buses: "الباصات",
  duty: "صيدلية المناوبة",
  directory: "الدليل والمتجر",
  ads: "جديد الحراج",
  sports: "رياضة",
  tech: "أخبار تقنية",
  israel: "أخبار إسرائيل",
  emergency: "أرقام الطوارئ",
  install: "تثبيت التطبيق والإشعارات",
} as const;
export type HomeSectionId = keyof typeof HOME_SECTIONS;

export const NAV_ITEMS = {
  "/": "الرئيسية",
  "/news": "الأخبار",
  "/buses": "باصات",
  "/directory": "الدليل",
  "/haraj": "حراج",
  "/today": "اليوم",
  "/store": "المتجر",
} as const;
export type NavId = keyof typeof NAV_ITEMS;

export const TILE_ITEMS = {
  "/news": "الأخبار",
  "/buses": "الباصات",
  "/directory": "الدليل",
  "/haraj": "حراج",
  "/today": "اليوم",
  "/store": "المتجر",
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

export const DEFAULT_ADSENSE_PUB = "ca-pub-9063892572843254";

export const DEFAULT_SETTINGS: SiteSettings = {
  google: {
    adsensePub: DEFAULT_ADSENSE_PUB,
    adsenseEnabled: true,
    autoAds: true,
    slots: [],
    gaId: "G-2B1R786GM0",
    gaEnabled: true,
    gtmId: "",
    gscCode: "gZirpZH5RWc4SxozAbvqJJPBxhk4DyFprqchBfkZhOU",
  },
  theme: THEME_DEFAULT,
  texts: {
    siteName: "رهط بوست",
    tagline: "أخبار وخدمات رهط والنقب في مكان واحد",
    addButton: "أضف",
    footer:
      "منصة رهط بوست — بوابة أخبار رهط والنقب، مواعيد باصات غاليم، دليل المصالح والخدمات، وحراج رهط. أرقام الطوارئ الوطنية حقيقية ومعتمدة.",
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
  const s = str(v, 300);
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

/** Extract and normalize an AdSense publisher ID from any format (ca-pub-XXX, pub-XXX, raw digits, <script>, or a full ads.txt line). */
export function normalizeAdsensePub(v: unknown): string {
  if (typeof v !== "string") return "";
  const m = v.match(/(?:ca-)?pub-(\d{10,20})/i) ?? v.trim().match(/^(\d{10,20})$/);
  return m ? `ca-pub-${m[1]}` : "";
}

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
    for (const q of i.quickLinks.slice(0, 12)) {
      const title = str(q?.title, 60);
      const url = safeUrl(q?.url);
      if (title && url && ID.test(String(q?.id)))
        quickLinks.push({
          id: String(q.id),
          title,
          subtitle: str(q.subtitle, 100),
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
  const rawTagline = str(x.tagline, 60);
  const cleanTagline =
    !rawTagline || rawTagline === "جمع الاخبار في مكان واحد"
      ? d.texts.tagline
      : rawTagline;
  const adsensePub = normalizeAdsensePub(g.adsensePub) || d.google.adsensePub;
  return {
    google: {
      adsensePub,
      adsenseEnabled: g.adsenseEnabled !== undefined ? g.adsenseEnabled === true : d.google.adsenseEnabled,
      autoAds: g.autoAds !== undefined ? g.autoAds === true : true,
      slots: slotsOut,
      gaId: pick(g.gaId, /^G-[A-Z0-9]{4,16}$/) || d.google.gaId,
      gaEnabled: g.gaEnabled !== undefined ? g.gaEnabled === true : d.google.gaEnabled,
      gtmId: pick(g.gtmId, /^GTM-[A-Z0-9]{4,12}$/),
      gscCode: pick(g.gscCode, /^[A-Za-z0-9_-]{10,100}$/) || d.google.gscCode,
    },
    theme: {
      primary: color(t.primary, d.theme.primary),
      accent: color(t.accent, d.theme.accent),
      background: color(t.background, d.theme.background),
      ink: color(t.ink, d.theme.ink),
    },
    texts: {
      siteName: str(x.siteName, 40) || d.texts.siteName,
      tagline: cleanTagline,
      addButton: str(x.addButton, 16) || d.texts.addButton,
      footer: str(x.footer, 400) || d.texts.footer,
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
  };
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
