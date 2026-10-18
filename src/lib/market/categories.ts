/**
 * Haraj categories + their optional spec fields. Admin-editable (table haraj_categories);
 * the code defaults below seed it and are used whenever the table is empty or unreachable.
 */
import { getLang, trv } from "@/lib/i18n/core";
import { DEFAULT_SPECS, MARKET_CATEGORIES, type SpecField, type Specs } from "./types";

export type HarajCategory = {
  /** Stable id stored on listings (the original Arabic name). Never changes after creation. */
  key: string;
  name: string;
  nameHe: string;
  nameEn: string;
  icon: string;
  enabled: boolean;
  fields: SpecField[];
};

const ICONS: Record<string, string> = {
  سيارات: "🚗", هواتف: "📱", إلكترونيات: "💻", أثاث: "🛋️", "أجهزة منزلية": "🧺", ملابس: "👕",
  أطفال: "🧸", رياضة: "⚽", عقارات: "🏠", حيوانات: "🐪", خدمات: "🛠️", أخرى: "📦",
};

export const DEFAULT_CATEGORIES: HarajCategory[] = MARKET_CATEGORIES.map((key) => ({
  key,
  name: key,
  nameHe: "",
  nameEn: "",
  icon: ICONS[key] ?? "📦",
  enabled: true,
  fields: (DEFAULT_SPECS[key] ?? []).map((f) => ({ ...f })),
}));

/** Label in the visitor's language: admin-entered he/en first, else the built-in dictionary. */
export function loc(ar: string, he?: string, en?: string): string {
  const lang = getLang();
  if (lang === "he" && he) return he;
  if (lang === "en" && en) return en;
  return trv(ar);
}
export const catName = (c: HarajCategory | undefined, fallback = "") => (c ? loc(c.name, c.nameHe, c.nameEn) : trv(fallback));
export const fieldLabel = (f: SpecField) => loc(f.label, f.labelHe, f.labelEn);
export function optionLabel(f: SpecField, v: string): string {
  const i = (f.options ?? []).indexOf(v);
  return i < 0 ? v : loc(v, f.optionsHe?.[i], f.optionsEn?.[i]);
}
export function specText(f: SpecField, v: string | number): string {
  if (f.type === "number") return `${Number(v).toLocaleString("en-US")}${f.unit ? ` ${trv(f.unit)}` : ""}`;
  if (f.type === "month") {
    const [y, m] = String(v).split("-");
    return `${m}/${y}`;
  }
  if (f.type === "select") return optionLabel(f, String(v));
  return String(v);
}
export const findCat = (cats: HarajCategory[], key: string) => cats.find((c) => c.key === key);

/** Keep only known, valid fields for the category (unknown keys dropped, empty = skipped). */
export function cleanSpecs(cat: HarajCategory | undefined, input: unknown): Specs {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: Specs = {};
  for (const f of cat?.fields ?? []) {
    const raw = src[f.key];
    if (raw === undefined || raw === null || raw === "") continue;
    const str = String(raw);
    if (f.type === "number") {
      const n = Number(str.replace(/[^\d.]/g, ""));
      if (/\d/.test(str) && Number.isFinite(n) && n >= (f.min ?? 0) && n <= (f.max ?? 1e9)) out[f.key] = n;
    } else if (f.type === "select") {
      if ((f.options ?? []).includes(str)) out[f.key] = str;
    } else if (f.type === "month") {
      if (/^\d{4}-(0[1-9]|1[0-2])$/.test(str)) out[f.key] = str;
    } else {
      const t = str.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, f.max ?? 60);
      if (t) out[f.key] = t;
    }
  }
  return out;
}

export type SpecFilter = Record<string, string>;
export function matchesSpecs(cat: HarajCategory | undefined, specs: Specs, f: SpecFilter | undefined): boolean {
  if (!f || !cat) return true;
  for (const field of cat.fields) {
    if (!field.filter) continue;
    const v = specs[field.key];
    const sel = f[field.key];
    const lo = Number(f[`${field.key}_min`]);
    const hi = Number(f[`${field.key}_max`]);
    if (sel && v !== sel) return false;
    if (lo && !(Number(v) >= lo)) return false;
    if (hi && !(v !== undefined && Number(v) <= hi)) return false;
  }
  return true;
}

/* ------------------------------------------------------------ admin input sanitizer */

const s = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max) : "");
const list = (v: unknown, max: number) => (Array.isArray(v) ? v.slice(0, 40).map((x) => s(x, max)) : []);
const KEY_RE = /^[a-z][a-z0-9]{1,15}$/;
const TYPES = ["text", "number", "select", "month"] as const;

export function sanitizeCategories(input: unknown): HarajCategory[] {
  const out: HarajCategory[] = [];
  if (!Array.isArray(input)) return out;
  for (const raw of input.slice(0, 40)) {
    const c = (raw ?? {}) as Record<string, unknown>;
    const name = s(c.name, 30);
    const key = s(c.key, 30) || name;
    if (!name || !key || out.some((o) => o.key === key)) continue;
    const fields: SpecField[] = [];
    for (const fr of Array.isArray(c.fields) ? c.fields.slice(0, 20) : []) {
      const f = (fr ?? {}) as Record<string, unknown>;
      const type = TYPES.includes(f.type as never) ? (f.type as SpecField["type"]) : "text";
      const fkey = s(f.key, 16).toLowerCase();
      const label = s(f.label, 40);
      if (!KEY_RE.test(fkey) || !label || fields.some((x) => x.key === fkey)) continue;
      const options = list(f.options, 40).filter(Boolean);
      if (type === "select" && !options.length) continue;
      const num = (v: unknown) => (v === "" || v === null || v === undefined || !Number.isFinite(Number(v)) ? undefined : Number(v));
      const filter = ["range", "max", "select"].includes(String(f.filter)) ? (f.filter as SpecField["filter"]) : undefined;
      fields.push({
        key: fkey,
        label,
        labelHe: s(f.labelHe, 40) || undefined,
        labelEn: s(f.labelEn, 40) || undefined,
        type,
        ...(type === "select" ? { options, optionsHe: list(f.optionsHe, 40).slice(0, options.length), optionsEn: list(f.optionsEn, 40).slice(0, options.length) } : {}),
        unit: s(f.unit, 10) || undefined,
        min: type === "number" ? num(f.min) : undefined,
        max: type === "number" || type === "text" ? num(f.max) : undefined,
        placeholder: s(f.placeholder, 40) || undefined,
        filter: type === "select" ? (filter ? "select" : undefined) : type === "number" ? (filter === "select" ? "range" : filter) : undefined,
      });
    }
    out.push({ key, name, nameHe: s(c.nameHe, 30), nameEn: s(c.nameEn, 30), icon: s(c.icon, 8) || "📦", enabled: c.enabled !== false, fields });
  }
  return out;
}
