/**
 * Shared protections for everything signed-in users submit (ads, reader news, businesses):
 * input cleaning, the honeypot + minimum-time bot check, per-user/per-IP rate limits and
 * Arabic error messages. Server-only at runtime (rate limiting reads the request IP).
 */

export const PHONE_RE = /^(0\d{8,9}|\+972\d{8,9})$/;

/** Strip tags/control chars and collapse whitespace (keeps paragraph breaks when multiline). */
export function clean(v: unknown, max: number, multiline = false): string {
  let s = String(v ?? "").replace(/[<>]/g, " ");
  s = multiline
    ? s
        .replace(/\r\n?/g, "\n")
        .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ")
        .replace(/[ \t]+/g, " ")
        .replace(/ *\n */g, "\n")
        .replace(/\n{3,}/g, "\n\n")
    : s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ");
  return s.trim().slice(0, max);
}

export function cleanPhone(v: unknown): string {
  return clean(v, 20).replace(/[\s-]/g, "");
}

/** Filled honeypot or impossibly fast submit → treat as a bot (callers pretend success). */
export function looksLikeBot(input: { website?: unknown; startedAt?: unknown }): boolean {
  return Boolean(input?.website) || Date.now() - (Number(input?.startedAt) || 0) < 3000;
}

export const friendly = (error: unknown, fallback: string) =>
  error instanceof Error && /[\u0600-\u06ff]/.test(error.message) ? error.message : fallback;

const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60_000;
const MAX_PER_USER = 3; // creates + edits per kind per user per 10 minutes
const MAX_PER_IP = 10; // shared mobile / household IPs

/** Records the attempt and reports whether this user or IP is over the limit for `kind`. */
export async function rateLimited(kind: string, userId: string): Promise<boolean> {
  const { getRequestIP } = await import("@tanstack/react-start/server");
  const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
  const now = Date.now();
  let limited = false;
  for (const [key, max] of [
    [`${kind}:u:${userId}`, MAX_PER_USER],
    [`${kind}:ip:${ip}`, MAX_PER_IP],
  ] as const) {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= max) limited = true;
    recent.push(now);
    hits.set(key, recent);
  }
  if (hits.size > 5000) hits.clear();
  return limited;
}

/** Same-site http(s) URL check for an optional "source" link. Returns "" when empty. */
export function cleanUrl(v: unknown): string {
  const s = String(v ?? "")
    .trim()
    .slice(0, 500);
  if (!s) return "";
  try {
    const url = new URL(s);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    return url.toString();
  } catch {
    throw new Error("رابط المصدر غير صحيح (يبدأ بـ https://).");
  }
}
