import { localizeTexts } from "./api";
import { getLang } from "./core";

type Group = { items: (object | null | undefined)[]; fields: string[] };

/**
 * Translate dynamic Arabic fields (news, products…) for the active language. Works on a copy,
 * waits at most ~2.5 s server-side and keeps the original text on any failure.
 */
export async function localized<T>(data: T, pick: (d: T) => Group[], kind: "site" | "auto" = "site"): Promise<T> {
  const lang = getLang();
  if (lang === "ar" || data == null) return data;
  const copy = structuredClone(data);
  const slots: { o: Record<string, unknown>; f: string }[] = [];
  for (const g of pick(copy))
    for (const it of g.items)
      if (it)
        for (const f of g.fields) {
          const v = (it as Record<string, unknown>)[f];
          if (typeof v === "string" && /[\u0600-\u06FF]/.test(v)) slots.push({ o: it as Record<string, unknown>, f });
        }
  if (!slots.length) return copy;
  try {
    const out = await Promise.race([
      localizeTexts({ data: { lang, texts: slots.map((s) => s.o[s.f] as string), kind } }),
      new Promise<null>((r) => setTimeout(() => r(null), 4_000)),
    ]);
    if (out) slots.forEach((s, i) => out[i] && (s.o[s.f] = out[i]));
  } catch {
    /* keep Arabic */
  }
  return copy;
}

type IsraelLike = { titleHe: string; summaryHe: string; titleAr?: string; summaryAr?: string };

/** Israel news: Hebrew shows the original Hebrew; other languages translate the Arabic version. */
export async function localizedIsrael<T>(data: T, items: (d: T) => (IsraelLike | null | undefined)[]): Promise<T> {
  const lang = getLang();
  if (lang === "ar" || data == null) return data;
  if (lang === "he") {
    const copy = structuredClone(data);
    for (const it of items(copy))
      if (it) {
        it.titleAr = it.titleHe;
        it.summaryAr = it.summaryHe;
      }
    return copy;
  }
  return localized(data, (d) => [{ items: items(d), fields: ["titleAr", "summaryAr"] }]);
}
