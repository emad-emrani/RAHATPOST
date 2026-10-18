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
 *   APPLE_CLIENT_ID / APPLE_TEAM_ID / APPLE_KEY_ID / APPLE_PRIVATE_KEY  (Sign in with Apple)
 *   BETTER_AUTH_SECRET   (required on Vercel)
 *   BETTER_AUTH_URL      (optional; defaults to https://rahatpost.com on Vercel)
 *   DATABASE_URL         (Neon; local runs fall back to embedded PGLite)
 *
 * OAuth redirect URIs: `${baseURL}/api/auth/callback/google` and
 * `${baseURL}/api/auth/callback/facebook`, `${baseURL}/api/auth/callback/apple`.
 *
 * Local testing only: `RP_DEV_LOGIN=1` turns on email/password sign-in, and only
 * when not on Vercel and with no DATABASE_URL (i.e. the throwaway PGLite DB).
 *
 * NEVER import this from client code.
 */
import { oneTimeToken } from "better-auth/plugins/one-time-token";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import { ensureDbReady, getPglite } from "../db";
import { pgliteDialect } from "./pglite-dialect";
import { appleProvider } from "./apple.server";

const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const onVercel = Boolean(env("VERCEL"));
const databaseUrl = env("DATABASE_URL");

export const SITE_URL = "https://rahatpost.com";

const apple = appleProvider();

/** Which sign-in methods are live (safe to send to the browser). */
export const authProviders = {
  google: Boolean(env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET")),
  facebook: Boolean(env("FACEBOOK_CLIENT_ID") && env("FACEBOOK_CLIENT_SECRET")),
  apple: Boolean(apple),
  devLogin: !onVercel && !databaseUrl && env("RP_DEV_LOGIN") === "1",
  /** Email + password sign-up / sign-in (admin can switch it off). */
  email: true,
  /** "Forgot password" needs a mail sender (RESEND_API_KEY + STORE_EMAIL_FROM). */
  resetEmail: Boolean(env("RESEND_API_KEY") && env("STORE_EMAIL_FROM")),
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

// Apple posts the sign-in result back (response_mode=form_post) from appleid.apple.com.
const APPLE_ORIGIN = "https://appleid.apple.com";
// Preview deployments also accept their own URLs (email sign-in works there; OAuth still returns to the main site).
const previewOrigins =
  env("VERCEL_ENV") === "preview"
    ? [env("VERCEL_URL"), env("VERCEL_BRANCH_URL")].filter(Boolean).map((h) => `https://${h}`)
    : [];
const trustedOrigins = onVercel
  ? [explicitBaseURL ?? SITE_URL, "https://www.rahatpost.com", ...previewOrigins, ...(apple ? [APPLE_ORIGIN] : [])]
  : [
      ...(explicitBaseURL ? [explicitBaseURL] : []),
      ...LOCAL_ORIGINS,
      ...(apple ? [APPLE_ORIGIN] : []),
    ];

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
    ...(apple ? { apple } : {}),
  },
  account: {
    encryptOAuthTokens: true,
    // Same verified email from Google, Facebook and Apple = same person.
    accountLinking: { enabled: true, trustedProviders: ["google", "facebook", "apple"] },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    resetPasswordTokenExpiresIn: 3600,
    sendResetPassword: async ({ user, url }) => {
      const { sendMail } = await import("@/lib/store/email.server");
      await sendMail(
        user.email,
        "إعادة تعيين كلمة المرور · رهط بوست",
        `مرحباً ${user.name},\n\nلإعادة تعيين كلمة المرور افتح الرابط (صالح لساعة واحدة):\n${url}\n\nإن لم تطلب ذلك فتجاهل هذه الرسالة.`,
      );
    },
  },
  // Admin switches (أعضاء وتسجيل الدخول): refuse a disabled method on the server too.
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const path = ctx.path;
      if (!path.startsWith("/sign-in") && !path.startsWith("/sign-up") && !path.startsWith("/request-password-reset")) return;
      const { getAuthMethods } = await import("./settings.server");
      const m = await getAuthMethods();
      const emailPath = path === "/sign-in/email" || path === "/sign-up/email" || path === "/request-password-reset";
      if (emailPath && !m.email && !authProviders.devLogin) throw new APIError("FORBIDDEN", { message: "تسجيل الدخول بالبريد موقوف حالياً." });
      if (path === "/sign-in/social") {
        const provider = (ctx.body as { provider?: string } | undefined)?.provider;
        if ((provider === "google" && !m.google) || (provider === "facebook" && !m.facebook))
          throw new APIError("FORBIDDEN", { message: "طريقة الدخول هذه موقوفة حالياً." });
      }
    }),
  },
  // No cookieCache: sign-in then sets a single cookie (session_token). When a server
  // already set response headers (e.g. Vite's dev CORS middleware), Node's writeHead
  // keeps only the last of several Set-Cookie headers, which dropped the session.
  session: { cookieCache: { enabled: false } },
  // Store app (Capacitor): Google refuses sign-in inside an embedded WebView, so the app signs in
  // in the system browser and hands the session back with a short-lived, single-use token
  // (see src/lib/auth/native.ts and /app-auth/*).
  // Pending team invites (admin_invites) take effect as soon as that verified email signs in.
  databaseHooks: {
    // Someone could register a password account with another person's email before that person
    // ever signs in. When the real owner then signs in with Google/Facebook (verified email →
    // linked account), the password is dropped so only the owner can get in.
    account: {
      create: {
        after: async (account) => {
          if (account.providerId === "credential") return;
          const { getSql } = await import("../db");
          const sql = await getSql();
          // Password accounts are never email-verified here (no verification mail), so a password
          // can't be trusted once a provider with a verified email claims the same address.
          await sql.query(`delete from "account" where "userId" = $1 and "providerId" = 'credential'`, [account.userId]);
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const { isBlocked } = await import("./settings.server");
          if (await isBlocked(session.userId)) throw new APIError("FORBIDDEN", { message: "هذا الحساب موقوف. تواصل مع إدارة الموقع." });
        },
        after: async (session) => {
          const { applyInvite } = await import("@/lib/team/invites.server");
          await applyInvite(session.userId);
        },
      },
    },
  },
  plugins: [oneTimeToken({ expiresIn: 3, storeToken: "hashed" })],
});
