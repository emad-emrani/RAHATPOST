import { createFileRoute, Link } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import logoUrl from "@/assets/logo.jpg";
import { LangSwitcher } from "@/components/lang-switcher";
import type { AuthConfig } from "@/components/sign-in";
import { getAuthConfig } from "@/lib/auth/api";
import { authClient, signInWith, type SocialProvider } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { adminLogin } from "@/lib/directory/api";
import { tr, trv } from "@/lib/i18n/core";
import { mediaUrl } from "@/lib/media/types";
import { useSiteSettings } from "@/lib/site-settings/context";

/** Only same-site relative paths are allowed as the post-login destination (defaults to "/"). */
function safeRedirect(value: unknown): string {
  const s = typeof value === "string" ? value : "";
  if (!s || s === "/my-posts") return "/";
  return /^\/(?!\/)[^\s\\]*$/.test(s) && !s.startsWith("/api/") ? s : "/";
}

function encodeLoginRpc(obj: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(obj ?? {}));
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

async function callLoginRpc<T = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(`/login?_rpc=${Date.now()}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "x-rp-login-action": action,
      "x-rp-login-payload": encodeLoginRpc(payload),
      accept: "application/json",
    },
  });
  return (await res.json()) as T;
}

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: tr("تسجيل الدخول · رهط بوست") },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (
    search: Record<string, unknown>,
  ): { redirect?: string; error?: string; mode?: string } => ({
    redirect:
      typeof search.redirect === "string"
        ? search.redirect.slice(0, 200)
        : undefined,
    error: search.error ? "1" : undefined,
    mode: typeof search.mode === "string" ? search.mode : undefined,
  }),
  loader: () => getAuthConfig(),
  server: {
    middleware: [
      createMiddleware().server(async ({ next }) => {
        try {
          const { getRequest, setCookie } = await import("@tanstack/react-start/server");
          const req = getRequest();
          const rpcAction = req?.headers?.get("x-rp-login-action");
          if (rpcAction && req) {
            const rawPayload = req.headers.get("x-rp-login-payload") ?? "";
            const data = rawPayload
              ? (JSON.parse(Buffer.from(rawPayload, "base64").toString("utf8")) as Record<string, unknown>)
              : {};

            const { getSql } = await import("@/lib/db");
            const sql = await getSql();
            await sql.query(
              `create table if not exists auth_settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now())`,
            );

            const hashBetterAuthPassword = async (plain: string): Promise<string> => {
              try {
                const { auth } = await import("@/lib/auth/server");
                const ctx = await auth.$context;
                if (ctx?.password?.hash) return await ctx.password.hash(plain);
              } catch {
                /* fallback */
              }
              const cryptoMod = (await import("better-auth/crypto")) as {
                hashPassword?: (p: string) => Promise<string>;
              };
              if (cryptoMod.hashPassword) return await cryptoMod.hashPassword(plain);
              throw new Error("تعذّر تشفير الرقم السري.");
            };

            const verifyBetterAuthPassword = async (hash: string, plain: string): Promise<boolean> => {
              try {
                const { auth } = await import("@/lib/auth/server");
                const ctx = await auth.$context;
                if (ctx?.password?.verify) return await ctx.password.verify({ hash, password: plain });
              } catch {
                /* fallback */
              }
              try {
                const cryptoMod = (await import("better-auth/crypto")) as {
                  verifyPassword?: (args: { hash: string; password: string }) => Promise<boolean>;
                };
                if (cryptoMod.verifyPassword) return await cryptoMod.verifyPassword({ hash, password: plain });
              } catch {
                /* ignore */
              }
              return false;
            };

            let rpcRes: Record<string, unknown> = { ok: false, message: "طلب غير معروف." };
            let cookieHeaderToSet = "";

            if (rpcAction === "owner-login") {
              const password = String(data.password ?? "").trim();
              const remember = Boolean(data.remember);
              const { ADMIN_COOKIE, checkPassword, issueSession, REMEMBER_MS } = await import(
                "@/lib/directory/auth.server"
              );
              const { masterEmails } = await import("@/lib/admin-auth");
              const { randomBytes } = await import("node:crypto");
              const mEmail = (masterEmails()[0] || "amad.wwf@gmail.com").toLowerCase();

              const rows = await sql.query<{ value: unknown }>(
                `select value from auth_settings where key = 'owner_password' limit 1`,
              );
              const rawVal = rows[0]?.value;
              const savedObj = (typeof rawVal === "string" ? JSON.parse(rawVal) : rawVal) as
                | { password?: string }
                | undefined;
              const savedCustomPw = savedObj?.password?.trim();

              let matched = false;
              if (savedCustomPw) {
                matched = password === savedCustomPw;
              } else if (checkPassword(password)) {
                matched = true;
              } else {
                const masterAcc = await sql.query<{ password: string | null }>(
                  `select a."password" from "account" a join "user" u on u."id" = a."userId"
                   where lower(u."email") = $1 and a."providerId" = 'credential' limit 1`,
                  [mEmail],
                );
                if (masterAcc[0]?.password) {
                  matched = await verifyBetterAuthPassword(masterAcc[0].password, password);
                }
              }

              if (!matched) {
                rpcRes = { ok: false, message: "كلمة مرور الإدارة غير صحيحة." };
              } else {
                const hashed = await hashBetterAuthPassword(password);
                const existingUser = await sql.query<{ id: string }>(
                  `select "id" from "user" where lower("email") = $1 limit 1`,
                  [mEmail],
                );
                let uid = existingUser[0]?.id;
                if (!uid) {
                  uid = randomBytes(16).toString("hex");
                  await sql.query(
                    `insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
                     values ($1, $2, $3, true, now(), now())`,
                    [uid, "إدارة رهط بوست", mEmail],
                  );
                } else {
                  await sql.query(
                    `update "user" set "emailVerified" = true, "updatedAt" = now() where "id" = $1`,
                    [uid],
                  );
                }
                const existingAcc = await sql.query<{ id: string }>(
                  `select "id" from "account" where "userId" = $1 and "providerId" = 'credential' limit 1`,
                  [uid],
                );
                if (existingAcc[0]?.id) {
                  await sql.query(
                    `update "account" set "password" = $1, "updatedAt" = now() where "id" = $2`,
                    [hashed, existingAcc[0].id],
                  );
                } else {
                  const accId = randomBytes(16).toString("hex");
                  await sql.query(
                    `insert into "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
                     values ($1, $2, 'credential', $2, $3, now(), now())`,
                    [accId, uid, hashed],
                  );
                }
                try {
                  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.trim().length < 8) {
                    process.env.ADMIN_PASSWORD =
                      (process.env.BETTER_AUTH_SECRET || "rahatpost-owner-secret-key").slice(0, 32);
                  }
                  const tok = remember ? issueSession(REMEMBER_MS) : issueSession();
                  setCookie(ADMIN_COOKIE, tok, {
                    httpOnly: true,
                    secure: Boolean(process.env.VERCEL),
                    sameSite: "strict",
                    path: "/",
                    ...(remember ? { maxAge: REMEMBER_MS / 1000 } : {}),
                  });
                  const maxAgePart = remember ? `; Max-Age=${Math.floor(REMEMBER_MS / 1000)}` : "";
                  const securePart = process.env.VERCEL ? "; Secure" : "";
                  cookieHeaderToSet = `${ADMIN_COOKIE}=${tok}; Path=/; HttpOnly; SameSite=Strict${securePart}${maxAgePart}`;
                } catch {
                  /* ignore */
                }
                rpcRes = { ok: true, masterEmail: mEmail };
              }
            } else if (rpcAction === "self-change-password") {
              const email = String(data.email ?? "").trim().toLowerCase();
              const currentPassword = String(data.currentPassword ?? "");
              const newPassword = String(data.newPassword ?? "").trim();
              if (!email || !currentPassword || newPassword.length < 8) {
                rpcRes = {
                  ok: false,
                  message: "تحقق من إدخال البريد الإلكتروني والرقم السري الحالي والجديد (8 أحرف على الأقل).",
                };
              } else {
                const rows = await sql.query<{ userId: string; accId: string; password: string | null }>(
                  `select u."id" as "userId", a."id" as "accId", a."password"
                   from "user" u
                   join "account" a on a."userId" = u."id" and a."providerId" = 'credential'
                   where lower(u."email") = $1 limit 1`,
                  [email],
                );
                const row = rows[0];
                if (!row || !row.password) {
                  rpcRes = { ok: false, message: "البريد الإلكتروني أو الرقم السري الحالي غير صحيح." };
                } else {
                  const okCurrent = await verifyBetterAuthPassword(row.password, currentPassword);
                  if (!okCurrent) {
                    rpcRes = { ok: false, message: "الرقم السري الحالي غير صحيح." };
                  } else {
                    const newHash = await hashBetterAuthPassword(newPassword);
                    await sql.query(
                      `update "account" set "password" = $1, "updatedAt" = now() where "id" = $2`,
                      [newHash, row.accId],
                    );
                    rpcRes = {
                      ok: true,
                      message: "تم تغيير الرقم السري بنجاح! يمكنك الآن تسجيل الدخول بالرقم السري الجديد.",
                    };
                  }
                }
              }
            }

            const result = await next();
            const headers = new Headers((result as { response?: Response }).response?.headers);
            headers.set("content-type", "application/json; charset=utf-8");
            headers.set("cache-control", "no-store");
            if (cookieHeaderToSet) {
              headers.append("set-cookie", cookieHeaderToSet);
            }
            return {
              ...result,
              response: new Response(JSON.stringify(rpcRes), { status: 200, headers }),
            } as typeof result;
          }
        } catch (err) {
          console.error("[login-rpc] error", err);
        }
        return next();
      }),
    ],
  },
  component: LoginPage,
});

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z"
      />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12Z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill="currentColor">
      <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.5 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4a10 10 0 0 0 1.4-2.8 4.3 4.3 0 0 1-2.1-4.2ZM13.9 5a4.4 4.4 0 0 0 1-3.2 4.5 4.5 0 0 0-2.9 1.5 4.2 4.2 0 0 0-1 3.1A3.7 3.7 0 0 0 13.9 5Z" />
    </svg>
  );
}

function friendlyAuthError(
  code?: string,
  fallback = tr("تعذّر تسجيل الدخول. حاول مرة أخرى."),
) {
  if (!code) return fallback;
  if (/INVALID_EMAIL_OR_PASSWORD|INVALID_PASSWORD|CREDENTIAL/i.test(code))
    return tr("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
  if (/USER_ALREADY_EXISTS|ALREADY_EXIST/i.test(code))
    return tr(
      "هذا البريد مسجّل بالفعل. سجّل الدخول من قسم تسجيل الدخول أو عبر Google / Facebook.",
    );
  if (/PASSWORD_TOO_SHORT/i.test(code))
    return tr("كلمة المرور قصيرة (8 أحرف على الأقل).");
  if (/موقوف/.test(code)) return code;
  return fallback;
}

function SocialCircleButtons({
  config,
  busyProvider,
  onSocialClick,
  label,
}: {
  config: AuthConfig;
  busyProvider: string;
  onSocialClick: (provider: SocialProvider) => void;
  label: string;
}) {
  return (
    <div className="mt-4 flex flex-col items-center gap-3">
      <div className="flex w-full items-center gap-2 text-xs font-bold text-muted">
        <span className="h-px flex-1 bg-line" />
        <span>{label}</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => onSocialClick("google")}
          disabled={Boolean(busyProvider)}
          title={tr("المتابعة باستخدام Google")}
          aria-label={tr("المتابعة باستخدام Google")}
          className="flex size-11 items-center justify-center rounded-full border border-line bg-surface/80 text-ink shadow-xs transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary/15 disabled:opacity-50"
        >
          <GoogleMark />
        </button>
        <button
          type="button"
          onClick={() => onSocialClick("facebook")}
          disabled={Boolean(busyProvider)}
          title={tr("المتابعة باستخدام Facebook")}
          aria-label={tr("المتابعة باستخدام Facebook")}
          className="flex size-11 items-center justify-center rounded-full border border-line bg-surface/80 text-ink shadow-xs transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary/15 disabled:opacity-50"
        >
          <FacebookMark />
        </button>
        {config.apple ? (
          <button
            type="button"
            onClick={() => onSocialClick("apple")}
            disabled={Boolean(busyProvider)}
            title={tr("المتابعة باستخدام Apple")}
            aria-label={tr("المتابعة باستخدام Apple")}
            className="flex size-11 items-center justify-center rounded-full border border-ink bg-ink text-paper shadow-xs transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
          >
            <AppleMark />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function LoginPage() {
  const config = Route.useLoaderData();
  const search = Route.useSearch();
  const redirect = safeRedirect(search.redirect);
  const { user, isPending } = useCurrentUserState();
  const st = useSiteSettings();

  const isAdminRedirect = redirect.startsWith("/admin");

  const [activeSide, setActiveSide] = useState<"in" | "up" | "forgot">(
    search.mode === "register" || search.mode === "up" ? "up" : "in",
  );
  const [busySocial, setBusySocial] = useState<string>("");
  const [busyIn, setBusyIn] = useState(false);
  const [busyUp, setBusyUp] = useState(false);
  const [busyForgot, setBusyForgot] = useState(false);
  const [busyOwner, setBusyOwner] = useState(false);

  const [loginError, setLoginError] = useState(
    search.error ? tr("لم يكتمل تسجيل الدخول. حاول مرة أخرى.") : "",
  );
  const [registerError, setRegisterError] = useState("");
  const [ownerError, setOwnerError] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotOk, setForgotOk] = useState("");

  const [showLoginPass, setShowLoginPass] = useState(false);
  const [showRegPass, setShowRegPass] = useState(false);
  const [showOwnerPass, setShowOwnerPass] = useState(false);

  const loginInputRef = useRef<HTMLInputElement>(null);
  const registerInputRef = useRef<HTMLInputElement>(null);
  const ownerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isPending && user && !isAdminRedirect && typeof window !== "undefined") {
      window.location.replace(redirect);
    }
  }, [isPending, user, isAdminRedirect, redirect]);

  const handleSocial = async (provider: SocialProvider) => {
    setBusySocial(provider);
    setLoginError("");
    setRegisterError("");
    try {
      await signInWith(provider, redirect);
    } catch {
      const errText = tr("تعذّر بدء تسجيل الدخول عبر المنصة. حاول مرة أخرى.");
      setLoginError(errText);
      setRegisterError(errText);
      setBusySocial("");
    }
  };

  const focusPanel = (panel: "in" | "up") => {
    setActiveSide(panel);
    setLoginError("");
    setRegisterError("");
    setOwnerError("");
    setTimeout(() => {
      if (panel === "in") loginInputRef.current?.focus();
      else if (isAdminRedirect) ownerInputRef.current?.focus();
      else registerInputRef.current?.focus();
    }, 80);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface text-ink">
      {/* Split Two-Tone Brand Background inspired by reference image while preserving Rahat Post colors */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute inset-y-0 right-0 w-full bg-gradient-to-b from-primary/35 via-primary/15 to-surface lg:w-1/2 lg:bg-primary" />
        <div className="hidden lg:block lg:absolute lg:inset-y-0 lg:left-0 lg:w-1/2 lg:bg-[#e8eaee]" />
        <div className="absolute -top-28 -right-28 size-96 rounded-full bg-primary/40 blur-3xl lg:bg-paper/20" />
        <div className="absolute -bottom-28 -left-28 size-96 rounded-full bg-primary/25 blur-3xl" />
      </div>

      {/* Top Navigation Bar */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 pt-5 pb-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full bg-paper/90 px-4 py-2 text-sm font-extrabold text-ink shadow-sm ring-1 ring-line backdrop-blur transition hover:bg-paper"
        >
          <ArrowRight className="size-4 ltr:rotate-180" aria-hidden />
          {tr("العودة للموقع")}
        </Link>

        <div className="flex items-center gap-2">
          <LangSwitcher />
        </div>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-6xl flex-col items-center justify-center px-4 py-6">
        {!isPending && user && !isAdminRedirect ? (
          /* Already Signed In Card */
          <div className="w-full max-w-md rounded-[2rem] bg-paper p-8 text-center shadow-[0_20px_60px_rgba(16,24,40,0.12)] ring-1 ring-line">
            <img
              src={st.logoKey ? mediaUrl(st.logoKey) : logoUrl}
              alt=""
              width={76}
              height={76}
              className="mx-auto size-[76px] rounded-3xl bg-paper object-cover shadow-md ring-4 ring-primary/40"
            />
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-extrabold text-emerald-700">
              <CheckCircle2 className="size-4" />
              {tr("متصل الآن")}
            </div>
            <h1 className="mt-3 text-2xl font-extrabold">
              {tr("أهلاً بعودتك")}
            </h1>
            <p className="mt-1 text-sm font-bold text-muted">
              {tr("أنت مسجّل الدخول باسم")}{" "}
              <span className="text-ink">{trv(user.displayName)}</span>
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                to="/"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-extrabold text-ink shadow-sm transition hover:brightness-95"
              >
                {tr("الذهاب إلى الصفحة الرئيسية")}
              </Link>
              <Link
                to="/my-posts"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-surface px-5 py-3 text-sm font-bold text-ink transition hover:bg-line/60"
              >
                {tr("منشوراتي")}
              </Link>
            </div>
          </div>
        ) : (
          /* Main Split Login / Welcome / Registration (or Owner Admin Login) Card */
          <div className="w-full max-w-5xl overflow-hidden rounded-[2.25rem] bg-paper shadow-[0_24px_70px_rgba(16,24,40,0.14)] ring-1 ring-black/5">
            {/* Mobile Top Switcher Banner (shown on < lg screens) */}
            <div className="bg-primary px-5 py-5 text-ink lg:hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={st.logoKey ? mediaUrl(st.logoKey) : logoUrl}
                    alt=""
                    width={52}
                    height={52}
                    className="size-[52px] rounded-2xl bg-paper object-cover shadow-md ring-2 ring-paper/70"
                  />
                  <div>
                    <p className="text-xs font-extrabold opacity-80">
                      {trv(st.texts.siteName)}
                    </p>
                    <h1 className="text-lg font-extrabold">
                      {isAdminRedirect
                        ? tr("بوابة لوحة التحكم")
                        : tr("أهلاً وسهلاً بك!")}
                    </h1>
                  </div>
                </div>
                <div className="flex rounded-full bg-ink/10 p-1">
                  <button
                    type="button"
                    onClick={() => focusPanel("in")}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                      activeSide !== "up"
                        ? "bg-ink text-paper shadow-xs"
                        : "text-ink hover:bg-ink/10"
                    }`}
                  >
                    {isAdminRedirect ? tr("دخول الفريق") : tr("تسجيل الدخول")}
                  </button>
                  <button
                    type="button"
                    onClick={() => focusPanel("up")}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                      activeSide === "up"
                        ? "bg-ink text-paper shadow-xs"
                        : "text-ink hover:bg-ink/10"
                    }`}
                  >
                    {isAdminRedirect ? tr("دخول المالك") : tr("إنشاء حساب")}
                  </button>
                </div>
              </div>
            </div>

            {/* 3-Column Desktop Layout: [Login Panel] | [Center Welcome Strip] | [Registration / Owner Panel] */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_250px_1fr]">
              {/* ==================== COLUMN 1: LOGIN / FORGOT PASSWORD ==================== */}
              <section
                aria-label={tr("تسجيل الدخول")}
                className={`flex flex-col justify-between p-6 sm:p-8 lg:p-9 transition-opacity ${
                  activeSide === "up" ? "hidden lg:flex lg:opacity-95" : "flex"
                }`}
              >
                {activeSide === "forgot" ? (
                  /* Change or Reset Password Sub-view */
                  <div className="my-auto flex flex-col">
                    <div className="mb-5 text-center">
                      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/20 text-ink">
                        <KeyRound className="size-6" />
                      </div>
                      <h2 className="text-2xl font-extrabold">
                        {tr("تغيير أو استعادة الرقم السري")}
                      </h2>
                      <p className="mt-1 text-xs font-semibold text-muted">
                        {tr(
                          "أدخل بريدك الإلكتروني والرقم السري الحالي لتعيين رقم سري جديد فوراً، أو اطلب من إدارة الموقع تغييره لك من لوحة التحكم.",
                        )}
                      </p>
                    </div>

                    <form
                      className="flex flex-col gap-3"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        setForgotMsg("");
                        setForgotOk("");
                        const f = new FormData(e.currentTarget);
                        const email = String(f.get("email") ?? "").trim();
                        const currentPassword = String(f.get("currentPassword") ?? "");
                        const newPassword = String(f.get("newPassword") ?? "").trim();
                        setBusyForgot(true);
                        try {
                          if (currentPassword && newPassword) {
                            const rpc = await callLoginRpc<{
                              ok: boolean;
                              message?: string;
                            }>("self-change-password", {
                              email,
                              currentPassword,
                              newPassword,
                            });
                            if (rpc.ok) {
                              setForgotOk(
                                rpc.message ??
                                  tr("تم تغيير الرقم السري بنجاح! يمكنك تسجيل الدخول الآن."),
                              );
                            } else {
                              setForgotMsg(
                                rpc.message ?? tr("تعذّر تغيير الرقم السري."),
                              );
                            }
                            return;
                          }
                          const res = await authClient.requestPasswordReset({
                            email,
                            redirectTo: "/reset-password",
                          });
                          if (res.error) {
                            setForgotMsg(
                              friendlyAuthError(
                                res.error.message,
                                tr("تعذّر إرسال الرابط. يمكنك التواصل مع إدارة الموقع لتغيير الرقم السري مباشرة."),
                              ),
                            );
                          } else {
                            setForgotOk(
                              tr(
                                "إن كان البريد مسجّلاً فستصلك رسالة فيها رابط لتعيين كلمة مرور جديدة.",
                              ),
                            );
                          }
                        } catch {
                          setForgotMsg(tr("تعذّر الاتصال. حاول مرة أخرى."));
                        } finally {
                          setBusyForgot(false);
                        }
                      }}
                    >
                      <label className="group flex items-center gap-3 rounded-2xl border border-transparent bg-surface px-4 py-3 transition focus-within:border-primary focus-within:bg-paper focus-within:shadow-xs">
                        <Mail className="size-5 shrink-0 text-muted transition group-focus-within:text-ink" />
                        <input
                          name="email"
                          type="email"
                          required
                          dir="ltr"
                          autoComplete="email"
                          placeholder={tr("البريد الإلكتروني")}
                          className="w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-muted"
                        />
                      </label>

                      <label className="group flex items-center gap-3 rounded-2xl border border-transparent bg-surface px-4 py-3 transition focus-within:border-primary focus-within:bg-paper focus-within:shadow-xs">
                        <Lock className="size-5 shrink-0 text-muted transition group-focus-within:text-ink" />
                        <input
                          name="currentPassword"
                          type={showLoginPass ? "text" : "password"}
                          dir="ltr"
                          autoComplete="current-password"
                          placeholder={tr("الرقم السري الحالي (لتغييره مباشرة)")}
                          className="w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-muted"
                        />
                      </label>

                      <label className="group flex items-center gap-3 rounded-2xl border border-transparent bg-surface px-4 py-3 transition focus-within:border-primary focus-within:bg-paper focus-within:shadow-xs">
                        <KeyRound className="size-5 shrink-0 text-muted transition group-focus-within:text-ink" />
                        <input
                          name="newPassword"
                          type={showLoginPass ? "text" : "password"}
                          minLength={8}
                          dir="ltr"
                          autoComplete="new-password"
                          placeholder={tr("الرقم السري الجديد (8 أحرف على الأقل)")}
                          className="w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-muted"
                        />
                      </label>

                      {forgotMsg ? (
                        <p
                          role="alert"
                          className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
                        >
                          {forgotMsg}
                        </p>
                      ) : null}
                      {forgotOk ? (
                        <p
                          role="status"
                          className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800"
                        >
                          {forgotOk}
                        </p>
                      ) : null}

                      <button
                        type="submit"
                        disabled={busyForgot}
                        className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-extrabold text-ink shadow-sm transition hover:brightness-95 disabled:opacity-50"
                      >
                        {busyForgot
                          ? tr("جاري الحفظ…")
                          : tr("حفظ الرقم السري الجديد / استعادة")}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveSide("in");
                          setForgotMsg("");
                          setForgotOk("");
                        }}
                        className="mt-1 text-center text-xs font-extrabold text-muted underline hover:text-ink"
                      >
                        {tr("رجوع لتسجيل الدخول")}
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Standard Login View */
                  <div className="my-auto flex flex-col">
                    <div className="mb-6 text-center">
                      <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                        {isAdminRedirect
                          ? tr("دخول فريق الإدارة")
                          : tr("تسجيل الدخول")}
                      </h2>
                      <p className="mt-1.5 text-xs font-semibold text-muted">
                        {isAdminRedirect
                          ? tr("لأعضاء الفريق (مشرف / محرر) بحساباتهم المعتمدة")
                          : tr("ادخل ببيانات حسابك لمتابعة أخبار وإعلانات رهط بوست")}
                      </p>
                    </div>

                    <form
                      className="flex flex-col gap-3.5"
                      method="post"
                      action="/login"
                      autoComplete="on"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        setLoginError("");
                        const f = new FormData(event.currentTarget);
                        const email = String(f.get("email") ?? "").trim();
                        const password = String(f.get("password") ?? "");
                        const rememberMe = f.get("remember") === "on";
                        setBusyIn(true);
                        try {
                          const res = await authClient.signIn.email({
                            email,
                            password,
                            rememberMe,
                          });
                          if (res.error) {
                            setLoginError(
                              friendlyAuthError(
                                res.error.code ?? res.error.message,
                              ),
                            );
                            return;
                          }
                          window.location.replace(redirect);
                        } catch {
                          setLoginError(tr("تعذّر الاتصال. حاول مرة أخرى."));
                        } finally {
                          setBusyIn(false);
                        }
                      }}
                    >
                      {/* Email Input Pill */}
                      <label className="group flex items-center gap-3 rounded-2xl border border-transparent bg-surface px-4 py-3.5 transition focus-within:border-primary focus-within:bg-paper focus-within:shadow-xs">
                        <User className="size-5 shrink-0 text-muted transition group-focus-within:text-ink" />
                        <input
                          ref={loginInputRef}
                          name="email"
                          type="email"
                          required
                          autoComplete="username"
                          dir="ltr"
                          placeholder={tr("البريد الإلكتروني")}
                          aria-label={tr("البريد الإلكتروني")}
                          onFocus={() => setActiveSide("in")}
                          className="w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-muted"
                        />
                      </label>

                      {/* Password Input Pill */}
                      <label className="group flex items-center gap-3 rounded-2xl border border-transparent bg-surface px-4 py-3.5 transition focus-within:border-primary focus-within:bg-paper focus-within:shadow-xs">
                        <Lock className="size-5 shrink-0 text-muted transition group-focus-within:text-ink" />
                        <input
                          name="password"
                          type={showLoginPass ? "text" : "password"}
                          required
                          minLength={8}
                          maxLength={128}
                          autoComplete="current-password"
                          dir="ltr"
                          placeholder={tr("كلمة المرور")}
                          aria-label={tr("كلمة المرور")}
                          onFocus={() => setActiveSide("in")}
                          className="w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-muted"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowLoginPass((v) => !v)}
                          className="text-muted hover:text-ink"
                          aria-label={
                            showLoginPass
                              ? tr("إخفاء كلمة المرور")
                              : tr("إظهار كلمة المرور")
                          }
                        >
                          {showLoginPass ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </label>

                      {/* Remember Me & Forgot Password Row */}
                      <div className="flex items-center justify-between px-1 text-xs font-bold">
                        <label className="flex cursor-pointer items-center gap-2 text-muted hover:text-ink">
                          <input
                            type="checkbox"
                            name="remember"
                            defaultChecked
                            className="size-4 rounded accent-primary"
                          />
                          {tr("تذكرني")}
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            setActiveSide("forgot");
                            setLoginError("");
                          }}
                          className="text-muted underline decoration-line underline-offset-4 transition hover:text-ink"
                        >
                          {tr("نسيت أو تريد تغيير الرقم السري؟")}
                        </button>
                      </div>

                      {loginError ? (
                        <p
                          role="alert"
                          className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
                        >
                          {trv(loginError)}
                        </p>
                      ) : null}

                      {/* Primary Login Button */}
                      <button
                        type="submit"
                        disabled={busyIn || Boolean(busySocial)}
                        className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-extrabold text-ink shadow-sm transition hover:brightness-95 disabled:opacity-50"
                      >
                        <LogIn className="size-4" />
                        {busyIn ? tr("جاري الدخول…") : tr("تسجيل الدخول")}
                      </button>
                    </form>

                    {/* Social Login Row */}
                    <SocialCircleButtons
                      config={config}
                      busyProvider={busySocial}
                      onSocialClick={handleSocial}
                      label={tr("أو سجل الدخول عبر المنصات الاجتماعية")}
                    />

                    {/* Mobile Switch Prompt */}
                    <p className="mt-5 text-center text-xs font-bold text-muted lg:hidden">
                      {isAdminRedirect
                        ? tr("هل أنت مالك الموقع؟")
                        : tr("ليس لديك حساب بعد؟")}{" "}
                      <button
                        type="button"
                        onClick={() => focusPanel("up")}
                        className="font-extrabold text-ink underline"
                      >
                        {isAdminRedirect
                          ? tr("دخول المالك بكلمة المرور")
                          : tr("إنشاء حساب جديد")}
                      </button>
                    </p>
                  </div>
                )}
              </section>

              {/* ==================== COLUMN 2: CENTER BRAND WELCOME STRIP ==================== */}
              <aside className="relative hidden flex-col items-center justify-between overflow-hidden bg-primary px-6 py-10 text-center text-ink lg:flex">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-12 -left-12 size-36 rounded-full bg-paper/25"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute -bottom-14 -right-14 size-44 rounded-full bg-ink/5"
                />

                {/* Top Logo & Site Name */}
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <img
                    src={st.logoKey ? mediaUrl(st.logoKey) : logoUrl}
                    alt=""
                    width={68}
                    height={68}
                    className="size-[68px] rounded-3xl bg-paper object-cover shadow-md ring-4 ring-paper/70"
                  />
                  <span className="inline-flex items-center gap-1 rounded-full bg-ink/10 px-3 py-0.5 text-[11px] font-extrabold">
                    <Sparkles className="size-3" />
                    {trv(st.texts.siteName)}
                  </span>
                </div>

                {/* Middle Welcome Callouts */}
                <div className="relative z-10 my-6 flex w-full flex-col items-center gap-5">
                  <h2 className="text-2xl font-extrabold leading-tight">
                    {isAdminRedirect
                      ? tr("بوابة الإدارة")
                      : tr("أهلاً وسهلاً بك!")}
                  </h2>

                  <div className="flex w-full flex-col items-center gap-2">
                    <p className="text-xs font-bold opacity-85">
                      {isAdminRedirect
                        ? tr("دخول مالك الموقع المباشر")
                        : tr("ليس لديك حساب بعد؟")}
                    </p>
                    <button
                      type="button"
                      onClick={() => focusPanel("up")}
                      className={`w-full max-w-[165px] rounded-full border-2 border-ink px-5 py-2 text-xs font-extrabold transition ${
                        activeSide === "up"
                          ? "bg-ink text-paper shadow-sm"
                          : "bg-transparent text-ink hover:bg-ink hover:text-paper"
                      }`}
                    >
                      {isAdminRedirect ? tr("دخول المالك") : tr("إنشاء حساب")}
                    </button>
                  </div>

                  <div className="h-px w-12 bg-ink/20" />

                  <div className="flex w-full flex-col items-center gap-2">
                    <p className="text-xs font-bold opacity-85">
                      {isAdminRedirect
                        ? tr("للمشرفين والمحررين")
                        : tr("لديك حساب بالفعل؟")}
                    </p>
                    <button
                      type="button"
                      onClick={() => focusPanel("in")}
                      className={`w-full max-w-[165px] rounded-full border-2 border-ink px-5 py-2 text-xs font-extrabold transition ${
                        activeSide === "in"
                          ? "bg-ink text-paper shadow-sm"
                          : "bg-transparent text-ink hover:bg-ink hover:text-paper"
                      }`}
                    >
                      {isAdminRedirect ? tr("دخول الفريق") : tr("تسجيل الدخول")}
                    </button>
                  </div>
                </div>

                {/* Bottom Tagline */}
                <p className="relative z-10 text-[11px] font-bold opacity-75">
                  {tr("بوابتك للأخبار والإعلانات وخدمات المجتمع")}
                </p>
              </aside>

              {/* ==================== COLUMN 3: REGISTRATION OR OWNER ADMIN LOGIN ==================== */}
              {isAdminRedirect ? (
                <section
                  aria-label={tr("دخول مالك الموقع")}
                  className={`flex flex-col justify-between p-6 sm:p-8 lg:p-9 transition-opacity ${
                    activeSide !== "up"
                      ? "hidden lg:flex lg:opacity-95"
                      : "flex"
                  }`}
                >
                  <div className="my-auto flex flex-col">
                    <div className="mb-6 text-center">
                      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/25 text-ink">
                        <ShieldCheck className="size-6" />
                      </div>
                      <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                        {tr("دخول المالك")}
                      </h2>
                      <p className="mt-1.5 text-xs font-semibold text-muted">
                        {tr(
                          "أدخل كلمة مرور الإدارة الرئيسية للدخول المباشر إلى لوحة التحكم",
                        )}
                      </p>
                    </div>

                    <form
                      className="flex flex-col gap-3.5"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        setOwnerError("");
                        const fd = new FormData(event.currentTarget);
                        const password = String(fd.get("password") ?? "");
                        const remember = fd.get("remember") === "on";
                        setBusyOwner(true);
                        try {
                          const rpc = await callLoginRpc<{
                            ok: boolean;
                            message?: string;
                            masterEmail?: string;
                          }>("owner-login", { password, remember });
                          if (rpc.ok) {
                            if (rpc.masterEmail) {
                              try {
                                await authClient.signIn.email({
                                  email: rpc.masterEmail,
                                  password,
                                  rememberMe: remember,
                                });
                              } catch {
                                /* cookie auth set */
                              }
                            }
                            window.location.replace("/admin");
                            return;
                          }
                          const res = await adminLogin({
                            data: { password, remember },
                          });
                          if (res.ok) {
                            window.location.replace("/admin");
                          } else {
                            setOwnerError(
                              rpc.message ?? res.message ?? tr("كلمة مرور الإدارة غير صحيحة."),
                            );
                          }
                        } catch {
                          setOwnerError(tr("تعذّر الاتصال. حاول مرة أخرى."));
                        } finally {
                          setBusyOwner(false);
                        }
                      }}
                    >
                      <input
                        type="text"
                        name="username"
                        value="admin"
                        autoComplete="username"
                        readOnly
                        hidden
                      />
                      <label className="group flex items-center gap-3 rounded-2xl border border-transparent bg-surface px-4 py-3.5 transition focus-within:border-primary focus-within:bg-paper focus-within:shadow-xs">
                        <Lock className="size-5 shrink-0 text-muted transition group-focus-within:text-ink" />
                        <input
                          ref={ownerInputRef}
                          name="password"
                          type={showOwnerPass ? "text" : "password"}
                          required
                          autoComplete="current-password"
                          dir="ltr"
                          placeholder={tr("كلمة مرور لوحة التحكم")}
                          aria-label={tr("كلمة مرور لوحة التحكم")}
                          onFocus={() => setActiveSide("up")}
                          className="w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-muted"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowOwnerPass((v) => !v)}
                          className="text-muted hover:text-ink"
                          aria-label={
                            showOwnerPass
                              ? tr("إخفاء كلمة المرور")
                              : tr("إظهار كلمة المرور")
                          }
                        >
                          {showOwnerPass ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </label>

                      <label className="flex cursor-pointer items-center gap-2 px-1 text-xs font-bold text-muted hover:text-ink">
                        <input
                          type="checkbox"
                          name="remember"
                          defaultChecked
                          className="size-4 rounded accent-primary"
                        />
                        {tr("تذكرني (30 يوماً)")}
                      </label>

                      {ownerError ? (
                        <p
                          role="alert"
                          className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
                        >
                          {trv(ownerError)}
                        </p>
                      ) : null}

                      <button
                        type="submit"
                        disabled={busyOwner}
                        className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-extrabold text-ink shadow-sm transition hover:brightness-95 disabled:opacity-50"
                      >
                        <ShieldCheck className="size-4" />
                        {busyOwner
                          ? tr("جاري الدخول…")
                          : tr("دخول لوحة التحكم")}
                      </button>
                    </form>

                    <p className="mt-5 text-center text-xs font-bold text-muted lg:hidden">
                      {tr("عضو في فريق التحرير؟")}{" "}
                      <button
                        type="button"
                        onClick={() => focusPanel("in")}
                        className="font-extrabold text-ink underline"
                      >
                        {tr("دخول بحساب الفريق")}
                      </button>
                    </p>
                  </div>
                </section>
              ) : (
                <section
                  aria-label={tr("إنشاء حساب جديد")}
                  className={`flex flex-col justify-between p-6 sm:p-8 lg:p-9 transition-opacity ${
                    activeSide !== "up"
                      ? "hidden lg:flex lg:opacity-95"
                      : "flex"
                  }`}
                >
                  <div className="my-auto flex flex-col">
                    <div className="mb-6 text-center">
                      <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                        {tr("إنشاء حساب")}
                      </h2>
                      <p className="mt-1.5 text-xs font-semibold text-muted">
                        {tr(
                          "أنشئ حسابك مجاناً لنشر الأخبار والإعلانات وإضافة مصلحتك التجارية",
                        )}
                      </p>
                    </div>

                    <form
                      className="flex flex-col gap-3"
                      method="post"
                      action="/login"
                      autoComplete="on"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        setRegisterError("");
                        const f = new FormData(event.currentTarget);
                        const name = String(f.get("name") ?? "").trim();
                        const email = String(f.get("email") ?? "").trim();
                        const password = String(f.get("password") ?? "");
                        const password2 = String(f.get("password2") ?? "");

                        if (name.length < 2) {
                          setRegisterError(
                            tr("اكتب اسمك الكامل (حرفان على الأقل)."),
                          );
                          return;
                        }
                        if (password.length < 8) {
                          setRegisterError(
                            tr("كلمة المرور قصيرة (8 أحرف على الأقل)."),
                          );
                          return;
                        }
                        if (password !== password2) {
                          setRegisterError(
                            tr("كلمتا المرور غير متطابقتين."),
                          );
                          return;
                        }

                        setBusyUp(true);
                        try {
                          const res = await authClient.signUp.email({
                            email,
                            password,
                            name,
                            rememberMe: true,
                          } as {
                            email: string;
                            password: string;
                            name: string;
                          });
                          if (res.error) {
                            setRegisterError(
                              friendlyAuthError(
                                res.error.code ?? res.error.message,
                                tr("تعذّر إنشاء الحساب."),
                              ),
                            );
                            return;
                          }
                          window.location.replace(redirect);
                        } catch {
                          setRegisterError(
                            tr("تعذّر الاتصال. حاول مرة أخرى."),
                          );
                        } finally {
                          setBusyUp(false);
                        }
                      }}
                    >
                      {/* Full Name Pill */}
                      <label className="group flex items-center gap-3 rounded-2xl border border-transparent bg-surface px-4 py-3 transition focus-within:border-primary focus-within:bg-paper focus-within:shadow-xs">
                        <User className="size-5 shrink-0 text-muted transition group-focus-within:text-ink" />
                        <input
                          ref={registerInputRef}
                          name="name"
                          type="text"
                          required
                          minLength={2}
                          maxLength={60}
                          autoComplete="name"
                          placeholder={tr("الاسم الكامل")}
                          aria-label={tr("الاسم الكامل")}
                          onFocus={() => setActiveSide("up")}
                          className="w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-muted"
                        />
                      </label>

                      {/* Email Pill */}
                      <label className="group flex items-center gap-3 rounded-2xl border border-transparent bg-surface px-4 py-3 transition focus-within:border-primary focus-within:bg-paper focus-within:shadow-xs">
                        <Mail className="size-5 shrink-0 text-muted transition group-focus-within:text-ink" />
                        <input
                          name="email"
                          type="email"
                          required
                          autoComplete="email"
                          dir="ltr"
                          placeholder={tr("البريد الإلكتروني")}
                          aria-label={tr("البريد الإلكتروني")}
                          onFocus={() => setActiveSide("up")}
                          className="w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-muted"
                        />
                      </label>

                      {/* Password Pill */}
                      <label className="group flex items-center gap-3 rounded-2xl border border-transparent bg-surface px-4 py-3 transition focus-within:border-primary focus-within:bg-paper focus-within:shadow-xs">
                        <Lock className="size-5 shrink-0 text-muted transition group-focus-within:text-ink" />
                        <input
                          name="password"
                          type={showRegPass ? "text" : "password"}
                          required
                          minLength={8}
                          maxLength={128}
                          autoComplete="new-password"
                          dir="ltr"
                          placeholder={tr("كلمة المرور (8 أحرف على الأقل)")}
                          aria-label={tr("كلمة المرور")}
                          onFocus={() => setActiveSide("up")}
                          className="w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-muted"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowRegPass((v) => !v)}
                          className="text-muted hover:text-ink"
                          aria-label={
                            showRegPass
                              ? tr("إخفاء كلمة المرور")
                              : tr("إظهار كلمة المرور")
                          }
                        >
                          {showRegPass ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </label>

                      {/* Confirm Password Pill */}
                      <label className="group flex items-center gap-3 rounded-2xl border border-transparent bg-surface px-4 py-3 transition focus-within:border-primary focus-within:bg-paper focus-within:shadow-xs">
                        <Lock className="size-5 shrink-0 text-muted transition group-focus-within:text-ink" />
                        <input
                          name="password2"
                          type={showRegPass ? "text" : "password"}
                          required
                          minLength={8}
                          maxLength={128}
                          autoComplete="new-password"
                          dir="ltr"
                          placeholder={tr("تأكيد كلمة المرور")}
                          aria-label={tr("تأكيد كلمة المرور")}
                          onFocus={() => setActiveSide("up")}
                          className="w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-muted"
                        />
                      </label>

                      {registerError ? (
                        <p
                          role="alert"
                          className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
                        >
                          {trv(registerError)}
                        </p>
                      ) : null}

                      {/* Primary Register Button */}
                      <button
                        type="submit"
                        disabled={busyUp || Boolean(busySocial)}
                        className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-extrabold text-ink shadow-sm transition hover:brightness-95 disabled:opacity-50"
                      >
                        <UserPlus className="size-4" />
                        {busyUp ? tr("جاري إنشاء الحساب…") : tr("إنشاء حساب")}
                      </button>
                    </form>

                    {/* Social Registration Row */}
                    <SocialCircleButtons
                      config={config}
                      busyProvider={busySocial}
                      onSocialClick={handleSocial}
                      label={tr("أو التسجيل عبر المنصات الاجتماعية")}
                    />

                    {/* Mobile Switch Prompt */}
                    <p className="mt-5 text-center text-xs font-bold text-muted lg:hidden">
                      {tr("لديك حساب بالفعل؟")}{" "}
                      <button
                        type="button"
                        onClick={() => focusPanel("in")}
                        className="font-extrabold text-ink underline"
                      >
                        {tr("تسجيل الدخول")}
                      </button>
                    </p>
                  </div>
                </section>
              )}
            </div>
          </div>
        )}

        {/* Terms & Privacy Footer */}
        <footer className="mt-5 max-w-xl px-4 text-center text-xs font-semibold text-muted">
          {tr(
            "نستخدم اسمك وصورتك من الحساب لعرضهما مع منشوراتك فقط، ولا ننشر شيئاً على حسابك. بتسجيل الدخول أنت توافق على",
          )}{" "}
          <Link to="/terms" className="font-extrabold text-ink underline">
            {tr("شروط الاستخدام")}
          </Link>{" "}
          {tr("و")}
          <Link to="/privacy" className="font-extrabold text-ink underline">
            {tr("سياسة الخصوصية")}
          </Link>
          .
        </footer>
      </main>
    </div>
  );
}
