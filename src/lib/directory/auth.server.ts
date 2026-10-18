import { createHmac, timingSafeEqual } from "node:crypto";

/** Admin access: one shared password (ADMIN_PASSWORD env var) and an HMAC-signed session cookie. */
export const ADMIN_COOKIE = "rp_admin";
const SESSION_MS = 12 * 60 * 60_000;

/** Shortest ADMIN_PASSWORD accepted (shorter values disable admin login entirely). */
const MIN_PASSWORD_LENGTH = 8;

function secret(): string | null {
  const pw = process.env.ADMIN_PASSWORD?.trim();
  if (pw && pw.length >= MIN_PASSWORD_LENGTH) return pw;
  if (pw)
    console.error(
      `[admin] ADMIN_PASSWORD is shorter than ${MIN_PASSWORD_LENGTH} characters; admin login disabled`,
    );
  // Local preview only, so the admin page can be exercised without the real secret.
  return process.env.VERCEL ? null : "local-preview-admin";
}

function sign(value: string, key: string) {
  // Mix in the server secret (when set) so session cookies can't be forged by guessing a short
  // password; changing either value signs everyone out.
  const pepper = process.env.BETTER_AUTH_SECRET ?? "";
  return createHmac("sha256", `rp-admin:${key}:${pepper}`).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkPassword(input: string): boolean {
  const key = secret();
  if (!key) return false;
  return safeEqual(sign(input, key), sign(key, key));
}

export const REMEMBER_MS = 30 * 24 * 60 * 60_000;
export function issueSession(ms = SESSION_MS): string {
  const key = secret();
  if (!key) throw new Error("admin not configured");
  const exp = String(Date.now() + ms);
  return `${exp}.${sign(exp, key)}`;
}

export function verifySession(cookie: string | undefined): boolean {
  const key = secret();
  if (!key || !cookie) return false;
  const [exp, mac] = cookie.split(".");
  if (!exp || !mac || Number(exp) < Date.now()) return false;
  return safeEqual(mac, sign(exp, key));
}

export function sessionMaxAge() {
  return SESSION_MS / 1000;
}
