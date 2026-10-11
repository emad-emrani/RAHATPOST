/**
 * Better Auth for rahatpost.com (server-only).
 *
 * The site is SELF-HOSTED on its own Vercel project, so there is no platform auth
 * broker: sign-in goes straight to Google / Facebook with our own OAuth apps.
 * Each provider is enabled only when both of its env vars are set, so the site
 * works with Google alone while Facebook is pending.
 *
 *   GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
 *   FACEBOOK_CLIENT_ID / FACEBOOK_CLIENT_SECRET
 *   BETTER_AUTH_SECRET   (required on Vercel)
 *   BETTER_AUTH_URL      (optional; defaults to https://rahatpost.com on Vercel)
 *   DATABASE_URL         (Neon; local runs fall back to embedded PGLite)
 *
 * OAuth redirect URIs: `${baseURL}/api/auth/callback/google` and
 * `${baseURL}/api/auth/callback/facebook`.
 *
 * Local testing only: `RP_DEV_LOGIN=1` turns on email/password sign-in, and only
 * when not on Vercel and with no DATABASE_URL (i.e. the throwaway PGLite DB).
 *
 * NEVER import this from client code.
 */
import { oneTimeToken } from "better-auth/plugins/one-time-token";
import { betterAuth } from "better-auth";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { ensureDbReady, getPglite } from "../db";
import { pgliteDialect } from "./pglite-dialect";

const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const onVercel = Boolean(env("VERCEL"));
const databaseUrl = env("DATABASE_URL");

export const SITE_URL = "https://rahatpost.com";

/** Which sign-in methods are live (safe to send to the browser). */
export const authProviders = {
  google: Boolean(env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET")),
  facebook: Boolean(env("FACEBOOK_CLIENT_ID") && env("FACEBOOK_CLIENT_SECRET")),
  devLogin: !onVercel && !databaseUrl && env("RP_DEV_LOGIN") === "1",
};

if (!databaseUrl) void ensureDbReady();

const LOCAL_ORIGINS = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:8081",
  "http://127.0.0.1:8081",
];

const explicitBaseURL = env("BETTER_AUTH_URL");
const baseURL =
  explicitBaseURL ??
  (onVercel
    ? SITE_URL
    : {
        allowedHosts: ["localhost:8080", "127.0.0.1:8080", "localhost:8081", "127.0.0.1:8081"],
        protocol: "http" as const,
        fallback: "http://localhost:8080",
      });

const trustedOrigins = onVercel
  ? [explicitBaseURL ?? SITE_URL, "https://www.rahatpost.com"]
  : [...(explicitBaseURL ? [explicitBaseURL] : []), ...LOCAL_ORIGINS];

const globalRef = globalThis as typeof globalThis & { __rpLocalAuthSecret__?: string };
function secret(): string {
  const configured = env("BETTER_AUTH_SECRET");
  if (configured) return configured;
  if (onVercel) throw new Error("BETTER_AUTH_SECRET is not set");
  // Local only: per-process secret (local PGLite sessions die with the process anyway).
  globalRef.__rpLocalAuthSecret__ ??= randomBytes(32).toString("hex");
  return globalRef.__rpLocalAuthSecret__;
}

const database = databaseUrl
  ? new Pool({ connectionString: databaseUrl, max: 3 })
  : { dialect: pgliteDialect(() => getPglite()), type: "postgres" as const };

export const auth = betterAuth({
  appName: "رهط بوست",
  baseURL,
  secret: secret(),
  database,
  trustedOrigins,
  socialProviders: {
    ...(authProviders.google
      ? {
          google: {
            clientId: env("GOOGLE_CLIENT_ID") as string,
            clientSecret: env("GOOGLE_CLIENT_SECRET") as string,
            prompt: "select_account" as const,
          },
        }
      : {}),
    ...(authProviders.facebook
      ? {
          facebook: {
            clientId: env("FACEBOOK_CLIENT_ID") as string,
            clientSecret: env("FACEBOOK_CLIENT_SECRET") as string,
          },
        }
      : {}),
  },
  account: {
    encryptOAuthTokens: true,
    // Same verified email from Google and Facebook = same person.
    accountLinking: { enabled: true, trustedProviders: ["google", "facebook"] },
  },
  ...(authProviders.devLogin ? { emailAndPassword: { enabled: true } } : {}),
  // No cookieCache: sign-in then sets a single cookie (session_token). When a server
  // already set response headers (e.g. Vite's dev CORS middleware), Node's writeHead
  // keeps only the last of several Set-Cookie headers, which dropped the session.
  session: { cookieCache: { enabled: false } },
  // Store app (Capacitor): Google refuses sign-in inside an embedded WebView, so the app signs in
  // in the system browser and hands the session back with a short-lived, single-use token
  // (see src/lib/auth/native.ts and /app-auth/*).
  plugins: [oneTimeToken({ expiresIn: 3, storeToken: "hashed" })],
});
