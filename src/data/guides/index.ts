import { healthGuide } from "./health";
import { municipalityGuide } from "./municipality";
import { postGuide } from "./post";
import { transportGuide } from "./transport";
import type { Guide } from "./types";

/** Structured local service guides for Rahat. Order = display order. */
export const guides: Guide[] = [postGuide, municipalityGuide, healthGuide, transportGuide];

export const getGuide = (slug: string): Guide | undefined => guides.find((g) => g.slug === slug);

export const guidesForPlace = (placeSlug: string): Guide[] =>
  guides.filter((g) => g.relatedPlaces?.includes(placeSlug));

export const guidePath = (g: Pick<Guide, "slug">) => `/directory/guide/${g.slug}`;

const MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

/** "2026-10-11" → "11 أكتوبر 2026" (no Intl dependency, same on server and client). */
export function formatCheckedAt(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export type { Guide } from "./types";
