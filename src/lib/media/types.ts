/** Shared (client + server) limits and helpers for user-uploaded photos. */

export const MEDIA_KEY_RE = /^[a-f0-9]{32}\.(webp|jpg)$/;
export const MAX_MEDIA_BYTES = 3 * 1024 * 1024;
export const MAX_MEDIA_SIDE = 2048;
export const MAX_AD_PHOTOS = 6;
export const MAX_BUSINESS_PHOTOS = 1;

export type MediaKind = "ad" | "business";

/** Public path of a stored photo (served by src/routes/media.$key.ts). */
export const mediaUrl = (key: string) => `/media/${key}`;

/** Keep only well-formed, unique keys, at most `max`. */
export function cleanMediaKeys(input: unknown, max: number): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const k of input) {
    const key = String(k ?? "");
    if (MEDIA_KEY_RE.test(key) && !out.includes(key)) out.push(key);
    if (out.length >= max) break;
  }
  return out;
}
