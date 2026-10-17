import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

/** Any language code (built-in: ar, he, en; admins can add more in «اللغات»). */
export type Lang = string;
export type LangDir = "rtl" | "ltr";
export type LangMode = "ai" | "manual";
export type LangDef = {
  code: string;
  name: string;
  dir: LangDir;
  flag: string;
  enabled: boolean;
  isDefault: boolean;
  mode: LangMode;
  sort: number;
};

export const BUILTIN_LANGS: LangDef[] = [
  { code: "ar", name: "العربية", dir: "rtl", flag: "", enabled: true, isDefault: true, mode: "manual", sort: 0 },
  { code: "he", name: "עברית", dir: "rtl", flag: "", enabled: true, isDefault: false, mode: "ai", sort: 1 },
  { code: "en", name: "English", dir: "ltr", flag: "", enabled: true, isDefault: false, mode: "ai", sort: 2 },
];
export const LANG_COOKIE = "lang";
export const LANG_CODE_RE = /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/;


export type I18nState = { lang: Lang; dir: LangDir; dict: Record<string, string>; langs: LangDef[] };
const ARABIC: I18nState = { lang: "ar", dir: "rtl", dict: {}, langs: BUILTIN_LANGS };

const reqState = new WeakMap<object, I18nState>();
let clientState: I18nState = ARABIC;

function currentRequest(): Request | undefined {
  try {
    return getRequest();
  } catch {
    return undefined;
  }
}

/** Install the active language + dictionary (server: per request; client: for the page). */
export const setI18nState = createIsomorphicFn()
  .server((s: I18nState) => {
    const req = currentRequest();
    if (req) reqState.set(req, s);
  })
  .client((s: I18nState) => {
    clientState = s;
  });

export const getI18nState = createIsomorphicFn()
  .server((): I18nState => {
    const req = currentRequest();
    return (req && reqState.get(req)) || ARABIC;
  })
  .client((): I18nState => clientState);

export const getLang = (): Lang => getI18nState().lang;

/** Translate an Arabic UI string. `{0}`, `{1}`… are replaced by args. Unknown strings stay Arabic. */
export function tr(ar: string, ...args: unknown[]): string {
  const st = getI18nState();
  let s = ar;
  if (st.lang !== "ar" && typeof ar === "string") s = st.dict[ar] || ar;
  if (args.length)
    s = s.replace(/\{(\d+)\}/g, (m, i) => (Number(i) < args.length ? String(args[Number(i)]) : m));
  return s;
}

/** Translate a value if it's an Arabic string with a dictionary entry; anything else passes through. */
export function trv<T>(v: T): T {
  return (typeof v === "string" && v && /[\u0600-\u06FF]/.test(v) ? tr(v) : v) as T;
}

export function withLangParam(href: string, lang: Lang, defaultLang = "ar"): string {
  const u = new URL(href, "https://x.invalid");
  if (lang === defaultLang) u.searchParams.delete("lang");
  else u.searchParams.set("lang", lang);
  return u.pathname + (u.search || "") + u.hash;
}
