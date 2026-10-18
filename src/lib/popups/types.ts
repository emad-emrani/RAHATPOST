export type PopupPage = "all" | "home" | "haraj" | "news";
export type PopupFreq = "visit" | "session" | "day";
export type PopupData = {
  title: string;
  kind: "image" | "text";
  image: string;
  text: string;
  link: string;
  enabled: boolean;
  delay: number;
  autoClose: number;
  freq: PopupFreq;
  start: string;
  end: string;
  pages: PopupPage[];
};
export type Popup = PopupData & { id: string };
export type AdminPopup = Popup & { views: number; clicks: number };

export const POPUP_ID_RE = /^[a-f0-9]{12}$/;
export const NEW_POPUP: PopupData = {
  title: "",
  kind: "image",
  image: "",
  text: "",
  link: "",
  enabled: false,
  delay: 3,
  autoClose: 0,
  freq: "session",
  start: "",
  end: "",
  pages: ["all"],
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const clampInt = (v: unknown, lo: number, hi: number, d: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};
export function sanitizePopup(i: unknown): PopupData {
  const x = (i && typeof i === "object" ? i : {}) as Record<string, unknown>;
  const str = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/[<>]/g, "").trim().slice(0, n) : "");
  let link = str(x.link, 500);
  if (link && !/^https?:\/\//i.test(link) && !link.startsWith("/")) link = "https://" + link;
  const pages = Array.isArray(x.pages) ? x.pages.filter((p): p is PopupPage => ["all", "home", "haraj", "news"].includes(p as string)) : [];
  return {
    title: str(x.title, 80),
    kind: x.kind === "text" ? "text" : "image",
    image: /^[A-Za-z0-9/_.-]{1,200}$/.test(String(x.image ?? "")) ? String(x.image) : "",
    text: str(x.text, 600),
    link,
    enabled: x.enabled === true,
    delay: clampInt(x.delay, 0, 120, 3),
    autoClose: clampInt(x.autoClose, 0, 300, 0),
    freq: x.freq === "visit" || x.freq === "day" ? x.freq : "session",
    start: DATE.test(String(x.start ?? "")) ? String(x.start) : "",
    end: DATE.test(String(x.end ?? "")) ? String(x.end) : "",
    pages: pages.length ? pages : ["all"],
  };
}
export function pageOf(pathname: string): PopupPage {
  if (pathname === "/" || pathname === "") return "home";
  if (pathname.startsWith("/haraj")) return "haraj";
  if (pathname.startsWith("/news")) return "news";
  return "all";
}
