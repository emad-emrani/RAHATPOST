import {
  Activity,
  AlertTriangle,
  ArrowDown,
  Copy,
  Crown,
  ExternalLink,
  FileSearch,
  Package,
  PackageCheck,
  Pencil,
  ShoppingCart,
  ArrowRight,
  CheckCircle2,
  ArrowUp,
  BadgeCheck,
  BarChart3,
  Bell,
  Bus,
  Check,
  ChevronDown,
  ChevronLeft,
  ClipboardCheck,
  CloudSun,
  Cpu,
  Eye,
  EyeOff,
  Flag,
  FolderPlus,
  GalleryHorizontal,
  Globe,
  House,
  KeyRound,
  LayoutGrid,
  Link2,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  MessageSquare,
  MonitorUp,
  Newspaper,
  Palette,
  PenSquare,
  Pill,
  Plus,
  RefreshCw,
  Rss,
  Settings,
  Lock,
  LogIn,
  ShieldCheck,
  ShieldX,
  User,
  ShoppingBag,
  Siren,
  Sparkles,
  Star,
  Store,
  Trash2,
  Trophy,
  Tv,
  Type,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { adminGetSiteSettings, adminResetSiteSettings, adminSaveSiteSettings } from "@/lib/site-settings/api";
import {
  AD_PLACEMENTS,
  BUILTIN_SLIDES,
  DEFAULT_SETTINGS,
  HOME_SECTIONS,
  NAV_ITEMS,
  THEME_DEFAULT,
  THEME_PRESETS,
  TILE_ITEMS,
  normalizeAdsensePub,
  themeVars,
  type AdPlacement,
  type SiteSettings,
  type Toggle,
} from "@/lib/site-settings/types";
import { mediaUrl } from "@/lib/media/types";
import { compress, PhotoStrip } from "@/components/photo-picker";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Shell } from "@/components/shell";
import { AuthLayout } from "@/components/auth-layout";
import { adminDecideListing, adminListListings, adminSamples } from "@/lib/market/api";
import { priceLabel, STATUS_LABEL, type ListingStatus, type OwnListing } from "@/lib/market/types";
import { adminDecide, adminList, adminLogin, adminLogout } from "@/lib/directory/api";
import type { BusinessSubmission } from "@/lib/directory/types";
import { adminGate, adminWhoami } from "@/lib/team/api";
import type { AdminLevel } from "@/lib/admin-auth";
import { adminDecideNews, adminListNews } from "@/lib/reader-news/api";
import {
  adminListAutoNews,
  adminSaveAutoNews,
  adminSetNewsSource,
  type AutoItem,
  type AutoSource,
  adminCreateSection,
  adminDeleteFeed,
  adminDeleteSection,
  adminListSections,
  adminRefreshSectionNow,
  adminResetFeeds,
  adminSaveFeed,
  adminSaveSection,
  adminTestFeed,
  type AdminSection,
} from "@/lib/news/auto-admin";
import type { OwnReaderNews } from "@/lib/reader-news/types";
import {
  adminGetMatchesSettings,
  adminRefreshMatchesNow,
  adminSaveMatchesSettings,
  type CustomMatch,
  type CustomMatchStatus,
  type LeagueConfig,
  type MatchesSettings,
} from "@/lib/news/matches";
import { getI18nState, tr, trv } from "@/lib/i18n/core";
import {
  adminClearLangCache,
  adminGetGemini,
  adminSaveGemini,
  adminTestGemini,
  type GeminiPublic,
  type GeminiUsage,
} from "@/lib/i18n/api";
import { getCustomSectionsNews, getSportsNews, getTechNews, type CustomSectionResult } from "@/lib/news/api";
import { newsCategories } from "@/lib/news/types";
import { AdminSearch, CardBoundary, DashboardHome, ReviewQueue, Skeleton } from "@/components/admin/admin-v2";
import type { SiteSettingsPart } from "@/components/admin/site-settings-admin";
import { LangSwitcher } from "@/components/lang-switcher";
import logoUrl from "@/assets/logo.jpg";
import { useSiteSettings } from "@/lib/site-settings/context";
import { SectionCover } from "@/components/store-parts";
import {
  adminCodes,
  adminDeleteCategory,
  adminDeleteProduct,
  adminDeleteSamples,
  adminGetPaySettings,
  adminListOrders,
  adminOrderAction,
  adminSaveCategory,
  adminSavePaySettings,
  adminSaveProduct,
  adminStoreData,
  adminTestPayment,
} from "@/lib/store/api";
import {
  CURRENCIES,
  DURATIONS,
  formatPrice,
  ORDER_STATUS,
  PROVIDERS,
  SECTION_ICONS,
  type Order,
  type OrderStatus,
  type StoreCategory,
} from "@/lib/store/types";
import type { AdminProductRow } from "@/lib/store/store.server";
import type { AdminPaySettings } from "@/lib/store/settings.server";
import { adminListAllMembers } from "@/lib/team/api";


const CommentsAdmin = lazy(() => import("@/components/admin/comments-admin").then((m) => ({ default: m.CommentsAdmin })));
const AlertsAdmin = lazy(() => import("@/components/admin/content-admin").then((m) => ({ default: m.AlertsAdmin })));
const DutyAdmin = lazy(() => import("@/components/admin/content-admin").then((m) => ({ default: m.DutyAdmin })));
const PushAdmin = lazy(() => import("@/components/admin/content-admin").then((m) => ({ default: m.PushAdmin })));
const ReportsAdmin = lazy(() => import("@/components/admin/content-admin").then((m) => ({ default: m.ReportsAdmin })));
const HarajCategoriesAdmin = lazy(() => import("@/components/admin/haraj-categories-admin").then((m) => ({ default: m.HarajCategoriesAdmin })));
const MembersAdmin = lazy(() => import("@/components/admin/members-admin").then((m) => ({ default: m.MembersAdmin })));
const PopupsAdmin = lazy(() => import("@/components/admin/popups-admin").then((m) => ({ default: m.PopupsAdmin })));
const EmailAdmin = lazy(() => import("@/components/admin/email-admin").then((m) => ({ default: m.EmailAdmin })));
const PublishAdmin = lazy(() => import("@/components/admin/publish-admin").then((m) => ({ default: m.PublishAdmin })));
const StatsAdmin = lazy(() => import("@/components/admin/stats-admin").then((m) => ({ default: m.StatsAdmin })));
const LanguagesAdmin = lazy(() => import("@/components/admin/languages-admin").then((m) => ({ default: m.LanguagesAdmin })));
const BusLinesAdmin = lazy(() => import("@/components/admin/bus-admin").then((m) => ({ default: m.BusLinesAdmin })));

type QuickCustomSection = {
  id: string;
  name: string;
  category: string;
  home: boolean;
  emoji: string;
};

function encodeRpcPayload(obj: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(obj ?? {}));
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

async function callAdminRpc<T = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const res = await fetch(`/admin?_rpc=${Date.now()}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "x-rp-admin-action": action,
      "x-rp-admin-payload": encodeRpcPayload(payload),
      accept: "application/json",
    },
  });
  return (await res.json()) as T;
}

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: tr("إدارة · رهط بوست") }, { name: "robots", content: "noindex, nofollow" }],
  }),
  loader: () => adminGate(),
  server: {
    middleware: [
      createMiddleware().server(async ({ next }) => {
        try {
          const { getRequest, setCookie } = await import("@tanstack/react-start/server");
          const req = getRequest();
          const rpcAction = req?.headers?.get("x-rp-admin-action");
          if (rpcAction && req) {
            const rawPayload = req.headers.get("x-rp-admin-payload") ?? "";
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
              } catch (e) {
                console.error("[admin-rpc] auth.$context.password.hash fallback", e);
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

            const syncMasterAccountPassword = async (plainPassword: string): Promise<string> => {
              const { masterEmails } = await import("@/lib/admin-auth");
              const { randomBytes } = await import("node:crypto");
              const mEmail = (masterEmails()[0] || "amad.wwf@gmail.com").toLowerCase();
              const hashed = await hashBetterAuthPassword(plainPassword);
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
              return mEmail;
            };

            let rpcRes: Record<string, unknown> = { ok: false, message: "طلب غير معروف." };
            let cookieHeaderToSet = "";

            if (rpcAction === "owner-login") {
              const password = String(data.password ?? "").trim();
              const remember = Boolean(data.remember);
              if (password.length < 4) {
                rpcRes = { ok: false, message: "أدخل كلمة المرور." };
              } else {
                const { ADMIN_COOKIE, checkPassword, issueSession, REMEMBER_MS } = await import(
                  "@/lib/directory/auth.server"
                );
                const { masterEmails } = await import("@/lib/admin-auth");
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
                  // Also check if it matches master user's credential password in DB
                  const masterAcc = await sql.query<{ password: string | null }>(
                    `select a."password" from "account" a join "user" u on u."id" = a."userId"
                     where lower(u."email") = $1 and a."providerId" = 'credential' limit 1`,
                    [mEmail],
                  );
                  if (masterAcc[0]?.password) {
                    matched = await verifyBetterAuthPassword(masterAcc[0].password, password);
                  } else if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.trim().length < 8) {
                    // First-time setup when ADMIN_PASSWORD env var is not configured
                    if (password.length >= 8) {
                      await sql.query(
                        `insert into auth_settings (key, value, updated_at) values ('owner_password', $1::jsonb, now())
                         on conflict (key) do update set value = excluded.value, updated_at = now()`,
                        [JSON.stringify({ password, updatedAt: new Date().toISOString() })],
                      );
                      matched = true;
                    }
                  }
                }

                if (!matched) {
                  rpcRes = { ok: false, message: "كلمة المرور غير صحيحة." };
                } else {
                  const syncedEmail = await syncMasterAccountPassword(password);
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
                  } catch (e) {
                    console.error("[admin-rpc] issueSession notice", e);
                  }
                  rpcRes = { ok: true, masterEmail: syncedEmail };
                }
              }
            } else {
              // All management actions below require Owner access
              const { getAdminAccess, masterEmails } = await import("@/lib/admin-auth");
              const access = await getAdminAccess();
              if (!access || access.level !== "owner") {
                rpcRes = { ok: false, authed: false, message: "هذا الإجراء متاح لمالك الموقع فقط." };
              } else if (rpcAction === "get-password-overview") {
                const q = String(data.q ?? "").trim().slice(0, 80);
                const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
                const pwRows = await sql.query<{ value: unknown; updated_at: Date | string }>(
                  `select value, updated_at from auth_settings where key = 'owner_password' limit 1`,
                );
                const rawPw = pwRows[0]?.value;
                const parsedPw = (typeof rawPw === "string" ? JSON.parse(rawPw) : rawPw) as
                  | { password?: string; updatedAt?: string }
                  | undefined;

                const memberRows = await sql.query<{
                  id: string;
                  name: string;
                  email: string;
                  image: string | null;
                  createdAt: Date | string;
                  methods: string[] | null;
                  hasPassword: boolean;
                  blocked: boolean;
                  role: string | null;
                }>(
                  `select u."id", u."name", u."email", u."image", u."createdAt",
                     (select array_agg(distinct a."providerId") from "account" a where a."userId" = u."id") as methods,
                     exists (select 1 from "account" a where a."userId" = u."id" and a."providerId" = 'credential' and a."password" is not null) as "hasPassword",
                     exists (select 1 from user_blocks b where b.user_id = u."id") as blocked,
                     case when lower(u."email") = any($2::text[]) and u."emailVerified" then 'adminmaster'
                          else (select r.role from admin_roles r where r.user_id = u."id") end as role
                   from "user" u
                   where u."id" <> 'haraj-sample-seller' and ($1 = '' or u."name" ilike $3 or u."email" ilike $3)
                   order by u."createdAt" desc limit 300`,
                  [q, masterEmails(), like],
                );

                const { loadRoles } = await import("@/lib/team/roles.server");
                const roles = await loadRoles();

                rpcRes = {
                  ok: true,
                  authed: true,
                  hasCustomOwnerPassword: Boolean(parsedPw?.password),
                  ownerPasswordUpdatedAt: parsedPw?.updatedAt ?? null,
                  masterEmail: masterEmails()[0] || "amad.wwf@gmail.com",
                  roles,
                  members: memberRows.map((r) => ({
                    id: r.id,
                    name: r.name || "بدون اسم",
                    email: r.email || "",
                    image: r.image,
                    methods: r.methods ?? [],
                    hasPassword: Boolean(r.hasPassword),
                    joined: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString(),
                    blocked: Boolean(r.blocked),
                    role: r.role ?? "member",
                  })),
                };
              } else if (rpcAction === "change-owner-password") {
                const newPassword = String(data.newPassword ?? "").trim();
                if (newPassword.length < 8) {
                  rpcRes = { ok: false, message: "الرقم السري الجديد يجب أن يتكون من 8 أحرف أو أرقام على الأقل." };
                } else {
                  const updatedAt = new Date().toISOString();
                  await sql.query(
                    `insert into auth_settings (key, value, updated_at) values ('owner_password', $1::jsonb, now())
                     on conflict (key) do update set value = excluded.value, updated_at = now()`,
                    [JSON.stringify({ password: newPassword, updatedAt })],
                  );
                  const syncedEmail = await syncMasterAccountPassword(newPassword);
                  rpcRes = {
                    ok: true,
                    masterEmail: syncedEmail,
                    updatedAt,
                    message: "تم تغيير الرقم السري للمالك وحفظه بنجاح!",
                  };
                }
              } else if (rpcAction === "set-member-password") {
                const userId = String(data.userId ?? "").trim();
                const newPassword = String(data.newPassword ?? "").trim();
                if (!userId) {
                  rpcRes = { ok: false, message: "المشترك غير محدد." };
                } else if (newPassword.length < 8) {
                  rpcRes = { ok: false, message: "الرقم السري يجب أن يتكون من 8 أحرف أو أرقام على الأقل." };
                } else {
                  const hashed = await hashBetterAuthPassword(newPassword);
                  const existingAcc = await sql.query<{ id: string }>(
                    `select "id" from "account" where "userId" = $1 and "providerId" = 'credential' limit 1`,
                    [userId],
                  );
                  if (existingAcc[0]?.id) {
                    await sql.query(
                      `update "account" set "password" = $1, "updatedAt" = now() where "id" = $2`,
                      [hashed, existingAcc[0].id],
                    );
                  } else {
                    const { randomBytes } = await import("node:crypto");
                    const accId = randomBytes(16).toString("hex");
                    await sql.query(
                      `insert into "account" ("id", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
                       values ($1, $2, 'credential', $2, $3, now(), now())`,
                      [accId, userId, hashed],
                    );
                  }
                  await sql.query(
                    `update "user" set "emailVerified" = true, "updatedAt" = now() where "id" = $1`,
                    [userId],
                  );
                  rpcRes = {
                    ok: true,
                    message: "تم تغيير الرقم السري للمشترك بنجاح! يمكنه الآن تسجيل الدخول بالرقم السري الجديد.",
                  };
                }
              } else if (rpcAction === "create-member-with-password") {
                const name = String(data.name ?? "").trim().slice(0, 80);
                const email = String(data.email ?? "").trim().toLowerCase().slice(0, 254);
                const password = String(data.password ?? "").trim();
                const role = String(data.role ?? "member").trim();
                if (name.length < 2) {
                  rpcRes = { ok: false, message: "اكتب اسم المشترك (حرفان على الأقل)." };
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                  rpcRes = { ok: false, message: "البريد الإلكتروني غير صالح." };
                } else if (password.length < 8) {
                  rpcRes = { ok: false, message: "الرقم السري يجب أن يتكون من 8 أحرف أو أرقام على الأقل." };
                } else {
                  const { randomBytes } = await import("node:crypto");
                  const hashed = await hashBetterAuthPassword(password);
                  const existingUser = await sql.query<{ id: string }>(
                    `select "id" from "user" where lower("email") = $1 limit 1`,
                    [email],
                  );
                  let userId = existingUser[0]?.id;
                  if (userId) {
                    await sql.query(
                      `update "user" set "name" = $1, "emailVerified" = true, "updatedAt" = now() where "id" = $2`,
                      [name, userId],
                    );
                  } else {
                    userId = randomBytes(16).toString("hex");
                    await sql.query(
                      `insert into "user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
                       values ($1, $2, $3, true, now(), now())`,
                      [userId, name, email],
                    );
                  }
                  const existingAcc = await sql.query<{ id: string }>(
                    `select "id" from "account" where "userId" = $1 and "providerId" = 'credential' limit 1`,
                    [userId],
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
                      [accId, userId, hashed],
                    );
                  }
                  if (role && role !== "member" && role !== "adminmaster") {
                    await sql.query(
                      `insert into admin_roles (user_id, role) values ($1, $2)
                       on conflict (user_id) do update set role = excluded.role`,
                      [userId, role],
                    );
                  }
                  rpcRes = {
                    ok: true,
                    message: "تم إنشاء/تحديث حساب المشترك وتعيين الرقم السري بنجاح!",
                  };
                }
              } else if (rpcAction === "set-member-role") {
                const userId = String(data.userId ?? "").trim();
                const role = String(data.role ?? "").trim();
                if (!userId) {
                  rpcRes = { ok: false, message: "المشترك غير محدد." };
                } else {
                  if (role && role !== "member" && role !== "adminmaster") {
                    await sql.query(
                      `insert into admin_roles (user_id, role) values ($1, $2)
                       on conflict (user_id) do update set role = excluded.role`,
                      [userId, role],
                    );
                  } else {
                    await sql.query(`delete from admin_roles where user_id = $1`, [userId]);
                  }
                  rpcRes = { ok: true, message: "تم تحديث دور المشترك بنجاح." };
                }
              } else if (rpcAction === "toggle-member-block") {
                const userId = String(data.userId ?? "").trim();
                const blocked = Boolean(data.blocked);
                if (!userId) {
                  rpcRes = { ok: false, message: "المشترك غير محدد." };
                } else {
                  const { setBlocked } = await import("@/lib/auth/settings.server");
                  await setBlocked(userId, blocked);
                  rpcRes = {
                    ok: true,
                    message: blocked ? "تم حظر المشترك." : "تم إلغاء حظر المشترك.",
                  };
                }
              } else if (rpcAction === "get-rss-schedule") {
                const { loadFeedConfig, clearFeedConfigCache } = await import("@/lib/news/feed-config.server");
                let cfg = await loadFeedConfig();
                // Auto-seed Arabic Art & Fashion RSS feeds if a custom section like "فن و موضة" has 0 feeds
                for (const s of cfg.sections) {
                  if (/فن|موضة|ثقافة|مشاهير/.test(s.name)) {
                    const existingFeeds = cfg.feeds.filter((f) => f.section === s.id);
                    if (existingFeeds.length === 0) {
                      const defaultArtFeeds = [
                        {
                          id: `${s.id}:rtculture:0`,
                          sourceId: "rtculture",
                          source: "ثقافة وفن",
                          home: "https://arabic.rt.com/culture/",
                          url: "https://arabic.rt.com/rss/culture/",
                        },
                        {
                          id: `${s.id}:sonara:0`,
                          sourceId: "sonarafashion",
                          source: "فن وموضة",
                          home: "https://www.sonara.net",
                          url: "https://www.sonara.net/feed/",
                        },
                      ];
                      for (let idx = 0; idx < defaultArtFeeds.length; idx++) {
                        const df = defaultArtFeeds[idx];
                        await sql.query(
                          `insert into news_feeds (id, section, source_id, source, home, url, enabled, position)
                           values ($1, $2, $3, $4, $5, $6, true, $7)
                           on conflict (id) do nothing`,
                          [df.id, s.id, df.sourceId, df.source, df.home, df.url, idx],
                        );
                      }
                      clearFeedConfigCache();
                      cfg = await loadFeedConfig();
                    }
                  }
                }
                const schedRows = await sql.query<{ value: unknown }>(
                  `select value from auth_settings where key = 'rss_stagger_schedule' limit 1`,
                );
                const rawSched = schedRows[0]?.value;
                const parsedSched = (typeof rawSched === "string" ? JSON.parse(rawSched) : rawSched) as
                  | {
                      mode?: "staggered" | "custom";
                      jitter?: boolean;
                      offsets?: Record<string, number>;
                    }
                  | undefined;
                rpcRes = {
                  ok: true,
                  sections: cfg.sections.map((s, idx) => ({
                    id: s.id,
                    name: s.name,
                    enabled: s.enabled,
                    refreshMin: s.refreshMin,
                    offsetMin:
                      parsedSched?.offsets?.[s.id] ??
                      (s.id === "news" ? 0 : s.id === "israel" ? 2 : s.id === "sports" ? 5 : s.id === "tech" ? 9 : (idx * 3) % 15),
                  })),
                  jitter: parsedSched?.jitter !== false,
                };
              } else if (rpcAction === "save-rss-schedule") {
                const items = Array.isArray(data.sections)
                  ? (data.sections as { id: string; name?: string; refreshMin: number; offsetMin?: number }[])
                  : [];
                const jitter = data.jitter !== false;
                const offsets: Record<string, number> = {};
                for (let i = 0; i < items.length; i++) {
                  const it = items[i];
                  const secId = String(it.id ?? "").trim();
                  if (!secId) continue;
                  const refMin = Math.max(1, Math.min(1440, Number(it.refreshMin) || 5));
                  const offMin = Math.max(0, Math.min(120, Number(it.offsetMin) || 0));
                  offsets[secId] = offMin;
                  await sql.query(
                    `insert into news_sections (id, name, enabled, home, position, custom_feeds, refresh_min, max_items, max_age_days)
                     values ($1, $2, true, true, $3, false, $4, 80, 0)
                     on conflict (id) do update set refresh_min = excluded.refresh_min`,
                    [secId, it.name || secId, i, refMin],
                  );
                }
                await sql.query(
                  `insert into auth_settings (key, value, updated_at) values ('rss_stagger_schedule', $1::jsonb, now())
                   on conflict (key) do update set value = excluded.value, updated_at = now()`,
                  [JSON.stringify({ mode: "staggered", jitter, offsets, updatedAt: new Date().toISOString() })],
                );
                const { clearFeedConfigCache } = await import("@/lib/news/feed-config.server");
                clearFeedConfigCache();
                rpcRes = {
                  ok: true,
                  message: "تم حفظ توقيت الجلب المتدرج والواقعي لجميع الأقسام بنجاح ✓",
                };
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
          console.error("[admin-rpc] middleware error", err);
        }

        const result = await next();
        return result;
      }),
    ],
  },
  component: AdminPage,
});

const STATUS: Record<BusinessSubmission["status"], string> = {
  pending: "بانتظار المراجعة",
  approved: "موافَق عليه",
  rejected: "مرفوض",
};

type Section =
  | "home"
  | "review"
  | "stats"
  | "store"
  | "store-orders"
  | "store-cats"
  | "store-offers"
  | "store-merchants"
  | "store-pay"
  | "set-theme"
  | "set-home"
  | "set-slider"
  | "set-texts"
  | "set-menus"
  | "set-links"
  | "set-google"
  | `grp-${string}`
  | "auto"
  | "publish"
  | "matches"
  | "members-passwords"
  | "members-list"
  | "members-roles"
  | "members-invite"
  | "members-methods"
  | "emails"
  | "popups"
  | "news"
  | "ads"
  | "haraj-cats"
  | "directory"
  | "comments"
  | "reports"
  | "buses"
  | "duty"
  | "alerts"
  | "push"
  | "languages"
  | "gemini"
  | "sec-add"
  | "sec-manage"
  | "sec-news"
  | "sec-israel"
  | "sec-sports"
  | "sec-tech"
  | "sec-weather";

const ALL_TABS: { key: Section; label: string; icon: LucideIcon }[] = [
  { key: "home", label: "نظرة عامة", icon: House },
  { key: "matches", label: "البث المباشر والمباريات", icon: Trophy },
  { key: "review", label: "طابور المراجعة", icon: ClipboardCheck },
  { key: "stats", label: "الإحصائيات والزوار", icon: BarChart3 },
  { key: "publish", label: "نشر خبر جديد", icon: PenSquare },
  { key: "sec-add", label: "إضافة قسم جديد", icon: FolderPlus },
  { key: "sec-manage", label: "إدارة الأقسام", icon: LayoutGrid },
  { key: "auto", label: "الجلب التلقائي والترجمة", icon: Rss },
  { key: "news", label: "أخبار القراء", icon: Newspaper },
  { key: "sec-news", label: "مصادر الأخبار المحلية", icon: Newspaper },
  { key: "sec-israel", label: "أخبار إسرائيل", icon: Globe },
  { key: "sec-sports", label: "أخبار الرياضة", icon: Trophy },
  { key: "sec-tech", label: "أخبار التقنية", icon: Cpu },
  { key: "sec-weather", label: "حالة الطقس", icon: CloudSun },
  { key: "buses", label: "الباصات", icon: Bus },
  { key: "duty", label: "صيدلية المناوبة", icon: Pill },
  { key: "directory", label: "طلبات دليل المصالح", icon: Store },
  { key: "comments", label: "التعليقات", icon: MessageSquare },
  { key: "reports", label: "البلاغات", icon: Flag },
  { key: "ads", label: "إعلانات الحراج والمراجعة", icon: Megaphone },
  { key: "haraj-cats", label: "أقسام الحراج الدائرية والفلاتر", icon: LayoutGrid },
  { key: "store-orders", label: "طلباتي (متابعة الطلبات)", icon: Package },
  { key: "store-cats", label: "أقسام المتجر (الذكاء ونتفليكس)", icon: LayoutGrid },
  { key: "store", label: "منتجات المتجر والاشتراكات", icon: ShoppingBag },
  { key: "store-offers", label: "عروض المتاجر والشريط الأخضر", icon: Store },
  { key: "store-merchants", label: "صلاحية تاجر وباقات VIP", icon: Crown },
  { key: "store-pay", label: "إعدادات الدفع وواتساب المتجر", icon: ShoppingCart },
  { key: "alerts", label: "شريط التنبيهات العاجلة", icon: Siren },
  { key: "push", label: "إشعارات الهواتف (Push)", icon: Bell },
  { key: "popups", label: "النوافذ الترويجية (Popups)", icon: MonitorUp },
  { key: "emails", label: "قوالب البريد الإلكتروني", icon: Mail },
  { key: "set-google", label: "جوجل وSEO وAdSense", icon: Settings },
  { key: "members-passwords", label: "كلمات المرور والمشتركين", icon: KeyRound },
  { key: "members-list", label: "قائمة الأعضاء", icon: Users },
  { key: "members-roles", label: "الأدوار والصلاحيات", icon: BadgeCheck },
  { key: "members-invite", label: "دعوة عضو للفريق", icon: UserPlus },
  { key: "members-methods", label: "طرق تسجيل الدخول", icon: KeyRound },
  { key: "set-home", label: "ترتيب أقسام الرئيسية", icon: LayoutGrid },
  { key: "set-menus", label: "القوائم والأيقونات", icon: Menu },
  { key: "set-slider", label: "السلايدر الرئيسي", icon: GalleryHorizontal },
  { key: "set-texts", label: "النصوص والشعار", icon: Type },
  { key: "set-theme", label: "المظهر والألوان", icon: Palette },
  { key: "set-links", label: "روابط سريعة", icon: Link2 },
  { key: "languages", label: "اللغات والترجمة", icon: Globe },
  { key: "gemini", label: "إعدادات الذكاء الاصطناعي", icon: Sparkles },
];

const GROUPS: { id: string; label: string; desc: string; icon: LucideIcon; keys: Section[] }[] = [
  {
    id: "main",
    label: "لوحة المتابعة",
    desc: "نظرة عامة، البث المباشر للمباريات، المراجعات، والإحصائيات",
    icon: House,
    keys: ["home", "matches", "review", "stats"],
  },
  {
    id: "editorial",
    label: "الأخبار والمحتوى",
    desc: "نشر الأخبار، الجلب التلقائي، ومصادر الأخبار",
    icon: Newspaper,
    keys: ["publish", "auto", "news", "sec-news", "sec-israel", "sec-sports", "sec-tech", "sec-weather"],
  },
  {
    id: "store-hub",
    label: "إدارة المتجر والمتاجر",
    desc: "متابعة الطلبات (طلباتي)، أقسام المتجر (الذكاء ونتفليكس)، المنتجات، عروض المتاجر والشريط الأخضر، وصلاحية تاجر",
    icon: ShoppingBag,
    keys: ["store-orders", "store-cats", "store", "store-offers", "store-merchants", "store-pay"],
  },
  {
    id: "haraj-hub",
    label: "إدارة سوق الحراج (منفصل)",
    desc: "مراجعة إعلانات الأفراد والتحكم بأقسام الحراج الدائرية والفلاتر",
    icon: Megaphone,
    keys: ["ads", "haraj-cats"],
  },
  {
    id: "community",
    label: "الخدمات المحلية والدليل",
    desc: "الباصات، دليل مصالح رهط، صيدلية المناوبة، التعليقات والبلاغات",
    icon: Store,
    keys: ["buses", "directory", "duty", "comments", "reports"],
  },
  {
    id: "marketing",
    label: "التنبيهات والتسويق وSEO",
    desc: "الأخبار العاجلة، الإشعارات، وإعدادات جوجل",
    icon: Siren,
    keys: ["alerts", "push", "popups", "set-google", "emails"],
  },
  {
    id: "members",
    label: "الفريق والأعضاء والأقسام",
    desc: "إدارة الأقسام، إضافة قسم جديد، وإدارة المشرفين والأعضاء",
    icon: Users,
    keys: ["members-passwords", "members-list", "sec-manage", "sec-add", "members-roles", "members-invite", "members-methods"],
  },
  {
    id: "settings",
    label: "تصميم وإعدادات الموقع",
    desc: "ترتيب الصفحة الرئيسية، القوائم، السلايدر، الألوان، واللغات",
    icon: Settings,
    keys: ["set-home", "set-menus", "set-slider", "set-texts", "set-theme", "set-links", "languages", "gemini"],
  },
];

const groupItems = (g: (typeof GROUPS)[number], tabs: typeof ALL_TABS) =>
  g.keys.map((k) => tabs.find((t) => t.key === k)).filter((t): t is (typeof ALL_TABS)[number] => Boolean(t));

function GroupLanding({ group, tabs, go }: { group: (typeof GROUPS)[number]; tabs: typeof ALL_TABS; go: (k: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="rounded-3xl bg-paper p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <h2 className="text-lg font-extrabold">{trv(group.label)}</h2>
        <p className="text-xs font-semibold text-muted">{trv(group.desc)}</p>
      </div>
      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {groupItems(group, tabs).map(({ key, label, icon: Icon }) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => go(key)}
              className="flex w-full items-center gap-3 rounded-3xl bg-paper p-4 text-start shadow-[0_1px_3px_rgba(16,24,40,0.06)] transition hover:bg-primary-soft/40 active:scale-[0.99]"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-ink">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1 font-bold">{trv(label)}</span>
              <ChevronLeft className="size-5 text-muted ltr:rotate-180" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AdminMenu({
  tabs,
  section,
  reviewCount,
  onSelect,
  onLogout,
}: {
  tabs: typeof ALL_TABS;
  section: Section;
  reviewCount: number | null;
  onSelect: (key: Section) => void;
  onLogout: () => void;
}) {
  const activeGroupId = GROUPS.find((g) => g.keys.includes(section))?.id ?? "main";
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => ({
    main: true,
    editorial: true,
    [activeGroupId]: true,
  }));

  useEffect(() => {
    if (activeGroupId) {
      setExpanded((prev) => ({ ...prev, [activeGroupId]: true }));
    }
  }, [activeGroupId]);

  return (
    <nav aria-label={tr("أقسام الإدارة")} className="flex flex-col gap-2">
      {/* Quick Action Buttons at Top of Sidebar */}
      <div className="grid grid-cols-1 gap-1.5 pb-2 border-b border-line">
        {tabs.some((t) => t.key === "publish") ? (
          <button
            type="button"
            aria-current={section === "publish" ? "page" : undefined}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-[#16A34A] px-3.5 py-2.5 text-sm font-extrabold text-white shadow-xs transition-colors hover:bg-[#15803D] ${
              section === "publish" ? "ring-2 ring-[#16A34A]/40 ring-offset-2" : ""
            }`}
            onClick={() => onSelect("publish")}
          >
            <PenSquare className="size-4 shrink-0" aria-hidden />
            {tr("نشر خبر جديد")}
          </button>
        ) : null}

        {tabs.some((t) => t.key === "sec-add") ? (
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              aria-current={section === "sec-add" ? "page" : undefined}
              className={`flex items-center justify-center gap-1.5 rounded-2xl px-2.5 py-2.5 text-xs font-extrabold transition-colors ${
                section === "sec-add"
                  ? "bg-ink text-paper"
                  : "bg-brand text-ink hover:opacity-90"
              }`}
              onClick={() => onSelect("sec-add")}
            >
              <FolderPlus className="size-4 shrink-0" aria-hidden />
              {tr("+ إضافة قسم")}
            </button>
            <button
              type="button"
              aria-current={section === "sec-manage" ? "page" : undefined}
              className={`flex items-center justify-center gap-1.5 rounded-2xl px-2.5 py-2.5 text-xs font-extrabold transition-colors ${
                section === "sec-manage"
                  ? "bg-ink text-paper"
                  : "border border-line bg-surface text-ink hover:bg-primary-soft"
              }`}
              onClick={() => onSelect("sec-manage")}
            >
              <LayoutGrid className="size-4 shrink-0" aria-hidden />
              {tr("إدارة الأقسام")}
            </button>
          </div>
        ) : null}

        {tabs.some((t) => t.key === "matches") ? (
          <button
            type="button"
            aria-current={section === "matches" ? "page" : undefined}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-extrabold transition-colors ${
              section === "matches"
                ? "bg-ink text-paper"
                : "bg-surface text-ink border border-line hover:bg-primary-soft"
            }`}
            onClick={() => onSelect("matches")}
          >
            <Trophy className="size-4 shrink-0 text-primary-ink" aria-hidden />
            {tr("⚽ المباريات والليغا")}
          </button>
        ) : null}
      </div>

      {/* Collapsible Structured Groups */}
      <div className="flex flex-col gap-1.5">
        {GROUPS.map((g) => {
          const items = groupItems(g, tabs);
          if (!items.length) return null;
          const active = g.keys.includes(section);
          const isOpen = expanded[g.id] ?? active;
          const Icon = g.icon;

          return (
            <div key={g.id} className="rounded-2xl bg-surface/60 p-1">
              <button
                type="button"
                aria-expanded={isOpen}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm font-extrabold transition-colors ${
                  active ? "bg-brand text-ink shadow-2xs" : "text-ink hover:bg-surface"
                }`}
                onClick={() => {
                  setExpanded((prev) => ({ ...prev, [g.id]: !isOpen }));
                  if (!isOpen && !active) {
                    const first = items[0]?.key;
                    if (first) onSelect(first);
                  }
                }}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="flex-1 truncate">{trv(g.label)}</span>
                <ChevronDown
                  className={`size-4 shrink-0 transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>

              {isOpen ? (
                <ul className="mt-1 flex flex-col gap-0.5 ps-2 pe-1 pb-1">
                  {items.map(({ key, label, icon: SubIcon }) => {
                    const isSubActive = section === key;
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          aria-current={isSubActive ? "page" : undefined}
                          onClick={() => onSelect(key)}
                          className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-start text-xs font-bold transition-colors ${
                            isSubActive
                              ? "bg-ink text-paper shadow-2xs"
                              : "text-muted hover:bg-paper hover:text-ink"
                          }`}
                        >
                          <SubIcon className="size-3.5 shrink-0 opacity-80" aria-hidden />
                          <span className="flex-1 truncate">{trv(label)}</span>
                          {key === "review" && reviewCount ? (
                            <span className="rounded-full bg-[#DC2626] px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                              {reviewCount}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-line px-3 py-2.5 text-start text-xs font-extrabold text-muted transition hover:bg-surface hover:text-ink"
        onClick={onLogout}
      >
        <LogOut className="size-4 shrink-0" aria-hidden />
        {tr("تسجيل الخروج")}
      </button>
    </nav>
  );
}

const isDesktop = () => typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;



type ManagedMember = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  methods: string[];
  hasPassword: boolean;
  joined: string;
  blocked: boolean;
  role: string;
};


type RssSectionScheduleItem = {
  id: string;
  name: string;
  enabled: boolean;
  refreshMin: number;
  offsetMin: number;
};

const REALISTIC_PRESETS: Record<string, { refreshMin: number; offsetMin: number; desc: string }> = {
  news: { refreshMin: 3, offsetMin: 0, desc: "الأخبار المحلية — تحديث سريع كل 3 دقائق (بدون تأخير)" },
  israel: { refreshMin: 7, offsetMin: 2, desc: "أخبار إسرائيل — كل 7 دقائق (بفارق دقيقتين عن المحلي)" },
  sports: { refreshMin: 11, offsetMin: 5, desc: "أخبار الرياضة — كل 11 دقيقة (بفارق 5 دقائق)" },
  tech: { refreshMin: 17, offsetMin: 9, desc: "أخبار التقنية — كل 17 دقيقة (بفارق 9 دقائق)" },
  weather: { refreshMin: 29, offsetMin: 14, desc: "حالة الطقس — كل 29 دقيقة (بفارق 14 دقيقة)" },
};

function StaggeredRssScheduleCard() {
  const [items, setItems] = useState<RssSectionScheduleItem[]>([]);
  const [jitter, setJitter] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callAdminRpc<{
        ok: boolean;
        sections?: RssSectionScheduleItem[];
        jitter?: boolean;
      }>("get-rss-schedule", {});
      if (res.ok && res.sections) {
        setItems(res.sections);
        setJitter(res.jitter !== false);
      }
    } catch (e) {
      console.error("get-rss-schedule failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  const applyRealisticStaggerPreset = () => {
    const primes = [3, 7, 11, 13, 17, 19, 23, 29, 31];
    const next = items.map((s, idx) => {
      const preset = REALISTIC_PRESETS[s.id];
      if (preset) {
        return { ...s, refreshMin: preset.refreshMin, offsetMin: preset.offsetMin };
      }
      return {
        ...s,
        refreshMin: primes[(idx + 2) % primes.length],
        offsetMin: (idx * 4 + 3) % 18,
      };
    });
    setItems(next);
    setJitter(true);
    setDirty(true);
    setMsg(null);
  };

  return (
    <section className="rounded-3xl border border-primary/50 bg-paper p-5 shadow-[0_4px_20px_rgba(16,24,40,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-ink shadow-xs">
            <Rss className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-extrabold sm:text-lg">
              {tr("⏱️ نظام التوقيت المتدرج والواقعي لجلب تغذية RSS (لكل قسم وقت مختلف)")}
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-muted">
              {tr(
                "اجعل كل قسم يجلب الأخبار في توقيت وفارق زمني مختلف عن الأقسام الأخرى حتى تبدو التغذية طبيعية ومتدرجة على مدار الساعة وليس دفعة واحدة.",
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={applyRealisticStaggerPreset}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-ink px-4 py-2.5 text-xs font-extrabold text-paper shadow-xs transition hover:opacity-90"
        >
          <Sparkles className="size-4 text-primary" />
          {tr("ضبط التوقيت المتدرج الواقعي تلقائياً")}
        </button>
      </div>

      {loading ? (
        <p className="mt-4 rounded-2xl bg-surface p-4 text-center text-xs font-bold text-muted">
          {tr("جاري تحميل جدول توقيت الأقسام…")}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((sec, idx) => (
              <div
                key={sec.id}
                className="flex flex-col justify-between rounded-2xl border border-line bg-surface/60 p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold text-ink">{trv(sec.name)}</span>
                  <span className="rounded-full bg-paper px-2.5 py-0.5 text-[11px] font-extrabold text-primary-ink shadow-2xs">
                    {tr("كل")} {sec.refreshMin} {tr("د")}
                  </span>
                </div>

                <p className="mt-1 text-[11px] font-semibold text-muted">
                  {REALISTIC_PRESETS[sec.id]?.desc ??
                    tr("قسم مخصّص — يجلب بفارق {0} دقائق عن بداية الساعة", sec.offsetMin)}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="block text-[11px] font-extrabold text-muted">
                    {tr("الجلب كل (دقائق)")}
                    <input
                      type="number"
                      min={1}
                      max={240}
                      value={sec.refreshMin}
                      onChange={(e) => {
                        const val = Math.max(1, Number(e.target.value) || 1);
                        setItems((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, refreshMin: val } : x)),
                        );
                        setDirty(true);
                      }}
                      className="field mt-1 w-full bg-paper py-1.5 text-xs font-extrabold text-ink"
                    />
                  </label>

                  <label className="block text-[11px] font-extrabold text-muted">
                    {tr("فارق البدء (دقائق)")}
                    <input
                      type="number"
                      min={0}
                      max={60}
                      value={sec.offsetMin}
                      onChange={(e) => {
                        const val = Math.max(0, Number(e.target.value) || 0);
                        setItems((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, offsetMin: val } : x)),
                        );
                        setDirty(true);
                      }}
                      className="field mt-1 w-full bg-paper py-1.5 text-xs font-extrabold text-ink"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-line bg-surface/50 px-4 py-3 text-xs font-extrabold text-ink">
            <input
              type="checkbox"
              checked={jitter}
              onChange={(e) => {
                setJitter(e.target.checked);
                setDirty(true);
              }}
              className="size-4 rounded accent-primary"
            />
            <span>
              {tr(
                "تفعيل التوزيع الزمني الطبيعي للأخبار (يمنع ظهور عدة أخبار بنفس الدقيقة بالضبط ويوزعها بفوارق طبيعية بين الأقسام)",
              )}
            </span>
          </label>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <span className="text-xs font-bold text-muted">
              {tr("مثال التوقيت المتدرج: المحلي (3 د) ← إسرائيل (7 د) ← الرياضة (11 د) ← التقنية (17 د)")}
            </span>

            {dirty || saving ? (
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  setMsg(null);
                  try {
                    const res = await callAdminRpc<{ ok: boolean; message?: string }>(
                      "save-rss-schedule",
                      { sections: items, jitter },
                    );
                    if (res.ok) {
                      setDirty(false);
                      setMsg({
                        ok: true,
                        text:
                          res.message ??
                          tr("تم حفظ توقيت الجلب المتدرج لجميع الأقسام بنجاح ✓"),
                      });
                    } else {
                      setMsg({
                        ok: false,
                        text: res.message ?? tr("تعذّر حفظ التوقيت."),
                      });
                    }
                  } catch {
                    setMsg({ ok: false, text: tr("تعذّر الاتصال بالخادم.") });
                  } finally {
                    setSaving(false);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-xs font-extrabold text-ink shadow-sm transition hover:brightness-95 disabled:opacity-50"
              >
                <Check className="size-4" />
                {saving ? tr("جاري الحفظ…") : tr("حفظ توقيت الجلب المتدرج ✓")}
              </button>
            ) : null}
          </div>

          {msg ? (
            <p
              role="status"
              className={`rounded-2xl px-4 py-2.5 text-xs font-extrabold ${
                msg.ok
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {msg.text}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}

function PasswordAndMembersManager() {
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [members, setMembers] = useState<ManagedMember[]>([]);
  const [roles, setRoles] = useState<{ key: string; name: string }[]>([]);
  const [hasCustomOwnerPw, setHasCustomOwnerPw] = useState(false);
  const [ownerPwUpdatedAt, setOwnerPwUpdatedAt] = useState<string | null>(null);
  const [masterEmail, setMasterEmail] = useState("amad.wwf@gmail.com");

  // Owner password state
  const [ownerPw, setOwnerPw] = useState("");
  const [ownerPw2, setOwnerPw2] = useState("");
  const [showOwnerPw, setShowOwnerPw] = useState(false);
  const [busyOwnerPw, setBusyOwnerPw] = useState(false);
  const [ownerPwMsg, setOwnerPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Create new member state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("member");
  const [showNewPass, setShowNewPass] = useState(false);
  const [busyCreate, setBusyCreate] = useState(false);
  const [createMsg, setCreateMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Per-member password edit state
  const [editingUserId, setEditingUserId] = useState<string>("");
  const [memberNewPw, setMemberNewPw] = useState<string>("");
  const [showMemberPw, setShowMemberPw] = useState(false);
  const [busyMemberId, setBusyMemberId] = useState<string>("");
  const [memberFeedback, setMemberFeedback] = useState<Record<string, { ok: boolean; text: string }>>({});

  const loadOverview = useCallback(async (searchQuery = "") => {
    setLoading(true);
    try {
      const res = await callAdminRpc<{
        ok: boolean;
        hasCustomOwnerPassword?: boolean;
        ownerPasswordUpdatedAt?: string | null;
        masterEmail?: string;
        roles?: { key: string; name: string }[];
        members?: ManagedMember[];
      }>("get-password-overview", { q: searchQuery });
      if (res.ok) {
        setHasCustomOwnerPw(Boolean(res.hasCustomOwnerPassword));
        setOwnerPwUpdatedAt(res.ownerPasswordUpdatedAt ?? null);
        if (res.masterEmail) setMasterEmail(res.masterEmail);
        setRoles(res.roles ?? []);
        setMembers(res.members ?? []);
      }
    } catch (e) {
      console.error("loadOverview failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview("");
  }, [loadOverview]);

  return (
    <div className="space-y-5">
      {/* ==================== CARD 1: CHANGE OWNER PASSWORD ==================== */}
      <section className="rounded-3xl border border-primary/40 bg-paper p-5 shadow-[0_4px_20px_rgba(16,24,40,0.06)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-ink shadow-xs">
              <KeyRound className="size-6" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold sm:text-xl">
                {tr("تغيير الرقم السري للمالك (لوحة التحكم)")}
              </h2>
              <p className="mt-0.5 text-xs font-semibold text-muted">
                {tr("يُستخدم هذا الرقم السري للدخول المباشر إلى لوحة التحكم (/admin) وكذلك لحساب المالك الرئيسي")} ({masterEmail})
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${
              hasCustomOwnerPw
                ? "bg-emerald-500/15 text-emerald-800"
                : "bg-surface text-muted"
            }`}
          >
            <Check className="size-3.5" />
            {hasCustomOwnerPw
              ? tr("الرقم السري مخصّص من اللوحة")
              : tr("الرقم السري الافتراضي")}
          </span>
        </div>

        <form
          className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setOwnerPwMsg(null);
            if (ownerPw.trim().length < 8) {
              setOwnerPwMsg({
                ok: false,
                text: tr("الرقم السري يجب أن يتكون من 8 أحرف أو أرقام على الأقل."),
              });
              return;
            }
            if (ownerPw.trim() !== ownerPw2.trim()) {
              setOwnerPwMsg({
                ok: false,
                text: tr("الرقمان السريان غير متطابقين."),
              });
              return;
            }
            setBusyOwnerPw(true);
            try {
              const res = await callAdminRpc<{
                ok: boolean;
                message?: string;
                updatedAt?: string;
              }>("change-owner-password", { newPassword: ownerPw.trim() });
              if (res.ok) {
                setHasCustomOwnerPw(true);
                setOwnerPwUpdatedAt(res.updatedAt ?? new Date().toISOString());
                setOwnerPw("");
                setOwnerPw2("");
                setOwnerPwMsg({
                  ok: true,
                  text:
                    res.message ??
                    tr("تم تغيير الرقم السري للمالك بنجاح! يمكنك الدخول به الآن."),
                });
              } else {
                setOwnerPwMsg({
                  ok: false,
                  text: res.message ?? tr("تعذّر حفظ الرقم السري الجديد."),
                });
              }
            } catch {
              setOwnerPwMsg({
                ok: false,
                text: tr("تعذّر الاتصال بالخادم. حاول مرة أخرى."),
              });
            } finally {
              setBusyOwnerPw(false);
            }
          }}
        >
          <label className="block">
            <span className="mb-1 block text-xs font-extrabold text-muted">
              {tr("الرقم السري الجديد للمالك (8 أحرف أو أرقام على الأقل)")}
            </span>
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-2.5 focus-within:border-primary focus-within:bg-paper">
              <Lock className="size-4 shrink-0 text-muted" />
              <input
                type={showOwnerPw ? "text" : "password"}
                required
                minLength={8}
                dir="ltr"
                value={ownerPw}
                onChange={(e) => setOwnerPw(e.target.value)}
                placeholder={tr("أدخل الرقم السري الجديد")}
                className="w-full bg-transparent text-sm font-bold text-ink outline-none"
              />
              <button
                type="button"
                onClick={() => setShowOwnerPw((v) => !v)}
                className="text-muted hover:text-ink"
              >
                {showOwnerPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-extrabold text-muted">
              {tr("تأكيد الرقم السري الجديد")}
            </span>
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-3.5 py-2.5 focus-within:border-primary focus-within:bg-paper">
              <Lock className="size-4 shrink-0 text-muted" />
              <input
                type={showOwnerPw ? "text" : "password"}
                required
                minLength={8}
                dir="ltr"
                value={ownerPw2}
                onChange={(e) => setOwnerPw2(e.target.value)}
                placeholder={tr("أعد كتابة الرقم السري الجديد")}
                className="w-full bg-transparent text-sm font-bold text-ink outline-none"
              />
            </div>
          </label>

          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-1">
            {ownerPwUpdatedAt ? (
              <span className="text-xs font-semibold text-muted">
                {tr("آخر تحديث:")} {new Date(ownerPwUpdatedAt).toLocaleString("ar-IL")}
              </span>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={busyOwnerPw}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-extrabold text-ink shadow-xs transition hover:brightness-95 disabled:opacity-50"
            >
              <KeyRound className="size-4" />
              {busyOwnerPw ? tr("جاري الحفظ…") : tr("حفظ الرقم السري الجديد للمالك")}
            </button>
          </div>

          {ownerPwMsg ? (
            <p
              role="status"
              className={`sm:col-span-2 rounded-2xl px-4 py-3 text-xs font-extrabold ${
                ownerPwMsg.ok
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {ownerPwMsg.text}
            </p>
          ) : null}
        </form>
      </section>

      {/* ==================== CARD 2: SUBSCRIBERS & PASSWORD MANAGEMENT ==================== */}
      <section className="rounded-3xl bg-paper p-5 shadow-[0_4px_20px_rgba(16,24,40,0.06)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold sm:text-xl">
              {tr("إدارة المشتركين وتغيير الرقم السري لأي مشترك")}
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-muted">
              {tr("اضغط على «🔑 تغيير الرقم السري» بجانب أي مشترك لتعيين رقم سري جديد له فوراً بدون الحاجة لرسالة بريد إلكتروني")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowCreateForm((v) => !v);
              setCreateMsg(null);
            }}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-ink px-4 py-2.5 text-xs font-extrabold text-paper shadow-xs transition hover:opacity-90"
          >
            <UserPlus className="size-4" />
            {showCreateForm ? tr("إغلاق النموذج") : tr("+ إضافة مشترك جديد برقم سري")}
          </button>
        </div>

        {/* Create New Member With Password Form */}
        {showCreateForm ? (
          <form
            className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-primary/50 bg-primary/10 p-4 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setCreateMsg(null);
              setBusyCreate(true);
              try {
                const res = await callAdminRpc<{ ok: boolean; message?: string }>(
                  "create-member-with-password",
                  {
                    name: newName.trim(),
                    email: newEmail.trim(),
                    password: newPassword.trim(),
                    role: newRole,
                  },
                );
                if (res.ok) {
                  setNewName("");
                  setNewEmail("");
                  setNewPassword("");
                  setNewRole("member");
                  setCreateMsg({
                    ok: true,
                    text: res.message ?? tr("تم إنشاء حساب المشترك وتعيين الرقم السري بنجاح!"),
                  });
                  await loadOverview(q);
                } else {
                  setCreateMsg({
                    ok: false,
                    text: res.message ?? tr("تعذّر إنشاء الحساب."),
                  });
                }
              } catch {
                setCreateMsg({ ok: false, text: tr("تعذّر الاتصال بالخادم.") });
              } finally {
                setBusyCreate(false);
              }
            }}
          >
            <label className="block">
              <span className="mb-1 block text-xs font-extrabold">{tr("الاسم الكامل")}</span>
              <input
                type="text"
                required
                minLength={2}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={tr("اسم المشترك")}
                className="field w-full bg-paper"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-extrabold">{tr("البريد الإلكتروني")}</span>
              <input
                type="email"
                required
                dir="ltr"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@example.com"
                className="field w-full bg-paper"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-extrabold">{tr("الرقم السري (8+ أحرف)")}</span>
              <div className="flex items-center gap-1 rounded-xl border border-line bg-paper px-3 py-2">
                <input
                  type={showNewPass ? "text" : "password"}
                  required
                  minLength={8}
                  dir="ltr"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="********"
                  className="w-full bg-transparent text-sm font-bold outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass((v) => !v)}
                  className="text-muted hover:text-ink"
                >
                  {showNewPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-extrabold">{tr("الدور / الصلاحية")}</span>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="field w-full bg-paper"
              >
                <option value="member">{tr("عضو عادي")}</option>
                {roles
                  .filter((r) => r.key !== "member")
                  .map((r) => (
                    <option key={r.key} value={r.key}>
                      {trv(r.name)}
                    </option>
                  ))}
              </select>
            </label>
            <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-end gap-2 pt-1">
              <button
                type="submit"
                disabled={busyCreate}
                className="rounded-2xl bg-primary px-5 py-2.5 text-xs font-extrabold text-ink shadow-xs transition hover:brightness-95 disabled:opacity-50"
              >
                {busyCreate ? tr("جاري الإنشاء…") : tr("حفظ المشترك وتعيين الرقم السري")}
              </button>
            </div>
            {createMsg ? (
              <p
                className={`sm:col-span-2 lg:col-span-4 rounded-xl px-3 py-2 text-xs font-extrabold ${
                  createMsg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
                }`}
              >
                {createMsg.text}
              </p>
            ) : null}
          </form>
        ) : null}

        {/* Search Subscribers Bar */}
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void loadOverview(q);
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tr("ابحث عن مشترك بالاسم أو البريد الإلكتروني…")}
            className="field flex-1"
          />
          <button type="submit" className="btn">
            {tr("بحث")}
          </button>
          <button
            type="button"
            onClick={() => {
              setQ("");
              void loadOverview("");
            }}
            className="btn btn-ghost"
            title={tr("تحديث القائمة")}
          >
            <RefreshCw className="size-4" />
          </button>
        </form>

        {/* Subscribers List */}
        {loading ? (
          <p className="mt-4 rounded-2xl bg-surface p-4 text-center text-sm font-bold text-muted">
            {tr("جاري تحميل قائمة المشتركين…")}
          </p>
        ) : members.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-surface p-4 text-center text-sm font-bold text-muted">
            {tr("لا يوجد مشتركون مطابقون للبحث.")}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {members.map((m) => {
              const isEditingPw = editingUserId === m.id;
              const fb = memberFeedback[m.id];
              return (
                <li
                  key={m.id}
                  className={`rounded-2xl border border-line bg-surface/50 p-4 transition ${
                    m.blocked ? "opacity-75" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {m.image ? (
                        <img
                          src={m.image}
                          alt=""
                          className="size-11 shrink-0 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/30 text-sm font-extrabold text-ink">
                          {(m.name || "؟").slice(0, 1)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-extrabold text-ink">{m.name}</p>
                          {m.role === "adminmaster" ? (
                            <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-extrabold text-ink">
                              {tr("المالك الرئيسي")}
                            </span>
                          ) : null}
                          {m.hasPassword ? (
                            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-800">
                              {tr("لديه رقم سري")}
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-900">
                              {tr("دخول اجتماعي (بدون رقم سري بعد)")}
                            </span>
                          )}
                          {m.blocked ? (
                            <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-[11px] font-extrabold text-red-700">
                              {tr("محظور")}
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-xs font-bold text-muted" dir="ltr">
                          {m.email}
                        </p>
                      </div>
                    </div>

                    {/* Action Controls for Subscriber */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (isEditingPw) {
                            setEditingUserId("");
                            setMemberNewPw("");
                          } else {
                            setEditingUserId(m.id);
                            setMemberNewPw("");
                            setShowMemberPw(true);
                          }
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-extrabold shadow-xs transition ${
                          isEditingPw
                            ? "bg-ink text-paper"
                            : "bg-primary text-ink hover:brightness-95"
                        }`}
                      >
                        <KeyRound className="size-3.5" />
                        {isEditingPw ? tr("إلغاء") : tr("تغيير الرقم السري")}
                      </button>

                      <select
                        value={m.role}
                        disabled={busyMemberId === m.id || m.role === "adminmaster"}
                        aria-label={tr("الدور")}
                        onChange={async (e) => {
                          const nextRole = e.target.value;
                          setBusyMemberId(m.id);
                          try {
                            const res = await callAdminRpc<{ ok: boolean; message?: string }>(
                              "set-member-role",
                              { userId: m.id, role: nextRole },
                            );
                            setMemberFeedback((prev) => ({
                              ...prev,
                              [m.id]: {
                                ok: res.ok,
                                text: res.message ?? (res.ok ? tr("تم تحديث الدور.") : tr("تعذّر تحديث الدور.")),
                              },
                            }));
                            await loadOverview(q);
                          } finally {
                            setBusyMemberId("");
                          }
                        }}
                        className="rounded-xl border border-line bg-paper px-3 py-2 text-xs font-extrabold text-ink"
                      >
                        {m.role === "adminmaster" ? (
                          <option value="adminmaster">{tr("المالك الرئيسي")}</option>
                        ) : null}
                        <option value="member">{tr("عضو")}</option>
                        {roles
                          .filter((r) => r.key !== "member")
                          .map((r) => (
                            <option key={r.key} value={r.key}>
                              {trv(r.name)}
                            </option>
                          ))}
                      </select>

                      {m.role !== "adminmaster" ? (
                        <button
                          type="button"
                          disabled={busyMemberId === m.id}
                          onClick={async () => {
                            if (
                              !m.blocked &&
                              !confirm(tr("هل تريد حظر هذا المشترك وإغلاق جلسته الحالية؟"))
                            )
                              return;
                            setBusyMemberId(m.id);
                            try {
                              const res = await callAdminRpc<{ ok: boolean; message?: string }>(
                                "toggle-member-block",
                                { userId: m.id, blocked: !m.blocked },
                              );
                              setMemberFeedback((prev) => ({
                                ...prev,
                                [m.id]: {
                                  ok: res.ok,
                                  text: res.message ?? tr("تم التحديث."),
                                },
                              }));
                              await loadOverview(q);
                            } finally {
                              setBusyMemberId("");
                            }
                          }}
                          className={`rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                            m.blocked
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                          }`}
                        >
                          {m.blocked ? tr("إلغاء الحظر") : tr("حظر")}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Expandable Inline Password Reset Box */}
                  {isEditingPw ? (
                    <form
                      className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-primary bg-paper p-3 shadow-xs"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (memberNewPw.trim().length < 8) {
                          setMemberFeedback((prev) => ({
                            ...prev,
                            [m.id]: {
                              ok: false,
                              text: tr("الرقم السري يجب أن يتكون من 8 أحرف أو أرقام على الأقل."),
                            },
                          }));
                          return;
                        }
                        setBusyMemberId(m.id);
                        try {
                          const res = await callAdminRpc<{ ok: boolean; message?: string }>(
                            "set-member-password",
                            { userId: m.id, newPassword: memberNewPw.trim() },
                          );
                          setMemberFeedback((prev) => ({
                            ...prev,
                            [m.id]: {
                              ok: res.ok,
                              text:
                                res.message ??
                                (res.ok
                                  ? tr("تم حفظ الرقم السري الجديد للمشترك!")
                                  : tr("تعذّر حفظ الرقم السري.")),
                            },
                          }));
                          if (res.ok) {
                            setEditingUserId("");
                            setMemberNewPw("");
                            await loadOverview(q);
                          }
                        } catch {
                          setMemberFeedback((prev) => ({
                            ...prev,
                            [m.id]: { ok: false, text: tr("تعذّر الاتصال بالخادم.") },
                          }));
                        } finally {
                          setBusyMemberId("");
                        }
                      }}
                    >
                      <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
                        <Lock className="size-4 shrink-0 text-muted" />
                        <input
                          type={showMemberPw ? "text" : "password"}
                          required
                          minLength={8}
                          dir="ltr"
                          value={memberNewPw}
                          onChange={(e) => setMemberNewPw(e.target.value)}
                          placeholder={tr("اكتب الرقم السري الجديد (8+ أحرف أو أرقام)")}
                          className="w-full bg-transparent text-sm font-bold text-ink outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowMemberPw((v) => !v)}
                          className="text-muted hover:text-ink"
                        >
                          {showMemberPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      <button
                        type="submit"
                        disabled={busyMemberId === m.id}
                        className="rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-ink shadow-xs transition hover:brightness-95 disabled:opacity-50"
                      >
                        {busyMemberId === m.id ? tr("جاري الحفظ…") : tr("حفظ الرقم السري الجديد")}
                      </button>
                    </form>
                  ) : null}

                  {fb ? (
                    <p
                      className={`mt-2 rounded-xl px-3 py-2 text-xs font-extrabold ${
                        fb.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
                      }`}
                    >
                      {fb.text}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function AdminLoginPortal({
  who,
  error,
  setError,
  onSuccess,
}: {
  who: { name: string; signedIn: boolean };
  error: string;
  setError: (msg: string) => void;
  onSuccess: () => Promise<void>;
}) {
  const st = useSiteSettings();
  const [activeSide, setActiveSide] = useState<"owner" | "team">("owner");
  const [showOwnerPass, setShowOwnerPass] = useState(false);
  const [showTeamPass, setShowTeamPass] = useState(false);
  const [busyOwner, setBusyOwner] = useState(false);
  const [busyTeam, setBusyTeam] = useState(false);
  const [busySocial, setBusySocial] = useState("");
  const [teamError, setTeamError] = useState("");

  const handleSocial = async (provider: "google" | "facebook") => {
    setBusySocial(provider);
    setTeamError("");
    setError("");
    try {
      const { authClient, signInWith } = await import("@/lib/auth/client");
      if (who.signedIn) {
        await authClient.signOut().catch(() => {});
      }
      await signInWith(provider, "/admin");
    } catch {
      setTeamError(tr("تعذّر بدء تسجيل الدخول عبر المنصة. حاول مرة أخرى."));
      setBusySocial("");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface text-ink">
      {/* Split Two-Tone Brand Background matching login.tsx and Rahat Post brand colors */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
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
        <div className="w-full max-w-5xl overflow-hidden rounded-[2.25rem] bg-paper shadow-[0_24px_70px_rgba(16,24,40,0.14)] ring-1 ring-black/5">
          {/* Mobile Top Switcher Banner */}
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
                  <p className="text-xs font-extrabold opacity-80">{trv(st.texts.siteName)}</p>
                  <h1 className="text-lg font-extrabold">{tr("بوابة لوحة التحكم")}</h1>
                </div>
              </div>
              <div className="flex rounded-full bg-ink/10 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSide("owner");
                    setError("");
                    setTeamError("");
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                    activeSide === "owner"
                      ? "bg-ink text-paper shadow-xs"
                      : "text-ink hover:bg-ink/10"
                  }`}
                >
                  {tr("دخول المالك")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSide("team");
                    setError("");
                    setTeamError("");
                  }}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
                    activeSide === "team"
                      ? "bg-ink text-paper shadow-xs"
                      : "text-ink hover:bg-ink/10"
                  }`}
                >
                  {tr("دخول الفريق")}
                </button>
              </div>
            </div>
          </div>

          {/* 3-Column Split Layout: [Owner Master Login] | [Center Welcome Strip] | [Team Account Login] */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_250px_1fr]">
            {/* ==================== COLUMN 1: OWNER MASTER PASSWORD LOGIN ==================== */}
            <section
              aria-label={tr("دخول مالك الموقع")}
              className={`flex flex-col justify-between p-6 sm:p-8 lg:p-9 transition-opacity ${
                activeSide === "team" ? "hidden lg:flex lg:opacity-95" : "flex"
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
                    {tr("أدخل كلمة المرور الرئيسية للوصول الكامل إلى لوحة التحكم")}
                  </p>
                </div>

                <form
                  className="flex flex-col gap-3.5"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    setError("");
                    const fd = new FormData(event.currentTarget);
                    const password = String(fd.get("password") ?? "");
                    const remember = fd.get("remember") === "on";
                    setBusyOwner(true);
                    try {
                      const rpc = await callAdminRpc<{
                        ok: boolean;
                        message?: string;
                        masterEmail?: string;
                      }>("owner-login", { password, remember });
                      if (rpc.ok) {
                        if (rpc.masterEmail) {
                          try {
                            const { authClient } = await import("@/lib/auth/client");
                            await authClient.signIn.email({
                              email: rpc.masterEmail,
                              password,
                              rememberMe: remember,
                            });
                          } catch {
                            /* cookie auth already set */
                          }
                        }
                        setError("");
                        await onSuccess();
                        return;
                      }
                      const res = await adminLogin({ data: { password, remember } });
                      if (res.ok) {
                        setError("");
                        await onSuccess();
                      } else {
                        setError(rpc.message ?? res.message ?? tr("كلمة المرور غير صحيحة."));
                      }
                    } catch {
                      setError(tr("تعذّر الاتصال. حاول مرة أخرى."));
                    } finally {
                      setBusyOwner(false);
                    }
                  }}
                >
                  <input type="text" name="username" value="admin" autoComplete="username" readOnly hidden />
                  <label className="group flex items-center gap-3 rounded-2xl border border-transparent bg-surface px-4 py-3.5 transition focus-within:border-primary focus-within:bg-paper focus-within:shadow-xs">
                    <Lock className="size-5 shrink-0 text-muted transition group-focus-within:text-ink" />
                    <input
                      name="password"
                      type={showOwnerPass ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      dir="ltr"
                      placeholder={tr("كلمة مرور لوحة التحكم")}
                      aria-label={tr("كلمة مرور لوحة التحكم")}
                      onFocus={() => setActiveSide("owner")}
                      className="w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-muted"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowOwnerPass((v) => !v)}
                      className="text-muted hover:text-ink"
                      aria-label={showOwnerPass ? tr("إخفاء كلمة المرور") : tr("إظهار كلمة المرور")}
                    >
                      {showOwnerPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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

                  {error ? (
                    <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                      {trv(error)}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={busyOwner}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-extrabold text-ink shadow-sm transition hover:brightness-95 disabled:opacity-50"
                  >
                    <ShieldCheck className="size-4" />
                    {busyOwner ? tr("جاري الدخول…") : tr("دخول لوحة التحكم")}
                  </button>
                </form>

                <p className="mt-5 text-center text-xs font-bold text-muted lg:hidden">
                  {tr("هل أنت مشرف أو محرر؟")}{" "}
                  <button
                    type="button"
                    onClick={() => setActiveSide("team")}
                    className="font-extrabold text-ink underline"
                  >
                    {tr("دخول أعضاء الفريق")}
                  </button>
                </p>
              </div>
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

              <div className="relative z-10 my-6 flex w-full flex-col items-center gap-5">
                <h2 className="text-2xl font-extrabold leading-tight">
                  {tr("لوحة التحكم")}
                </h2>

                <div className="flex w-full flex-col items-center gap-2">
                  <p className="text-xs font-bold opacity-85">{tr("إدارة الموقع الكاملة")}</p>
                  <button
                    type="button"
                    onClick={() => setActiveSide("owner")}
                    className={`w-full max-w-[165px] rounded-full border-2 border-ink px-5 py-2 text-xs font-extrabold transition ${
                      activeSide === "owner"
                        ? "bg-ink text-paper shadow-sm"
                        : "bg-transparent text-ink hover:bg-ink hover:text-paper"
                    }`}
                  >
                    {tr("دخول المالك")}
                  </button>
                </div>

                <div className="h-px w-12 bg-ink/20" />

                <div className="flex w-full flex-col items-center gap-2">
                  <p className="text-xs font-bold opacity-85">{tr("المشرفون والمحررون")}</p>
                  <button
                    type="button"
                    onClick={() => setActiveSide("team")}
                    className={`w-full max-w-[165px] rounded-full border-2 border-ink px-5 py-2 text-xs font-extrabold transition ${
                      activeSide === "team"
                        ? "bg-ink text-paper shadow-sm"
                        : "bg-transparent text-ink hover:bg-ink hover:text-paper"
                    }`}
                  >
                    {tr("دخول الفريق")}
                  </button>
                </div>
              </div>

              <p className="relative z-10 text-[11px] font-bold opacity-75">
                {tr("بوابتك لإدارة الأخبار والإعلانات والأقسام")}
              </p>
            </aside>

            {/* ==================== COLUMN 3: TEAM MEMBER LOGIN ==================== */}
            <section
              aria-label={tr("دخول أعضاء الفريق")}
              className={`flex flex-col justify-between p-6 sm:p-8 lg:p-9 transition-opacity ${
                activeSide === "owner" ? "hidden lg:flex lg:opacity-95" : "flex"
              }`}
            >
              <div className="my-auto flex flex-col">
                <div className="mb-5 text-center">
                  <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                    {tr("أعضاء الفريق")}
                  </h2>
                  <p className="mt-1.5 text-xs font-semibold text-muted">
                    {tr("دخول المشرفين والكتّاب المعتمدين بحساباتهم")}
                  </p>
                </div>

                {who.signedIn ? (
                  <div className="mb-4 rounded-2xl border border-amber-300/80 bg-amber-50/80 p-3.5 text-xs font-bold text-amber-950">
                    <p>
                      {tr("أنت مسجّل الدخول حالياً بحساب لا يملك صلاحية فريق الإدارة. يمكنك الدخول بكلمة مرور المالك، أو تسجيل الدخول بحساب فريق معتمد أدناه.")}
                    </p>
                  </div>
                ) : null}

                <form
                  className="flex flex-col gap-3"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    setTeamError("");
                    const f = new FormData(event.currentTarget);
                    const email = String(f.get("email") ?? "").trim();
                    const password = String(f.get("password") ?? "");
                    const rememberMe = f.get("remember") === "on";
                    setBusyTeam(true);
                    try {
                      const { authClient } = await import("@/lib/auth/client");
                      if (who.signedIn) {
                        await authClient.signOut().catch(() => {});
                      }
                      const res = await authClient.signIn.email({
                        email,
                        password,
                        rememberMe,
                      });
                      if (res.error) {
                        setTeamError(tr("البريد الإلكتروني أو كلمة المرور غير صحيحة."));
                        return;
                      }
                      await onSuccess();
                    } catch {
                      setTeamError(tr("تعذّر الاتصال. حاول مرة أخرى."));
                    } finally {
                      setBusyTeam(false);
                    }
                  }}
                >
                  <label className="group flex items-center gap-3 rounded-2xl border border-transparent bg-surface px-4 py-3.5 transition focus-within:border-primary focus-within:bg-paper focus-within:shadow-xs">
                    <User className="size-5 shrink-0 text-muted transition group-focus-within:text-ink" />
                    <input
                      name="email"
                      type="email"
                      required
                      autoComplete="username"
                      dir="ltr"
                      placeholder={tr("البريد الإلكتروني للعضو")}
                      aria-label={tr("البريد الإلكتروني")}
                      onFocus={() => setActiveSide("team")}
                      className="w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-muted"
                    />
                  </label>

                  <label className="group flex items-center gap-3 rounded-2xl border border-transparent bg-surface px-4 py-3.5 transition focus-within:border-primary focus-within:bg-paper focus-within:shadow-xs">
                    <Lock className="size-5 shrink-0 text-muted transition group-focus-within:text-ink" />
                    <input
                      name="password"
                      type={showTeamPass ? "text" : "password"}
                      required
                      minLength={8}
                      maxLength={128}
                      autoComplete="current-password"
                      dir="ltr"
                      placeholder={tr("كلمة المرور")}
                      aria-label={tr("كلمة المرور")}
                      onFocus={() => setActiveSide("team")}
                      className="w-full bg-transparent text-sm font-semibold text-ink outline-none placeholder:text-muted"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowTeamPass((v) => !v)}
                      className="text-muted hover:text-ink"
                      aria-label={showTeamPass ? tr("إخفاء كلمة المرور") : tr("إظهار كلمة المرور")}
                    >
                      {showTeamPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </label>

                  <label className="flex cursor-pointer items-center gap-2 px-1 text-xs font-bold text-muted hover:text-ink">
                    <input
                      type="checkbox"
                      name="remember"
                      defaultChecked
                      className="size-4 rounded accent-primary"
                    />
                    {tr("تذكرني")}
                  </label>

                  {teamError ? (
                    <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                      {trv(teamError)}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={busyTeam || Boolean(busySocial)}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-extrabold text-ink shadow-sm transition hover:brightness-95 disabled:opacity-50"
                  >
                    <LogIn className="size-4" />
                    {busyTeam ? tr("جاري الدخول…") : tr("دخول بحساب الفريق")}
                  </button>
                </form>

                {/* Social Team Login */}
                <div className="mt-4 flex flex-col items-center gap-3">
                  <div className="flex w-full items-center gap-2 text-xs font-bold text-muted">
                    <span className="h-px flex-1 bg-line" />
                    <span>{tr("أو الدخول عبر المنصات الاجتماعية")}</span>
                    <span className="h-px flex-1 bg-line" />
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleSocial("google")}
                      disabled={Boolean(busySocial)}
                      title={tr("المتابعة باستخدام Google")}
                      aria-label={tr("المتابعة باستخدام Google")}
                      className="flex size-11 items-center justify-center rounded-full border border-line bg-surface/80 text-ink shadow-xs transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary/15 disabled:opacity-50"
                    >
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
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSocial("facebook")}
                      disabled={Boolean(busySocial)}
                      title={tr("المتابعة باستخدام Facebook")}
                      aria-label={tr("المتابعة باستخدام Facebook")}
                      className="flex size-11 items-center justify-center rounded-full border border-line bg-surface/80 text-ink shadow-xs transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary/15 disabled:opacity-50"
                    >
                      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                        <path
                          fill="#1877F2"
                          d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12Z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                <p className="mt-5 text-center text-xs font-bold text-muted lg:hidden">
                  {tr("هل أنت مالك الموقع؟")}{" "}
                  <button
                    type="button"
                    onClick={() => setActiveSide("owner")}
                    className="font-extrabold text-ink underline"
                  >
                    {tr("دخول المالك بكلمة المرور")}
                  </button>
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function AdminPage() {
  const gate = Route.useLoaderData();
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [items, setItems] = useState<BusinessSubmission[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [tab, setTab] = useState<BusinessSubmission["status"]>("pending");
  const [section, setSection] = useState<Section>("home");
  const [activeSecId, setActiveSecId] = useState<string>("news");
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const [level, setLevel] = useState<AdminLevel | null>(null);
  const [perms, setPerms] = useState<string[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sideCollapsed, setSideCollapsed] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);
  const [who, setWho] = useState({ name: "", signedIn: false });

  const refresh = useCallback(async () => {
    const me = await adminWhoami();
    setLevel(me.level);
    setPerms(me.perms);
    setWho({ name: me.name, signedIn: me.signedIn });
    if (!me.level) {
      setState("login");
      return;
    }
    if (me.level === "writer") {
      setSection("publish");
      setState("ready");
      return;
    }
    if (me.level === "moderator" && !me.perms.includes("moderate_directory")) {
      setState("ready");
      return;
    }
    const res = await adminList();
    if (!res.authed) {
      setState("login");
      return;
    }
    setItems(res.items);
    setError(res.ok ? "" : tr("تعذّر تحميل الطلبات من التخزين."));
    setState("ready");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (state === "loading") {
    return (
      <Shell>
        <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>
      </Shell>
    );
  }

  if (state === "login" || (gate.denied && !level)) {
    return (
      <AdminLoginPortal
        who={who}
        error={error}
        setError={setError}
        onSuccess={refresh}
      />
    );
  }

  const act = async (id: string, action: "approved" | "rejected" | "pending" | "delete") => {
    if (action === "delete" && !confirm(tr("حذف الطلب نهائياً؟"))) return;
    setBusyId(id);
    try {
      await adminDecide({ data: { id, action } });
      await refresh();
    } catch {
      setError(tr("تعذّر تنفيذ العملية."));
    } finally {
      setBusyId("");
    }
  };

  const list = items.filter((i) => i.status === tab);
  const TAB_PERM: Partial<Record<Section, string>> = {
    ads: "moderate_haraj",
    "haraj-cats": "moderate_haraj",
    news: "moderate_news",
    matches: "moderate_news",
    "sec-add": "moderate_news",
    "sec-manage": "moderate_news",
    "sec-news": "moderate_news",
    reports: "moderate_news",
    comments: "moderate_comments",
    directory: "moderate_directory",
    publish: "write_news",
  };
  const isMod = level === "moderator" && ["moderate_haraj", "moderate_news", "moderate_comments"].some((p) => perms.includes(p));
  const tabs = ALL_TABS.filter(({ key }) =>
    level === "owner"
      ? true
      : level === "writer"
        ? key === "publish"
        : key === "home" || key === "review"
          ? isMod
          : Boolean(TAB_PERM[key] && perms.includes(TAB_PERM[key]!)),
  );
  const visibleGroups = GROUPS.filter((g) => groupItems(g, tabs).length);
  const current: Section =
    tabs.some((t) => t.key === section) || visibleGroups.some((g) => `grp-${g.id}` === section) ? section : (tabs[0]?.key ?? "news");
  const go = (k: string) => {
    const g = k.startsWith("grp-") ? GROUPS.find((x) => `grp-${x.id}` === k) : undefined;
    if (g) k = groupItems(g, tabs)[0]?.key ?? "home";
    setSection(k as Section);
    setMenuOpen(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };
  const landing = undefined as (typeof GROUPS)[number] | undefined;
  const curGroup = landing ?? GROUPS.find((g) => g.keys.includes(current));
  const activeTabObj = tabs.find((t) => t.key === current);
  const logout = async () => {
    setMenuOpen(false);
    await adminLogout();
    setState("login");
  };

  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className={`mx-auto max-w-6xl lg:grid lg:gap-6 lg:px-6 lg:py-6 ${sideCollapsed ? "lg:grid-cols-[minmax(0,1fr)]" : "lg:grid-cols-[17.5rem_minmax(0,1fr)]"}`}>
        <aside className={sideCollapsed ? "hidden" : "hidden lg:block"}>
          <div className="sticky top-6 flex max-h-[calc(100vh-3rem)] flex-col gap-3 overflow-y-auto rounded-3xl bg-paper p-3.5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
            <div className="flex items-center justify-between px-2 pt-1">
              <Link to="/" className="flex items-center gap-2 text-sm font-bold text-muted hover:text-ink">
                <ArrowRight className="size-4 rtl:rotate-0 ltr:rotate-180" aria-hidden />
                {tr("العودة للموقع")}
              </Link>
              <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-extrabold text-primary-ink">
                {level === "owner" ? tr("المالك") : level === "moderator" ? tr("مشرف") : tr("كاتب")}
              </span>
            </div>
            <AdminMenu tabs={tabs} section={current} reviewCount={reviewCount} onSelect={go} onLogout={logout} />
          </div>
        </aside>
        <div className="min-w-0 px-4 pb-10 pt-4 lg:px-0 lg:pt-0">
          {/* Tidy Header Bar */}
          <header className="mb-4 flex flex-wrap items-center gap-3 rounded-3xl bg-paper p-3.5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
            <button
              type="button"
              className="grid size-10 shrink-0 place-items-center rounded-2xl bg-surface hover:bg-primary-soft"
              aria-label={tr("فتح القائمة")}
              aria-expanded={menuOpen || (!sideCollapsed && isDesktop())}
              aria-controls="admin-drawer"
              onClick={() => (isDesktop() ? setSideCollapsed((v) => !v) : setMenuOpen(true))}
            >
              <Menu className="size-5" aria-hidden />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-muted">
                {tr("لوحة تحكم رهط بوست")} {curGroup ? `· ${trv(curGroup.label)}` : ""}
              </p>
              <h1 className="truncate text-xl font-extrabold sm:text-2xl">
                {trv(activeTabObj?.label ?? curGroup?.label ?? "الإدارة")}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <LangSwitcher />
              <span
                className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-sm font-extrabold text-ink"
                title={level === "owner" ? tr("المالك") : who.name}
                aria-label={level === "owner" ? tr("المالك") : who.name}
              >
                {level === "owner" && !who.name ? <BadgeCheck className="size-5" aria-hidden /> : (who.name || "?").slice(0, 1)}
              </span>
            </div>
          </header>

          {/* Always-visible Mobile & Desktop Quick Control Bar */}
          {level !== "writer" ? (
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <button
                type="button"
                onClick={() => go("matches")}
                className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-extrabold shadow-xs transition ${
                  current === "matches"
                    ? "bg-ink text-paper ring-2 ring-ink/30"
                    : "bg-[#DC2626] text-white hover:bg-[#B91C1C]"
                }`}
              >
                <Trophy className="size-4 shrink-0" aria-hidden />
                <span>{tr("🔴 البث والمباريات")}</span>
              </button>
              <button
                type="button"
                onClick={() => go("sec-add")}
                className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-extrabold shadow-xs transition ${
                  current === "sec-add"
                    ? "bg-ink text-paper ring-2 ring-ink/30"
                    : "bg-brand text-ink hover:opacity-90"
                }`}
              >
                <FolderPlus className="size-4 shrink-0" aria-hidden />
                <span>{tr("+ إضافة قسم")}</span>
              </button>
              <button
                type="button"
                onClick={() => go("sec-manage")}
                className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-extrabold shadow-xs transition ${
                  current === "sec-manage"
                    ? "bg-ink text-paper ring-2 ring-ink/30"
                    : "border border-line bg-paper text-ink hover:bg-primary-soft"
                }`}
              >
                <LayoutGrid className="size-4 shrink-0" aria-hidden />
                <span>{tr("إدارة الأقسام")}</span>
              </button>
              <button
                type="button"
                onClick={() => go("publish")}
                className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-extrabold shadow-xs transition ${
                  current === "publish"
                    ? "bg-ink text-paper ring-2 ring-ink/30"
                    : "bg-[#16A34A] text-white hover:bg-[#15803D]"
                }`}
              >
                <PenSquare className="size-4 shrink-0" aria-hidden />
                <span>{tr("✍️ نشر خبر جديد")}</span>
              </button>
              <button
                type="button"
                onClick={() => setMenuOpen(true)}
                className=" col-span-2 sm:col-span-1 flex items-center justify-center gap-2 rounded-2xl border border-line bg-paper px-3 py-3 text-xs font-extrabold text-ink shadow-xs transition hover:bg-primary-soft lg:hidden"
              >
                <Menu className="size-4 shrink-0" aria-hidden />
                <span>{tr("كل أقسام اللوحة")}</span>
              </button>
              <button
                type="button"
                onClick={() => go("home")}
                className={`hidden lg:flex items-center justify-center gap-2 rounded-2xl border border-line px-3 py-3 text-xs font-extrabold shadow-xs transition ${
                  current === "home" ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-primary-soft"
                }`}
              >
                <House className="size-4 shrink-0" aria-hidden />
                <span>{tr("لوحة المتابعة")}</span>
              </button>
            </div>
          ) : null}

          {level !== "writer" ? (
            <div className="mb-4">
              <AdminSearch sections={tabs.map((t) => ({ key: t.key, label: t.label }))} go={go} />
            </div>
          ) : null}
          {curGroup && groupItems(curGroup, tabs).length > 1 ? (
            <div
              className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
              role="tablist"
              aria-label={trv(curGroup.label)}
            >
              {groupItems(curGroup, tabs).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={current === key}
                  onClick={() => go(key)}
                  className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-extrabold shadow-xs transition ${
                    current === key
                      ? "bg-ink text-paper ring-2 ring-ink/25"
                      : "border border-line bg-paper text-ink hover:bg-primary-soft"
                  }`}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{trv(label)}</span>
                </button>
              ))}
            </div>
          ) : null}
          <CardBoundary key={current}>
          <Suspense fallback={<Skeleton rows={4} />}>
          {current === "home" ? (
            <div className="space-y-4">
              {level === "owner" ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-primary/50 bg-paper p-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary text-ink">
                      <KeyRound className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-extrabold text-ink">
                        {tr("إدارة الرقم السري للمالك والمشتركين")}
                      </p>
                      <p className="text-xs font-semibold text-muted">
                        {tr("غيّر الرقم السري للوحة التحكم أو عيّن رقماً سرياً جديداً لأي مشترك مباشرة")}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => go("members-passwords")}
                    className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-extrabold text-ink shadow-xs transition hover:brightness-95"
                  >
                    <KeyRound className="size-4" />
                    {tr("فتح إدارة كلمات المرور")}
                  </button>
                </div>
              ) : null}
              <DashboardHome
                go={go}
                icons={{ haraj: Megaphone, comments: MessageSquare, news: Newspaper, reports: Flag, members: Users, sold: ShoppingBag, stats: BarChart3 }}
              />
            </div>
          ) : current === "review" ? (
            <ReviewQueue onCount={setReviewCount} />
          ) : current === "publish" ? (
            <PublishAdmin />
          ) : current === "matches" ? (
            <MatchesAdmin />
          ) : current === "languages" ? (
            <LanguagesAdmin />
          ) : current === "gemini" ? (
            <GeminiAdmin />
          ) : current === "stats" ? (
            <StatsAdmin />
          ) : current === "store" ||
            current === "store-orders" ||
            current === "store-cats" ||
            current === "store-offers" ||
            current === "store-merchants" ||
            current === "store-pay" ? (
            <StoreAndMerchantsAdmin
              key={current}
              initialTab={
                current === "store-orders"
                  ? "orders"
                  : current === "store-cats"
                    ? "categories"
                    : current === "store-offers"
                      ? "offers"
                      : current === "store-merchants"
                        ? "merchants"
                        : current === "store-pay"
                          ? "pay"
                          : "products"
              }
              isOwner={level === "owner"}
            />
          ) : landing ? (
            <GroupLanding group={landing} tabs={tabs} go={go} />
          ) : current.startsWith("set-") ? (
            <SiteSettingsAdmin key={current} only={current.slice(4) as SiteSettingsPart} />
          ) : current === "sec-add" ? (
            <QuickCustomSectionsBar
              mode="add"
              currentId={activeSecId}
              onSelectSection={(id) => {
                setActiveSecId(id);
                go("sec-manage");
              }}
            />
          ) : current === "sec-manage" ? (
            <div className="space-y-4">
              <StaggeredRssScheduleCard />
              <QuickCustomSectionsBar
                mode="manage"
                currentId={activeSecId}
                onSelectSection={(id) => setActiveSecId(id)}
              />
              <SectionAdmin key={`sec-mng-${activeSecId}`} id={activeSecId as "news"} />
            </div>
          ) : current.startsWith("sec-") ? (
            <div className="space-y-4">
              <StaggeredRssScheduleCard />
              <QuickCustomSectionsBar
                mode="manage"
                currentId={current.slice(4)}
                onSelectSection={(id) => {
                  setActiveSecId(id);
                  go("sec-manage");
                }}
              />
              <SectionAdmin key={current} id={current.slice(4) as "news"} />
            </div>
          ) : current === "auto" ? (
            <div className="space-y-4">
              <StaggeredRssScheduleCard />
              <AutoNewsAdmin />
            </div>
          ) : current === "popups" ? (
            <PopupsAdmin />
          ) : current === "emails" ? (
            <EmailAdmin />
          ) : current === "members-passwords" ? (
            <PasswordAndMembersManager />
          ) : current === "members-list" ? (
            <div className="space-y-6">
              <PasswordAndMembersManager />
            </div>
          ) : current.startsWith("members-") ? (
            <MembersAdmin key={current} only={current.slice(8) as "list"} />
          ) : current === "comments" ? (
            <CommentsAdmin />
          ) : current === "reports" ? (
            <ReportsAdmin />
          ) : current === "buses" ? (
            <BusLinesAdmin />
          ) : current === "duty" ? (
            <DutyAdmin />
          ) : current === "alerts" ? (
            <AlertsAdmin />
          ) : current === "push" ? (
            <PushAdmin />
          ) : current === "haraj-cats" ? (
            <HarajCategoriesAdmin />
          ) : current === "ads" ? (
            <AdsAdmin />
          ) : current === "news" ? (
            <NewsAdmin />
          ) : (
            <>
              <div className="scroll-row mb-4">
                {(Object.keys(STATUS) as BusinessSubmission["status"][]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={tab === s ? "chip chip-ink shrink-0" : "chip shrink-0 bg-paper"}
                    onClick={() => setTab(s)}
                  >
                    {trv(STATUS[s])} ({trv(items.filter((i) => i.status === s).length)})
                  </button>
                ))}
              </div>
              {error ? <p className="stamp mb-3 p-3 font-bold">{trv(error)}</p> : null}
              {list.length === 0 ? (
                <p className="stamp p-4 font-semibold">{tr("لا طلبات هنا.")}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {list.map((item) => (
                    <li key={item.id} className="stamp p-4">
                      <span className="chip">{trv(item.category)}</span>
                      <h2 className="mt-2 text-xl font-bold">{trv(item.name)}</h2>
                      <p className="font-semibold">{trv(item.area)}</p>
                      <p className="mt-1">{trv(item.about)}</p>
                      <PhotoStrip keys={item.photo ? [item.photo] : []} />
                      <p className="mt-1 font-bold" dir="ltr">
                        {trv(item.phone)}
                      </p>
                      <p className="text-sm font-semibold text-muted">
                        {item.posterName ? `${item.posterName} · ` : ""}
                        {new Date(item.createdAt).toLocaleString("ar-u-nu-latn", {
                          timeZone: "Asia/Jerusalem",
                        })}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {item.status !== "approved" ? (
                          <button
                            type="button"
                            className="btn"
                            disabled={busyId === item.id}
                            onClick={() => act(item.id, "approved")}
                          >
                            {tr("موافقة")}
                          </button>
                        ) : null}
                        {item.status !== "rejected" ? (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            disabled={busyId === item.id}
                            onClick={() => act(item.id, "rejected")}
                          >
                            {tr("رفض")}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={busyId === item.id}
                          onClick={() => act(item.id, "delete")}
                        >
                          {tr("حذف")}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          </Suspense>
          </CardBoundary>
        </div>
      </div>
      <div className={`fixed inset-0 z-50 lg:hidden ${menuOpen ? "" : "pointer-events-none"}`} aria-hidden={!menuOpen}>
        <button
          type="button"
          tabIndex={menuOpen ? 0 : -1}
          className={`absolute inset-0 h-full w-full bg-black/40 transition-opacity duration-200 ${menuOpen ? "opacity-100" : "opacity-0"}`}
          aria-label={tr("إغلاق القائمة")}
          onClick={() => setMenuOpen(false)}
        />
        <div
          id="admin-drawer"
          role="dialog"
          aria-modal="true"
          aria-label={tr("قائمة الإدارة")}
          className={`absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col gap-3 overflow-y-auto bg-paper p-4 shadow-xl transition-transform duration-200 ${
            menuOpen ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-lg font-extrabold">{tr("لوحة الإدارة")}</p>
            <button type="button" className="grid size-9 place-items-center rounded-full bg-surface" aria-label={tr("إغلاق")} onClick={() => setMenuOpen(false)}>
              <X className="size-5" aria-hidden />
            </button>
          </div>
          {menuOpen ? <AdminMenu tabs={tabs} section={current} reviewCount={reviewCount} onSelect={go} onLogout={logout} /> : null}
          <Link to="/" className="mt-auto flex items-center gap-2 px-3 pt-2 text-sm font-bold text-muted">
            <ArrowRight className="size-4 ltr:rotate-180" aria-hidden />
            {tr("العودة للموقع")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function AdsAdmin() {
  const [items, setItems] = useState<OwnListing[] | null>(null);
  const [tab, setTab] = useState<ListingStatus>("pending");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const refresh = useCallback(async () => {
    const res = await adminListListings();
    setItems(res.items);
    setError(!res.authed ? tr("انتهت الجلسة. سجّل الدخول من جديد.") : res.ok ? "" : tr("تعذّر تحميل الإعلانات."));
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (id: string, action: ListingStatus | "delete") => {
    if (action === "delete" && !confirm(tr("حذف الإعلان نهائياً؟"))) return;
    setBusyId(id);
    try {
      await adminDecideListing({ data: { id, action } });
      await refresh();
    } catch {
      setError(tr("تعذّر تنفيذ العملية."));
    } finally {
      setBusyId("");
    }
  };

  if (!items) return <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>;
  const list = items.filter((i) => i.status === tab);
  const btn = (l: OwnListing, action: ListingStatus | "delete", label: string, ghost = true) => (
    <button type="button" className={ghost ? "btn btn-ghost" : "btn"} disabled={busyId === l.id} onClick={() => act(l.id, action)}>
      {label}
    </button>
  );

  return (
    <>
      <div className="stamp mb-3 flex flex-wrap items-center gap-2 p-3">
        <p className="min-w-0 flex-1 text-sm font-semibold">
          {tr("إعلانات تجريبية: {0} (تظهر بشارة «إعلان تجريبي» ولا تُفهرس).", items.filter((i) => i.sample).length)}
        </p>
        <button type="button" className="btn btn-ghost" disabled={busyId === "samples"} onClick={async () => {
          if (!confirm(tr("حذف كل إعلانات المثال وصورها؟"))) return;
          setBusyId("samples"); try { await adminSamples({ data: { action: "remove" } }); await refresh(); } finally { setBusyId(""); }
        }}>{tr("حذف كل الأمثلة")}</button>
        <button type="button" className="btn btn-ghost" disabled={busyId === "samples"} onClick={async () => {
          setBusyId("samples"); try { await adminSamples({ data: { action: "add" } }); await refresh(); } finally { setBusyId(""); }
        }}>{tr("إضافة الأمثلة")}</button>
      </div>
      <p className="mb-3 font-semibold text-muted">{tr("كل إعلان جديد أو معدّل ينتظر الموافقة قبل ظهوره في الحراج. البلاغات المتكررة تعيد الإعلان للمراجعة.")}</p>
      <div className="scroll-row mb-4">
        {(Object.keys(STATUS_LABEL) as ListingStatus[]).map((s) => (
          <button key={s} type="button" className={tab === s ? "chip chip-ink shrink-0" : "chip shrink-0"} onClick={() => setTab(s)}>
            {trv(STATUS_LABEL[s])} ({trv(items.filter((i) => i.status === s).length)})
          </button>
        ))}
      </div>
      {error ? <p className="stamp mb-3 p-3 font-bold">{trv(error)}</p> : null}
      {list.length === 0 ? (
        <p className="stamp p-4 font-semibold">{tr("لا إعلانات هنا.")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((l) => (
            <li key={l.id} className="stamp p-4">
              <div className="flex flex-wrap gap-1">
                <span className="chip">{trv(l.category)}</span>
                <span className="chip">{trv(l.condition)}</span>
                {l.sold ? <span className="chip chip-ink">{tr("انباع")}</span> : null}
                {l.sample ? <span className="chip">{tr("إعلان تجريبي")}</span> : null}
                {l.expired ? <span className="chip">{tr("منتهي")}</span> : null}
              </div>
              <h2 className="mt-2 text-xl font-bold">{trv(l.title)}</h2>
              <p className="font-semibold">{trv(priceLabel(l))} · {trv(l.area)}</p>
              <p className="mt-1 whitespace-pre-line">{trv(l.description)}</p>
              <PhotoStrip keys={l.photos} />
              <p className="mt-1 font-bold" dir="ltr">{l.phone}{l.hidePhone ? " (hidden)" : ""}</p>
              <p className="text-sm font-semibold text-muted">
                {l.seller.name} · {new Date(l.updatedAt).toLocaleString("ar-u-nu-latn", { timeZone: "Asia/Jerusalem" })}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {l.status !== "approved" ? btn(l, "approved", tr("موافقة"), false) : null}
                {l.status !== "hidden" ? btn(l, "hidden", tr("إخفاء")) : null}
                {l.status !== "rejected" ? btn(l, "rejected", tr("رفض")) : null}
                {btn(l, "delete", tr("حذف"))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function NewsAdmin() {
  const [items, setItems] = useState<OwnReaderNews[] | null>(null);
  const [tab, setTab] = useState<OwnReaderNews["status"]>("pending");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const refresh = useCallback(async () => {
    const res = await adminListNews();
    setItems(res.items);
    setError(
      !res.authed ? tr("انتهت الجلسة. سجّل الدخول من جديد.") : res.ok ? "" : tr("تعذّر تحميل الأخبار."),
    );
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (id: string, action: "approved" | "rejected" | "delete") => {
    if (action === "delete" && !confirm(tr("حذف الخبر نهائياً؟"))) return;
    setBusyId(id);
    try {
      await adminDecideNews({ data: { id, action } });
      await refresh();
    } catch {
      setError(tr("تعذّر تنفيذ العملية."));
    } finally {
      setBusyId("");
    }
  };

  if (!items) return <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>;
  const list = items.filter((i) => i.status === tab);

  return (
    <>
      <div className="scroll-row mb-4">
        {(Object.keys(STATUS) as OwnReaderNews["status"][]).map((s) => (
          <button
            key={s}
            type="button"
            className={tab === s ? "chip chip-ink shrink-0" : "chip shrink-0"}
            onClick={() => setTab(s)}
          >
            {trv(STATUS[s])} ({trv(items.filter((i) => i.status === s).length)})
          </button>
        ))}
      </div>
      {error ? <p className="stamp mb-3 p-3 font-bold">{trv(error)}</p> : null}
      {list.length === 0 ? (
        <p className="stamp p-4 font-semibold">{tr("لا أخبار هنا.")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((item) => (
            <li key={item.id} className="stamp p-4">
              <span className="chip">{trv(item.neighborhood)}</span>
              <h2 className="mt-2 text-xl font-bold">{trv(item.title)}</h2>
              <p className="mt-1 whitespace-pre-line">{trv(item.body)}</p>
              {item.sourceUrl ? (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-1 block break-all text-sm font-bold underline"
                  dir="ltr"
                >
                  {trv(item.sourceUrl)}
                </a>
              ) : null}
              <p className="mt-1 text-sm font-semibold text-muted">
                {trv(item.posterName)} ·{" "}
                {new Date(item.updatedAt).toLocaleString("ar-u-nu-latn", {
                  timeZone: "Asia/Jerusalem",
                })}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {item.status !== "approved" ? (
                  <button
                    type="button"
                    className="btn"
                    disabled={busyId === item.id}
                    onClick={() => act(item.id, "approved")}
                  >
                    {tr("موافقة")}
                  </button>
                ) : null}
                {item.status !== "rejected" ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busyId === item.id}
                    onClick={() => act(item.id, "rejected")}
                  >
                    {tr("رفض")}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busyId === item.id}
                  onClick={() => act(item.id, "delete")}
                >
                  {tr("حذف")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const ESPN_LEAGUE_PRESETS: { id: string; nameAr: string; shortAr: string; countryAr: string; badge: string }[] = [
  { id: "esp.1", nameAr: "الدوري الإسباني (لا ليغا)", shortAr: "لا ليغا", countryAr: "إسبانيا", badge: "🇪🇸" },
  { id: "eng.1", nameAr: "الدوري الإنجليزي الممتاز", shortAr: "البريميرليغ", countryAr: "إنجلترا", badge: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { id: "uefa.champions", nameAr: "دوري أبطال أوروبا", shortAr: "أبطال أوروبا", countryAr: "أوروبا", badge: "🏆" },
  { id: "isr.1", nameAr: "الدوري الإسرائيلي الممتاز (ليغات هاعل)", shortAr: "ليغات هاعل", countryAr: "إسرائيل", badge: "⚽" },
  { id: "ita.1", nameAr: "الدوري الإيطالي (سيريا A)", shortAr: "سيريا A", countryAr: "إيطاليا", badge: "🇮🇹" },
  { id: "ger.1", nameAr: "الدوري الألماني (بوندسليغا)", shortAr: "بوندسليغا", countryAr: "ألمانيا", badge: "🇩🇪" },
  { id: "fra.1", nameAr: "الدوري الفرنسي (ليغ 1)", shortAr: "ليغ 1", countryAr: "فرنسا", badge: "🇫🇷" },
  { id: "ksa.1", nameAr: "دوري روشن السعودي", shortAr: "دوري روشن", countryAr: "السعودية", badge: "🇸🇦" },
  { id: "uefa.europa", nameAr: "الدوري الأوروبي", shortAr: "الدوري الأوروبي", countryAr: "أوروبا", badge: "🟠" },
  { id: "esp.copa_del_rey", nameAr: "كأس ملك إسبانيا", shortAr: "كأس الملك", countryAr: "إسبانيا", badge: "👑" },
  { id: "eng.fa", nameAr: "كأس الاتحاد الإنجليزي", shortAr: "كأس إنجلترا", countryAr: "إنجلترا", badge: "🏅" },
  { id: "fifa.world", nameAr: "كأس العالم وتصفياته", shortAr: "كأس العالم", countryAr: "دولي", badge: "🌍" },
];

function MatchesAdmin() {
  const [settings, setSettings] = useState<MatchesSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const [newLeagueId, setNewLeagueId] = useState("");
  const [newLeagueName, setNewLeagueName] = useState("");
  const [newLeagueShort, setNewLeagueShort] = useState("");
  const [newLeagueCountry, setNewLeagueCountry] = useState("");
  const [newLeagueBadge, setNewLeagueBadge] = useState("⚽");

  const [matchLeagueId, setMatchLeagueId] = useState("local.negev");
  const [matchLeagueName, setMatchLeagueName] = useState("مباريات رهط والنقب");
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [kickoff, setKickoff] = useState("20:00");
  const [dateOffset, setDateOffset] = useState<-1 | 0 | 1>(0);
  const [matchStatus, setMatchStatus] = useState<CustomMatchStatus>("pre");
  const [matchMinute, setMatchMinute] = useState("");
  const [matchNote, setMatchNote] = useState("");
  const [matchStreamUrl, setMatchStreamUrl] = useState("");
  const [matchChannel, setMatchChannel] = useState("");
  const [homeGoalsText, setHomeGoalsText] = useState("");
  const [awayGoalsText, setAwayGoalsText] = useState("");
  const [homeYellowCards, setHomeYellowCards] = useState(0);
  const [homeRedCards, setHomeRedCards] = useState(0);
  const [awayYellowCards, setAwayYellowCards] = useState(0);
  const [awayRedCards, setAwayRedCards] = useState(0);

  const load = async () => {
    const res = await adminGetMatchesSettings();
    if (res.authed) setSettings(res.settings);
  };

  useEffect(() => {
    void load();
  }, []);

  if (!settings) {
    return <p className="stamp p-4 font-semibold">{tr("جاري تحميل إعدادات المباريات والدوريات…")}</p>;
  }

  const save = async (next: MatchesSettings, customMsg?: string) => {
    setBusy(true);
    setMsg("");
    try {
      const res = await adminSaveMatchesSettings({ data: next });
      if (res.ok && res.settings) {
        setSettings(res.settings);
        setMsg(customMsg ?? "تم حفظ إعدادات المباريات والدوريات بنجاح ✓");
      } else {
        setMsg(res.message ?? "تعذر حفظ الإعدادات");
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleLeague = (id: string) => {
    const next: MatchesSettings = {
      ...settings,
      leagues: settings.leagues.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l)),
    };
    void save(next);
  };

  const moveLeague = (idx: number, dir: -1 | 1) => {
    const copy = [...settings.leagues];
    const target = idx + dir;
    if (target < 0 || target >= copy.length) return;
    const [item] = copy.splice(idx, 1);
    copy.splice(target, 0, item);
    void save({ ...settings, leagues: copy });
  };

  const removeLeague = (id: string) => {
    if (!confirm("إزالة هذا الدوري من القائمة؟")) return;
    const next: MatchesSettings = {
      ...settings,
      leagues: settings.leagues.filter((l) => l.id !== id),
      defaultLeague: settings.defaultLeague === id ? "all" : settings.defaultLeague,
    };
    void save(next);
  };

  const addLeague = (preset?: { id: string; nameAr: string; shortAr: string; countryAr: string; badge: string }) => {
    const id = (preset?.id ?? newLeagueId).trim().toLowerCase();
    const nameAr = (preset?.nameAr ?? newLeagueName).trim();
    const shortAr = (preset?.shortAr ?? (newLeagueShort || nameAr)).trim();
    const countryAr = (preset?.countryAr ?? (newLeagueCountry || "دولي")).trim();
    const badge = (preset?.badge ?? (newLeagueBadge || "⚽")).trim();
    if (!id || !nameAr) {
      setMsg("الرجاء إدخال معرّف الدوري واسمه بالعربية.");
      return;
    }
    if (settings.leagues.some((l) => l.id === id)) {
      const next: MatchesSettings = {
        ...settings,
        leagues: settings.leagues.map((l) => (l.id === id ? { ...l, enabled: true } : l)),
      };
      void save(next, `تم تفعيل «${nameAr}» ✓`);
      return;
    }
    const nextLeague: LeagueConfig = { id, nameAr, shortAr, countryAr, badge, enabled: true };
    void save(
      { ...settings, leagues: [...settings.leagues, nextLeague] },
      `تمت إضافة دوري «${nameAr}» بنجاح ✓`,
    );
    setNewLeagueId("");
    setNewLeagueName("");
    setNewLeagueShort("");
    setNewLeagueCountry("");
  };

  const addCustomMatch = () => {
    if (!homeTeam.trim() || !awayTeam.trim()) {
      setMsg("الرجاء إدخال اسم الفريق المضيف والفريق الضيف.");
      return;
    }
    const parseAdminGoalInput = (raw: string): { m: string; s: string }[] => {
      return raw
        .split(/[,،;\n]+/)
        .map((x) => x.trim())
        .filter(Boolean)
        .map((entry) => {
          const matchMin = entry.match(/^(.*?)\s*(\d+(?:\+\d+)?\x27?)$/);
          if (matchMin && matchMin[1].trim()) {
            const minVal = matchMin[2].endsWith("\x27") ? matchMin[2] : `${matchMin[2]}\x27`;
            return { s: matchMin[1].trim(), m: minVal };
          }
          const matchMinFirst = entry.match(/^(\d+(?:\+\d+)?\x27?)\s*[:\-]?\s*(.+)$/);
          if (matchMinFirst && matchMinFirst[2].trim()) {
            const minVal = matchMinFirst[1].endsWith("\x27") ? matchMinFirst[1] : `${matchMinFirst[1]}\x27`;
            return { s: matchMinFirst[2].trim(), m: minVal };
          }
          return { s: entry, m: "" };
        });
    };

    const hgList = parseAdminGoalInput(homeGoalsText);
    const agList = parseAdminGoalInput(awayGoalsText);
    const metaPayload = {
      hg: hgList,
      ag: agList,
      hy: Number(homeYellowCards) || 0,
      hr: Number(homeRedCards) || 0,
      ay: Number(awayYellowCards) || 0,
      ar: Number(awayRedCards) || 0,
      min: matchMinute.trim() || undefined,
    };
    const metaTag = `{{META:${JSON.stringify(metaPayload)}}}`;

    const cleanStream = matchStreamUrl.trim() || undefined;
    const cleanChan = matchChannel.trim() || undefined;
    const cleanNote = matchNote.trim();
    const combinedNote =
      [
        cleanChan ? `[${cleanChan}]` : "",
        cleanNote,
        cleanStream ?? "",
        metaTag,
      ]
        .filter(Boolean)
        .join(" ")
        .trim() || undefined;

    const item: CustomMatch = {
      id: `cm-${Date.now()}`,
      leagueId: matchLeagueId.trim() || "local.negev",
      leagueNameAr: matchLeagueName.trim() || "مباريات اليوم · بث مباشر",
      homeTeam: homeTeam.trim(),
      awayTeam: awayTeam.trim(),
      homeScore: Number(homeScore) || 0,
      awayScore: Number(awayScore) || 0,
      kickoff: kickoff.trim() || "20:00",
      dateOffset,
      status: matchStatus,
      minute: matchMinute.trim() || undefined,
      note: combinedNote,
      streamUrl: cleanStream,
      channel: cleanChan,
    };
    const next: MatchesSettings = {
      ...settings,
      customMatches: [item, ...settings.customMatches],
    };
    void save(next, `تمت إضافة مباراة «${item.homeTeam} ضد ${item.awayTeam}» ${cleanStream ? "(مع البث المباشر 📺)" : ""} ✓`);
    setHomeTeam("");
    setAwayTeam("");
    setHomeScore(0);
    setAwayScore(0);
    setMatchMinute("");
    setMatchNote("");
    setMatchStreamUrl("");
    setMatchChannel("");
    setHomeGoalsText("");
    setAwayGoalsText("");
    setHomeYellowCards(0);
    setHomeRedCards(0);
    setAwayYellowCards(0);
    setAwayRedCards(0);
  };

  const updateCustomMatch = (id: string, patch: Partial<CustomMatch>) => {
    const next: MatchesSettings = {
      ...settings,
      customMatches: settings.customMatches.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    };
    void save(next, "تم تحديث نتيجة المباراة ✓");
  };

  const deleteCustomMatch = (id: string) => {
    const next: MatchesSettings = {
      ...settings,
      customMatches: settings.customMatches.filter((m) => m.id !== id),
    };
    void save(next, "تم حذف المباراة اليدوية ✓");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-paper p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-brand text-ink shadow-xs">
              <Trophy className="size-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-xl font-extrabold">{tr("إدارة نتائج المباريات والدوريات (الليغا والعالم)")}</h2>
              <p className="text-xs font-semibold text-muted">
                {tr("تحديث مباشر وتلقائي لنتائج ومواعيد مباريات الدوري الإسباني (لا ليغا)، الإنجليزي، أبطال أوروبا، والدوري المحلي، مع إمكانية إضافة مباريات محلية يدوياً.")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await adminRefreshMatchesNow();
                  setMsg(r.message);
                } finally {
                  setBusy(false);
                }
              }}
              className="flex items-center gap-1.5 rounded-2xl bg-ink px-4 py-2.5 text-xs font-extrabold text-paper shadow-xs transition hover:opacity-90"
            >
              <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} aria-hidden />
              {tr("تحديث النتائج الآن")}
            </button>
            <Link
              to="/sports-news"
              className="flex items-center gap-1.5 rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-xs font-extrabold hover:bg-primary-soft"
            >
              {tr("معاينة صفحة الرياضة")}
            </Link>
          </div>
        </div>

        {msg ? (
          <div className="mt-3 rounded-2xl bg-primary-soft/60 px-4 py-2.5 text-xs font-extrabold text-ink">
            {trv(msg)}
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-line pt-4 sm:grid-cols-3">
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-surface p-3.5">
            <div>
              <p className="text-sm font-extrabold">{tr("تفعيل جدول المباريات")}</p>
              <p className="text-[11px] font-semibold text-muted">{tr("إظهار النتائج في صفحة الرياضة")}</p>
            </div>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => void save({ ...settings, enabled: e.target.checked })}
              className="size-5 accent-[#16A34A]"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-surface p-3.5">
            <div>
              <p className="text-sm font-extrabold">{tr("إظهار الشريط في الرئيسية")}</p>
              <p className="text-[11px] font-semibold text-muted">{tr("شريط المباريات أعلى الصفحة الرئيسية")}</p>
            </div>
            <input
              type="checkbox"
              checked={settings.showOnHome}
              onChange={(e) => void save({ ...settings, showOnHome: e.target.checked })}
              className="size-5 accent-[#16A34A]"
            />
          </label>

          <label className="flex flex-col justify-center rounded-2xl bg-surface p-3.5">
            <span className="text-xs font-extrabold text-muted">{tr("الدوري الافتراضي عند فتح الجدول")}</span>
            <select
              value={settings.defaultLeague}
              onChange={(e) => void save({ ...settings, defaultLeague: e.target.value })}
              className="mt-1 rounded-xl border border-line bg-paper px-2.5 py-1.5 text-xs font-extrabold"
            >
              <option value="all">{tr("كل الدوريات المفعلة")}</option>
              {settings.leagues
                .filter((l) => l.enabled)
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.badge} {l.nameAr}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </div>

      <div className="rounded-3xl bg-paper p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold">{tr("الدوريات والبطولات المتاحة")}</h3>
            <p className="text-xs font-semibold text-muted">
              {tr("فعّل أو أخفِ أي دوري، ورتّب أولوية ظهوره للزوار (مثلاً: الليغا الإسبانية أولاً أو الدوري المحلي أولاً).")}
            </p>
          </div>
          <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-extrabold text-primary-ink">
            {settings.leagues.filter((l) => l.enabled).length} {tr("دوري مفعّل")}
          </span>
        </div>

        <ul className="space-y-2">
          {settings.leagues.map((l, idx) => (
            <li
              key={l.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-3 transition ${
                l.enabled ? "border-line bg-surface/60" : "border-line/50 bg-surface/20 opacity-60"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-paper text-lg shadow-2xs">
                  {l.badge}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-sm font-extrabold">{l.nameAr}</p>
                    <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold text-muted">
                      {l.countryAr}
                    </span>
                    <code className="rounded bg-paper px-1.5 py-0.5 text-[10px] text-muted" dir="ltr">
                      {l.id}
                    </code>
                    {settings.defaultLeague === l.id ? (
                      <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-extrabold text-ink">
                        {tr("الافتراضي")}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void save({ ...settings, defaultLeague: settings.defaultLeague === l.id ? "all" : l.id })}
                  title={tr("تعيين كدوري افتراضي")}
                  className={`grid size-8 place-items-center rounded-xl border transition ${
                    settings.defaultLeague === l.id
                      ? "border-brand bg-brand text-ink"
                      : "border-line bg-paper text-muted hover:text-ink"
                  }`}
                >
                  <Star className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => moveLeague(idx, -1)}
                  className="grid size-8 place-items-center rounded-xl border border-line bg-paper text-muted hover:text-ink disabled:opacity-30"
                  title={tr("تحريك لأعلى")}
                >
                  <ArrowUp className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={idx === settings.leagues.length - 1}
                  onClick={() => moveLeague(idx, 1)}
                  className="grid size-8 place-items-center rounded-xl border border-line bg-paper text-muted hover:text-ink disabled:opacity-30"
                  title={tr("تحريك لأسفل")}
                >
                  <ArrowDown className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => toggleLeague(l.id)}
                  className={`flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
                    l.enabled ? "bg-[#16A34A] text-white" : "border border-line bg-paper text-muted"
                  }`}
                >
                  {l.enabled ? <Eye className="size-3.5" aria-hidden /> : <EyeOff className="size-3.5" aria-hidden />}
                  {l.enabled ? tr("مفعّل") : tr("مخفي")}
                </button>
                {!l.builtin ? (
                  <button
                    type="button"
                    onClick={() => removeLeague(l.id)}
                    className="grid size-8 place-items-center rounded-xl border border-line bg-paper text-[#DC2626] hover:bg-[#DC2626]/10"
                    title={tr("حذف الدوري")}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 text-xs font-extrabold text-muted">
            {tr("+ إضافة بطولات ودوريات سريعة بضغطة واحدة:")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ESPN_LEAGUE_PRESETS.map((p) => {
              const exists = settings.leagues.some((l) => l.id === p.id && l.enabled);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addLeague(p)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    exists
                      ? "bg-primary-soft text-primary-ink"
                      : "border border-line bg-surface hover:bg-primary-soft/50"
                  }`}
                >
                  <span>{p.badge}</span>
                  <span>{p.shortAr}</span>
                  {exists ? <Check className="size-3.5" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl bg-surface p-3.5">
            <p className="mb-2 text-xs font-extrabold">{tr("أو أضف دوري مخصص (رمز ESPN أو دوري محلي):")}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
              <input
                type="text"
                value={newLeagueId}
                onChange={(e) => setNewLeagueId(e.target.value)}
                placeholder="الرمز مثل esp.1 أو local.rahat"
                dir="ltr"
                className="field text-xs"
              />
              <input
                type="text"
                value={newLeagueName}
                onChange={(e) => setNewLeagueName(e.target.value)}
                placeholder="الاسم الكامل (مثلاً: دوري رهط)"
                className="field text-xs"
              />
              <input
                type="text"
                value={newLeagueShort}
                onChange={(e) => setNewLeagueShort(e.target.value)}
                placeholder="الاسم المختصر (دوري رهط)"
                className="field text-xs"
              />
              <input
                type="text"
                value={newLeagueBadge}
                onChange={(e) => setNewLeagueBadge(e.target.value)}
                placeholder="الرمز التعبيري ⚽"
                className="field text-xs"
              />
              <button
                type="button"
                onClick={() => addLeague()}
                className="btn flex items-center justify-center gap-1.5 py-2 text-xs"
              >
                <Plus className="size-4" aria-hidden />
                {tr("إضافة الدوري")}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-paper p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-base font-extrabold">
              <span className="size-2.5 animate-ping rounded-full bg-[#DC2626]" />
              {tr("إضافة مباراة اليوم · بث مباشر 🔴 (أو مباراة محلية)")}
            </h3>
            <p className="text-xs font-semibold text-muted">
              {tr("أضف مباراة اليوم وحدد حالتها «مباشر الآن 🔴» وضع رابط البث المباشر (يوتيوب / فيسبوك / بث حي) ليظهر زر «📺 مشاهدة البث المباشر» للزوار داخل الموقع.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => {
                setMatchStatus("in");
                setDateOffset(0);
                setMatchLeagueName("مباريات اليوم · بث مباشر");
              }}
              className="rounded-full bg-[#DC2626] px-3 py-1.5 text-xs font-extrabold text-white shadow-2xs hover:bg-[#B91C1C]"
            >
              🔴 {tr("تجهيز مباراة اليوم بث مباشر")}
            </button>
            <button
              type="button"
              onClick={() => {
                setHomeTeam("ريال مدريد");
                setAwayTeam("برشلونة");
                setMatchLeagueId("esp.1");
                setMatchLeagueName("الدوري الإسباني (لا ليغا)");
                setMatchStatus("in");
                setDateOffset(0);
                setMatchChannel("beIN Sports 1");
              }}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-bold hover:bg-primary-soft"
            >
              🇪🇸 {tr("الكلاسيكو (مباشر)")}
            </button>
            <button
              type="button"
              onClick={() => {
                setHomeTeam("شباب رهط");
                setAwayTeam("هبوعيل رهط");
                setMatchLeagueId("local.negev");
                setMatchLeagueName("ديربي رهط والنقب");
                setMatchStatus("in");
                setDateOffset(0);
                setMatchChannel("بث مباشر رهط بوست");
              }}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-bold hover:bg-primary-soft"
            >
              🏟️ {tr("ديربي رهط (مباشر)")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-2xl bg-surface p-4 sm:grid-cols-4">
          <label className="text-xs font-bold">
            {tr("الفريق المضيف (صاحب الأرض)")}
            <input
              type="text"
              value={homeTeam}
              onChange={(e) => setHomeTeam(e.target.value)}
              placeholder="مثال: شباب رهط / ريال مدريد"
              className="field mt-1 text-xs"
            />
          </label>
          <label className="text-xs font-bold">
            {tr("الفريق الضيف")}
            <input
              type="text"
              value={awayTeam}
              onChange={(e) => setAwayTeam(e.target.value)}
              placeholder="مثال: مكابي بئر السبع / برشلونة"
              className="field mt-1 text-xs"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-bold">
              {tr("أهداف المضيف")}
              <input
                type="number"
                min={0}
                value={homeScore}
                onChange={(e) => setHomeScore(Number(e.target.value))}
                className="field mt-1 text-center text-xs"
              />
            </label>
            <label className="text-xs font-bold">
              {tr("أهداف الضيف")}
              <input
                type="number"
                min={0}
                value={awayScore}
                onChange={(e) => setAwayScore(Number(e.target.value))}
                className="field mt-1 text-center text-xs"
              />
            </label>
          </div>
          <label className="text-xs font-bold">
            {tr("حالة المباراة")}
            <select
              value={matchStatus}
              onChange={(e) => setMatchStatus(e.target.value as CustomMatchStatus)}
              className="field mt-1 text-xs"
            >
              <option value="pre">{tr("لم تبدأ بعد")}</option>
              <option value="in">{tr("مباشر الآن 🔴")}</option>
              <option value="post">{tr("انتهت المباراة")}</option>
            </select>
          </label>

          <label className="text-xs font-bold">
            {tr("يوم المباراة")}
            <select
              value={dateOffset}
              onChange={(e) => setDateOffset(Number(e.target.value) as -1 | 0 | 1)}
              className="field mt-1 text-xs"
            >
              <option value={0}>{tr("اليوم")}</option>
              <option value={1}>{tr("غداً")}</option>
              <option value={-1}>{tr("أمس")}</option>
            </select>
          </label>

          <label className="text-xs font-bold">
            {tr("وقت البداية (الساعة)")}
            <input
              type="text"
              value={kickoff}
              onChange={(e) => setKickoff(e.target.value)}
              placeholder="20:00"
              dir="ltr"
              className="field mt-1 text-xs"
            />
          </label>

          <label className="text-xs font-bold">
            {tr("اسم البطولة")}
            <input
              type="text"
              value={matchLeagueName}
              onChange={(e) => setMatchLeagueName(e.target.value)}
              placeholder="مباريات رهط والنقب"
              className="field mt-1 text-xs"
            />
          </label>

          <label className="text-xs font-bold sm:col-span-2">
            📺 {tr("رابط البث المباشر (يوتيوب / فيسبوك لايف / رابط بث حي أو iframe)")}
            <input
              type="url"
              value={matchStreamUrl}
              onChange={(e) => setMatchStreamUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... أو رابط البث المباشر"
              dir="ltr"
              className="field mt-1 text-xs"
            />
          </label>

          <label className="text-xs font-bold">
            📡 {tr("القناة الناقلة / المعلق (اختياري)")}
            <input
              type="text"
              value={matchChannel}
              onChange={(e) => setMatchChannel(e.target.value)}
              placeholder="مثال: beIN Sports 1 / مكان 33"
              className="field mt-1 text-xs"
            />
          </label>

          <label className="text-xs font-bold">
            ⏱️ {tr("وقت المباراة المباشر (الدقيقة الحالية)")}
            <input
              type="text"
              value={matchMinute}
              onChange={(e) => setMatchMinute(e.target.value)}
              placeholder="مثال: 65' أو 45+2' أو استراحة"
              dir="ltr"
              className="field mt-1 text-xs"
            />
          </label>

          <label className="text-xs font-bold sm:col-span-2">
            ⚽ {tr("أهداف الفريق المضيف (اسم صاحب الهدف وبجانبه الدقيقة)")}
            <input
              type="text"
              value={homeGoalsText}
              onChange={(e) => setHomeGoalsText(e.target.value)}
              placeholder="مثال: ليفاندوفسكي 23'، لامين يامال 67'"
              className="field mt-1 text-xs"
            />
          </label>

          <label className="text-xs font-bold sm:col-span-2">
            ⚽ {tr("أهداف الفريق الضيف (اسم صاحب الهدف وبجانبه الدقيقة)")}
            <input
              type="text"
              value={awayGoalsText}
              onChange={(e) => setAwayGoalsText(e.target.value)}
              placeholder="مثال: مبابي 41'، بيلينغهام 82'"
              className="field mt-1 text-xs"
            />
          </label>

          <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-paper p-2.5 sm:col-span-2">
            <label className="text-[11px] font-extrabold">
              🟨 {tr("بطاقات صفراء (المضيف)")}
              <input
                type="number"
                min={0}
                value={homeYellowCards}
                onChange={(e) => setHomeYellowCards(Number(e.target.value))}
                className="field mt-1 text-center text-xs"
              />
            </label>
            <label className="text-[11px] font-extrabold">
              🟥 {tr("بطاقات حمراء (المضيف)")}
              <input
                type="number"
                min={0}
                value={homeRedCards}
                onChange={(e) => setHomeRedCards(Number(e.target.value))}
                className="field mt-1 text-center text-xs"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-paper p-2.5 sm:col-span-2">
            <label className="text-[11px] font-extrabold">
              🟨 {tr("بطاقات صفراء (الضيف)")}
              <input
                type="number"
                min={0}
                value={awayYellowCards}
                onChange={(e) => setAwayYellowCards(Number(e.target.value))}
                className="field mt-1 text-center text-xs"
              />
            </label>
            <label className="text-[11px] font-extrabold">
              🟥 {tr("بطاقات حمراء (الضيف)")}
              <input
                type="number"
                min={0}
                value={awayRedCards}
                onChange={(e) => setAwayRedCards(Number(e.target.value))}
                className="field mt-1 text-center text-xs"
              />
            </label>
          </div>

          <div className="flex items-end sm:col-span-4">
            <button
              type="button"
              onClick={addCustomMatch}
              className="btn flex w-full items-center justify-center gap-1.5 py-2.5 text-xs"
            >
              <Plus className="size-4" aria-hidden />
              {tr("إضافة المباراة والبث للجدول")}
            </button>
          </div>
        </div>

        {settings.customMatches.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-extrabold text-muted">{tr("المباريات المضافة يدوياً:")}</p>
            {settings.customMatches.map((cm) => (
              <div
                key={cm.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-surface/50 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold text-muted">
                      {cm.leagueNameAr} · {cm.kickoff}
                    </span>
                    {cm.streamUrl || (cm.note && /https?:\/\//i.test(cm.note)) ? (
                      <span className="rounded-full bg-[#DC2626] px-2 py-0.5 text-[10px] font-extrabold text-white">
                        📺 {tr("بث مباشر مفعّل")}
                      </span>
                    ) : null}
                    {cm.channel ? (
                      <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-extrabold text-primary-ink">
                        📡 {cm.channel}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-extrabold">
                    {cm.homeTeam} <span className="mx-1 text-primary-ink">({cm.homeScore} - {cm.awayScore})</span> {cm.awayTeam}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <input
                      type="url"
                      defaultValue={cm.streamUrl ?? (cm.note?.match(/https?:\/\/\S+/i)?.[0] ?? "")}
                      placeholder="https://... رابط البث المباشر (يوتيوب / فيسبوك / بث حي)"
                      dir="ltr"
                      onBlur={(e) => {
                        const val = e.target.value.trim();
                        if (val !== (cm.streamUrl ?? "")) {
                          const existingMeta = cm.note?.match(/\{\{META:\{[\s\S]*?\}\}\}/)?.[0] ?? "";
                          const chanPrefix = cm.channel ? `[${cm.channel}] ` : "";
                          updateCustomMatch(cm.id, {
                            streamUrl: val || undefined,
                            note: `${chanPrefix}${val} ${existingMeta}`.trim() || undefined,
                          });
                        }
                      }}
                      className="field max-w-xs py-1 text-[11px]"
                    />
                    <span className="text-[10px] font-semibold text-muted">
                      {tr("(الرابط يُحفظ تلقائياً عند الخروج من الخانة)")}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const scorer = window.prompt(`⚽ اسم مسجل الهدف لفريق ${cm.homeTeam} (اختياري):`, "") ?? "";
                      const min = window.prompt("⏱️ دقيقة الهدف (مثال: 34'):", cm.minute || "45'") ?? "";
                      let metaObj: any = { hg: [], ag: [], hy: 0, hr: 0, ay: 0, ar: 0 };
                      const mMatch = cm.note?.match(/\{\{META:(\{[\s\S]*?\})\}\}/);
                      if (mMatch) {
                        try { metaObj = { ...metaObj, ...JSON.parse(mMatch[1]) }; } catch {}
                      }
                      if (scorer.trim() || min.trim()) {
                        metaObj.hg = [...(metaObj.hg || []), { s: scorer.trim() || "هدف", m: min.trim() }];
                      }
                      const baseNote = (cm.note ?? "").replace(/\{\{META:\{[\s\S]*?\}\}\}/g, "").trim();
                      updateCustomMatch(cm.id, {
                        homeScore: cm.homeScore + 1,
                        note: `${baseNote} {{META:${JSON.stringify(metaObj)}}}`.trim(),
                      });
                    }}
                    className="rounded-xl border border-line bg-paper px-2.5 py-1 text-xs font-bold hover:bg-primary-soft"
                  >
                    ⚽ +1 {cm.homeTeam}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const scorer = window.prompt(`⚽ اسم مسجل الهدف لفريق ${cm.awayTeam} (اختياري):`, "") ?? "";
                      const min = window.prompt("⏱️ دقيقة الهدف (مثال: 67'):", cm.minute || "60'") ?? "";
                      let metaObj: any = { hg: [], ag: [], hy: 0, hr: 0, ay: 0, ar: 0 };
                      const mMatch = cm.note?.match(/\{\{META:(\{[\s\S]*?\})\}\}/);
                      if (mMatch) {
                        try { metaObj = { ...metaObj, ...JSON.parse(mMatch[1]) }; } catch {}
                      }
                      if (scorer.trim() || min.trim()) {
                        metaObj.ag = [...(metaObj.ag || []), { s: scorer.trim() || "هدف", m: min.trim() }];
                      }
                      const baseNote = (cm.note ?? "").replace(/\{\{META:\{[\s\S]*?\}\}\}/g, "").trim();
                      updateCustomMatch(cm.id, {
                        awayScore: cm.awayScore + 1,
                        note: `${baseNote} {{META:${JSON.stringify(metaObj)}}}`.trim(),
                      });
                    }}
                    className="rounded-xl border border-line bg-paper px-2.5 py-1 text-xs font-bold hover:bg-primary-soft"
                  >
                    ⚽ +1 {cm.awayTeam}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      let metaObj: any = { hg: [], ag: [], hy: 0, hr: 0, ay: 0, ar: 0 };
                      const mMatch = cm.note?.match(/\{\{META:(\{[\s\S]*?\})\}\}/);
                      if (mMatch) {
                        try { metaObj = { ...metaObj, ...JSON.parse(mMatch[1]) }; } catch {}
                      }
                      metaObj.hy = (Number(metaObj.hy) || 0) + 1;
                      const baseNote = (cm.note ?? "").replace(/\{\{META:\{[\s\S]*?\}\}\}/g, "").trim();
                      updateCustomMatch(cm.id, {
                        note: `${baseNote} {{META:${JSON.stringify(metaObj)}}}`.trim(),
                      });
                    }}
                    className="rounded-xl border border-line bg-paper px-2 py-1 text-[11px] font-bold"
                    title={`إضافة بطاقة صفراء لـ ${cm.homeTeam}`}
                  >
                    🟨+ المضيف
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      let metaObj: any = { hg: [], ag: [], hy: 0, hr: 0, ay: 0, ar: 0 };
                      const mMatch = cm.note?.match(/\{\{META:(\{[\s\S]*?\})\}\}/);
                      if (mMatch) {
                        try { metaObj = { ...metaObj, ...JSON.parse(mMatch[1]) }; } catch {}
                      }
                      metaObj.ay = (Number(metaObj.ay) || 0) + 1;
                      const baseNote = (cm.note ?? "").replace(/\{\{META:\{[\s\S]*?\}\}\}/g, "").trim();
                      updateCustomMatch(cm.id, {
                        note: `${baseNote} {{META:${JSON.stringify(metaObj)}}}`.trim(),
                      });
                    }}
                    className="rounded-xl border border-line bg-paper px-2 py-1 text-[11px] font-bold"
                    title={`إضافة بطاقة صفراء لـ ${cm.awayTeam}`}
                  >
                    🟨+ الضيف
                  </button>
                  <select
                    value={cm.status}
                    onChange={(e) => updateCustomMatch(cm.id, { status: e.target.value as CustomMatchStatus })}
                    className="rounded-xl border border-line bg-paper px-2 py-1 text-xs font-bold"
                  >
                    <option value="pre">{tr("لم تبدأ")}</option>
                    <option value="in">{tr("مباشر 🔴")}</option>
                    <option value="post">{tr("انتهت")}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => deleteCustomMatch(cm.id)}
                    className="grid size-8 place-items-center rounded-xl border border-line bg-paper text-[#DC2626]"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}


const QUICK_SECTION_PRESETS: { id: string; name: string; category: string; emoji: string; iconKey: string; defaultUrl: string }[] = [
  { id: "secart", name: "فن و موضة", category: "فن و موضة", emoji: "✨", iconKey: "sparkles", defaultUrl: "/?q=فن و موضة" },
  { id: "seclocal", name: "أخبار محلية", category: "رهط", emoji: "📰", iconKey: "news", defaultUrl: "/news?q=رهط" },
  { id: "secrahat", name: "أخبار رهط والنقب", category: "النقب", emoji: "📍", iconKey: "pin", defaultUrl: "/news?q=النقب" },
  { id: "seclive", name: "بث مباشر المباريات", category: "رياضة", emoji: "🔴", iconKey: "tv", defaultUrl: "/sports-news" },
  { id: "seccomm", name: "بلدية ومجتمع", category: "بلدية", emoji: "🏛️", iconKey: "news", defaultUrl: "/news?q=بلدية" },
  { id: "seceduc", name: "تعليم ومدارس", category: "تعليم", emoji: "🎓", iconKey: "news", defaultUrl: "/news?q=تعليم" },
  { id: "sececon", name: "اقتصاد وأعمال", category: "أعمال", emoji: "💼", iconKey: "store", defaultUrl: "/news?q=أعمال" },
];

const SECTION_PATH_PRESETS: { label: string; value: string }[] = [
  { label: "تلقائي: صفحة القسم المخصّص (/?q=اسم القسم)", value: "__auto__" },
  { label: "صفحة الأخبار مع فلتر القسم (/news?q=اسم القسم)", value: "__news_q__" },
  { label: "الأخبار المحلية (/news)", value: "/news" },
  { label: "الرياضة وبث المباريات (/sports-news)", value: "/sports-news" },
  { label: "أخبار إسرائيل (/israel-news)", value: "/israel-news" },
  { label: "أخبار التقنية (/tech-news)", value: "/tech-news" },
  { label: "سوق الحراج (/haraj)", value: "/haraj" },
  { label: "دليل المحلات والخدمات (/directory)", value: "/directory" },
  { label: "الباصات والخريطة المباشرة (/buses)", value: "/buses" },
  { label: "لوحة اليوم والطوارئ (/today)", value: "/today" },
  { label: "المتجر (/store)", value: "/store" },
  { label: "الصفحة الرئيسية (/)", value: "/" },
];

const EMOJI_TO_ICON_KEY: Record<string, string> = {
  "✨": "sparkles",
  "📰": "news",
  "📺": "tv",
  "🔴": "tv",
  "⚽": "trophy",
  "🚌": "bus",
  "📢": "ad",
  "🚨": "siren",
  "📍": "pin",
  "🛍️": "store",
  "💼": "store",
  "🌍": "globe",
  "💻": "cpu",
  "🏛️": "news",
  "🎓": "news",
};

const ICON_KEY_TO_EMOJI: Record<string, string> = {
  sparkles: "✨",
  news: "📰",
  tv: "📺",
  trophy: "⚽",
  bus: "🚌",
  ad: "📢",
  siren: "🚨",
  pin: "📍",
  store: "🛍️",
  globe: "🌍",
  cpu: "💻",
  home: "🏠",
  plus: "➕",
};


type SectionFeedItem = AdminSection["feeds"][number];
const BUILTIN_SECTION_IDS = new Set(["news", "israel", "sports", "tech", "weather"]);
const PRESET_NEW_SECTIONS: { name: string; slug: string; url: string; icon: string }[] = [
  { name: "فن و موضة", slug: "art-fashion", url: "/?q=فن و موضة", icon: "sparkles" },
  { name: "أخبار محلية", slug: "local-news", url: "/news?q=رهط", icon: "news" },
  { name: "أخبار رهط والنقب", slug: "rahat-negev", url: "/news?q=النقب", icon: "pin" },
  { name: "بلدية ومجتمع", slug: "municipality", url: "/news?q=بلدية", icon: "news" },
  { name: "تعليم ومدارس", slug: "education", url: "/news?q=تعليم", icon: "news" },
  { name: "اقتصاد وأعمال", slug: "business", url: "/news?q=أعمال", icon: "store" },
  { name: "ثقافة وفعاليات", slug: "events", url: "/?q=ثقافة وفعاليات", icon: "sparkles" },
];

const fmtFeedDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("ar-u-nu-latn", {
        timeZone: "Asia/Jerusalem",
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";

function SectionAdmin({ id }: { id: AdminSection["id"] }) {
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [activeId, setActiveId] = useState<string>(id || "news");
  const [sec, setSec] = useState<AdminSection | null>(null);
  const [secUrl, setSecUrl] = useState<string>("");
  const [secIcon, setSecIcon] = useState<string>("sparkles");
  const [msg, setMsg] = useState("");
  const [refreshMsg, setRefreshMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [edit, setEdit] = useState<Partial<SectionFeedItem> | null>(null);
  const [tests, setTests] = useState<Record<string, string>>({});

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newIcon, setNewIcon] = useState("sparkles");
  const [newHome, setNewHome] = useState(true);
  const [newInTop, setNewInTop] = useState(true);
  const [newInBot, setNewInBot] = useState(false);

  useEffect(() => {
    if (id) setActiveId(id);
  }, [id]);

  const syncSecMetaFromSettings = useCallback(
    (foundSec: AdminSection, st: SiteSettings | null) => {
      const cleanName = foundSec.name.trim();
      const defaultPath =
        foundSec.id === "news"
          ? "/news"
          : foundSec.id === "israel"
            ? "/israel-news"
            : foundSec.id === "sports"
              ? "/sports-news"
              : foundSec.id === "tech"
                ? "/tech-news"
                : `/?q=${cleanName}`;
      const defaultIc = /فن|موضة|ثقافة/.test(cleanName)
        ? "sparkles"
        : foundSec.id === "sports"
          ? "trophy"
          : foundSec.id === "tech"
            ? "cpu"
            : foundSec.id === "israel"
              ? "globe"
              : "news";
      if (!st) {
        setSecUrl(defaultPath);
        setSecIcon(defaultIc);
        return;
      }
      const ql = (st.quickLinks ?? []).find(
        (q) => q.id.startsWith("sec") && q.title.trim() === cleanName,
      );
      const topMatch = parseTopBarConfig(st.quickLinks).find(
        (b) => b.label.trim() === cleanName,
      );
      const botMatch = parseBotBarConfig(st.quickLinks).btns.find(
        (b) => b.label.trim() === cleanName,
      );
      setSecUrl(ql?.url || topMatch?.to || botMatch?.to || defaultPath);
      setSecIcon(
        topMatch?.icon ||
          botMatch?.icon ||
          (ql?.emoji ? EMOJI_TO_ICON_KEY[ql.emoji] : undefined) ||
          defaultIc,
      );
    },
    [],
  );

  const load = useCallback(
    async (preferId?: string) => {
      const [r, stRes] = await Promise.all([
        adminListSections(),
        adminGetSiteSettings().catch(() => ({ authed: false, settings: null })),
      ]);
      if (!r.authed) return setMsg(tr("هذا القسم للمالك والمشرفين فقط."));
      const st = stRes.authed && stRes.settings ? stRes.settings : null;
      if (st) setSiteSettings(st);
      setSections(r.sections);
      const targetId = preferId ?? activeId;
      const found =
        r.sections.find((s) => s.id === targetId) ?? r.sections[0] ?? null;
      if (found) {
        setActiveId(found.id);
        setSec(found);
        syncSecMetaFromSettings(found, st);
      }
    },
    [activeId, syncSecMetaFromSettings],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const selectSection = (nextId: string) => {
    setActiveId(nextId);
    const found = sections.find((s) => s.id === nextId) ?? null;
    setSec(found);
    if (found) syncSecMetaFromSettings(found, siteSettings);
    setEdit(null);
    setMsg("");
    setRefreshMsg("");
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newName.trim();
    if (!cleanName) return setMsg(tr("أدخل اسم القسم الجديد (مثل: فن و موضة)."));
    setBusy("create-sec");
    setMsg("");
    const targetUrl = (newUrl.trim() || `/?q=${cleanName}`).trim();
    const targetEmoji = ICON_KEY_TO_EMOJI[newIcon] ?? "✨";

    const r = await adminCreateSection({
      data: {
        name: cleanName,
        id: newSlug.trim() || undefined,
        home: newHome,
      },
    });

    if (siteSettings) {
      const secId = `sec${(r.id || Date.now().toString(36)).replace(/[^a-z0-9]/gi, "").slice(0, 10)}`;
      let nextLinks = siteSettings.quickLinks.filter(
        (q) => !(q.id.startsWith("sec") && q.title.trim() === cleanName),
      );
      nextLinks.push({
        id: secId,
        title: cleanName,
        subtitle: newInTop
          ? newHome
            ? "قسم في الرئيسية"
            : "مَخفي_رئيسية"
          : "مَخفي_علوي",
        url: targetUrl,
        emoji: targetEmoji,
      });

      if (newInTop) {
        const curTop = parseTopBarConfig(nextLinks);
        const updatedTop = curTop.some((b) => b.label.trim() === cleanName)
          ? curTop.map((b) =>
              b.label.trim() === cleanName
                ? { icon: newIcon, label: cleanName, to: targetUrl }
                : b,
            )
          : [...curTop, { icon: newIcon, label: cleanName, to: targetUrl }];
        nextLinks = encodeTopBarConfig(nextLinks, updatedTop);
      }

      if (newInBot) {
        const curBot = parseBotBarConfig(nextLinks);
        const updatedBot = curBot.btns.some((b) => b.label.trim() === cleanName)
          ? curBot.btns.map((b) =>
              b.label.trim() === cleanName
                ? { icon: newIcon, label: cleanName, to: targetUrl }
                : b,
            )
          : [...curBot.btns, { icon: newIcon, label: cleanName, to: targetUrl }];
        nextLinks = encodeBotBarConfig(nextLinks, curBot.style, updatedBot);
      }

      const savedSt = await adminSaveSiteSettings({
        data: { ...siteSettings, quickLinks: nextLinks },
      });
      if (savedSt.ok && savedSt.settings) setSiteSettings(savedSt.settings);
    }

    setBusy("");
    if (!r.ok) {
      setMsg(trv(r.message ?? tr("تعذّر إنشاء القسم.")));
      return;
    }
    setNewName("");
    setNewSlug("");
    setNewUrl("");
    setShowCreate(false);
    setMsg(`تم إنشاء وربط القسم «${cleanName}» بالمسار (${targetUrl}) بنجاح ✓`);
    await load(r.id);
  };

  const handleDeleteSection = async () => {
    if (!sec || BUILTIN_SECTION_IDS.has(sec.id)) return;
    if (!confirm(tr("هل أنت متأكد من حذف قسم «{0}» وجميع مصادره؟", sec.name)))
      return;
    setBusy("del-sec");
    const cleanName = sec.name.trim();
    const r = await adminDeleteSection({ data: { id: sec.id } });
    if (siteSettings) {
      let nextLinks = siteSettings.quickLinks.filter(
        (q) => !(q.id.startsWith("sec") && q.title.trim() === cleanName),
      );
      const curTop = parseTopBarConfig(nextLinks);
      nextLinks = encodeTopBarConfig(
        nextLinks,
        curTop.filter((b) => b.label.trim() !== cleanName),
      );
      const curBot = parseBotBarConfig(nextLinks);
      nextLinks = encodeBotBarConfig(
        nextLinks,
        curBot.style,
        curBot.btns.filter((b) => b.label.trim() !== cleanName),
      );
      await adminSaveSiteSettings({
        data: { ...siteSettings, quickLinks: nextLinks },
      }).catch(() => null);
    }
    setBusy("");
    if (!r.ok) {
      setMsg(trv(r.message ?? tr("تعذّر حذف القسم.")));
      return;
    }
    setMsg(tr("تم حذف القسم."));
    await load("news");
  };

  if (!sec)
    return (
      <p className="stamp p-4 font-semibold">{msg || tr("جاري التحميل…")}</p>
    );

  const hasFeeds = sec.id !== "weather";
  const isCustom = !BUILTIN_SECTION_IDS.has(sec.id);
  const cleanSecName = sec.name.trim();
  const curTopBtns = siteSettings ? parseTopBarConfig(siteSettings.quickLinks) : [];
  const curBotCfg = siteSettings
    ? parseBotBarConfig(siteSettings.quickLinks)
    : { style: "classic" as BottomBarStyleKey, btns: [] };
  const hiddenInTop = (siteSettings?.quickLinks ?? []).some(
    (q) => q.title.trim() === cleanSecName && q.subtitle?.includes("مَخفي_علوي"),
  );
  const inTopMenu =
    !hiddenInTop &&
    (isCustom || curTopBtns.some((b) => b.label.trim() === cleanSecName));
  const inBotBar = curBotCfg.btns.some((b) => b.label.trim() === cleanSecName);

  const saveSec = async () => {
    setBusy("sec");
    const targetUrl = (secUrl.trim() || `/?q=${cleanSecName}`).trim();
    const targetEmoji = ICON_KEY_TO_EMOJI[secIcon] ?? "✨";

    const r = await adminSaveSection({ data: sec });
    if (siteSettings) {
      const secId = `sec${sec.id.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "custom"}`;
      let nextLinks = siteSettings.quickLinks.filter(
        (q) => q.id !== secId && !(q.id.startsWith("sec") && q.title.trim() === cleanSecName),
      );
      nextLinks.push({
        id: secId,
        title: cleanSecName,
        subtitle: inTopMenu
          ? sec.home
            ? "قسم في الرئيسية"
            : "مَخفي_رئيسية"
          : "مَخفي_علوي",
        url: targetUrl,
        emoji: targetEmoji,
      });

      if (curTopBtns.some((b) => b.label.trim() === cleanSecName)) {
        nextLinks = encodeTopBarConfig(
          nextLinks,
          curTopBtns.map((b) =>
            b.label.trim() === cleanSecName
              ? { ...b, icon: secIcon, to: targetUrl }
              : b,
          ),
        );
      }
      if (curBotCfg.btns.some((b) => b.label.trim() === cleanSecName)) {
        nextLinks = encodeBotBarConfig(
          nextLinks,
          curBotCfg.style,
          curBotCfg.btns.map((b) =>
            b.label.trim() === cleanSecName
              ? { ...b, icon: secIcon, to: targetUrl }
              : b,
          ),
        );
      }

      const savedSt = await adminSaveSiteSettings({
        data: { ...siteSettings, quickLinks: nextLinks },
      });
      if (savedSt.ok && savedSt.settings) setSiteSettings(savedSt.settings);
    }

    setBusy("");
    setMsg(
      r.ok
        ? `تم حفظ إعدادات قسم «${cleanSecName}» ومسار التوجه (${targetUrl}) ✓`
        : trv(r.message ?? tr("تعذّر الحفظ.")),
    );
    if (r.ok) await load(sec.id);
  };

  const toggleSecInTopBar = async () => {
    if (!siteSettings) return;
    setBusy("sec");
    const targetUrl = (secUrl.trim() || `/?q=${cleanSecName}`).trim();
    const secId = `sec${sec.id.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "custom"}`;
    let nextLinks = siteSettings.quickLinks.filter(
      (q) => q.id !== secId && !(q.id.startsWith("sec") && q.title.trim() === cleanSecName),
    );

    if (inTopMenu) {
      nextLinks.push({
        id: secId,
        title: cleanSecName,
        subtitle: "مَخفي_علوي",
        url: targetUrl,
        emoji: ICON_KEY_TO_EMOJI[secIcon] ?? "✨",
      });
      nextLinks = encodeTopBarConfig(
        nextLinks,
        curTopBtns.filter((b) => b.label.trim() !== cleanSecName),
      );
    } else {
      nextLinks.push({
        id: secId,
        title: cleanSecName,
        subtitle: sec.home ? "قسم في الرئيسية" : "مَخفي_رئيسية",
        url: targetUrl,
        emoji: ICON_KEY_TO_EMOJI[secIcon] ?? "✨",
      });
      const updatedTop = curTopBtns.some((b) => b.label.trim() === cleanSecName)
        ? curTopBtns.map((b) =>
            b.label.trim() === cleanSecName
              ? { icon: secIcon, label: cleanSecName, to: targetUrl }
              : b,
          )
        : [...curTopBtns, { icon: secIcon, label: cleanSecName, to: targetUrl }];
      nextLinks = encodeTopBarConfig(nextLinks, updatedTop);
    }

    const res = await adminSaveSiteSettings({
      data: { ...siteSettings, quickLinks: nextLinks },
    });
    setBusy("");
    if (res.ok && res.settings) {
      setSiteSettings(res.settings);
      setMsg(
        inTopMenu
          ? `تم إخفاء «${cleanSecName}» من القائمة العلوية`
          : `تم إظهار «${cleanSecName}» في القائمة العلوية ✓`,
      );
    }
  };

  const toggleSecInBotBar = async () => {
    if (!siteSettings) return;
    setBusy("sec");
    const targetUrl = (secUrl.trim() || `/?q=${cleanSecName}`).trim();
    const nextBtns = inBotBar
      ? curBotCfg.btns.filter((b) => b.label.trim() !== cleanSecName)
      : [...curBotCfg.btns, { icon: secIcon, label: cleanSecName, to: targetUrl }];
    const nextLinks = encodeBotBarConfig(
      siteSettings.quickLinks,
      curBotCfg.style,
      nextBtns,
    );
    const res = await adminSaveSiteSettings({
      data: { ...siteSettings, quickLinks: nextLinks },
    });
    setBusy("");
    if (res.ok && res.settings) {
      setSiteSettings(res.settings);
      setMsg(
        inBotBar
          ? `تمت إزالة «${cleanSecName}» من البار السفلي`
          : `تمت إضافة «${cleanSecName}» إلى البار السفلي في جميع صفحات الموقع ✓`,
      );
    }
  };

  const saveFeed = async (f: Partial<SectionFeedItem>) => {
    setBusy(f.id ?? "new");
    const r = await adminSaveFeed({
      data: {
        section: sec.id,
        id: f.id,
        source: f.source ?? "",
        home: f.home ?? "",
        url: f.url ?? "",
        enabled: f.enabled !== false,
      },
    });
    setBusy("");
    setMsg(r.ok ? tr("تم حفظ المصدر ✓") : trv(r.message ?? tr("تعذّر الحفظ.")));
    if (r.ok) {
      setEdit(null);
      await load(sec.id);
    }
  };

  const del = async (f: SectionFeedItem) => {
    if (!confirm(tr("حذف هذا المصدر؟"))) return;
    setBusy(f.id);
    await adminDeleteFeed({ data: { section: sec.id, id: f.id } });
    setBusy("");
    await load(sec.id);
  };

  const test = async (url: string, key: string) => {
    setTests((t) => ({ ...t, [key]: tr("جاري الاختبار…") }));
    const r = await adminTestFeed({ data: { section: sec.id, url } });
    setTests((t) => ({
      ...t,
      [key]: r.ok
        ? tr(
            "✓ يعمل ({0} مللي ثانية): {1} خبر، {2} بصورة، الأحدث {3}",
            r.ms,
            r.count,
            r.images,
            fmtFeedDate(r.latest ?? null),
          )
        : tr("✕ خطأ ({0} مللي ثانية): {1}", r.ms, r.error ?? ""),
    }));
    void load(sec.id);
  };

  const testAllFeeds = async () => {
    if (!sec.feeds.length) return;
    setBusy("test-all");
    const nextTests: Record<string, string> = {};
    sec.feeds.forEach((f) => {
      nextTests[f.id] = tr("جاري الفحص…");
    });
    setTests((prev) => ({ ...prev, ...nextTests }));
    await Promise.all(
      sec.feeds.map(async (f) => {
        const r = await adminTestFeed({ data: { section: sec.id, url: f.url } });
        setTests((prev) => ({
          ...prev,
          [f.id]: r.ok
            ? tr("✓ يعمل ({0}ms) · {1} خبر ({2} بصورة)", r.ms, r.count, r.images)
            : tr("✕ خطأ ({0}ms): {1}", r.ms, r.error ?? ""),
        }));
      }),
    );
    setBusy("");
    await load(sec.id);
  };

  const refreshSectionNow = async () => {
    setBusy("refresh-now");
    setRefreshMsg(tr("جاري الجلب الفوري من المصادر…"));
    const r = await adminRefreshSectionNow({ data: { section: sec.id } });
    setBusy("");
    if (r.ok) {
      setRefreshMsg(
        r.failedSources.length
          ? tr(
              "✓ تم التحديث في {0} مللي ثانية ({1} خبر) · تعذّر: {2}",
              r.ms,
              r.count,
              r.failedSources.join("، "),
            )
          : tr("✓ تم جلب وتحديث {0} خبر بنجاح في {1} مللي ثانية", r.count, r.ms),
      );
      await load(sec.id);
    } else {
      setRefreshMsg(trv(r.message ?? tr("تعذّر التحديث الفوري.")));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Bar: All Sections + "Add New Section" Button */}
      <section className="rounded-3xl bg-paper p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold">
              {tr("إدارة أقسام الموقع ومصادر RSS ومسار التوجه")}
            </h2>
            <p className="text-xs font-semibold text-muted">
              {tr(
                "اختر أي قسم (مثل: فن و موضة) لتعديل مسار توجه الصفحة، إضافته للقائمة العلوية أو البار السفلي، وإدارة مصادر RSS الخاصة به.",
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center gap-2 rounded-2xl bg-[#16A34A] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#15803D]"
          >
            <Plus className="size-4" aria-hidden />
            {tr("إضافة قسم جديد")}
          </button>
        </div>

        {/* Create New Section Modal/Drawer Card (Connected with TopBar, BotBar & Destination Path) */}
        {showCreate ? (
          <form
            onSubmit={handleCreateSection}
            className="mt-4 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-extrabold">
                <FolderPlus className="size-4 text-primary-ink" aria-hidden />
                {tr("إنشاء قسم جديد في الموقع (متصل مع القائمة العلوية والبار السفلي)")}
              </h3>
              <button
                type="button"
                className="text-xs font-bold text-muted underline"
                onClick={() => setShowCreate(false)}
              >
                {tr("إغلاق")}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-muted">
                {tr("أقسام مقترحة جاهزة:")}
              </span>
              {PRESET_NEW_SECTIONS.map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => {
                    setNewName(p.name);
                    setNewSlug(p.slug);
                    setNewUrl(p.url);
                    setNewIcon(p.icon);
                  }}
                  className="rounded-full bg-paper px-3 py-1 text-xs font-bold shadow-xs transition hover:bg-brand hover:text-ink"
                >
                  + {trv(p.name)}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1 text-xs font-bold">
                {tr("اسم القسم (بالعربية)")}
                <input
                  className="field text-xs"
                  required
                  placeholder={tr("مثال: فن و موضة")}
                  value={newName}
                  onChange={(e) => {
                    const v = e.target.value;
                    setNewName(v);
                    if (!newUrl || newUrl.startsWith("/?q=")) {
                      setNewUrl(v.trim() ? `/?q=${v.trim()}` : "");
                    }
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold">
                {tr("المعرّف الإنجليزي (اختياري)")}
                <input
                  className="field text-xs"
                  dir="ltr"
                  placeholder="art-fashion"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold">
                {tr("أيقونة القسم")}
                <select
                  className="field text-xs"
                  value={newIcon}
                  onChange={(e) => setNewIcon(e.target.value)}
                >
                  {BAR_ICON_OPTIONS.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-bold">
                {tr("مسار توجه الصفحة (الرابط URL)")}
                <input
                  className="field font-mono text-xs"
                  dir="ltr"
                  placeholder="/?q=فن و موضة أو /news"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <label className="flex items-center gap-2 text-xs font-extrabold">
                <input
                  type="checkbox"
                  checked={newInTop}
                  onChange={(e) => setNewInTop(e.target.checked)}
                  className="size-4 accent-[#16A34A]"
                />
                {tr("إظهار في القائمة العلوية")}
              </label>
              <label className="flex items-center gap-2 text-xs font-extrabold">
                <input
                  type="checkbox"
                  checked={newInBot}
                  onChange={(e) => setNewInBot(e.target.checked)}
                  className="size-4 accent-[#16A34A]"
                />
                {tr("إضافة إلى البار السفلي")}
              </label>
              <label className="flex items-center gap-2 text-xs font-extrabold">
                <input
                  type="checkbox"
                  checked={newHome}
                  onChange={(e) => setNewHome(e.target.checked)}
                  className="size-4 accent-[#16A34A]"
                />
                {tr("إظهار في الصفحة الرئيسية")}
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="btn text-xs"
                disabled={busy === "create-sec"}
              >
                {busy === "create-sec"
                  ? tr("جاري الإنشاء…")
                  : tr("حفظ وإضافة القسم الآن ✓")}
              </button>
              <button
                type="button"
                className="btn btn-ghost text-xs"
                onClick={() => setShowCreate(false)}
              >
                {tr("إلغاء")}
              </button>
            </div>
          </form>
        ) : null}

        {/* Section Selector Chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {sections.map((s) => {
            const active = s.id === sec.id;
            const custom = !BUILTIN_SECTION_IDS.has(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => selectSection(s.id)}
                className={`flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-bold transition ${
                  active
                    ? "bg-ink text-paper shadow-xs"
                    : "bg-surface text-ink hover:bg-primary-soft"
                }`}
              >
                <span>{trv(s.name)}</span>
                {custom ? (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${
                      active ? "bg-brand text-ink" : "bg-paper text-muted"
                    }`}
                  >
                    {tr("مخصص")}
                  </span>
                ) : null}
                {!s.enabled ? (
                  <span className="rounded-full bg-alert/20 px-1.5 py-0.5 text-[10px] text-alert">
                    {tr("موقوف")}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Section Settings + Destination Path + Top/Bottom Bar Controls */}
      <section className="flex flex-col gap-3 rounded-3xl bg-paper p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold">{trv(sec.name)}</h2>
            <span
              className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold text-muted"
              dir="ltr"
            >
              #{sec.id}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Direct 1-click toggles for Top Bar and Bottom Bar right inside SectionAdmin! */}
            <button
              type="button"
              disabled={busy === "sec" || !siteSettings}
              onClick={toggleSecInTopBar}
              className={`rounded-xl px-3 py-1.5 text-xs font-extrabold text-white transition ${
                inTopMenu ? "bg-[#16A34A]" : "bg-muted hover:opacity-90"
              }`}
            >
              {inTopMenu ? tr("في القائمة العلوية ✓") : tr("+ القائمة العلوية")}
            </button>
            <button
              type="button"
              disabled={busy === "sec" || !siteSettings}
              onClick={toggleSecInBotBar}
              className={`rounded-xl px-3 py-1.5 text-xs font-extrabold text-white transition ${
                inBotBar ? "bg-[#0284C7]" : "bg-muted hover:opacity-90"
              }`}
            >
              {inBotBar ? tr("في البار السفلي ✓") : tr("+ البار السفلي")}
            </button>
            {hasFeeds ? (
              <button
                type="button"
                disabled={busy === "refresh-now"}
                onClick={refreshSectionNow}
                className="flex items-center gap-1.5 rounded-xl bg-primary-soft px-3 py-1.5 text-xs font-extrabold text-primary-ink transition hover:bg-brand hover:text-ink"
              >
                <RefreshCw
                  className={`size-3.5 ${busy === "refresh-now" ? "animate-spin" : ""}`}
                  aria-hidden
                />
                {busy === "refresh-now"
                  ? tr("جاري الجلب…")
                  : tr("تحديث وجلب الأخبار الآن")}
              </button>
            ) : null}
            {isCustom ? (
              <button
                type="button"
                disabled={busy === "del-sec"}
                onClick={handleDeleteSection}
                className="flex items-center gap-1.5 rounded-xl bg-surface px-3 py-1.5 text-xs font-bold text-alert hover:bg-alert/10"
              >
                <Trash2 className="size-4" aria-hidden />
                {tr("حذف هذا القسم")}
              </button>
            ) : null}
          </div>
        </div>

        {refreshMsg ? (
          <p
            className="rounded-2xl bg-surface px-3 py-2 text-xs font-bold text-ink"
            role="status"
          >
            {refreshMsg}
          </p>
        ) : null}

        {/* Destination Route / URL & Icon Control Box inside SectionAdmin */}
        <div className="rounded-2xl border border-primary/40 bg-surface p-3.5">
          <p className="mb-2 text-xs font-extrabold text-ink">
            {tr("🧭 التحكم في مسار توجه الصفحة وأيقونة القسم (للبار السفلي والقائمة العلوية):")}
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-bold">
              {tr("أيقونة القسم")}
              <select
                className="field text-xs"
                value={secIcon}
                onChange={(e) => setSecIcon(e.target.value)}
              >
                {BAR_ICON_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold">
              {tr("اختيار مسار جاهز")}
              <select
                className="field text-xs"
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  if (val === "__auto__") setSecUrl(`/?q=${cleanSecName}`);
                  else if (val === "__news_q__") setSecUrl(`/news?q=${cleanSecName}`);
                  else setSecUrl(val);
                }}
              >
                <option value="">{tr("اختر مسار توجه سريع...")}</option>
                {SECTION_PATH_PRESETS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold">
              {tr("مسار توجه الصفحة (الرابط URL)")}
              <input
                className="field font-mono text-xs"
                dir="ltr"
                value={secUrl}
                onChange={(e) => setSecUrl(e.target.value)}
                placeholder={`/?q=${cleanSecName}`}
              />
            </label>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-2xl bg-surface p-3 font-bold">
            <input
              type="checkbox"
              checked={sec.enabled}
              onChange={(e) => setSec({ ...sec, enabled: e.target.checked })}
            />
            {tr("القسم مفعّل (عند الإيقاف يختفي من الموقع)")}
          </label>
          <label className="flex items-center gap-2 rounded-2xl bg-surface p-3 font-bold">
            <input
              type="checkbox"
              checked={sec.home}
              onChange={(e) => setSec({ ...sec, home: e.target.checked })}
            />
            {tr("يظهر في الصفحة الرئيسية")}
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-bold">
            {tr("اسم القسم")}
            <input
              className="field"
              value={sec.name}
              onChange={(e) => setSec({ ...sec, name: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            {tr("الترتيب في العرض")}
            <input
              className="field"
              type="number"
              min={0}
              max={99}
              value={sec.position}
              onChange={(e) =>
                setSec({ ...sec, position: Number(e.target.value) })
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            {tr("التحديث التلقائي كل (دقائق)")}
            <input
              className="field"
              type="number"
              min={1}
              max={1440}
              value={sec.refreshMin}
              onChange={(e) =>
                setSec({ ...sec, refreshMin: Number(e.target.value) })
              }
            />
          </label>
          {hasFeeds ? (
            <>
              <label className="flex flex-col gap-1 text-sm font-bold">
                {tr("أقصى عدد للأخبار")}
                <input
                  className="field"
                  type="number"
                  min={5}
                  max={300}
                  value={sec.maxItems}
                  onChange={(e) =>
                    setSec({ ...sec, maxItems: Number(e.target.value) })
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-bold">
                {tr("أقصى عمر للخبر (أيام، 0 = بلا حد)")}
                <input
                  className="field"
                  type="number"
                  min={0}
                  max={365}
                  value={sec.maxAgeDays}
                  onChange={(e) =>
                    setSec({ ...sec, maxAgeDays: Number(e.target.value) })
                  }
                />
              </label>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            className="btn flex items-center gap-2"
            disabled={busy === "sec"}
            onClick={saveSec}
          >
            <CheckCircle2 className="size-4" aria-hidden />
            {tr("حفظ إعدادات القسم ومسار التوجه ✓")}
          </button>
          {msg ? (
            <p className="text-sm font-bold text-primary-ink" role="status">
              {trv(msg)}
            </p>
          ) : null}
        </div>
        {isCustom ? (
          <p className="text-xs font-semibold text-muted">
            {tr(
              "ملاحظة: يمكنك نشر أخبار مباشرة داخل هذا القسم من زر «نشر خبر» واختيار تصنيف «{0}»، أو ربطه بمصادر RSS بالأسفل.",
              sec.name,
            )}
          </p>
        ) : null}
      </section>

      {/* Feeds (RSS) for Active Section */}
      {hasFeeds ? (
        <section className="flex flex-col gap-3 rounded-3xl bg-paper p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-base font-extrabold">
                <Rss className="size-4 text-primary-ink" aria-hidden />
                {tr("مصادر التغذية (RSS) لقسم")} «{trv(sec.name)}» (
                {sec.feeds.length})
              </h2>
              <p className="text-xs font-semibold text-muted">
                {tr(
                  "الجلب يعمل بتقنية التخزين الشرطي السريع (ETag/304) مع مهلة قصوى 4.5 ثانية لضمان سرعة استجابة الموقع.",
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {sec.feeds.length > 0 ? (
                <button
                  type="button"
                  disabled={busy === "test-all"}
                  className="btn btn-ghost px-3 text-sm"
                  onClick={testAllFeeds}
                >
                  <Activity className="size-4" aria-hidden />
                  {busy === "test-all"
                    ? tr("جاري الفحص…")
                    : tr("فحص جميع المصادر")}
                </button>
              ) : null}
              <button
                type="button"
                className="btn px-3 text-sm"
                onClick={() => setEdit({ enabled: true })}
              >
                + {tr("إضافة مصدر RSS")}
              </button>
              {sec.customFeeds && !isCustom ? (
                <button
                  type="button"
                  className="btn btn-ghost px-3 text-sm"
                  onClick={async () => {
                    if (confirm(tr("استعادة المصادر الافتراضية؟"))) {
                      await adminResetFeeds({ data: { section: sec.id } });
                      await load(sec.id);
                    }
                  }}
                >
                  {tr("استعادة الافتراضي")}
                </button>
              ) : null}
            </div>
          </div>
          {edit ? (
            <SectionFeedForm
              feed={edit}
              busy={busy !== ""}
              onCancel={() => setEdit(null)}
              onSave={saveFeed}
              onTest={(u) => test(u, "form")}
              testMsg={tests.form}
            />
          ) : null}
          <ul className="flex flex-col gap-2">
            {sec.feeds.map((f) => {
              const hasErr = Boolean(f.stat?.lastError);
              const isHealthy = Boolean(f.stat?.lastOk && !hasErr);
              return (
                <li key={f.id} className="rounded-2xl border border-line p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="checkbox"
                      aria-label={tr("تفعيل")}
                      checked={f.enabled}
                      disabled={busy === f.id}
                      onChange={(e) =>
                        saveFeed({ ...f, enabled: e.target.checked })
                      }
                    />
                    <span className="font-bold">{trv(f.source)}</span>
                    {!f.enabled ? (
                      <span className="chip">{tr("موقوف")}</span>
                    ) : isHealthy ? (
                      <span className="chip chip-ok">
                        {tr("متصل")} · {f.stat?.lastCount ?? 0} {tr("خبر")}
                      </span>
                    ) : hasErr ? (
                      <span className="chip chip-alert">
                        {tr("تنبيه اتصال")}
                      </span>
                    ) : null}
                    <span className="ms-auto flex gap-1">
                      <button
                        type="button"
                        className="btn btn-ghost px-2 text-sm"
                        onClick={() => test(f.url, f.id)}
                      >
                        {tr("اختبار السرعة")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost px-2 text-sm"
                        onClick={() => setEdit(f)}
                      >
                        {tr("تعديل")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost px-2 text-sm"
                        onClick={() => del(f)}
                      >
                        {tr("حذف")}
                      </button>
                    </span>
                  </div>
                  <p
                    className="mt-1 break-all text-xs font-semibold text-muted"
                    dir="ltr"
                  >
                    {f.url}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {f.stat
                      ? tr(
                          "آخر جلب: {0} · العناصر: {1} · آخر نجاح: {2}",
                          fmtFeedDate(f.stat.lastFetch),
                          f.stat.lastCount,
                          fmtFeedDate(f.stat.lastOk),
                        )
                      : tr("لم يُجلب بعد.")}
                    {f.stat?.lastError ? (
                      <span className="block text-alert">
                        {tr("آخر خطأ: {0}", f.stat.lastError)}
                      </span>
                    ) : null}
                  </p>
                  {tests[f.id] ? (
                    <p
                      className="mt-1 text-sm font-bold text-primary-ink"
                      role="status"
                    >
                      {tests[f.id]}
                    </p>
                  ) : null}
                </li>
              );
            })}
            {sec.feeds.length === 0 ? (
              <li className="rounded-2xl bg-surface p-4 text-center text-sm font-semibold text-muted">
                {tr(
                  "لا توجد مصادر RSS مضافة لهذا القسم حالياً. يمكنك إضافة مصدر RSS أو الاكتفاء بنشر الأخبار يدوياً من «نشر خبر».",
                )}
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function SectionFeedForm({
  feed,
  busy,
  onSave,
  onCancel,
  onTest,
  testMsg,
}: {
  feed: Partial<SectionFeedItem>;
  busy: boolean;
  onSave: (f: Partial<SectionFeedItem>) => void;
  onCancel: () => void;
  onTest: (url: string) => void;
  testMsg?: string;
}) {
  const [f, setF] = useState(feed);
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-surface p-3">
      <label className="flex flex-col gap-1 text-sm font-bold">
        {tr("اسم المصدر")}
        <input
          className="field"
          value={f.source ?? ""}
          onChange={(e) => setF({ ...f, source: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-bold">
        {tr("رابط RSS")}
        <input
          className="field"
          dir="ltr"
          value={f.url ?? ""}
          onChange={(e) => setF({ ...f, url: e.target.value })}
          placeholder="https://example.com/feed/"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-bold">
        {tr("رابط الموقع (اختياري)")}
        <input
          className="field"
          dir="ltr"
          value={f.home ?? ""}
          onChange={(e) => setF({ ...f, home: e.target.value })}
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          checked={f.enabled !== false}
          onChange={(e) => setF({ ...f, enabled: e.target.checked })}
        />
        {tr("مفعّل")}
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => onSave(f)}
        >
          {tr("حفظ")}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={!f.url}
          onClick={() => onTest(f.url ?? "")}
        >
          {tr("اختبار السرعة")}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          {tr("إلغاء")}
        </button>
      </div>
      {testMsg ? (
        <p className="text-sm font-semibold" role="status">
          {testMsg}
        </p>
      ) : null}
    </div>
  );
}

function QuickCustomSectionsBar({
  mode = "all",
  currentId,
  onSelectSection,
}: {
  mode?: "add" | "manage" | "all";
  currentId: string;
  onSelectSection: (id: string) => void;
}) {
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [dbCustomSecs, setDbCustomSecs] = useState<AdminSection[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("فن و موضة");
  const [iconKey, setIconKey] = useState("sparkles");
  const [pathPreset, setPathPreset] = useState("__auto__");
  const [customPath, setCustomPath] = useState("/?q=فن و موضة");
  const [home, setHome] = useState(true);
  const [addToTopBar, setAddToTopBar] = useState(true);
  const [addToBotBar, setAddToBotBar] = useState(false);

  const [pathDrafts, setPathDrafts] = useState<Record<string, string>>({});
  const [iconDrafts, setIconDrafts] = useState<Record<string, string>>({});

  const [liveTileLabel, setLiveTileLabel] = useState("بث مباريات");
  const [liveTileVisible, setLiveTileVisible] = useState(true);
  const [liveTileGlow, setLiveTileGlow] = useState(true);
  const [dirtyLiveTile, setDirtyLiveTile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const BUILTIN_SEC_IDS = new Set(["news", "israel", "sports", "tech", "weather"]);

  const load = useCallback(async () => {
    const [res, secRes] = await Promise.all([
      adminGetSiteSettings(),
      adminListSections().catch(() => ({ authed: false, sections: [] as AdminSection[] })),
    ]);
    if (res.authed && res.settings) {
      setSiteSettings(res.settings);
      const cfg = (res.settings.quickLinks ?? []).find((q) => q.id === "tilelive");
      if (cfg) {
        setLiveTileLabel(cfg.title || "بث مباريات");
        setLiveTileVisible(!cfg.subtitle?.includes("مَخفي"));
        setLiveTileGlow(!cfg.subtitle?.includes("بدون توهج") && cfg.emoji !== "⚪");
      }
    }
    if (secRes.authed && secRes.sections) {
      setDbCustomSecs(secRes.sections.filter((s) => !BUILTIN_SEC_IDS.has(s.id)));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Update default customPath when name or pathPreset changes
  useEffect(() => {
    const clean = name.trim() || category.trim() || "قسم";
    if (pathPreset === "__auto__") {
      setCustomPath(`/?q=${clean}`);
    } else if (pathPreset === "__news_q__") {
      setCustomPath(`/news?q=${clean}`);
    } else if (pathPreset !== "__custom__") {
      setCustomPath(pathPreset);
    }
  }, [name, category, pathPreset]);

  // Merge sections from BOTH database (SectionAdmin Image 2) AND quickLinks (Image 1) so both screens are 100% connected
  const unifiedSections = useMemo(() => {
    const qLinks = siteSettings?.quickLinks ?? [];
    const topBtns = siteSettings ? parseTopBarConfig(qLinks) : [];
    const botCfg = siteSettings ? parseBotBarConfig(qLinks) : { style: "classic" as BottomBarStyleKey, btns: [] };

    const map = new Map<
      string,
      {
        key: string;
        dbSec?: AdminSection;
        qlItem?: SiteSettings["quickLinks"][number];
        name: string;
        url: string;
        iconKey: string;
        emoji: string;
        inHome: boolean;
        inTopBar: boolean;
        inBotBar: boolean;
      }
    >();

    for (const dbSec of dbCustomSecs) {
      const cleanName = dbSec.name.trim();
      if (!cleanName) continue;
      const matchingQl = qLinks.find(
        (q) => q.id.startsWith("sec") && q.title.trim() === cleanName,
      );
      const matchedTop = topBtns.find((b) => b.label.trim() === cleanName);
      const matchedBot = botCfg.btns.find((b) => b.label.trim() === cleanName);
      const hiddenTop = qLinks.some(
        (q) => q.title.trim() === cleanName && q.subtitle?.includes("مَخفي_علوي"),
      );
      const defaultIcon = /فن|موضة|ثقافة/.test(cleanName) ? "sparkles" : "news";
      const resolvedIcon =
        matchedTop?.icon ||
        matchedBot?.icon ||
        (matchingQl?.emoji ? EMOJI_TO_ICON_KEY[matchingQl.emoji] : undefined) ||
        defaultIcon;
      const resolvedUrl =
        matchingQl?.url ||
        matchedTop?.to ||
        matchedBot?.to ||
        `/?q=${cleanName}`;

      map.set(cleanName, {
        key: dbSec.id,
        dbSec,
        qlItem: matchingQl,
        name: cleanName,
        url: resolvedUrl,
        iconKey: resolvedIcon,
        emoji: ICON_KEY_TO_EMOJI[resolvedIcon] || matchingQl?.emoji || "✨",
        inHome: dbSec.home !== false && !matchingQl?.subtitle?.includes("مَخفي_رئيسية"),
        inTopBar: !hiddenTop || Boolean(matchedTop),
        inBotBar: Boolean(matchedBot),
      });
    }

    for (const q of qLinks) {
      if (!q.id.startsWith("sec")) continue;
      const cleanName = q.title.trim();
      if (!cleanName || map.has(cleanName)) continue;
      const matchedTop = topBtns.find((b) => b.label.trim() === cleanName);
      const matchedBot = botCfg.btns.find((b) => b.label.trim() === cleanName);
      const hiddenTop = q.subtitle?.includes("مَخفي_علوي") && !matchedTop;
      const resolvedIcon =
        matchedTop?.icon ||
        matchedBot?.icon ||
        (q.emoji ? EMOJI_TO_ICON_KEY[q.emoji] : undefined) ||
        (/فن|موضة|ثقافة/.test(cleanName) ? "sparkles" : "news");
      const resolvedUrl = q.url || matchedTop?.to || matchedBot?.to || `/?q=${cleanName}`;

      map.set(cleanName, {
        key: q.id,
        qlItem: q,
        name: cleanName,
        url: resolvedUrl,
        iconKey: resolvedIcon,
        emoji: q.emoji || ICON_KEY_TO_EMOJI[resolvedIcon] || "📰",
        inHome: !q.subtitle?.includes("مَخفي"),
        inTopBar: !hiddenTop,
        inBotBar: Boolean(matchedBot),
      });
    }

    return Array.from(map.values());
  }, [dbCustomSecs, siteSettings]);

  const saveQuickLinks = async (nextLinks: SiteSettings["quickLinks"], successMsg: string) => {
    if (!siteSettings) return;
    setBusy(true);
    setMsg("");
    try {
      const next: SiteSettings = { ...siteSettings, quickLinks: nextLinks };
      const res = await adminSaveSiteSettings({ data: next });
      if (res.ok && res.settings) {
        setSiteSettings(res.settings);
        setMsg(successMsg);
      } else {
        setMsg(res.message ?? "تعذر حفظ القسم");
      }
    } finally {
      setBusy(false);
    }
  };

  // Unified Add Handler: saves to BOTH news_sections (Image 2) AND siteSettings.quickLinks / TopBar / BotBar (Image 1)
  const handleAdd = async (preset?: {
    id: string;
    name: string;
    category: string;
    emoji: string;
    iconKey?: string;
    defaultUrl?: string;
  }) => {
    if (!siteSettings) return;
    const targetName = (preset?.name ?? name).trim();
    if (!targetName) {
      setMsg("الرجاء كتابة اسم القسم (مثلاً: فن و موضة أو أخبار محلية)");
      return;
    }
    const targetIconKey =
      preset?.iconKey ??
      iconKey ??
      (/فن|موضة|ثقافة/.test(targetName) ? "sparkles" : "news");
    const targetEmoji = preset?.emoji ?? ICON_KEY_TO_EMOJI[targetIconKey] ?? "✨";
    const targetUrl = (
      preset?.defaultUrl ??
      (customPath.trim() || `/?q=${targetName}`)
    ).trim();
    const targetId =
      preset?.id ??
      `sec${Date.now().toString(36).replace(/[^a-z0-9]/g, "").slice(-10)}`;

    setBusy(true);
    setMsg("");
    try {
      // 1. Ensure section exists in news_sections database table (so it is connected with Image 2 SectionAdmin!)
      const existingDb = dbCustomSecs.find((d) => d.name.trim() === targetName);
      if (!existingDb) {
        await adminCreateSection({
          data: {
            name: targetName,
            home,
          },
        }).catch(() => null);
      } else if (existingDb.home !== home) {
        await adminSaveSection({
          data: {
            ...existingDb,
            enabled: true,
            home,
          },
        }).catch(() => null);
      }

      // 2. Save section config + destination URL in siteSettings.quickLinks
      let nextLinks = siteSettings.quickLinks.filter(
        (q) => q.id !== targetId && !(q.id.startsWith("sec") && q.title.trim() === targetName),
      );
      nextLinks.push({
        id: targetId,
        title: targetName,
        subtitle: home ? "قسم في الرئيسية" : " مَخفي",
        url: targetUrl,
        emoji: targetEmoji,
      });

      // 3. Sync Top Menu (topbarcfg) if addToTopBar is checked (or preset clicked)
      if (addToTopBar || preset) {
        const curTop = parseTopBarConfig(nextLinks);
        const updatedTop = curTop.some((b) => b.label.trim() === targetName)
          ? curTop.map((b) =>
              b.label.trim() === targetName
                ? { icon: targetIconKey, label: targetName, to: targetUrl }
                : b,
            )
          : [...curTop, { icon: targetIconKey, label: targetName, to: targetUrl }];
        nextLinks = encodeTopBarConfig(nextLinks, updatedTop);
      }

      // 4. Sync Bottom Bar (botbarcfg) if addToBotBar is checked
      if (addToBotBar) {
        const curBot = parseBotBarConfig(nextLinks);
        const updatedBot = curBot.btns.some((b) => b.label.trim() === targetName)
          ? curBot.btns.map((b) =>
              b.label.trim() === targetName
                ? { icon: targetIconKey, label: targetName, to: targetUrl }
                : b,
            )
          : [...curBot.btns, { icon: targetIconKey, label: targetName, to: targetUrl }];
        nextLinks = encodeBotBarConfig(nextLinks, curBot.style, updatedBot);
      }

      const tempSettings: SiteSettings = { ...siteSettings, quickLinks: nextLinks };
      const combinedHome = buildCombinedHomeOrder(tempSettings, [targetName]);
      const homePatch = applyCombinedHomeOrderToSettings(tempSettings, combinedHome);
      const res = await adminSaveSiteSettings({ data: { ...tempSettings, ...homePatch } });
      if (res.ok && res.settings) {
        setSiteSettings(res.settings);
      }
      await load();
      setMsg(
        `تم حفظ وربط قسم «${targetName}» بنجاح بالمسار (${targetUrl}) ${addToBotBar ? "+ إضافته للبار السفلي " : ""}✓`,
      );
      if (!preset) setName("");
    } finally {
      setBusy(false);
    }
  };

  // Save updated destination URL & icon for any existing section (like "فن و موضة") across QuickLinks, TopBar, and BottomBar
  const handleSaveSectionPath = async (secItem: (typeof unifiedSections)[number]) => {
    if (!siteSettings) return;
    const nextUrl = (pathDrafts[secItem.name] ?? secItem.url).trim() || `/?q=${secItem.name}`;
    const nextIconKey = iconDrafts[secItem.name] ?? secItem.iconKey;
    const nextEmoji = ICON_KEY_TO_EMOJI[nextIconKey] ?? secItem.emoji;
    const secId =
      secItem.qlItem?.id ??
      `sec${secItem.key.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "custom"}`;

    let nextLinks = siteSettings.quickLinks.filter(
      (q) => q.id !== secId && !(q.id.startsWith("sec") && q.title.trim() === secItem.name),
    );
    nextLinks.push({
      id: secId,
      title: secItem.name,
      subtitle: secItem.inTopBar
        ? secItem.inHome
          ? "قسم في الرئيسية"
          : "مَخفي_رئيسية"
        : "مَخفي_علوي",
      url: nextUrl,
      emoji: nextEmoji,
    });

    // Also update path & icon in Top Bar if present
    const curTop = parseTopBarConfig(nextLinks);
    if (curTop.some((b) => b.label.trim() === secItem.name)) {
      nextLinks = encodeTopBarConfig(
        nextLinks,
        curTop.map((b) =>
          b.label.trim() === secItem.name
            ? { ...b, icon: nextIconKey, to: nextUrl }
            : b,
        ),
      );
    }

    // Also update path & icon in Bottom Bar if present
    const curBot = parseBotBarConfig(nextLinks);
    if (curBot.btns.some((b) => b.label.trim() === secItem.name)) {
      nextLinks = encodeBotBarConfig(
        nextLinks,
        curBot.style,
        curBot.btns.map((b) =>
          b.label.trim() === secItem.name
            ? { ...b, icon: nextIconKey, to: nextUrl }
            : b,
        ),
      );
    }

    await saveQuickLinks(
      nextLinks,
      `تم تحديث مسار توجه قسم «${secItem.name}» إلى (${nextUrl}) ✓`,
    );
  };

  // Toggle Section in Top Bar
  const handleToggleTopBar = async (secItem: (typeof unifiedSections)[number]) => {
    if (!siteSettings) return;
    const curTop = parseTopBarConfig(siteSettings.quickLinks);
    const targetUrl = (pathDrafts[secItem.name] ?? secItem.url).trim() || `/?q=${secItem.name}`;
    const targetIcon = iconDrafts[secItem.name] ?? secItem.iconKey;
    const secId =
      secItem.qlItem?.id ??
      `sec${secItem.key.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "custom"}`;

    if (secItem.inTopBar) {
      const filteredTop = curTop.filter((b) => b.label.trim() !== secItem.name);
      let nextLinks = encodeTopBarConfig(siteSettings.quickLinks, filteredTop).filter(
        (q) => !(q.title.trim() === secItem.name && q.id.startsWith("sec")),
      );
      nextLinks.push({
        id: secId,
        title: secItem.name,
        subtitle: "مَخفي_علوي",
        url: targetUrl,
        emoji: ICON_KEY_TO_EMOJI[targetIcon] ?? "✨",
      });
      await saveQuickLinks(nextLinks, `تم إخفاء قسم «${secItem.name}» من القائمة العلوية`);
    } else {
      const nextTop = curTop.some((b) => b.label.trim() === secItem.name)
        ? curTop.map((b) =>
            b.label.trim() === secItem.name
              ? { icon: targetIcon, label: secItem.name, to: targetUrl }
              : b,
          )
        : [...curTop, { icon: targetIcon, label: secItem.name, to: targetUrl }];
      let nextLinks = siteSettings.quickLinks.filter(
        (q) => !(q.title.trim() === secItem.name && q.id.startsWith("sec")),
      );
      nextLinks.push({
        id: secId,
        title: secItem.name,
        subtitle: secItem.inHome ? "قسم في الرئيسية" : "مَخفي_رئيسية",
        url: targetUrl,
        emoji: ICON_KEY_TO_EMOJI[targetIcon] ?? "✨",
      });
      nextLinks = encodeTopBarConfig(nextLinks, nextTop);
      await saveQuickLinks(nextLinks, `تم إظهار قسم «${secItem.name}» في القائمة العلوية ✓`);
    }
  };

  // Toggle Section in Global Bottom Bar
  const handleToggleBotBar = async (secItem: (typeof unifiedSections)[number]) => {
    if (!siteSettings) return;
    const curBot = parseBotBarConfig(siteSettings.quickLinks);
    const targetUrl = (pathDrafts[secItem.name] ?? secItem.url).trim() || `/?q=${secItem.name}`;
    const targetIcon = iconDrafts[secItem.name] ?? secItem.iconKey;

    if (secItem.inBotBar) {
      const nextBtns = curBot.btns.filter((b) => b.label.trim() !== secItem.name);
      const nextLinks = encodeBotBarConfig(siteSettings.quickLinks, curBot.style, nextBtns);
      await saveQuickLinks(nextLinks, `تمت إزالة قسم «${secItem.name}» من البار السفلي`);
    } else {
      const nextBtns = curBot.btns.some((b) => b.label.trim() === secItem.name)
        ? curBot.btns
        : [...curBot.btns, { icon: targetIcon, label: secItem.name, to: targetUrl }];
      const nextLinks = encodeBotBarConfig(siteSettings.quickLinks, curBot.style, nextBtns);
      await saveQuickLinks(
        nextLinks,
        `تمت إضافة قسم «${secItem.name}» إلى البار السفلي في جميع صفحات الموقع ✓`,
      );
    }
  };

  // Toggle Section on Homepage
  const handleToggleHome = async (secItem: (typeof unifiedSections)[number]) => {
    if (!siteSettings) return;
    const nextHome = !secItem.inHome;
    setBusy(true);
    try {
      if (secItem.dbSec) {
        await adminSaveSection({
          data: {
            ...secItem.dbSec,
            enabled: true,
            home: nextHome,
          },
        }).catch(() => null);
      } else {
        await adminCreateSection({
          data: {
            name: secItem.name,
            home: nextHome,
          },
        }).catch(() => null);
      }
      const secId =
        secItem.qlItem?.id ??
        `sec${secItem.key.replace(/[^a-z0-9]/gi, "").slice(0, 10) || "custom"}`;
      const nextLinks = siteSettings.quickLinks.filter(
        (q) => q.id !== secId && !(q.id.startsWith("sec") && q.title.trim() === secItem.name),
      );
      nextLinks.push({
        id: secId,
        title: secItem.name,
        subtitle: !secItem.inTopBar
          ? "مَخفي_علوي"
          : nextHome
            ? "قسم في الرئيسية"
            : "مَخفي_رئيسية",
        url: (pathDrafts[secItem.name] ?? secItem.url).trim() || `/?q=${secItem.name}`,
        emoji: secItem.emoji,
      });
      const res = await adminSaveSiteSettings({ data: { ...siteSettings, quickLinks: nextLinks } });
      if (res.ok && res.settings) setSiteSettings(res.settings);
      await load();
      setMsg(
        nextHome
          ? `تم إظهار قسم «${secItem.name}» في الصفحة الرئيسية ✓`
          : `تم إخفاء قسم «${secItem.name}» من الصفحة الرئيسية`,
      );
    } finally {
      setBusy(false);
    }
  };

  // Delete Section from both DB and QuickLinks/Bars
  const handleDeleteUnified = async (secItem: (typeof unifiedSections)[number]) => {
    if (!siteSettings || !confirm(`حذف قسم «${secItem.name}» نهائياً؟`)) return;
    setBusy(true);
    try {
      if (secItem.dbSec) {
        await adminDeleteSection({ data: { id: secItem.dbSec.id } }).catch(() => null);
      }
      let nextLinks = siteSettings.quickLinks.filter(
        (q) => !(q.id.startsWith("sec") && q.title.trim() === secItem.name) && q.id !== secItem.key,
      );
      const curTop = parseTopBarConfig(nextLinks);
      if (curTop.some((b) => b.label.trim() === secItem.name)) {
        nextLinks = encodeTopBarConfig(
          nextLinks,
          curTop.filter((b) => b.label.trim() !== secItem.name),
        );
      }
      const curBot = parseBotBarConfig(nextLinks);
      if (curBot.btns.some((b) => b.label.trim() === secItem.name)) {
        nextLinks = encodeBotBarConfig(
          nextLinks,
          curBot.style,
          curBot.btns.filter((b) => b.label.trim() !== secItem.name),
        );
      }
      const res = await adminSaveSiteSettings({ data: { ...siteSettings, quickLinks: nextLinks } });
      if (res.ok && res.settings) setSiteSettings(res.settings);
      await load();
      setMsg(`تم حذف قسم «${secItem.name}» ✓`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {msg ? (
        <div className="rounded-2xl bg-primary-soft/60 px-4 py-2.5 text-xs font-extrabold text-ink">
          {trv(msg)}
        </div>
      ) : null}

      {/* Card 1: Add New Section (Connected to both SectionAdmin DB & QuickLinks + Full Path & Bar Control) */}
      {mode === "add" || mode === "all" ? (
        <div className="rounded-3xl bg-paper p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="grid size-10 place-items-center rounded-2xl bg-brand text-ink">
                <FolderPlus className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-extrabold">
                  {tr("إضافة قسم جديد للموقع والصفحة الرئيسية (متصل مع إدارة الأقسام والبار السفلي)")}
                </h2>
                <p className="text-xs font-semibold text-muted">
                  {tr("أي قسم تضيفه هنا أو في «إدارة الأقسام» (مثل: فن و موضة) يتزامن تلقائياً في المكانين مع تحكم كامل بمسار التوجه والبار السفلي والقائمة العلوية.")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-extrabold text-ink hover:bg-primary-soft"
            >
              <RefreshCw className="size-3.5" />
              {tr("مزامنة الأقسام")}
            </button>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-extrabold text-muted">
              {tr("إضافة سريعة بضغطة واحدة (أو تفعيل قسم مضاف من إدارة الأقسام):")}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {QUICK_SECTION_PRESETS.map((p) => {
                const exists = unifiedSections.some((s) => s.name === p.name && (s.inHome || s.inTopBar));
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void handleAdd(p)}
                    className={`flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-extrabold transition ${
                      exists
                        ? "bg-[#16A34A] text-white"
                        : "border border-line bg-surface hover:bg-primary-soft"
                    }`}
                  >
                    {exists ? <Check className="size-3.5" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
                    <span>{p.emoji} {p.name}</span>
                  </button>
                );
              })}
              {/* Also show any custom section created in SectionAdmin (Image 2) that is not in QUICK_SECTION_PRESETS */}
              {unifiedSections
                .filter((u) => !QUICK_SECTION_PRESETS.some((p) => p.name === u.name))
                .map((u) => (
                  <button
                    key={u.key}
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void handleAdd({
                        id: u.qlItem?.id ?? `sec${u.key}`,
                        name: u.name,
                        category: u.name,
                        emoji: u.emoji,
                        iconKey: u.iconKey,
                        defaultUrl: u.url,
                      })
                    }
                    className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#16A34A] px-3 py-2.5 text-xs font-extrabold text-white transition hover:opacity-95"
                  >
                    <Check className="size-3.5" aria-hidden />
                    <span>{u.emoji} {u.name}</span>
                  </button>
                ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-bold">
              {tr("1. اسم القسم الجديد")}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: فن و موضة"
                className="field mt-1 text-xs"
              />
            </label>

            <label className="text-xs font-bold">
              {tr("2. أيقونة القسم (للعلوي والسفلي)")}
              <select
                value={iconKey}
                onChange={(e) => setIconKey(e.target.value)}
                className="field mt-1 text-xs"
              >
                {BAR_ICON_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold">
              {tr("3. نوع مسار التوجه السريع")}
              <select
                value={pathPreset}
                onChange={(e) => {
                  const val = e.target.value;
                  setPathPreset(val);
                  if (val !== "__auto__" && val !== "__news_q__" && val !== "__custom__") {
                    setCustomPath(val);
                  }
                }}
                className="field mt-1 text-xs"
              >
                {SECTION_PATH_PRESETS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
                <option value="__custom__">مسار أو رابط مخصّص يدوياً...</option>
              </select>
            </label>

            <label className="text-xs font-bold">
              {tr("4. مسار توجه الصفحة (الرابط URL)")}
              <input
                type="text"
                dir="ltr"
                value={customPath}
                onChange={(e) => {
                  setPathPreset("__custom__");
                  setCustomPath(e.target.value);
                }}
                placeholder="/?q=فن و موضة أو /news"
                className="field mt-1 text-xs font-mono"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/60 px-4 py-3">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-extrabold">
                <input
                  type="checkbox"
                  checked={addToTopBar}
                  onChange={(e) => setAddToTopBar(e.target.checked)}
                  className="size-4 accent-[#16A34A]"
                />
                {tr("إظهار في القائمة العلوية")}
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-extrabold">
                <input
                  type="checkbox"
                  checked={addToBotBar}
                  onChange={(e) => setAddToBotBar(e.target.checked)}
                  className="size-4 accent-[#16A34A]"
                />
                {tr("إضافة إلى البار السفلي الآن")}
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs font-extrabold">
                <input
                  type="checkbox"
                  checked={home}
                  onChange={(e) => setHome(e.target.checked)}
                  className="size-4 accent-[#16A34A]"
                />
                {tr("إظهار القسم في الصفحة الرئيسية")}
              </label>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => void handleAdd()}
              className="btn flex items-center justify-center gap-1.5 px-6 py-2.5 text-xs"
            >
              <Plus className="size-4" aria-hidden />
              {tr("حفظ وإضافة القسم الآن ✓")}
            </button>
          </div>
        </div>
      ) : null}

      {/* Card 2: Unified Connected Sections Manager — ALWAYS visible in BOTH Image 1 (sec-add) AND Image 2 (sec-manage)! */}
      <div className="rounded-3xl bg-paper p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-2xl bg-primary-soft text-primary-ink">
              <LayoutGrid className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-extrabold">
                {tr("الأقسام المضافة حالياً — التحكم بمسار التوجه، القائمة العلوية، والبار السفلي")}
              </h2>
              <p className="text-xs font-semibold text-muted">
                {tr("جميع الأقسام المضافة في «إدارة الأقسام» (مثل: فن و موضة) أو «إضافة قسم» متصلة هنا: غيّر مسار توجه أي قسم أو أضفه للقائمة العلوية أو البار السفلي بضغطة واحدة.")}
              </p>
            </div>
          </div>
        </div>

        {/* Dedicated control for the "بث مباريات" icon tile in the Homepage top tiles row */}
        <div className={`mt-4 rounded-2xl border p-3.5 transition ${liveTileGlow ? "border-[#DC2626]/30 bg-[#DC2626]/5" : "border-line bg-surface"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`size-2.5 rounded-full ${liveTileGlow ? "animate-ping bg-[#DC2626]" : "bg-emerald-600"}`} />
              <div>
                <p className="text-sm font-extrabold text-ink">
                  {tr("أيقونة قسم «بث مباريات» في شريط الأيقونات العلوي بالرئيسية")}
                </p>
                <p className="text-[11px] font-semibold text-muted">
                  {liveTileGlow
                    ? tr("التوهج الأحمر مفعّل حالياً — يمكنك إطفاؤه ليكون مريحاً للعين")
                    : tr("التوهج مطفأ حالياً (وضع مريح للعين بهدوء باقي الأيقونات)")}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy || !siteSettings}
                onClick={async () => {
                  if (!siteSettings) return;
                  const nextGlow = !liveTileGlow;
                  setLiveTileGlow(nextGlow);
                  const subParts = [liveTileVisible ? "قسم في الشريط" : " مَخفي"];
                  if (!nextGlow) subParts.push("بدون توهج");
                  const others = siteSettings.quickLinks.filter((q) => q.id !== "tilelive");
                  await saveQuickLinks(
                    [
                      {
                        id: "tilelive",
                        title: liveTileLabel.trim() || "بث مباريات",
                        subtitle: subParts.join("|"),
                        url: "/sports-news",
                        emoji: nextGlow ? "🔴" : "⚪",
                      },
                      ...others,
                    ],
                    nextGlow
                      ? "تم تشغيل توهج أيقونة «بث مباريات» ✓"
                      : "تم إطفاء توهج أيقونة «بث مباريات» ليكون مريحاً للعين ✓",
                  );
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
                  liveTileGlow
                    ? "border border-[#DC2626]/40 bg-paper text-[#DC2626] hover:bg-[#DC2626]/10"
                    : "bg-ink text-paper"
                }`}
              >
                {liveTileGlow ? tr("⚪ إطفاء التوهج (مريح للعين)") : tr("🔴 التوهج مطفأ (اضغط لتشغيله)")}
              </button>
              <button
                type="button"
                disabled={busy || !siteSettings}
                onClick={async () => {
                  if (!siteSettings) return;
                  const nextVis = !liveTileVisible;
                  setLiveTileVisible(nextVis);
                  const subParts = [nextVis ? "قسم في الشريط" : " مَخفي"];
                  if (!liveTileGlow) subParts.push("بدون توهج");
                  const others = siteSettings.quickLinks.filter((q) => q.id !== "tilelive");
                  await saveQuickLinks(
                    [
                      {
                        id: "tilelive",
                        title: liveTileLabel.trim() || "بث مباريات",
                        subtitle: subParts.join("|"),
                        url: "/sports-news",
                        emoji: liveTileGlow ? "🔴" : "⚪",
                      },
                      ...others,
                    ],
                    nextVis
                      ? "تم إظهار أيقونة «بث مباريات» في شريط الأقسام العلوي ✓"
                      : "تم إخفاء أيقونة «بث مباريات» من شريط الأقسام",
                  );
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-extrabold text-white transition ${
                  liveTileVisible ? "bg-[#16A34A]" : "bg-muted"
                }`}
              >
                {liveTileVisible ? tr("ظاهر في شريط الأيقونات ✓") : tr("مخفي من الشريط")}
              </button>
            </div>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={liveTileLabel}
              onChange={(e) => {
                setLiveTileLabel(e.target.value);
                setDirtyLiveTile(true);
              }}
              placeholder="بث مباريات"
              className="field max-w-xs text-xs"
            />
            {dirtyLiveTile ? (
              <button
                type="button"
                disabled={busy || !siteSettings}
                onClick={async () => {
                  if (!siteSettings) return;
                  const subParts = [liveTileVisible ? "قسم في الشريط" : " مَخفي"];
                  if (!liveTileGlow) subParts.push("بدون توهج");
                  const others = siteSettings.quickLinks.filter((q) => q.id !== "tilelive");
                  await saveQuickLinks(
                    [
                      {
                        id: "tilelive",
                        title: liveTileLabel.trim() || "بث مباريات",
                        subtitle: subParts.join("|"),
                        url: "/sports-news",
                        emoji: liveTileGlow ? "🔴" : "⚪",
                      },
                      ...others,
                    ],
                    `تم حفظ اسم الأيقونة «${liveTileLabel.trim() || "بث مباريات"}» ✓`,
                  );
                  setDirtyLiveTile(false);
                }}
                className="btn py-2 text-xs"
              >
                {tr("حفظ التغيير ✓")}
              </button>
            ) : null}
          </div>
        </div>

        {/* Unified List of All Custom Sections (including "فن و موضة" from Image 2!) */}
        <div className="mt-4">
          <p className="mb-2.5 text-xs font-extrabold text-muted">
            {tr("الأقسام المخصّصة المضافة (تحكّم كامل بمسار التوجه، القائمة العلوية، البار السفلي، والصفحة الرئيسية):")}
          </p>
          {unifiedSections.length === 0 ? (
            <p className="rounded-2xl bg-surface p-3 text-xs font-semibold text-muted">
              {tr("لا توجد أقسام مخصّصة مضافة بعد. اضغط على «✨ فن و موضة» أو أضف قسماً من الأعلى.")}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {unifiedSections.map((secItem) => {
                const draftUrl = pathDrafts[secItem.name] ?? secItem.url;
                const draftIcon = iconDrafts[secItem.name] ?? secItem.iconKey;
                const isPathDirty =
                  draftUrl.trim() !== secItem.url.trim() || draftIcon !== secItem.iconKey;

                return (
                  <div
                    key={secItem.key}
                    className="flex flex-col gap-3 rounded-2xl border border-primary/40 bg-surface p-3.5 text-xs font-bold shadow-2xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-9 place-items-center rounded-xl bg-paper text-base shadow-2xs">
                          {ICON_KEY_TO_EMOJI[draftIcon] ?? secItem.emoji}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-extrabold text-ink">{secItem.name}</span>
                            <span className="rounded-full bg-brand/40 px-2 py-0.5 text-[10px] font-extrabold text-ink">
                              {tr("مخصص · متصل")}
                            </span>
                            {secItem.dbSec ? (
                              <span className="text-[10px] font-semibold text-muted" dir="ltr">
                                #{secItem.dbSec.id}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[11px] font-semibold text-muted" dir="ltr">
                            {tr("المسار الحالي:")} {secItem.url}
                          </p>
                        </div>
                      </div>

                      {/* 1-Click Placement Toggles: Top Bar, Bottom Bar, Homepage, RSS Manager, Delete */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          disabled={busy || !siteSettings}
                          onClick={() => void handleToggleTopBar(secItem)}
                          className={`rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold text-white transition ${
                            secItem.inTopBar ? "bg-[#16A34A]" : "bg-muted hover:opacity-90"
                          }`}
                        >
                          {secItem.inTopBar ? tr("في القائمة العلوية ✓") : tr("+ القائمة العلوية")}
                        </button>

                        <button
                          type="button"
                          disabled={busy || !siteSettings}
                          onClick={() => void handleToggleBotBar(secItem)}
                          className={`rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold text-white transition ${
                            secItem.inBotBar ? "bg-[#0284C7]" : "bg-muted hover:opacity-90"
                          }`}
                        >
                          {secItem.inBotBar ? tr("في البار السفلي ✓") : tr("+ البار السفلي")}
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleToggleHome(secItem)}
                          className={`rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold text-white transition ${
                            secItem.inHome ? "bg-ink" : "bg-muted hover:opacity-90"
                          }`}
                        >
                          {secItem.inHome ? tr("في الرئيسية ✓") : tr("مخفي بالرئيسية")}
                        </button>

                        {/* Reorder custom section up/down on Homepage directly from here */}
                        <button
                          type="button"
                          disabled={busy || !siteSettings}
                          onClick={async () => {
                            if (!siteSettings) return;
                            const list = buildCombinedHomeOrder(
                              siteSettings,
                              unifiedSections.map((u) => u.name),
                            );
                            const idx = list.findIndex(
                              (x) => x.id === `csec~${secItem.name}`,
                            );
                            if (idx <= 0) return;
                            const moved = moveItem(list, idx, -1);
                            const patch = applyCombinedHomeOrderToSettings(
                              siteSettings,
                              moved,
                            );
                            setBusy(true);
                            try {
                              const r = await adminSaveSiteSettings({
                                data: { ...siteSettings, ...patch },
                              });
                              if (r.ok && r.settings) {
                                setSiteSettings(r.settings);
                                setMsg(
                                  `تم تقديم ترتيب قسم «${secItem.name}» للأعلى في الصفحة الرئيسية ✓`,
                                );
                              }
                            } finally {
                              setBusy(false);
                            }
                          }}
                          className="rounded-xl border border-line bg-paper px-2 py-1.5 text-[11px] font-extrabold text-ink hover:bg-primary-soft"
                          title={tr("تقديم ترتيب القسم لأعلى في الصفحة الرئيسية")}
                        >
                          ⬆️ {tr("أعلى بالرئيسية")}
                        </button>

                        <button
                          type="button"
                          disabled={busy || !siteSettings}
                          onClick={async () => {
                            if (!siteSettings) return;
                            const list = buildCombinedHomeOrder(
                              siteSettings,
                              unifiedSections.map((u) => u.name),
                            );
                            const idx = list.findIndex(
                              (x) => x.id === `csec~${secItem.name}`,
                            );
                            if (idx === -1 || idx >= list.length - 1) return;
                            const moved = moveItem(list, idx, 1);
                            const patch = applyCombinedHomeOrderToSettings(
                              siteSettings,
                              moved,
                            );
                            setBusy(true);
                            try {
                              const r = await adminSaveSiteSettings({
                                data: { ...siteSettings, ...patch },
                              });
                              if (r.ok && r.settings) {
                                setSiteSettings(r.settings);
                                setMsg(
                                  `تم تأخير ترتيب قسم «${secItem.name}» لأسفل في الصفحة الرئيسية ✓`,
                                );
                              }
                            } finally {
                              setBusy(false);
                            }
                          }}
                          className="rounded-xl border border-line bg-paper px-2 py-1.5 text-[11px] font-extrabold text-ink hover:bg-primary-soft"
                          title={tr("تأخير ترتيب القسم لأسفل في الصفحة الرئيسية")}
                        >
                          ⬇️ {tr("أسفل بالرئيسية")}
                        </button>

                        {secItem.dbSec ? (
                          <button
                            type="button"
                            onClick={() => onSelectSection(secItem.dbSec!.id)}
                            className="rounded-xl border border-line bg-paper px-2.5 py-1.5 text-[11px] font-extrabold text-ink hover:bg-primary-soft"
                          >
                            {tr("مصادر RSS ⚙")}
                          </button>
                        ) : null}

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleDeleteUnified(secItem)}
                          className="grid size-7 place-items-center rounded-lg border border-line bg-paper text-[#DC2626] hover:opacity-80"
                          title={tr("حذف القسم")}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Destination Path (مسار توجه الصفحة) & Icon Control */}
                    <div className="grid grid-cols-1 gap-2 rounded-xl border border-line bg-paper p-2.5 sm:grid-cols-12">
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-extrabold text-muted">
                          {tr("أيقونة القسم")}
                        </label>
                        <select
                          value={draftIcon}
                          onChange={(e) =>
                            setIconDrafts((prev) => ({ ...prev, [secItem.name]: e.target.value }))
                          }
                          className="field mt-0.5 py-1 text-xs"
                        >
                          {BAR_ICON_OPTIONS.map((o) => (
                            <option key={o.key} value={o.key}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-extrabold text-muted">
                          {tr("اختيار مسار جاهز")}
                        </label>
                        <select
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            const nextPath =
                              val === "__auto__"
                                ? `/?q=${secItem.name}`
                                : val === "__news_q__"
                                  ? `/news?q=${secItem.name}`
                                  : val;
                            setPathDrafts((prev) => ({ ...prev, [secItem.name]: nextPath }));
                          }}
                          className="field mt-0.5 py-1 text-xs"
                        >
                          <option value="">{tr("اختر مسار توجه سريع...")}</option>
                          {SECTION_PATH_PRESETS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-4">
                        <label className="block text-[10px] font-extrabold text-muted">
                          {tr("مسار توجه الصفحة (الرابط عند الضغط على القسم)")}
                        </label>
                        <input
                          type="text"
                          dir="ltr"
                          value={draftUrl}
                          onChange={(e) =>
                            setPathDrafts((prev) => ({ ...prev, [secItem.name]: e.target.value }))
                          }
                          placeholder={`/?q=${secItem.name}`}
                          className="field mt-0.5 py-1 font-mono text-xs"
                        />
                      </div>

                      <div className="flex items-end sm:col-span-2">
                        <button
                          type="button"
                          disabled={busy || !siteSettings}
                          onClick={() => void handleSaveSectionPath(secItem)}
                          className={`w-full rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                            isPathDirty
                              ? "bg-primary text-ink shadow-xs"
                              : "border border-line bg-surface text-ink hover:bg-primary-soft"
                          }`}
                        >
                          {tr("حفظ المسار ✓")}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-2 text-xs font-extrabold text-muted">{tr("إدارة مصادر الأقسام الأساسية والمخصّصة:")}</p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "news", label: "الأخبار المحلية" },
              { id: "israel", label: "أخبار إسرائيل" },
              { id: "sports", label: "الرياضة" },
              { id: "tech", label: "التقنية" },
              { id: "weather", label: "الطقس" },
              ...dbCustomSecs.map((d) => ({ id: d.id, label: `✨ ${d.name}` })),
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onSelectSection(b.id)}
                className={`rounded-2xl border px-3 py-2 text-xs font-extrabold transition ${
                  currentId === b.id
                    ? "border-ink bg-ink text-paper"
                    : "border-line bg-surface hover:bg-primary-soft"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Embedded SiteSettingsAdmin with Dirty-Only Save & Advanced Slider Controls */
/* -------------------------------------------------------------------------- */

const SETTINGS_PARTS = {
  theme: "المظهر والألوان",
  home: "أقسام الرئيسية",
  slider: "السلايدر",
  texts: "النصوص والشعار",
  menus: "القوائم والأيقونات",
  links: "روابط سريعة",
  google: "خدمات جوجل",
} as const;
type SettingsPartKey = keyof typeof SETTINGS_PARTS;

const genSlideId = () => Math.random().toString(36).slice(2, 12).padEnd(8, "0");

function moveItem<T>(list: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= list.length) return list;
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

async function uploadSettingImage(file: File): Promise<string> {
  const blob = await compress(file);
  const res = await fetch("/api/media?kind=staff", {
    method: "POST",
    headers: { "content-type": blob.type },
    body: blob,
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    key?: string;
    message?: string;
  };
  if (!res.ok || !data.ok || !data.key) throw new Error(data.message || tr("تعذّر رفع الصورة."));
  return data.key;
}

type SliderSizeKey = "sm" | "md" | "lg" | "xl";
type BottomBarStyleKey =
  | "classic"
  | "floating"
  | "dark"
  | "dock"
  | "minimal"
  | "neon"
  | "glass"
  | "custom"
  | "hidden";
type BarBtnItem = { icon: string; label: string; to: string };
type CustomBotCssConfig = {
  bg: string;
  fg: string;
  ab: string;
  af: string;
  r: number;
  m: number;
  rawCss: string;
};

function toAdminBase64Url(str: string): string {
  try {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch {
    return "";
  }
}

function fromAdminBase64Url(b64u: string): string {
  try {
    const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const bin = atob(b64 + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

function parseBotBarCssConfig(quickLinks: SiteSettings["quickLinks"]): CustomBotCssConfig {
  const cssItem = (quickLinks ?? []).find((q) => q.id === "botbarcss");
  let bg = "#111827";
  let fg = "#9ca3af";
  let ab = "#f2c94c";
  let af = "#111827";
  let r = 24;
  let m = 10;
  let rawCss = "";
  if (cssItem) {
    for (const part of (cssItem.title ?? "").split("|")) {
      if (part.startsWith("bg:")) bg = part.slice(3) || bg;
      else if (part.startsWith("fg:")) fg = part.slice(3) || fg;
      else if (part.startsWith("ab:")) ab = part.slice(3) || ab;
      else if (part.startsWith("af:")) af = part.slice(3) || af;
      else if (part.startsWith("r:")) r = Number(part.slice(2)) || 0;
      else if (part.startsWith("m:")) m = Number(part.slice(2)) || 0;
    }
    const b64Part1 = cssItem.url?.startsWith("/__bcss?") ? cssItem.url.slice(8) : "";
    const b64Part2 = cssItem.subtitle && cssItem.subtitle !== "css" ? cssItem.subtitle : "";
    if (b64Part1) rawCss = fromAdminBase64Url(b64Part1 + b64Part2);
  }
  return { bg, fg, ab, af, r, m, rawCss };
}

function encodeBotBarCssConfig(
  quickLinks: SiteSettings["quickLinks"],
  cfg: CustomBotCssConfig,
): SiteSettings["quickLinks"] {
  const others = (quickLinks ?? []).filter((q) => q.id !== "botbarcss" && q.id !== "txsecscfg");
  const title = `bg:${cfg.bg}|fg:${cfg.fg}|ab:${cfg.ab}|af:${cfg.af}|r:${cfg.r}|m:${cfg.m}`.slice(0, 60);
  const b64 = toAdminBase64Url(cfg.rawCss.trim().slice(0, 260));
  const url = `/__bcss?${b64.slice(0, 280)}`;
  const subtitle = b64.slice(280, 380) || "css";
  return [
    ...others,
    {
      id: "botbarcss",
      title,
      subtitle,
      url,
      emoji: "🎨",
    },
  ];
}

const DEFAULT_TOP_BAR_BTNS: BarBtnItem[] = [
  { icon: "news", label: "الأخبار", to: "/news" },
  { icon: "tv", label: "بث مباريات", to: "/sports-news" },
  { icon: "sparkles", label: "فن و موضة", to: "/?q=فن و موضة" },
  { icon: "siren", label: "اليوم", to: "/today" },
  { icon: "ad", label: "حراج", to: "/haraj" },
  { icon: "bus", label: "الباصات", to: "/buses" },
  { icon: "store", label: "المتجر", to: "/store" },
  { icon: "pin", label: "الدليل", to: "/directory" },
];

const DEFAULT_BOT_BAR_BTNS: BarBtnItem[] = [
  { icon: "home", label: "الرئيسية", to: "/" },
  { icon: "news", label: "الأخبار", to: "/news" },
  { icon: "tv", label: "بث مباريات", to: "/sports-news" },
  { icon: "bus", label: "باصات", to: "/buses" },
  { icon: "ad", label: "حراج", to: "/haraj" },
  { icon: "siren", label: "اليوم", to: "/today" },
];

const BAR_ICON_OPTIONS: { key: string; label: string }[] = [
  { key: "home", label: "🏠 الرئيسية" },
  { key: "news", label: "📰 أخبار" },
  { key: "tv", label: "📺 بث مباشر / تلفاز" },
  { key: "trophy", label: "⚽ كأس / مباريات" },
  { key: "bus", label: "🚌 باصات" },
  { key: "ad", label: "📢 حراج / إعلانات" },
  { key: "siren", label: "🚨 طوارئ / اليوم" },
  { key: "pin", label: "📍 الدليل / موقع" },
  { key: "store", label: "🛍️ المتجر" },
  { key: "globe", label: "🌍 عالمي / إسرائيل" },
  { key: "sparkles", label: "✨ فن وموضة / نجمة" },
  { key: "cpu", label: "💻 تقنية" },
  { key: "plus", label: "➕ إضافة" },
];

function parseSliderConfig(quickLinks: SiteSettings["quickLinks"]): {
  size: SliderSizeKey;
  sections: string[];
  ampAds: boolean;
  homeOrderUrl: string;
} {
  const item = (quickLinks ?? []).find((q) => q.id === "slidercfg");
  const raw = item?.subtitle ?? "";
  const titleFlags = item?.title ?? "";
  const homeOrderUrl = item?.url?.startsWith("/__hord?") ? item.url : "/";
  let size: SliderSizeKey = "md";
  let sections: string[] = ["news", "israel", "sports", "tech", "reader"];
  const ampAds = !titleFlags.includes("amp:0");
  for (const part of raw.split("|")) {
    if (part.startsWith("size:")) {
      const v = part.slice(5).trim();
      if (v === "sm" || v === "md" || v === "lg" || v === "xl") size = v;
    } else if (part.startsWith("secs:")) {
      const list = part
        .slice(5)
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      if (list.length > 0) sections = list;
    }
  }
  return { size, sections, ampAds, homeOrderUrl };
}

function encodeSliderConfig(
  quickLinks: SiteSettings["quickLinks"],
  size: SliderSizeKey,
  sections: string[],
  ampAds?: boolean,
  customHomeOrderUrl?: string,
): SiteSettings["quickLinks"] {
  const current = parseSliderConfig(quickLinks);
  const nextAmp = ampAds !== undefined ? ampAds : current.ampAds;
  const nextUrl = (customHomeOrderUrl ?? current.homeOrderUrl ?? "/").slice(0, 300);
  const others = (quickLinks ?? []).filter((q) => q.id !== "slidercfg");
  const sub = `size:${size}|secs:${sections.join(",")}`.slice(0, 100);
  return [
    ...others,
    {
      id: "slidercfg",
      title: `amp:${nextAmp ? "1" : "0"}`,
      subtitle: sub,
      url: nextUrl || "/",
      emoji: "🎞️",
    },
  ];
}

type CombinedHomeOrderItem = {
  id: string;
  label: string;
  visible: boolean;
  isCustom: boolean;
  rawCustomName?: string;
};

function buildCombinedHomeOrder(
  s: SiteSettings,
  extraCustomNames: string[],
): CombinedHomeOrderItem[] {
  const sliderItem = (s.quickLinks ?? []).find((q) => q.id === "slidercfg");
  const hordRaw = sliderItem?.url?.startsWith("/__hord?")
    ? sliderItem.url.slice(8)
    : "";

  // Collect all custom section names from DB, quickLinks (sec*), topbarcfg (/?q=), and "فن و موضة"
  const customNamesSet = new Set<string>();
  customNamesSet.add("فن و موضة");
  for (const n of extraCustomNames) {
    if (n.trim()) customNamesSet.add(n.trim());
  }
  for (const q of s.quickLinks ?? []) {
    if (q.id.startsWith("sec") && q.title.trim()) {
      customNamesSet.add(q.title.trim());
    }
  }
  for (const b of parseTopBarConfig(s.quickLinks)) {
    if ((b.to.includes("?q=") || b.icon === "sparkles") && b.label.trim()) {
      customNamesSet.add(b.label.trim());
    }
  }

  const builtinMap = new Map<string, { label: string; visible: boolean }>();
  for (const h of s.home) {
    builtinMap.set(h.id, {
      label: HOME_SECTIONS[h.id] ?? h.id,
      visible: h.visible,
    });
  }
  for (const [k, lbl] of Object.entries(HOME_SECTIONS)) {
    if (!builtinMap.has(k)) {
      builtinMap.set(k, { label: lbl, visible: true });
    }
  }

  const customVisMap = new Map<string, boolean>();
  for (const cName of customNamesSet) {
    const ql = (s.quickLinks ?? []).find(
      (q) => q.id.startsWith("sec") && q.title.trim() === cName,
    );
    const hidden = ql?.subtitle?.includes("مَخفي_رئيسية") || ql?.subtitle === " مَخفي";
    customVisMap.set(cName, !hidden);
  }

  const out: CombinedHomeOrderItem[] = [];
  const seenIds = new Set<string>();

  if (hordRaw) {
    for (const token of hordRaw.split("|").filter(Boolean)) {
      const colon = token.lastIndexOf(":");
      const rawKey = (colon > 0 ? token.slice(0, colon) : token).replace(/%20/g, " ");
      const visFlag = colon > 0 ? token.slice(colon + 1) !== "0" : true;
      if (rawKey.startsWith("csec~")) {
        const cName = rawKey.slice(5).trim();
        if (!cName || seenIds.has(`csec~${cName}`)) continue;
        seenIds.add(`csec~${cName}`);
        customNamesSet.add(cName);
        out.push({
          id: `csec~${cName}`,
          label: `✨ قسم مخصّص: ${cName}`,
          visible: visFlag,
          isCustom: true,
          rawCustomName: cName,
        });
      } else if (builtinMap.has(rawKey) && !seenIds.has(rawKey)) {
        seenIds.add(rawKey);
        const b = builtinMap.get(rawKey)!;
        out.push({
          id: rawKey,
          label: b.label,
          visible: visFlag,
          isCustom: false,
        });
      }
    }
  }

  // Append any built-in sections not yet in out (preserving s.home order)
  for (const h of s.home) {
    if (!seenIds.has(h.id)) {
      seenIds.add(h.id);
      out.push({
        id: h.id,
        label: HOME_SECTIONS[h.id] ?? h.id,
        visible: h.visible,
        isCustom: false,
      });
    }
  }

  // Insert any custom sections not yet in out right after "news" (آخر الأخبار)
  for (const cName of customNamesSet) {
    const cid = `csec~${cName}`;
    if (seenIds.has(cid)) continue;
    seenIds.add(cid);
    const item: CombinedHomeOrderItem = {
      id: cid,
      label: `✨ قسم مخصّص: ${cName}`,
      visible: customVisMap.get(cName) ?? true,
      isCustom: true,
      rawCustomName: cName,
    };
    const newsIdx = out.findIndex((x) => x.id === "news");
    if (newsIdx !== -1) {
      out.splice(newsIdx + 1, 0, item);
    } else {
      out.push(item);
    }
  }

  return out;
}

function applyCombinedHomeOrderToSettings(
  s: SiteSettings,
  nextList: CombinedHomeOrderItem[],
): Partial<SiteSettings> {
  const nextHome: SiteSettings["home"] = nextList
    .filter((x) => !x.isCustom && x.id in HOME_SECTIONS)
    .map((x) => ({
      id: x.id as keyof typeof HOME_SECTIONS,
      visible: x.visible,
    }));

  const hordTokens = nextList.map((x) => {
    const safeKey = x.id.trim().replace(/\s+/g, "%20");
    return `${safeKey}:${x.visible ? "1" : "0"}`;
  });
  const hordUrl = ("/__hord?" + hordTokens.join("|")).slice(0, 300);

  const curSlider = parseSliderConfig(s.quickLinks);
  let nextQuickLinks = encodeSliderConfig(
    s.quickLinks,
    curSlider.size,
    curSlider.sections,
    curSlider.ampAds,
    hordUrl,
  );

  // Also sync custom section home visibility flags in sec* quickLinks
  for (const item of nextList) {
    if (!item.isCustom || !item.rawCustomName) continue;
    const cName = item.rawCustomName;
    const existingQl = nextQuickLinks.find(
      (q) => q.id.startsWith("sec") && q.title.trim() === cName,
    );
    if (existingQl) {
      nextQuickLinks = nextQuickLinks.map((q) =>
        q.id === existingQl.id
          ? {
              ...q,
              subtitle: q.subtitle?.includes("مَخفي_علوي")
                ? "مَخفي_علوي"
                : item.visible
                  ? "قسم في الرئيسية"
                  : "مَخفي_رئيسية",
            }
          : q,
      );
    }
  }

  return {
    home: nextHome.length > 0 ? nextHome : s.home,
    quickLinks: nextQuickLinks,
  };
}

function parseTopBarConfig(quickLinks: SiteSettings["quickLinks"]): BarBtnItem[] {
  const item = (quickLinks ?? []).find((q) => q.id === "topbarcfg");
  if (!item || !item.url.startsWith("/__top?")) return DEFAULT_TOP_BAR_BTNS;
  const labels = (item.subtitle ?? "").split("|");
  const pairs = item.url.slice(7).split("|").filter(Boolean);
  if (!pairs.length) return DEFAULT_TOP_BAR_BTNS;
  return pairs.map((p, idx) => {
    const colon = p.indexOf(":");
    const icon = colon > 0 ? p.slice(0, colon) : "news";
    const rawTo = colon > 0 ? p.slice(colon + 1) : p;
    const to = rawTo.replace(/%20/g, " ");
    return {
      icon: icon || "news",
      to: to || "/news",
      label: (labels[idx] ?? "").trim() || "قسم",
    };
  });
}

function encodeTopBarConfig(
  quickLinks: SiteSettings["quickLinks"],
  btns: BarBtnItem[],
): SiteSettings["quickLinks"] {
  const others = (quickLinks ?? []).filter((q) => q.id !== "topbarcfg");
  const clean = btns.slice(0, 10);
  const subtitle = clean.map((b) => b.label.replace(/\|/g, " ").trim() || "قسم").join("|").slice(0, 100);
  const url = ("/__top?" + clean.map((b) => `${b.icon}:${b.to.replace(/\s+/g, "")}`).join("|")).slice(0, 300);
  return [
    ...others,
    {
      id: "topbarcfg",
      title: "topbarcfg",
      subtitle: subtitle || "الأخبار",
      url,
      emoji: "🧭",
    },
  ];
}

function parseBotBarConfig(quickLinks: SiteSettings["quickLinks"]): {
  style: BottomBarStyleKey;
  btns: BarBtnItem[];
} {
  const item = (quickLinks ?? []).find((q) => q.id === "botbarcfg");
  if (!item || !item.url.startsWith("/__bot?")) {
    return { style: "classic", btns: DEFAULT_BOT_BAR_BTNS };
  }
  const rawStyle = item.title.trim() as BottomBarStyleKey;
  const style: BottomBarStyleKey =
    rawStyle === "floating" ||
    rawStyle === "dark" ||
    rawStyle === "dock" ||
    rawStyle === "minimal" ||
    rawStyle === "neon" ||
    rawStyle === "glass" ||
    rawStyle === "custom" ||
    rawStyle === "hidden"
      ? rawStyle
      : "classic";
  const labels = (item.subtitle ?? "").split("|");
  const pairs = item.url.slice(7).split("|").filter(Boolean);
  const btns: BarBtnItem[] = pairs.map((p, idx) => {
    const colon = p.indexOf(":");
    const icon = colon > 0 ? p.slice(0, colon) : "home";
    const rawTo = colon > 0 ? p.slice(colon + 1) : p;
    const to = rawTo.replace(/%20/g, " ");
    return {
      icon: icon || "home",
      to: to || "/",
      label: (labels[idx] ?? "").trim() || "زر",
    };
  });
  return { style, btns: btns.length > 0 ? btns : DEFAULT_BOT_BAR_BTNS };
}

function encodeBotBarConfig(
  quickLinks: SiteSettings["quickLinks"],
  style: BottomBarStyleKey,
  btns: BarBtnItem[],
): SiteSettings["quickLinks"] {
  const others = (quickLinks ?? []).filter((q) => q.id !== "botbarcfg");
  const clean = btns.slice(0, 7);
  const subtitle = clean.map((b) => b.label.replace(/\|/g, " ").trim() || "زر").join("|").slice(0, 100);
  const url = ("/__bot?" + clean.map((b) => `${b.icon}:${b.to.replace(/\s+/g, "")}`).join("|")).slice(0, 300);
  return [
    ...others,
    {
      id: "botbarcfg",
      title: style,
      subtitle: subtitle || "الرئيسية",
      url,
      emoji: "📱",
    },
  ];
}

function SiteSettingsAdmin({ only }: { only?: SettingsPartKey } = {}) {
  const router = useRouter();
  const [s, setS] = useState<SiteSettings | null>(null);
  const [origJson, setOrigJson] = useState<string>("");
  const [partState, setPart] = useState<SettingsPartKey>("theme");
  const part = only ?? partState;
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    void adminGetSiteSettings().then((r) => {
      if (!r.authed) setMsg(tr("هذا القسم لمالك الموقع فقط."));
      if (r.settings) {
        setS(r.settings);
        setOrigJson(JSON.stringify(r.settings));
      }
    });
  }, []);

  if (!s) return <p className="stamp p-4 font-semibold">{msg || tr("جاري التحميل…")}</p>;

  const set = (patch: Partial<SiteSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    setDirty(true);
    setMsg("");
  };

  const save = async () => {
    setSaving(true);
    const res = await adminSaveSiteSettings({ data: s });
    setSaving(false);
    if (!res.ok || !res.settings) return setMsg(res.message || tr("تعذّر الحفظ."));
    setS(res.settings);
    setOrigJson(JSON.stringify(res.settings));
    setDirty(false);
    setMsg(tr("تم حفظ التغييرات بنجاح ✓"));
    await router.invalidate();
  };

  const cancelChanges = () => {
    if (origJson) {
      try {
        setS(JSON.parse(origJson) as SiteSettings);
      } catch {
        // ignore
      }
    }
    setDirty(false);
    setMsg("");
  };

  const reset = async () => {
    if (!confirm(tr("استعادة كل الإعدادات الافتراضية؟ سيتم حذف كل التخصيصات."))) return;
    const res = await adminResetSiteSettings();
    if (!res.ok) return setMsg(tr("تعذّر الاستعادة."));
    setS(DEFAULT_SETTINGS);
    setOrigJson(JSON.stringify(DEFAULT_SETTINGS));
    setDirty(false);
    setMsg(tr("تمت استعادة الإعدادات الافتراضية ✓"));
    await router.invalidate();
  };

  return (
    <>
      <div className={only ? "hidden" : "mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4"}>
        {(Object.keys(SETTINGS_PARTS) as SettingsPartKey[]).map((p) => (
          <button
            key={p}
            type="button"
            className={`rounded-2xl px-3 py-2.5 text-xs font-extrabold transition ${
              part === p ? "bg-ink text-paper" : "border border-line bg-paper text-ink"
            }`}
            onClick={() => setPart(p)}
          >
            {trv(SETTINGS_PARTS[p])}
          </button>
        ))}
      </div>

      {msg ? (
        <div className="mb-4 rounded-2xl bg-primary-soft/70 px-4 py-3 text-sm font-extrabold text-ink">
          {trv(msg)}
        </div>
      ) : null}

      {part === "theme" ? <ThemePart s={s} set={set} /> : null}
      {part === "home" ? <HomeSectionsOrderPart s={s} set={set} /> : null}
      {part === "slider" ? <SliderPart s={s} set={set} setMsg={setMsg} /> : null}
      {part === "texts" ? <TextsPart s={s} set={set} setMsg={setMsg} /> : null}
      {part === "menus" ? <MenusAndBarsPart s={s} set={set} /> : null}
      {part === "links" ? <LinksPart s={s} set={set} /> : null}
      {part === "google" ? <GooglePart s={s} set={set} /> : null}

      {/* Save bar ONLY appears when a change is actually made (dirty === true) */}
      {dirty || saving ? (
        <div className="sticky bottom-4 z-20 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-ink/20 bg-paper p-3.5 shadow-[var(--shadow-lift)]">
          <span className="text-xs font-extrabold text-primary-ink">
            {tr("لديك تعديلات غير محفوظة — اضغط حفظ لتطبيقها")}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn px-5 py-2 text-xs"
              disabled={saving}
              onClick={save}
            >
              {saving ? tr("جاري الحفظ…") : tr("حفظ التغييرات ✓")}
            </button>
            <button
              type="button"
              className="btn btn-ghost px-3 py-2 text-xs"
              disabled={saving}
              onClick={cancelChanges}
            >
              {tr("تراجع")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="text-xs font-bold text-muted underline hover:text-ink"
            onClick={reset}
          >
            {tr("استعادة الإعدادات الافتراضية")}
          </button>
        </div>
      )}
    </>
  );
}

type SettingsPartProps = { s: SiteSettings; set: (p: Partial<SiteSettings>) => void };

function SettingsCard({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="stamp mb-4 flex flex-col gap-3 p-4">
      <div>
        <h2 className="text-lg font-bold">{trv(title)}</h2>
        {hint ? <p className="text-sm font-semibold text-muted">{trv(hint)}</p> : null}
      </div>
      {children}
    </section>
  );
}

function SettingsField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block font-bold">
      {trv(label)}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function ToggleList<T extends string>({
  list,
  labels,
  onChange,
}: {
  list: Toggle<T>[];
  labels: Record<T, string>;
  onChange: (l: Toggle<T>[]) => void;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {list.map((item, i) => (
        <li
          key={item.id}
          className={`flex items-center gap-2 rounded-xl border border-line px-3 py-2 ${item.visible ? "" : "opacity-50"}`}
        >
          <span className="min-w-0 flex-1 font-bold">{trv(labels[item.id] ?? item.id)}</span>
          <SettingsIconBtn label={tr("أعلى")} onClick={() => onChange(moveItem(list, i, -1))} disabled={i === 0}>
            <ArrowUp className="size-4" />
          </SettingsIconBtn>
          <SettingsIconBtn
            label={tr("أسفل")}
            onClick={() => onChange(moveItem(list, i, 1))}
            disabled={i === list.length - 1}
          >
            <ArrowDown className="size-4" />
          </SettingsIconBtn>
          <SettingsIconBtn
            label={item.visible ? tr("إخفاء") : tr("إظهار")}
            onClick={() =>
              onChange(list.map((x) => (x.id === item.id ? { ...x, visible: !x.visible } : x)))
            }
          >
            {item.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          </SettingsIconBtn>
        </li>
      ))}
    </ul>
  );
}

function SettingsIconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={trv(label)}
      title={trv(label)}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-lg border border-line bg-paper disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function HomeSectionsOrderPart({ s, set }: SettingsPartProps) {
  const [dbCustomNames, setDbCustomNames] = useState<string[]>(["فن و موضة"]);

  useEffect(() => {
    const BUILTIN = new Set(["news", "israel", "sports", "tech", "weather"]);
    void adminListSections()
      .then((r) => {
        if (r.authed && r.sections) {
          const names = r.sections
            .filter((sec) => !BUILTIN.has(sec.id))
            .map((sec) => sec.name.trim())
            .filter(Boolean);
          setDbCustomNames(Array.from(new Set(["فن و موضة", ...names])));
        }
      })
      .catch(() => {});
  }, []);

  const combinedList = useMemo(
    () => buildCombinedHomeOrder(s, dbCustomNames),
    [s, dbCustomNames],
  );

  const updateOrder = (next: CombinedHomeOrderItem[]) => {
    set(applyCombinedHomeOrderToSettings(s, next));
  };

  const moveDirectlyAfter = (fromIdx: number, targetId: string) => {
    const copy = [...combinedList];
    const [picked] = copy.splice(fromIdx, 1);
    const targetIdx = copy.findIndex((x) => x.id === targetId);
    if (targetIdx !== -1) {
      copy.splice(targetIdx + 1, 0, picked);
    } else {
      copy.unshift(picked);
    }
    updateOrder(copy);
  };

  return (
    <SettingsCard
      title={tr("أقسام الصفحة الرئيسية (تشمل الأقسام الأساسية والأقسام المخصّصة مثل «فن و موضة»)")}
      hint={tr(
        "رتّب جميع أقسام الصفحة الرئيسية بالأسهم (أعلى / أسفل) أو أخفِ وأظهر أي قسم. أي قسم جديد تضيفه يظهر هنا تلقائياً ويمكنك وضعه في أي مكان في الصفحة الرئيسية.",
      )}
    >
      <ul className="flex flex-col gap-2">
        {combinedList.map((item, i) => (
          <li
            key={item.id}
            className={`flex flex-wrap items-center gap-2 rounded-2xl border px-3 py-2.5 transition ${
              item.isCustom
                ? "border-primary/60 bg-primary/10"
                : "border-line bg-paper"
            } ${item.visible ? "" : "opacity-50"}`}
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface text-xs font-extrabold text-muted">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 font-extrabold text-ink">
              {trv(item.label)}
            </span>

            {item.isCustom ? (
              <button
                type="button"
                onClick={() => moveDirectlyAfter(i, "tiles")}
                className="rounded-xl border border-primary bg-paper px-2.5 py-1 text-[11px] font-extrabold text-ink hover:bg-primary"
                title={tr("نقل إلى أعلى الصفحة مباشرة تحت شريط الأيقونات")}
              >
                {tr("⏫ نقل لأعلى الرئيسية")}
              </button>
            ) : null}

            <SettingsIconBtn
              label={tr("أعلى")}
              onClick={() => updateOrder(moveItem(combinedList, i, -1))}
              disabled={i === 0}
            >
              <ArrowUp className="size-4" />
            </SettingsIconBtn>
            <SettingsIconBtn
              label={tr("أسفل")}
              onClick={() => updateOrder(moveItem(combinedList, i, 1))}
              disabled={i === combinedList.length - 1}
            >
              <ArrowDown className="size-4" />
            </SettingsIconBtn>
            <SettingsIconBtn
              label={item.visible ? tr("إخفاء") : tr("إظهار")}
              onClick={() =>
                updateOrder(
                  combinedList.map((x, idx) =>
                    idx === i ? { ...x, visible: !x.visible } : x,
                  ),
                )
              }
            >
              {item.visible ? (
                <Eye className="size-4 text-[#16A34A]" />
              ) : (
                <EyeOff className="size-4" />
              )}
            </SettingsIconBtn>
          </li>
        ))}
      </ul>
    </SettingsCard>
  );
}

function ThemePart({ s, set }: SettingsPartProps) {
  const t = s.theme;
  const color = (k: keyof typeof t, label: string) => (
    <SettingsField label={trv(label)}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={t[k]}
          onChange={(e) => set({ theme: { ...t, [k]: e.target.value } })}
          className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-paper"
        />
        <input
          className="field"
          dir="ltr"
          value={t[k]}
          maxLength={7}
          onChange={(e) => set({ theme: { ...t, [k]: e.target.value } })}
        />
      </div>
    </SettingsField>
  );
  return (
    <>
      <SettingsCard title={tr("الألوان")} hint={tr("الألوان الفاتحة للون الأساسي تبقى أوضح مع النص الداكن.")}>
        <div className="flex flex-wrap gap-2">
          {THEME_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className="chip"
              onClick={() => set({ theme: p.theme })}
            >
              <span className="size-4 rounded-full" style={{ background: p.theme.primary }} />
              {trv(p.name)}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {color("primary", tr("اللون الأساسي (الأزرار والتحديد)"))}
          {color("accent", tr("لون التنبيه والعاجل"))}
          {color("background", tr("لون الخلفية"))}
          {color("ink", tr("لون النص"))}
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => set({ theme: THEME_DEFAULT })}
        >
          {tr("إرجاع الألوان الافتراضية")}
        </button>
      </SettingsCard>
      <SettingsCard title={tr("معاينة مباشرة")}>
        <div
          className="rounded-2xl p-4"
          style={{
            ...(themeVars(t) as CSSProperties),
            background: "var(--color-surface)",
            color: "var(--color-ink)",
          }}
        >
          <div className="stamp p-4">
            <span className="chip chip-deep">{tr("رهط")}</span>
            <p className="mt-2 text-lg font-bold">{tr("عنوان خبر للمعاينة")}</p>
            <p className="text-sm font-semibold text-muted">{tr("منذ 5 دقائق · رهط بوست")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="btn">{tr("زر أساسي")}</span>
              <span className="chip chip-alert">{tr("عاجل")}</span>
              <span className="see-all">{tr("عرض الكل")}</span>
            </div>
          </div>
        </div>
      </SettingsCard>
    </>
  );
}

function ImagePick({
  label,
  value,
  onChange,
  setMsg,
}: {
  label: string;
  value: string;
  onChange: (k: string) => void;
  setMsg: (m: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <span className="font-bold">{trv(label)}</span>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={mediaUrl(value)} alt="" className="size-16 rounded-xl object-cover" />
        ) : (
          <span className="grid size-16 place-items-center rounded-xl bg-primary-soft text-xs font-bold">
            {tr("افتراضي")}
          </span>
        )}
        <label className="btn btn-ghost px-3">
          {busy ? tr("جاري الرفع…") : tr("اختيار صورة")}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={busy}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true);
              try {
                onChange(await uploadSettingImage(f));
              } catch (err) {
                setMsg(err instanceof Error ? err.message : tr("تعذّر رفع الصورة."));
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        {value ? (
          <button type="button" className="btn btn-ghost px-3" onClick={() => onChange("")}>
            {tr("إزالة")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TextsPart({ s, set, setMsg }: SettingsPartProps & { setMsg: (m: string) => void }) {
  const t = s.texts;
  const text = (k: keyof typeof t, label: string, max: number, multi = false) => (
    <SettingsField label={trv(label)}>
      {multi ? (
        <textarea
          className="field min-h-20"
          value={t[k]}
          maxLength={max}
          onChange={(e) => set({ texts: { ...t, [k]: e.target.value } })}
        />
      ) : (
        <input
          className="field"
          value={t[k]}
          maxLength={max}
          dir={k === "contactEmail" ? "ltr" : undefined}
          onChange={(e) => set({ texts: { ...t, [k]: e.target.value } })}
        />
      )}
    </SettingsField>
  );
  return (
    <>
      <SettingsCard title={tr("نصوص الموقع")}>
        {text("siteName", tr("اسم الموقع (في الشريط العلوي)"), 40)}
        {text("tagline", tr("الشعار تحت الاسم"), 60)}
        {text("addButton", tr("نص زر الإضافة"), 16)}
        {text("footer", tr("نص أسفل الصفحة"), 400, true)}
        {text("contactEmail", tr("بريد التواصل (يظهر أسفل الصفحة)"), 120)}
        {text("harajName", tr("اسم قسم سوق المستعمل"), 40)}
        {text("harajNav", tr("اسم القسم في القائمة"), 16)}
      </SettingsCard>
      <SettingsCard
        title={tr("الشعار والأيقونة")}
        hint={tr("صورة مربعة JPG أو WebP. تُستبدل صورة الشعار في الشريط العلوي وأيقونة المتصفح.")}
      >
        <ImagePick
          label={tr("الشعار")}
          value={s.logoKey}
          onChange={(logoKey) => set({ logoKey })}
          setMsg={setMsg}
        />
        <ImagePick
          label={tr("أيقونة المتصفح (favicon)")}
          value={s.faviconKey}
          onChange={(faviconKey) => set({ faviconKey })}
          setMsg={setMsg}
        />
      </SettingsCard>
    </>
  );
}

function SliderPart({ s, set, setMsg }: SettingsPartProps & { setMsg: (m: string) => void }) {
  const slides = s.slides;
  const { size, sections } = parseSliderConfig(s.quickLinks);

  // Gather all available sections (built-in + custom sections added by admin)
  const customSecs = (s.quickLinks ?? [])
    .filter((q) => q.id.startsWith("sec"))
    .map((q) => ({ id: q.id, label: `${q.emoji || "📰"} ${q.title}` }));

  const availableSections: { id: string; label: string }[] = [
    { id: "news", label: "📰 آخر الأخبار المحلية" },
    { id: "israel", label: "🌍 أخبار إسرائيل" },
    { id: "sports", label: "⚽ أخبار الرياضة والمباريات" },
    { id: "tech", label: "💻 أخبار التقنية" },
    { id: "reader", label: "✍️ أخبار القراء" },
    ...customSecs,
  ];

  const updateSliderCfg = (nextSize: SliderSizeKey, nextSections: string[]) => {
    const safeSecs = nextSections.length > 0 ? nextSections : ["news"];
    set({
      quickLinks: encodeSliderConfig(s.quickLinks, nextSize, safeSecs),
    });
  };

  const toggleSec = (id: string) => {
    const exists = sections.includes(id);
    const next = exists ? sections.filter((x) => x !== id) : [...sections, id];
    updateSliderCfg(size, next);
  };

  const selectOnlySec = (id: string) => {
    updateSliderCfg(size, [id]);
  };

  const missing = (Object.keys(BUILTIN_SLIDES) as (keyof typeof BUILTIN_SLIDES)[]).filter(
    (id) => !slides.some((x) => x.type === "builtin" && x.id === id),
  );
  const update = (i: number, patch: Record<string, string>) =>
    set({
      slides: slides.map((x, j) => (j === i && x.type === "custom" ? { ...x, ...patch } : x)),
    });

  return (
    <>
      <SettingsCard
        title={tr("حجم السلايدر في الصفحة الرئيسية")}
        hint={tr("تحكّم في ارتفاع وحجم السلايدر الرئيسي ليتناسب مع تصميم الصفحة.")}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              { key: "sm", label: "صغير (مدمج)", sub: "ارتفاع 180px" },
              { key: "md", label: "متوسط (قياسي)", sub: "ارتفاع 240px" },
              { key: "lg", label: "كبير (بارز)", sub: "ارتفاع 310px" },
              { key: "xl", label: "عريض سينمائي", sub: "ارتفاع 380px" },
            ] as { key: SliderSizeKey; label: string; sub: string }[]
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => updateSliderCfg(opt.key, sections)}
              className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition ${
                size === opt.key
                  ? "border-ink bg-ink text-paper shadow-xs"
                  : "border-line bg-surface text-ink hover:bg-primary-soft"
              }`}
            >
              <span className="text-xs font-extrabold">{tr(opt.label)}</span>
              <span className="mt-0.5 text-[11px] opacity-75">{opt.sub}</span>
            </button>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard
        title={tr("الأقسام المعروضة في السلايدر (قسم واحد أو عدة أقسام)")}
        hint={tr("يمكنك اختيار قسم واحد محدد فقط ليعرض السلايدر أحدث أخباره، أو تفعيل أكثر من قسم معاً.")}
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-extrabold text-muted">
            {sections.length === 1
              ? tr("وضع العرض الحالي: عرض قسم واحد مخصص في السلايدر")
              : tr("وضع العرض الحالي: عرض {0} أقسام متنوعة في السلايدر", sections.length)}
          </span>
          <button
            type="button"
            onClick={() => updateSliderCfg(size, availableSections.map((a) => a.id))}
            className="rounded-xl border border-line bg-surface px-3 py-1 text-xs font-extrabold hover:bg-primary-soft"
          >
            {tr("تحديد كل الأقسام")}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {availableSections.map((sec) => {
            const active = sections.includes(sec.id);
            const isOnly = active && sections.length === 1;
            return (
              <div
                key={sec.id}
                className={`flex items-center justify-between gap-2 rounded-2xl border p-3 transition ${
                  active ? "border-ink bg-primary-soft/35" : "border-line bg-surface/50 opacity-70"
                }`}
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-xs font-extrabold">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleSec(sec.id)}
                    className="size-4 accent-[#16A34A]"
                  />
                  <span className="truncate">{sec.label}</span>
                </label>
                <button
                  type="button"
                  onClick={() => selectOnlySec(sec.id)}
                  className={`shrink-0 rounded-xl px-2.5 py-1 text-[11px] font-extrabold transition ${
                    isOnly
                      ? "bg-ink text-paper"
                      : "border border-line bg-paper text-muted hover:text-ink"
                  }`}
                >
                  {isOnly ? tr("هذا القسم فقط ✓") : tr("عرض هذا فقط")}
                </button>
              </div>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard title={tr("شرائح السلايدر الثابتة والمخصصة")} hint={tr("رتّب الشرائح بالأسهم أو أضف شريحة مخصصة بصورة ورابط.")}>
        <ul className="flex flex-col gap-3">
          {slides.map((x, i) => (
            <li key={x.id} className="rounded-xl border border-line p-3">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 font-bold">
                  {x.type === "builtin"
                    ? tr("شريحة جاهزة: {0}", BUILTIN_SLIDES[x.id])
                    : x.title || tr("شريحة جديدة")}
                </span>
                <SettingsIconBtn
                  label={tr("أعلى")}
                  onClick={() => set({ slides: moveItem(slides, i, -1) })}
                  disabled={i === 0}
                >
                  <ArrowUp className="size-4" />
                </SettingsIconBtn>
                <SettingsIconBtn
                  label={tr("أسفل")}
                  onClick={() => set({ slides: moveItem(slides, i, 1) })}
                  disabled={i === slides.length - 1}
                >
                  <ArrowDown className="size-4" />
                </SettingsIconBtn>
                <SettingsIconBtn
                  label={tr("حذف")}
                  onClick={() => set({ slides: slides.filter((_, j) => j !== i) })}
                >
                  <Trash2 className="size-4" />
                </SettingsIconBtn>
              </div>
              {x.type === "custom" ? (
                <div className="mt-3 flex flex-col gap-2">
                  <SettingsField label={tr("العنوان")}>
                    <input
                      className="field"
                      value={x.title}
                      maxLength={90}
                      onChange={(e) => update(i, { title: e.target.value })}
                    />
                  </SettingsField>
                  <SettingsField label={tr("نص قصير (اختياري)")}>
                    <input
                      className="field"
                      value={x.subtitle}
                      maxLength={140}
                      onChange={(e) => update(i, { subtitle: e.target.value })}
                    />
                  </SettingsField>
                  <SettingsField label={tr("الرابط (صفحة في الموقع مثل /buses أو رابط https)")}>
                    <input
                      className="field"
                      dir="ltr"
                      value={x.link}
                      maxLength={300}
                      onChange={(e) => update(i, { link: e.target.value })}
                    />
                  </SettingsField>
                  <ImagePick
                    label={tr("الصورة")}
                    value={x.imageKey}
                    onChange={(imageKey) => update(i, { imageKey })}
                    setMsg={setMsg}
                  />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn"
          disabled={slides.length >= 12}
          onClick={() =>
            set({
              slides: [
                ...slides,
                { type: "custom", id: genSlideId(), title: "", subtitle: "", link: "", imageKey: "" },
              ],
            })
          }
        >
          {tr("إضافة شريحة مخصصة")}
        </button>
        {missing.length ? (
          <div className="flex flex-wrap gap-2">
            {missing.map((id) => (
              <button
                key={id}
                type="button"
                className="chip"
                onClick={() => set({ slides: [...slides, { type: "builtin", id }] })}
              >
                + {trv(BUILTIN_SLIDES[id])}
              </button>
            ))}
          </div>
        ) : null}
      </SettingsCard>
    </>
  );
}

function LinksPart({ s, set }: SettingsPartProps) {
  const internalLinks = (s.quickLinks ?? []).filter(
    (l) => l.id === "tilelive" || l.id === "slidercfg" || l.id === "topbarcfg" || l.id === "botbarcfg" || l.id === "botbarcss" || l.id.startsWith("sec"),
  );
  const userLinks = (s.quickLinks ?? []).filter(
    (l) => l.id !== "tilelive" && l.id !== "slidercfg" && l.id !== "topbarcfg" && l.id !== "botbarcfg" && l.id !== "botbarcss" && !l.id.startsWith("sec"),
  );

  const setUserLinks = (nextUserLinks: SiteSettings["quickLinks"]) => {
    set({ quickLinks: [...internalLinks, ...nextUserLinks] });
  };

  const update = (i: number, patch: Record<string, string>) =>
    setUserLinks(userLinks.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <SettingsCard
      title={tr("روابط سريعة في الرئيسية")}
      hint={tr("بطاقات صغيرة بروابط تختارها. رتّب مكانها من «أقسام الرئيسية».")}
    >
      <ul className="flex flex-col gap-3">
        {userLinks.map((l, i) => (
          <li key={l.id} className="flex flex-col gap-2 rounded-xl border border-line p-3">
            <div className="flex items-center gap-2">
              <input
                className="field w-16 text-center"
                value={l.emoji}
                maxLength={4}
                placeholder="🔗"
                onChange={(e) => update(i, { emoji: e.target.value })}
                aria-label={tr("رمز")}
              />
              <input
                className="field flex-1"
                value={l.title}
                maxLength={60}
                placeholder={tr("العنوان")}
                onChange={(e) => update(i, { title: e.target.value })}
              />
              <SettingsIconBtn
                label={tr("أعلى")}
                onClick={() => setUserLinks(moveItem(userLinks, i, -1))}
                disabled={i === 0}
              >
                <ArrowUp className="size-4" />
              </SettingsIconBtn>
              <SettingsIconBtn
                label={tr("حذف")}
                onClick={() => setUserLinks(userLinks.filter((_, j) => j !== i))}
              >
                <Trash2 className="size-4" />
              </SettingsIconBtn>
            </div>
            <input
              className="field"
              value={l.subtitle}
              maxLength={100}
              placeholder={tr("وصف قصير (اختياري)")}
              onChange={(e) => update(i, { subtitle: e.target.value })}
            />
            <input
              className="field"
              dir="ltr"
              value={l.url}
              maxLength={300}
              placeholder={tr("/directory أو https://…")}
              onChange={(e) => update(i, { url: e.target.value })}
            />
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn"
        disabled={userLinks.length >= 10}
        onClick={() =>
          setUserLinks([
            ...userLinks,
            { id: genSlideId(), title: "", subtitle: "", url: "", emoji: "" },
          ])
        }
      >
        {tr("إضافة رابط")}
      </button>
      <p className="text-sm font-semibold text-muted">
        {tr("الروابط بدون عنوان أو برابط غير صحيح لا تُحفظ.")}
      </p>
    </SettingsCard>
  );
}

function GooglePart({ s, set }: SettingsPartProps) {
  const g = s.google;
  const up = (patch: Partial<typeof g>) => set({ google: { ...g, ...patch } });
  const check = (on: boolean, label: string, onChange: (v: boolean) => void) => (
    <label className="flex items-center gap-2 font-bold">
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
      {trv(label)}
    </label>
  );
  const bad = (v: string, re: RegExp) =>
    v && !re.test(v.trim()) ? (
      <p className="text-sm font-bold text-alert">{tr("الصيغة غير صحيحة — لن تُحفظ.")}</p>
    ) : null;
  const normalizedPub = normalizeAdsensePub(g.adsensePub);
  const adsTxtLine = normalizedPub
    ? `google.com, ${normalizedPub.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0`
    : "";
  return (
    <>
      <SettingsCard
        title="Google AdSense (الإعلانات وملف ads.txt)"
        hint={tr("يمكنك لصق معرّف الناشر (ca-pub-...) أو لصق سطر ads.txt كاملاً وسيقوم النظام باستخراج المعرّف وتوليد ملف /ads.txt تلقائياً.")}
      >
        <SettingsField label={tr("معرّف الناشر أو سطر ads.txt")}>
          <input
            className="field"
            dir="ltr"
            value={g.adsensePub}
            placeholder="ca-pub-1234567890123456 أو google.com, pub-..., DIRECT, f08c47fec0942fa0"
            onChange={(e) => {
              const raw = e.target.value;
              const norm = normalizeAdsensePub(raw);
              up({
                adsensePub: norm || raw,
                ...(norm && !g.adsenseEnabled ? { adsenseEnabled: true, autoAds: true } : {}),
              });
            }}
          />
        </SettingsField>
        {g.adsensePub && !normalizedPub ? (
          <p className="text-sm font-bold text-alert">
            {tr("أدخل رقم ناشر صحيحاً (يتكون من 10 إلى 20 رقماً مثل pub-1234567890123456).")}
          </p>
        ) : null}
        {adsTxtLine ? (
          <div className="rounded-2xl bg-surface p-3 text-xs font-bold">
            <p className="text-muted">{tr("محتوى ملف /ads.txt المفعّل تلقائياً:")}</p>
            <code className="mt-1 block break-all text-primary-ink" dir="ltr">
              {adsTxtLine}
            </code>
            <a
              href="/ads.txt"
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-block underline"
            >
              {tr("معاينة ملف /ads.txt في تبويب جديد ↗")}
            </a>
          </div>
        ) : null}
        {check(g.adsenseEnabled, tr("تفعيل الإعلانات في الموقع"), (v) => up({ adsenseEnabled: v }))}
        {check(g.autoAds, tr("الإعلانات التلقائية (Auto ads) — فعّلها أيضاً من حساب AdSense"), (v) =>
          up({ autoAds: v }),
        )}
        <div className="rounded-2xl border border-[#16A34A]/35 bg-[#16A34A]/5 p-3.5">
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-ink">
                ⚡ {tr("تمكين Google من وضع إعلانات تلقائية على مواقع AMP (AMP Auto Ads)")}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-muted">
                {tr("يدرج تلقائياً سكربت amp-auto-ads ووسم <amp-auto-ads> برقم الناشر الخاص بك لعرض إعلانات جوجل على صفحات AMP والهواتف.")}
              </p>
            </div>
            <input
              type="checkbox"
              checked={parseSliderConfig(s.quickLinks).ampAds}
              onChange={(e) => {
                const cur = parseSliderConfig(s.quickLinks);
                set({
                  quickLinks: encodeSliderConfig(s.quickLinks, cur.size, cur.sections, e.target.checked),
                });
              }}
              className="size-5 accent-[#16A34A]"
            />
          </label>
          {parseSliderConfig(s.quickLinks).ampAds && normalizedPub ? (
            <div className="mt-2.5 space-y-1.5 rounded-xl bg-paper p-2.5 text-[11px] font-bold">
              <p className="text-[#16A34A]">{tr("✓ إعلانات AMP مفعّلة في الموقع بالكود التالي:")}</p>
              <code className="block break-all text-muted" dir="ltr">
                {`<script async custom-element="amp-auto-ads" src="https://cdn.ampproject.org/v0/amp-auto-ads-0.1.js"></script>`}
              </code>
              <code className="block break-all text-primary-ink" dir="ltr">
                {`<amp-auto-ads type="adsense" data-ad-client="${normalizedPub}"></amp-auto-ads>`}
              </code>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-bold">{tr("وحدات إعلانية يدوية")}</p>
          {g.slots.map((a, i) => (
            <div key={a.id} className="flex items-center gap-2">
              <input
                className="field flex-1"
                dir="ltr"
                value={a.slot}
                placeholder={tr("رقم الوحدة (data-ad-slot)")}
                onChange={(e) =>
                  up({
                    slots: g.slots.map((x, j) => (j === i ? { ...x, slot: e.target.value } : x)),
                  })
                }
              />
              <select
                className="field flex-1"
                value={a.placement}
                onChange={(e) =>
                  up({
                    slots: g.slots.map((x, j) =>
                      j === i ? { ...x, placement: e.target.value as AdPlacement } : x,
                    ),
                  })
                }
              >
                {(Object.keys(AD_PLACEMENTS) as AdPlacement[]).map((p) => (
                  <option key={p} value={p}>
                    {trv(AD_PLACEMENTS[p])}
                  </option>
                ))}
              </select>
              <SettingsIconBtn label={tr("حذف")} onClick={() => up({ slots: g.slots.filter((_, j) => j !== i) })}>
                <Trash2 className="size-4" />
              </SettingsIconBtn>
            </div>
          ))}
          <button
            type="button"
            className="btn btn-ghost"
            disabled={g.slots.length >= 10}
            onClick={() =>
              up({ slots: [...g.slots, { id: genSlideId(), slot: "", placement: "home" }] })
            }
          >
            {tr("إضافة وحدة إعلانية")}
          </button>
        </div>
      </SettingsCard>
      <SettingsCard title="Google Analytics 4">
        <SettingsField label={tr("معرّف القياس (G-…)")}>
          <input
            className="field"
            dir="ltr"
            value={g.gaId}
            placeholder="G-XXXXXXXXXX"
            onChange={(e) => up({ gaId: e.target.value.toUpperCase() })}
          />
        </SettingsField>
        {bad(g.gaId, /^G-[A-Z0-9]{4,16}$/)}
        {check(g.gaEnabled, tr("تفعيل Google Analytics"), (v) => up({ gaEnabled: v }))}
      </SettingsCard>
      <SettingsCard title={tr("Google Tag Manager (اختياري)")}>
        <SettingsField label={tr("معرّف الحاوية (GTM-…)")}>
          <input
            className="field"
            dir="ltr"
            value={g.gtmId}
            placeholder="GTM-XXXXXXX"
            onChange={(e) => up({ gtmId: e.target.value.toUpperCase() })}
          />
        </SettingsField>
        {bad(g.gtmId, /^GTM-[A-Z0-9]{4,12}$/)}
      </SettingsCard>
      <SettingsCard
        title="Google Search Console"
        hint={tr("من «طريقة التحقق: علامة HTML» انسخ قيمة content فقط.")}
      >
        <SettingsField label={tr("رمز التحقق")}>
          <input
            className="field"
            dir="ltr"
            value={g.gscCode}
            onChange={(e) => up({ gscCode: e.target.value.trim() })}
          />
        </SettingsField>
        {bad(g.gscCode, /^[A-Za-z0-9_-]{10,100}$/)}
      </SettingsCard>
    </>
  );
}


const QUICK_PRESET_DESTINATIONS: BarBtnItem[] = [
  { icon: "home", label: "الرئيسية", to: "/" },
  { icon: "news", label: "الأخبار", to: "/news" },
  { icon: "tv", label: "بث مباريات", to: "/sports-news" },
  { icon: "siren", label: "اليوم", to: "/today" },
  { icon: "ad", label: "حراج", to: "/haraj" },
  { icon: "bus", label: "الباصات", to: "/buses" },
  { icon: "store", label: "المتجر", to: "/store" },
  { icon: "pin", label: "الدليل", to: "/directory" },
  { icon: "globe", label: "أخبار إسرائيل", to: "/israel-news" },
  { icon: "cpu", label: "أخبار تقنية", to: "/tech-news" },
  { icon: "plus", label: "أضف", to: "/submit" },
];

function MenusAndBarsPart({ s, set }: SettingsPartProps) {
  const topBtns = parseTopBarConfig(s.quickLinks);
  const botCfg = parseBotBarConfig(s.quickLinks);
  const cssCfg = parseBotBarCssConfig(s.quickLinks);

  const [dbSecsForBars, setDbSecsForBars] = useState<AdminSection[]>([]);
  useEffect(() => {
    const BUILTIN = new Set(["news", "israel", "sports", "tech", "weather"]);
    void adminListSections()
      .then((r) => {
        if (r.authed && r.sections) {
          setDbSecsForBars(r.sections.filter((sec) => !BUILTIN.has(sec.id)));
        }
      })
      .catch(() => {});
  }, []);

  // Automatically combine built-in presets + all custom sections (from DB and quickLinks) so they are always available in Bottom Bar & Top Bar options
  const allBarDestinations: BarBtnItem[] = useMemo(() => {
    const list: BarBtnItem[] = [...QUICK_PRESET_DESTINATIONS];
    const addCustomOpt = (labelRaw: string, defaultIcon: string, customUrl?: string) => {
      const label = labelRaw.trim();
      if (!label) return;
      const qlMatch = (s.quickLinks ?? []).find(
        (q) => q.id.startsWith("sec") && q.title.trim() === label,
      );
      const resolvedUrl = customUrl || qlMatch?.url || `/?q=${label}`;
      const resolvedIcon =
        (qlMatch?.emoji ? EMOJI_TO_ICON_KEY[qlMatch.emoji] : undefined) ||
        defaultIcon ||
        (/فن|موضة|ثقافة/.test(label) ? "sparkles" : "news");
      if (!list.some((d) => d.label.trim() === label)) {
        list.push({ icon: resolvedIcon, label, to: resolvedUrl });
      }
    };

    // Always include "فن و موضة" + all DB custom sections + quickLinks custom sections
    addCustomOpt("فن و موضة", "sparkles");
    for (const dbSec of dbSecsForBars) {
      addCustomOpt(dbSec.name, /فن|موضة|ثقافة/.test(dbSec.name) ? "sparkles" : "news");
    }
    for (const q of s.quickLinks ?? []) {
      if (q.id.startsWith("sec") && q.title.trim()) {
        addCustomOpt(q.title, EMOJI_TO_ICON_KEY[q.emoji] || "news", q.url);
      }
    }
    return list;
  }, [dbSecsForBars, s.quickLinks]);

  const liveTileItem = (s.quickLinks ?? []).find((q) => q.id === "tilelive");
  const liveTileVisible = liveTileItem ? !liveTileItem.subtitle?.includes("مَخفي") : true;
  const liveTileGlow =
    !liveTileItem?.subtitle?.includes("بدون توهج") && liveTileItem?.emoji !== "⚪";
  const liveTileLabel = liveTileItem?.title?.trim() || "بث مباريات";

  const [newTopLabel, setNewTopLabel] = useState("");
  const [newTopIcon, setNewTopIcon] = useState("tv");
  const [newTopUrl, setNewTopUrl] = useState("/sports-news");

  const [newBotLabel, setNewBotLabel] = useState("");
  const [newBotIcon, setNewBotIcon] = useState("tv");
  const [newBotUrl, setNewBotUrl] = useState("/sports-news");

  const updateTop = (next: BarBtnItem[]) => {
    set({ quickLinks: encodeTopBarConfig(s.quickLinks, next) });
  };

  const updateBot = (nextStyle: BottomBarStyleKey, nextBtns: BarBtnItem[]) => {
    set({ quickLinks: encodeBotBarConfig(s.quickLinks, nextStyle, nextBtns) });
  };

  const updateBotCss = (patch: Partial<CustomBotCssConfig>, autoSwitchToCustom = true) => {
    const nextCss = { ...cssCfg, ...patch };
    let nextLinks = encodeBotBarCssConfig(s.quickLinks, nextCss);
    if (autoSwitchToCustom && botCfg.style !== "custom") {
      nextLinks = encodeBotBarConfig(nextLinks, "custom", botCfg.btns);
    }
    set({ quickLinks: nextLinks });
  };

  const toggleLiveGlow = (nextGlow: boolean) => {
    const others = (s.quickLinks ?? []).filter((q) => q.id !== "tilelive");
    const subParts = [liveTileVisible ? "قسم في الشريط" : " مَخفي"];
    if (!nextGlow) subParts.push("بدون توهج");
    set({
      quickLinks: [
        {
          id: "tilelive",
          title: liveTileLabel,
          subtitle: subParts.join("|"),
          url: "/sports-news",
          emoji: nextGlow ? "🔴" : "⚪",
        },
        ...others,
      ],
    });
  };

  return (
    <div className="space-y-4">
      {/* 0. Eye-Friendly Glow Toggle for "بث مباريات" Icon */}
      <SettingsCard
        title={tr("أيقونة «بث مباريات» — التحكم بالتوهج وراحة العين")}
        hint={tr("يمكنك إطفاء التوهج والوميض الأحمر عن أيقونة «بث مباريات» لتظهر بهدوء مريح للعين متناسق مع باقي الأيقونات.")}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3.5">
          <div className="flex items-center gap-3">
            <span
              className={`grid size-11 place-items-center rounded-2xl bg-paper shadow-2xs ${
                liveTileGlow ? "ring-2 ring-[#DC2626]/50 text-[#DC2626]" : "text-ink"
              }`}
            >
              <Tv className="size-5" />
            </span>
            <div>
              <p className="text-sm font-extrabold text-ink">
                {liveTileGlow
                  ? tr("التوهج والوميض مفعّل حالياً على أيقونة «بث مباريات»")
                  : tr("التوهج مطفأ حالياً — وضع مريح للعين ✓")}
              </p>
              <p className="text-xs font-semibold text-muted">
                {tr("اضغط الزر المقابل لإطفاء أو تشغيل التوهج، ثم اضغط حفظ التغييرات بالأسفل.")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleLiveGlow(!liveTileGlow)}
              className={`rounded-2xl px-4 py-2.5 text-xs font-extrabold shadow-xs transition ${
                !liveTileGlow
                  ? "bg-emerald-600 text-white"
                  : "bg-ink text-paper hover:opacity-90"
              }`}
            >
              {!liveTileGlow
                ? tr("✓ التوهج مطفأ (مريح للعين)")
                : tr("⚪ إطفاء التوهج لراحة العين")}
            </button>
            {!liveTileGlow ? (
              <button
                type="button"
                onClick={() => toggleLiveGlow(true)}
                className="rounded-2xl border border-line bg-paper px-3 py-2.5 text-xs font-bold text-muted hover:text-ink"
              >
                {tr("إعادة التوهج")}
              </button>
            ) : null}
          </div>
        </div>
      </SettingsCard>

      {/* 1. Full Top Category Bar Control */}
      <SettingsCard
        title={tr("1. التحكم في القائمة العلوية وشريط الأقسام (إضافة وإزالة وترتيب)")}
        hint={tr("تحكّم كامل في أزرار وأقسام الشريط العلوي في الصفحة الرئيسية: احذف أي قسم أو أضف قسماً جديداً أو غيّر ترتيبه.")}
      >
        <ul className="space-y-2">
          {topBtns.map((btn, idx) => (
            <li
              key={`${btn.to}-${idx}`}
              className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface/60 p-2.5"
            >
              <select
                value={btn.icon}
                onChange={(e) =>
                  updateTop(topBtns.map((b, i) => (i === idx ? { ...b, icon: e.target.value } : b)))
                }
                className="field w-36 py-1.5 text-xs font-bold"
              >
                {BAR_ICON_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={btn.label}
                onChange={(e) =>
                  updateTop(topBtns.map((b, i) => (i === idx ? { ...b, label: e.target.value } : b)))
                }
                className="field min-w-28 flex-1 py-1.5 text-xs font-extrabold"
                placeholder="اسم القسم"
              />
              <input
                type="text"
                dir="ltr"
                value={btn.to}
                onChange={(e) =>
                  updateTop(topBtns.map((b, i) => (i === idx ? { ...b, to: e.target.value } : b)))
                }
                className="field w-36 py-1.5 text-xs"
                placeholder="/sports-news"
              />
              <div className="flex items-center gap-1">
                <SettingsIconBtn
                  label={tr("أعلى")}
                  disabled={idx === 0}
                  onClick={() => updateTop(moveItem(topBtns, idx, -1))}
                >
                  <ArrowUp className="size-4" />
                </SettingsIconBtn>
                <SettingsIconBtn
                  label={tr("أسفل")}
                  disabled={idx === topBtns.length - 1}
                  onClick={() => updateTop(moveItem(topBtns, idx, 1))}
                >
                  <ArrowDown className="size-4" />
                </SettingsIconBtn>
                <button
                  type="button"
                  onClick={() => updateTop(topBtns.filter((_, i) => i !== idx))}
                  className="flex items-center gap-1 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/10 px-2.5 py-1.5 text-xs font-extrabold text-[#DC2626] hover:bg-[#DC2626] hover:text-white"
                  title={tr("إزالة من القائمة العلوية")}
                >
                  <Trash2 className="size-3.5" />
                  {tr("إزالة")}
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-2 border-t border-line pt-3">
          <p className="mb-2 text-xs font-extrabold text-muted">
            {tr("+ إضافة سريعة لقسم في القائمة العلوية:")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {allBarDestinations.filter((d) => d.to !== "/").map((preset) => {
              const exists = topBtns.some((b) => b.label.trim() === preset.label.trim());
              return (
                <button
                  key={`${preset.to}-${preset.label}`}
                  type="button"
                  onClick={() => {
                    if (exists) {
                      updateTop(topBtns.filter((b) => b.label.trim() !== preset.label.trim()));
                    } else {
                      updateTop([...topBtns, { ...preset }]);
                    }
                  }}
                  className={`rounded-xl px-2.5 py-1.5 text-xs font-extrabold transition ${
                    exists
                      ? "bg-[#16A34A] text-white"
                      : "border border-line bg-surface text-ink hover:bg-primary-soft"
                  }`}
                >
                  {exists ? `✓ ${preset.label}` : `+ ${preset.label}`}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 rounded-2xl bg-surface p-3 sm:grid-cols-4">
            <input
              type="text"
              value={newTopLabel}
              onChange={(e) => setNewTopLabel(e.target.value)}
              placeholder="اسم القسم الجديد (مثلاً: بث مباريات)"
              className="field text-xs"
            />
            <select
              value={newTopIcon}
              onChange={(e) => setNewTopIcon(e.target.value)}
              className="field text-xs"
            >
              {BAR_ICON_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              dir="ltr"
              value={newTopUrl}
              onChange={(e) => setNewTopUrl(e.target.value)}
              placeholder="/sports-news أو /news?q=رهط"
              className="field text-xs"
            />
            <button
              type="button"
              onClick={() => {
                if (!newTopLabel.trim()) return;
                updateTop([
                  ...topBtns,
                  {
                    icon: newTopIcon,
                    label: newTopLabel.trim(),
                    to: newTopUrl.trim() || "/news",
                  },
                ]);
                setNewTopLabel("");
              }}
              className="btn py-2 text-xs"
            >
              + {tr("إضافة للقائمة العلوية")}
            </button>
          </div>
        </div>
      </SettingsCard>

      {/* 2. Bottom Bar Styles / Shapes + Custom Code & Visual Builder */}
      <SettingsCard
        title={tr("2. أشكال وتصاميم البار السفلي (على جميع صفحات الموقع) + إضافة شكل بالكود")}
        hint={tr("يتطبق شكل وترتيب البار السفلي المختار على جميع صفحات الموقع، ويمكنك اختيار شكل جاهز أو تصميم شكل خاص بالكود والألوان.")}
      >
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {(
            [
              {
                key: "classic",
                label: "الشكل الكلاسيكي",
                desc: "شريط سفلي كامل مع كبسولة صفراء للزر النشط",
              },
              {
                key: "floating",
                label: "الكبسولة العائمة",
                desc: "بار عائم بزوايا دائرية وظل ناعم أنيق",
              },
              {
                key: "dark",
                label: "الزجاجي الداكن",
                desc: "خلفية داكنة فاخرة مع تمييز ذهبي للزر النشط",
              },
              {
                key: "dock",
                label: "أيقونات التطبيقات (Dock)",
                desc: "مربعات أيقونات بارزة بحجم واضح",
              },
              {
                key: "minimal",
                label: "النحيف المدمج",
                desc: "شريط نحيف مع خط علوي ملون للزر النشط",
              },
              {
                key: "neon",
                label: "النيون العصري",
                desc: "شريط متدرج داكن بإطار ذهبي مضيء",
              },
              {
                key: "glass",
                label: "الكريستال الشفاف",
                desc: "شريط عائم زجاجي شفاف بتأثير الضباب",
              },
              {
                key: "custom",
                label: "🎨 شكل مخصّص (بالكود / الألوان)",
                desc: "صمّم شكلك الخاص بالكود CSS أو أداة الألوان والحواف",
              },
              {
                key: "hidden",
                label: "إخفاء البار السفلي",
                desc: "إلغاء إظهار البار السفلي في جميع الصفحات",
              },
            ] as { key: BottomBarStyleKey; label: string; desc: string }[]
          ).map((st) => (
            <button
              key={st.key}
              type="button"
              onClick={() => updateBot(st.key, botCfg.btns)}
              className={`flex flex-col items-start rounded-2xl border p-3 text-start transition ${
                botCfg.style === st.key
                  ? "border-ink bg-ink text-paper shadow-xs"
                  : "border-line bg-surface text-ink hover:bg-primary-soft"
              }`}
            >
              <span className="text-xs font-extrabold">{tr(st.label)}</span>
              <span className="mt-1 text-[11px] opacity-75">{tr(st.desc)}</span>
            </button>
          ))}
        </div>

        {/* Custom Code & Visual Builder Box */}
        <div className="mt-4 rounded-3xl border border-primary/50 bg-surface/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-ink">
                {tr("🎨 إضافة وتخصيص شكل البار السفلي بالكود (CSS) أو الألوان المباشرة")}
              </h3>
              <p className="text-xs font-semibold text-muted">
                {tr("اختر أحد القوالب البرمجية الجاهزة أو عدّل الألوان والاستدارة أو اكتب كود CSS خاصاً بك:")}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                {
                  name: "تدرج ذهبي ملكي",
                  cfg: {
                    bg: "#111827",
                    fg: "#e5e7eb",
                    ab: "#f2c94c",
                    af: "#111827",
                    r: 28,
                    m: 10,
                    rawCss:
                      "background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); border: 1.5px solid rgba(242,201,76,0.55); box-shadow: 0 12px 32px rgba(0,0,0,0.35);",
                  },
                },
                {
                  name: "كبسولة ثلاثية الأبعاد",
                  cfg: {
                    bg: "#ffffff",
                    fg: "#475569",
                    ab: "#263238",
                    af: "#ffffff",
                    r: 36,
                    m: 12,
                    rawCss:
                      "box-shadow: 0 14px 34px rgba(15,23,42,0.18), inset 0 1px 0 #ffffff; border: 1px solid #e2e8f0;",
                  },
                },
                {
                  name: "أزرق ليلي حديث",
                  cfg: {
                    bg: "#0f172a",
                    fg: "#94a3b8",
                    ab: "#38bdf8",
                    af: "#0f172a",
                    r: 22,
                    m: 8,
                    rawCss:
                      "border: 1px solid rgba(56,189,248,0.35); box-shadow: 0 10px 25px rgba(15,23,42,0.45);",
                  },
                },
                {
                  name: "أصفر رهط بوست البارز",
                  cfg: {
                    bg: "#f2c94c",
                    fg: "#263238",
                    ab: "#263238",
                    af: "#ffffff",
                    r: 26,
                    m: 10,
                    rawCss:
                      "border: 2px solid #263238; box-shadow: 0 8px 24px rgba(38,50,56,0.22);",
                  },
                },
              ].map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => updateBotCss(preset.cfg, true)}
                  className="rounded-xl border border-line bg-paper px-3 py-1.5 text-xs font-extrabold text-ink shadow-2xs transition hover:border-primary hover:bg-primary/20"
                >
                  ✨ {tr(preset.name)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <label className="block text-xs font-bold">
              {tr("لون خلفية البار")}
              <div className="mt-1 flex items-center gap-1.5 rounded-xl border border-line bg-paper p-1.5">
                <input
                  type="color"
                  value={cssCfg.bg}
                  onChange={(e) => updateBotCss({ bg: e.target.value })}
                  className="size-6 cursor-pointer rounded border-0 bg-transparent"
                />
                <input
                  type="text"
                  dir="ltr"
                  value={cssCfg.bg}
                  onChange={(e) => updateBotCss({ bg: e.target.value })}
                  className="w-full bg-transparent text-xs font-bold outline-none"
                />
              </div>
            </label>

            <label className="block text-xs font-bold">
              {tr("لون الأيقونات والنص")}
              <div className="mt-1 flex items-center gap-1.5 rounded-xl border border-line bg-paper p-1.5">
                <input
                  type="color"
                  value={cssCfg.fg}
                  onChange={(e) => updateBotCss({ fg: e.target.value })}
                  className="size-6 cursor-pointer rounded border-0 bg-transparent"
                />
                <input
                  type="text"
                  dir="ltr"
                  value={cssCfg.fg}
                  onChange={(e) => updateBotCss({ fg: e.target.value })}
                  className="w-full bg-transparent text-xs font-bold outline-none"
                />
              </div>
            </label>

            <label className="block text-xs font-bold">
              {tr("خلفية الزر النشط")}
              <div className="mt-1 flex items-center gap-1.5 rounded-xl border border-line bg-paper p-1.5">
                <input
                  type="color"
                  value={cssCfg.ab}
                  onChange={(e) => updateBotCss({ ab: e.target.value })}
                  className="size-6 cursor-pointer rounded border-0 bg-transparent"
                />
                <input
                  type="text"
                  dir="ltr"
                  value={cssCfg.ab}
                  onChange={(e) => updateBotCss({ ab: e.target.value })}
                  className="w-full bg-transparent text-xs font-bold outline-none"
                />
              </div>
            </label>

            <label className="block text-xs font-bold">
              {tr("نص الزر النشط")}
              <div className="mt-1 flex items-center gap-1.5 rounded-xl border border-line bg-paper p-1.5">
                <input
                  type="color"
                  value={cssCfg.af}
                  onChange={(e) => updateBotCss({ af: e.target.value })}
                  className="size-6 cursor-pointer rounded border-0 bg-transparent"
                />
                <input
                  type="text"
                  dir="ltr"
                  value={cssCfg.af}
                  onChange={(e) => updateBotCss({ af: e.target.value })}
                  className="w-full bg-transparent text-xs font-bold outline-none"
                />
              </div>
            </label>

            <label className="block text-xs font-bold">
              {tr("استدارة الحواف")} ({cssCfg.r}px)
              <input
                type="range"
                min={0}
                max={40}
                value={cssCfg.r}
                onChange={(e) => updateBotCss({ r: Number(e.target.value) })}
                className="mt-2.5 w-full accent-primary"
              />
            </label>

            <label className="block text-xs font-bold">
              {tr("الارتفاع عن الأسفل")} ({cssCfg.m}px)
              <input
                type="range"
                min={0}
                max={20}
                value={cssCfg.m}
                onChange={(e) => updateBotCss({ m: Number(e.target.value) })}
                className="mt-2.5 w-full accent-primary"
              />
            </label>
          </div>

          <div className="mt-3">
            <label className="block text-xs font-extrabold text-ink">
              {tr("كود CSS مخصّص للبار السفلي (اختياري — اكتب خصائص CSS مباشرة أو قواعد .custom-botbar):")}
              <textarea
                dir="ltr"
                rows={3}
                value={cssCfg.rawCss}
                onChange={(e) => updateBotCss({ rawCss: e.target.value }, false)}
                placeholder="background: linear-gradient(135deg, #111827, #1f2937); box-shadow: 0 10px 30px rgba(0,0,0,0.3); border: 1px solid #f2c94c;"
                className="field mt-1.5 w-full font-mono text-xs"
              />
            </label>
          </div>

          {/* Live Interactive Preview inside Admin Panel */}
          <div className="mt-4 rounded-2xl border border-dashed border-line bg-paper p-3">
            <p className="mb-2 text-[11px] font-extrabold text-muted">
              {tr("معاينة حية لشكل وترتيب البار السفلي:")} ({tr("الشكل الحالي:")} {botCfg.style})
            </p>
            <div
              className="mx-auto flex max-w-md items-center justify-around px-2 py-2 shadow-md transition"
              style={{
                backgroundColor:
                  botCfg.style === "dark" || botCfg.style === "neon"
                    ? "#111827"
                    : botCfg.style === "custom"
                      ? cssCfg.bg
                      : "#ffffff",
                color:
                  botCfg.style === "dark" || botCfg.style === "neon"
                    ? "#ffffff"
                    : botCfg.style === "custom"
                      ? cssCfg.fg
                      : "#263238",
                borderRadius:
                  botCfg.style === "floating"
                    ? "9999px"
                    : botCfg.style === "dock" || botCfg.style === "neon" || botCfg.style === "glass"
                      ? "24px"
                      : botCfg.style === "custom"
                        ? `${cssCfg.r}px`
                        : "12px",
              }}
            >
              {botCfg.btns.map((b, i) => {
                const active = i === 0;
                return (
                  <div
                    key={`${b.to}-${i}`}
                    className="flex flex-1 flex-col items-center justify-center gap-0.5 px-2 py-1.5 text-[11px] font-extrabold"
                    style={
                      active
                        ? {
                            backgroundColor:
                              botCfg.style === "custom"
                                ? cssCfg.ab
                                : botCfg.style === "floating"
                                  ? "#263238"
                                  : "#f2c94c",
                            color:
                              botCfg.style === "custom"
                                ? cssCfg.af
                                : botCfg.style === "floating"
                                  ? "#ffffff"
                                  : "#263238",
                            borderRadius: "14px",
                          }
                        : undefined
                    }
                  >
                    <span className="truncate">{b.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* 3. Bottom Bar Buttons Add / Remove / Reorder */}
      <SettingsCard
        title={tr("3. أزرار البار السفلي وترتيبها (على جميع صفحات الموقع)")}
        hint={tr("الترتيب الذي تضبطه هنا يظهر بنفس الترتيب تماماً في البار السفلي على الصفحة الرئيسية وجميع صفحات الموقع.")}
      >
        <ul className="space-y-2">
          {botCfg.btns.map((btn, idx) => (
            <li
              key={`${btn.to}-${idx}`}
              className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface/60 p-2.5"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/30 text-xs font-extrabold text-ink">
                {idx + 1}
              </span>
              <select
                value={btn.icon}
                onChange={(e) =>
                  updateBot(
                    botCfg.style,
                    botCfg.btns.map((b, i) => (i === idx ? { ...b, icon: e.target.value } : b)),
                  )
                }
                className="field w-36 py-1.5 text-xs font-bold"
              >
                {BAR_ICON_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={btn.label}
                onChange={(e) =>
                  updateBot(
                    botCfg.style,
                    botCfg.btns.map((b, i) => (i === idx ? { ...b, label: e.target.value } : b)),
                  )
                }
                className="field min-w-28 flex-1 py-1.5 text-xs font-extrabold"
                placeholder="اسم الزر"
              />
              <input
                type="text"
                dir="ltr"
                value={btn.to}
                onChange={(e) =>
                  updateBot(
                    botCfg.style,
                    botCfg.btns.map((b, i) => (i === idx ? { ...b, to: e.target.value } : b)),
                  )
                }
                className="field w-36 py-1.5 text-xs"
                placeholder="/sports-news"
              />
              <div className="flex items-center gap-1">
                <SettingsIconBtn
                  label={tr("أعلى")}
                  disabled={idx === 0}
                  onClick={() => updateBot(botCfg.style, moveItem(botCfg.btns, idx, -1))}
                >
                  <ArrowUp className="size-4" />
                </SettingsIconBtn>
                <SettingsIconBtn
                  label={tr("أسفل")}
                  disabled={idx === botCfg.btns.length - 1}
                  onClick={() => updateBot(botCfg.style, moveItem(botCfg.btns, idx, 1))}
                >
                  <ArrowDown className="size-4" />
                </SettingsIconBtn>
                <button
                  type="button"
                  onClick={() =>
                    updateBot(
                      botCfg.style,
                      botCfg.btns.filter((_, i) => i !== idx),
                    )
                  }
                  className="flex items-center gap-1 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/10 px-2.5 py-1.5 text-xs font-extrabold text-[#DC2626] hover:bg-[#DC2626] hover:text-white"
                  title={tr("إلغاء الزر من البار السفلي")}
                >
                  <Trash2 className="size-3.5" />
                  {tr("إلغاء الزر")}
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-2 border-t border-line pt-3">
          <p className="mb-2 text-xs font-extrabold text-muted">
            {tr("+ إضافة أو إلغاء سريع لأزرار البار السفلي:")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {allBarDestinations.map((preset) => {
              const exists = botCfg.btns.some((b) => b.label.trim() === preset.label.trim());
              return (
                <button
                  key={`${preset.to}-${preset.label}`}
                  type="button"
                  onClick={() => {
                    if (exists) {
                      updateBot(
                        botCfg.style,
                        botCfg.btns.filter((b) => b.label.trim() !== preset.label.trim()),
                      );
                    } else {
                      updateBot(botCfg.style, [...botCfg.btns, { ...preset }]);
                    }
                  }}
                  className={`rounded-xl px-2.5 py-1.5 text-xs font-extrabold transition ${
                    exists
                      ? "bg-[#16A34A] text-white"
                      : "border border-line bg-surface text-ink hover:bg-primary-soft"
                  }`}
                >
                  {exists ? `✓ ${preset.label}` : `+ ${preset.label}`}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2 rounded-2xl bg-surface p-3 sm:grid-cols-4">
            <input
              type="text"
              value={newBotLabel}
              onChange={(e) => setNewBotLabel(e.target.value)}
              placeholder="اسم الزر الجديد (مثلاً: بث مباريات)"
              className="field text-xs"
            />
            <select
              value={newBotIcon}
              onChange={(e) => setNewBotIcon(e.target.value)}
              className="field text-xs"
            >
              {BAR_ICON_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              dir="ltr"
              value={newBotUrl}
              onChange={(e) => setNewBotUrl(e.target.value)}
              placeholder="/sports-news أو /today"
              className="field text-xs"
            />
            <button
              type="button"
              onClick={() => {
                if (!newBotLabel.trim()) return;
                updateBot(botCfg.style, [
                  ...botCfg.btns,
                  {
                    icon: newBotIcon,
                    label: newBotLabel.trim(),
                    to: newBotUrl.trim() || "/",
                  },
                ]);
                setNewBotLabel("");
              }}
              className="btn py-2 text-xs"
            >
              + {tr("إضافة الزر للبار السفلي")}
            </button>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Unified Store, Merchant Offers, Green Ribbon, VIP Role & Orders Admin      */
/* -------------------------------------------------------------------------- */

type StoreHubTabKey =
  | "orders"
  | "categories"
  | "products"
  | "offers"
  | "merchants"
  | "pay";

type ExtendedOrderStageAdmin =
  | "pending"
  | "reviewing"
  | "paid"
  | "delivered"
  | "received"
  | "cancelled";

type VipPkgAdmin = {
  badge: string;
  title: string;
  price: string;
  desc: string;
  perks: string[];
  customUrl?: string;
  featured?: boolean;
};

type HubMasterConfig = {
  greenSectionTitle: string;
  greenBadgeDefault: string;
  merchantUsers: string[];
  orderStages: Record<string, ExtendedOrderStageAdmin>;
  vipPackages: VipPkgAdmin[];
};

const DEFAULT_HUB_MASTER_CFG: HubMasterConfig = {
  greenSectionTitle: "عروض المتاجر وتجار رهط الموثّقين",
  greenBadgeDefault: "عرض تاجر موثّق ✓",
  merchantUsers: [],
  orderStages: {},
  vipPackages: [
    {
      badge: "⭐ للأفراد والتجار",
      title: "تثبيت إعلان VIP في الصدارة",
      price: "₪29 / أسبوع",
      desc: "يثبّت إعلانك في أعلى الحراج وفي الصفحة الرئيسية مع إطار ذهبي مميز.",
      perks: [
        "ظهور في أول الصفوف لمدة 7 أيام",
        "شارة «إعلان مميز VIP»",
        "أولوية في نتائج البحث",
      ],
    },
    {
      badge: "🏪 للمحلات والتجار",
      title: "عضوية «متجر / تاجر موثّق ✓»",
      price: "₪99 / شهرياً",
      desc: "ظهور دائم لعروض محلك في «قسم عروض المتاجر الموثّقة» في أعلى الصفحة مع شارة التوثيق الخضراء.",
      perks: [
        "شارة «تاجر موثّق ✓» قابلة للتخصيص",
        "عرض إعلاني برابط مخصّص لمحلك أو واتسابك",
        "توهّج قسم العروض بالأصفر في الحراج",
      ],
      featured: true,
    },
    {
      badge: "🚀 للمعارض والشركات",
      title: "باقة المعارض والوكالات الذهبية",
      price: "₪199 / شهرياً",
      desc: "لمعارض السيارات، مكاتب العقارات، ومحلات الإلكترونيات والأثاث الكبرى في رهط والنقب.",
      perks: [
        "نشر عروض إعلانية غير محدودة شهرياً",
        "تثبيت 3 عروض VIP في نفس الوقت",
        "دعم مباشر وتصميم بطاقة المتجر",
      ],
    },
  ],
};

function parseHubMasterCfgFromProducts(
  products: AdminProductRow[],
): { rowId: string; cfg: HubMasterConfig } {
  const row = products.find((p) => p.slug === "hub-cfg-main");
  if (!row?.description) {
    return { rowId: row?.id ?? "", cfg: DEFAULT_HUB_MASTER_CFG };
  }
  try {
    const parsed = JSON.parse(row.description) as Partial<HubMasterConfig>;
    return {
      rowId: row.id,
      cfg: {
        greenSectionTitle:
          parsed.greenSectionTitle?.trim() ||
          DEFAULT_HUB_MASTER_CFG.greenSectionTitle,
        greenBadgeDefault:
          parsed.greenBadgeDefault?.trim() ||
          DEFAULT_HUB_MASTER_CFG.greenBadgeDefault,
        merchantUsers: Array.isArray(parsed.merchantUsers)
          ? parsed.merchantUsers.map((x) => String(x).trim().toLowerCase())
          : [],
        orderStages:
          parsed.orderStages && typeof parsed.orderStages === "object"
            ? parsed.orderStages
            : {},
        vipPackages:
          Array.isArray(parsed.vipPackages) && parsed.vipPackages.length > 0
            ? parsed.vipPackages
            : DEFAULT_HUB_MASTER_CFG.vipPackages,
      },
    };
  } catch {
    return { rowId: row.id, cfg: DEFAULT_HUB_MASTER_CFG };
  }
}

const STORE_CATEGORY_PRESETS: {
  name: string;
  slug: string;
  icon: StoreCategory["icon"];
  color: string;
  description: string;
}[] = [
  {
    name: "الذكاء الاصطناعي (ChatGPT & AI)",
    slug: "ai-tools",
    icon: "bot",
    color: "#10b981",
    description: "اشتراكات ChatGPT Plus وClaude وأدوات الذكاء الاصطناعي والتصميم",
  },
  {
    name: "نتفليكس وشاهد والبث (Netflix & TV)",
    slug: "netflix-streaming",
    icon: "tv",
    color: "#ef4444",
    description: "اشتراكات نتفليكس، شاهد VIP، يوتيوب بريميوم، والقنوات الرياضية",
  },
  {
    name: "الألعاب وبطاقات الشحن",
    slug: "gaming-cards",
    icon: "gamepad",
    color: "#8b5cf6",
    description: "بطاقات بلايستيشن، إكس بوكس، ببجي، وشحن الألعاب الفوري",
  },
  {
    name: "البرامج والأوفيس والحماية",
    slug: "software-office",
    icon: "briefcase",
    color: "#3b82f6",
    description: "تفعيل أوفيس، ويندوز، كانفا برو، وبرامج الحماية الأصلية",
  },
  {
    name: "التخزين السحابي والخدمات الرقمية",
    slug: "cloud-storage",
    icon: "cloud",
    color: "#06b6d4",
    description: "مساحات Google One وiCloud والخدمات السحابية",
  },
  {
    name: "الاتصالات والإنترنت",
    slug: "telecom-internet",
    icon: "phone",
    color: "#f2c94c",
    description: "حزم الإنترنت، الشرائح الإلكترونية eSIM، وبطاقات الاتصال",
  },
];

function StoreAndMerchantsAdmin({
  initialTab = "orders",
  isOwner,
}: {
  initialTab?: StoreHubTabKey;
  isOwner: boolean;
}) {
  const [tab, setTab] = useState<StoreHubTabKey>(initialTab);
  const [storeData, setStoreData] = useState<{
    products: AdminProductRow[];
    categories: StoreCategory[];
    low: { name: string; freeCodes: number }[];
    lowThreshold: number;
  } | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const refreshStore = useCallback(async () => {
    const r = await adminStoreData();
    if (!r.authed) {
      setMsg(tr("انتهت الجلسة. سجّل الدخول من جديد."));
      return;
    }
    setStoreData(r);
  }, []);

  useEffect(() => {
    void refreshStore();
  }, [refreshStore]);

  const { rowId: cfgRowId, cfg: hubCfg } = useMemo(
    () => parseHubMasterCfgFromProducts(storeData?.products ?? []),
    [storeData?.products],
  );

  const saveHubMasterCfg = async (
    nextCfg: HubMasterConfig,
    successMessage: string,
  ) => {
    setBusy(true);
    setMsg("");
    try {
      const jsonStr = JSON.stringify(nextCfg);
      const r = await adminSaveProduct({
        data: {
          id: cfgRowId || "",
          name: "إعدادات بوابة المتجر والمتاجر",
          slug: "hub-cfg-main",
          categoryId: "",
          price: "0",
          sale: "",
          imageKey: "",
          shortDesc: "system-config",
          description: jsonStr,
          duration: "none",
          badges: ["system"],
          stock: "0",
          active: true,
          sort: "9999",
          deliveryType: "fixed",
          delivery: "system",
          isSample: true,
        },
      });
      if (r.ok) {
        await refreshStore();
        setMsg(successMessage);
      } else {
        setMsg(r.message ?? tr("تعذّر حفظ الإعدادات."));
      }
    } finally {
      setBusy(false);
    }
  };

  const tabs: { key: StoreHubTabKey; label: string; icon: string }[] = [
    { key: "orders", label: "طلباتي (متابعة الطلبات)", icon: "📦" },
    { key: "categories", label: "أقسام المتجر (الذكاء ونتفليكس)", icon: "🗂️" },
    { key: "products", label: "منتجات المتجر والاشتراكات", icon: "🛍️" },
    { key: "offers", label: "عروض المتاجر والشريط الأخضر", icon: "🏪" },
    { key: "merchants", label: "صلاحية «تاجر» وباقات VIP", icon: "👑" },
    ...(isOwner
      ? ([
          {
            key: "pay",
            label: "إعدادات الدفع وواتساب المتجر",
            icon: "💳",
          },
        ] as const)
      : []),
  ];

  return (
    <div className="space-y-4">
      {/* Top Unified Store & Merchants Control Header */}
      <div className="rounded-3xl bg-paper p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand text-ink shadow-xs">
              <ShoppingBag className="size-6" aria-hidden />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold">
                  {tr("إدارة المتجر والمتاجر والطلبات (قسم مستقل وشامل)")}
                </h2>
                <span className="rounded-full bg-[#16A34A]/15 px-2.5 py-0.5 text-xs font-extrabold text-[#16A34A]">
                  {tr("بدون إعلانات AdSense لحماية القبول ✓")}
                </span>
              </div>
              <p className="mt-0.5 text-xs font-semibold text-muted">
                {tr(
                  "تحكّم كامل في طلباتي (قيد المراجعة وتم الاستلام)، أقسام المتجر (الذكاء ونتفليكس)، المنتجات، عروض المتاجر الإعلانية والشريط الأخضر، وصلاحية «تاجر» لباقات VIP.",
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/store"
              className="rounded-2xl border border-line bg-surface px-3.5 py-2 text-xs font-extrabold text-ink hover:bg-primary-soft"
            >
              {tr("معاينة المتجر ↗")}
            </Link>
            <Link
              to="/my-orders"
              className="rounded-2xl border border-line bg-surface px-3.5 py-2 text-xs font-extrabold text-ink hover:bg-primary-soft"
            >
              {tr("معاينة طلباتي ↗")}
            </Link>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 sm:grid-cols-3 lg:grid-cols-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                setMsg("");
              }}
              className={`flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-extrabold transition ${
                tab === t.key
                  ? "bg-ink text-paper shadow-xs"
                  : "border border-line bg-surface text-ink hover:bg-primary-soft"
              }`}
            >
              <span>{t.icon}</span>
              <span className="truncate">{tr(t.label)}</span>
            </button>
          ))}
        </div>
      </div>

      {msg ? (
        <div className="rounded-2xl bg-primary-soft/75 px-4 py-3 text-xs font-extrabold text-ink">
          {trv(msg)}
        </div>
      ) : null}

      {!storeData ? (
        <p className="stamp p-4 font-semibold">{tr("جاري تحميل بيانات المتجر…")}</p>
      ) : tab === "orders" ? (
        <ProfessionalOrdersAdmin
          hubCfg={hubCfg}
          onSaveHubCfg={saveHubMasterCfg}
          busy={busy}
        />
      ) : tab === "categories" ? (
        <StoreCategoriesManager
          cats={storeData.categories}
          refresh={refreshStore}
          setParentMsg={setMsg}
        />
      ) : tab === "products" ? (
        <StoreProductsManager
          data={storeData}
          refresh={refreshStore}
          setParentMsg={setMsg}
        />
      ) : tab === "offers" ? (
        <MerchantPromoOffersAdmin
          allProducts={storeData.products}
          hubCfg={hubCfg}
          onSaveHubCfg={saveHubMasterCfg}
          refreshStore={refreshStore}
          busy={busy}
          setParentMsg={setMsg}
        />
      ) : tab === "merchants" ? (
        <MerchantRoleAndVipAdmin
          hubCfg={hubCfg}
          onSaveHubCfg={saveHubMasterCfg}
          busy={busy}
        />
      ) : (
        <StorePaySettingsAdmin />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. Professional Orders Admin (قيد المراجعة + تم الاستلام + نسخ رقم الطلب)  */
/* -------------------------------------------------------------------------- */

type AdminOrderWithLog = Order & {
  log: { action: string; detail: string; at: string }[];
  items: (Order["items"][number] & { revoked?: boolean })[];
};

const ADMIN_ORDER_STAGE_LABELS: Record<ExtendedOrderStageAdmin, string> = {
  pending: "⏳ بانتظار الدفع",
  reviewing: "🔍 قيد المراجعة",
  paid: "💳 تم الدفع",
  delivered: "📦 تم التسليم",
  received: "✅ تم الاستلام",
  cancelled: "✕ ملغى",
};

function resolveAdminOrderStage(
  o: AdminOrderWithLog,
  stageMap: Record<string, ExtendedOrderStageAdmin>,
): ExtendedOrderStageAdmin {
  if (o.status === "cancelled") return "cancelled";
  const custom = stageMap[o.id];
  if (custom === "received") return "received";
  if (custom === "reviewing") return "reviewing";
  if (o.status === "delivered") return "delivered";
  if (o.status === "paid") return "paid";
  return custom || "pending";
}

function ProfessionalOrdersAdmin({
  hubCfg,
  onSaveHubCfg,
  busy: parentBusy,
}: {
  hubCfg: HubMasterConfig;
  onSaveHubCfg: (cfg: HubMasterConfig, msg: string) => Promise<void>;
  busy: boolean;
}) {
  const [filter, setFilter] = useState<ExtendedOrderStageAdmin | "all">("all");
  const [searchCode, setSearchCode] = useState("");
  const [orders, setOrders] = useState<AdminOrderWithLog[] | null>(null);
  const [busyId, setBusyId] = useState("");
  const [copiedId, setCopiedId] = useState("");
  const [localMsg, setLocalMsg] = useState("");

  const refreshOrders = useCallback(async () => {
    const r = await adminListOrders({ data: {} });
    setOrders((r.orders ?? []) as AdminOrderWithLog[]);
  }, []);

  useEffect(() => {
    void refreshOrders();
  }, [refreshOrders]);

  const setOrderStage = async (
    order: AdminOrderWithLog,
    targetStage: ExtendedOrderStageAdmin,
  ) => {
    setBusyId(order.id);
    setLocalMsg("");
    try {
      const nextStages: Record<string, ExtendedOrderStageAdmin> = {
        ...hubCfg.orderStages,
      };
      if (targetStage === "reviewing" || targetStage === "received") {
        nextStages[order.id] = targetStage;
        if (targetStage === "received" && order.status === "pending") {
          await adminOrderAction({
            data: { id: order.id, action: "paid" },
          }).catch(() => null);
        }
        await onSaveHubCfg(
          { ...hubCfg, orderStages: nextStages },
          `تم تحديث حالة الطلب #${order.id.slice(0, 8).toUpperCase()} إلى «${ADMIN_ORDER_STAGE_LABELS[targetStage]}» ✓`,
        );
      } else {
        delete nextStages[order.id];
        if (targetStage === "paid") {
          const r = await adminOrderAction({
            data: { id: order.id, action: "paid" },
          });
          if (!r.ok) setLocalMsg(r.message ?? "تعذّر تحديث الحالة");
        } else if (targetStage === "delivered") {
          const r = await adminOrderAction({
            data: { id: order.id, action: "deliver" },
          });
          if (!r.ok) setLocalMsg(r.message ?? "تعذّر التسليم");
        } else if (targetStage === "cancelled") {
          await adminOrderAction({
            data: { id: order.id, action: "cancelled" },
          });
        } else if (targetStage === "pending") {
          await adminOrderAction({
            data: { id: order.id, action: "pending" },
          }).catch(() => null);
        }
        await onSaveHubCfg(
          { ...hubCfg, orderStages: nextStages },
          `تم تحديث حالة الطلب #${order.id.slice(0, 8).toUpperCase()} إلى «${ADMIN_ORDER_STAGE_LABELS[targetStage]}» ✓`,
        );
      }
      await refreshOrders();
    } finally {
      setBusyId("");
    }
  };

  const copyCode = (code: string, id: string) => {
    void navigator.clipboard?.writeText(code);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((p) => (p === id ? "" : p));
    }, 2000);
  };

  const filteredList = useMemo(() => {
    if (!orders) return [];
    const q = searchCode.trim().replace(/^#/, "").toLowerCase();
    return orders.filter((o) => {
      const st = resolveAdminOrderStage(o, hubCfg.orderStages);
      if (filter !== "all" && st !== filter) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        (o.userName ?? "").toLowerCase().includes(q) ||
        (o.userEmail ?? "").toLowerCase().includes(q)
      );
    });
  }, [orders, filter, searchCode, hubCfg.orderStages]);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-paper p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold">
              {tr("📦 متابعة الطلبات الاحترافية (التحكم بحالات: قيد المراجعة، تم الدفع، تم الاستلام)")}
            </h3>
            <p className="text-xs font-semibold text-muted">
              {tr(
                "كل طلب يحمل رقم طلب مرجعي بارز ومنفصل يمكن نسخه بضغطة واحدة للتواصل السريع مع المشتري، مع تحكم فوري بجميع مراحل الطلب.",
              )}
            </p>
          </div>

          <input
            type="search"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            placeholder={tr("ابحث برقم الطلب (#...) أو اسم المشترك أو البريد…")}
            className="field max-w-xs text-xs"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="scroll-row mt-3.5 gap-1.5">
          {(
            [
              { key: "all", label: "الكل" },
              { key: "pending", label: "⏳ بانتظار الدفع" },
              { key: "reviewing", label: "🔍 قيد المراجعة" },
              { key: "paid", label: "💳 تم الدفع" },
              { key: "delivered", label: "📦 تم التسليم" },
              { key: "received", label: "✅ تم الاستلام" },
              { key: "cancelled", label: "✕ ملغى" },
            ] as { key: ExtendedOrderStageAdmin | "all"; label: string }[]
          ).map((fTab) => (
            <button
              key={fTab.key}
              type="button"
              onClick={() => setFilter(fTab.key)}
              className={`shrink-0 rounded-2xl px-3 py-1.5 text-xs font-extrabold transition ${
                filter === fTab.key
                  ? "bg-ink text-paper"
                  : "border border-line bg-surface text-ink hover:bg-primary-soft"
              }`}
            >
              {tr(fTab.label)}
            </button>
          ))}
        </div>
      </div>

      {localMsg ? (
        <p className="stamp p-3 text-xs font-extrabold text-alert">{trv(localMsg)}</p>
      ) : null}

      {!orders ? (
        <p className="stamp p-4 font-semibold">{tr("جاري تحميل الطلبات…")}</p>
      ) : filteredList.length === 0 ? (
        <p className="stamp p-6 text-center font-bold text-muted">
          {tr("لا توجد طلبات مطابقة للفلتر الحالي.")}
        </p>
      ) : (
        <ul className="space-y-3">
          {filteredList.map((o) => {
            const stage = resolveAdminOrderStage(o, hubCfg.orderStages);
            const shortCode = o.id.slice(0, 8).toUpperCase();
            const isCopied = copiedId === o.id;

            return (
              <li
                key={o.id}
                className="rounded-3xl border border-line bg-paper p-4 shadow-2xs sm:p-5"
              >
                {/* Standalone Prominent Order Number Header */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border-2 border-primary/60 bg-primary/15 px-3.5 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-extrabold text-muted">
                      {tr("رقم الطلب المنفصل:")}
                    </span>
                    <code
                      dir="ltr"
                      className="rounded-xl bg-paper px-3 py-1 font-mono text-base font-extrabold tracking-wider text-ink shadow-2xs"
                    >
                      #{shortCode}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyCode(shortCode, o.id)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
                        isCopied
                          ? "bg-[#16A34A] text-white"
                          : "bg-ink text-paper hover:opacity-90"
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="size-3.5" aria-hidden />
                          <span>{tr("تم النسخ ✓")}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" aria-hidden />
                          <span>{tr("نسخ رقم الطلب")}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-ink px-3 py-1 text-xs font-extrabold text-paper">
                      {trv(ADMIN_ORDER_STAGE_LABELS[stage])}
                    </span>
                    <span className="text-base font-extrabold text-ink" dir="ltr">
                      {formatPrice(o.totalAgorot, o.currency)}
                    </span>
                  </div>
                </div>

                {/* Buyer Info & Items */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <p className="font-extrabold text-ink">
                    👤 {trv(o.userName || "مشترك")}{" "}
                    {o.userEmail ? (
                      <span className="font-semibold text-muted" dir="ltr">
                        ({o.userEmail})
                      </span>
                    ) : null}
                  </p>
                  <p className="font-semibold text-muted">
                    {new Date(o.createdAt).toLocaleString("ar-u-nu-latn", {
                      timeZone: "Asia/Jerusalem",
                    })}{" "}
                    · {PROVIDERS[o.provider] ?? o.provider}
                  </p>
                </div>

                <ul className="mt-2.5 space-y-1 rounded-2xl bg-surface p-3 text-xs">
                  {o.items.map((it) => (
                    <li key={it.productId} className="font-bold">
                      • {trv(it.name)} × {it.qty}
                      {it.delivery ? (
                        <span
                          className="mt-1 block whitespace-pre-wrap break-all rounded-lg bg-paper p-2 font-mono text-[11px] text-muted"
                          dir="auto"
                        >
                          {it.revoked ? "[مسحوب] " : ""}
                          {it.delivery}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>

                {/* Direct Status Control Buttons */}
                <div className="mt-3 border-t border-line pt-3">
                  <p className="mb-2 text-[11px] font-extrabold text-muted">
                    {tr("تغيير حالة الطلب مباشرة:")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === o.id || parentBusy}
                      onClick={() => void setOrderStage(o, "reviewing")}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                        stage === "reviewing"
                          ? "bg-sky-600 text-white shadow-xs"
                          : "border border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-100"
                      }`}
                    >
                      <FileSearch className="size-3.5" aria-hidden />
                      {tr("🔍 الطلب قيد المراجعة")}
                    </button>

                    <button
                      type="button"
                      disabled={busyId === o.id || parentBusy}
                      onClick={() => void setOrderStage(o, "paid")}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                        stage === "paid"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "border border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                      }`}
                    >
                      <CheckCircle2 className="size-3.5" aria-hidden />
                      {tr("💳 تم الدفع والتسليم التلقائي")}
                    </button>

                    <button
                      type="button"
                      disabled={busyId === o.id || parentBusy}
                      onClick={() => void setOrderStage(o, "delivered")}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                        stage === "delivered"
                          ? "bg-ink text-paper shadow-xs"
                          : "border border-line bg-surface text-ink hover:bg-primary-soft"
                      }`}
                    >
                      <Package className="size-3.5" aria-hidden />
                      {tr("📦 تم الإرسال / التسليم")}
                    </button>

                    <button
                      type="button"
                      disabled={busyId === o.id || parentBusy}
                      onClick={() => void setOrderStage(o, "received")}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                        stage === "received"
                          ? "bg-[#16A34A] text-white shadow-xs"
                          : "border border-[#16A34A]/40 bg-[#16A34A]/10 text-[#16A34A] hover:bg-[#16A34A] hover:text-white"
                      }`}
                    >
                      <PackageCheck className="size-3.5" aria-hidden />
                      {tr("✅ تم الاستلام (مكتمل)")}
                    </button>

                    <button
                      type="button"
                      disabled={busyId === o.id || parentBusy}
                      onClick={() => void setOrderStage(o, "cancelled")}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                        stage === "cancelled"
                          ? "bg-[#DC2626] text-white"
                          : "border border-line bg-surface text-[#DC2626] hover:bg-[#DC2626]/10"
                      }`}
                    >
                      {tr("✕ إلغاء الطلب")}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. Store Categories Manager (الذكاء، نتفليكس + ضمان الظهور على الصفحات)    */
/* -------------------------------------------------------------------------- */

function StoreCategoriesManager({
  cats,
  refresh,
  setParentMsg,
}: {
  cats: StoreCategory[];
  refresh: () => Promise<void>;
  setParentMsg: (m: string) => void;
}) {
  const [editing, setEditing] = useState<Partial<StoreCategory> | null>(null);
  const [busy, setBusy] = useState(false);

  const quickAddPresetCategory = async (
    preset: (typeof STORE_CATEGORY_PRESETS)[number],
  ) => {
    setBusy(true);
    setParentMsg("");
    try {
      const existing = cats.find(
        (c) => c.slug === preset.slug || c.name.trim() === preset.name.trim(),
      );
      const r = await adminSaveCategory({
        data: {
          id: existing?.id ?? "",
          name: preset.name,
          slug: preset.slug,
          description: preset.description,
          icon: preset.icon,
          color: preset.color,
          imageKey: existing?.imageKey ?? "",
          sort: String(existing?.sort ?? cats.length + 1),
          active: true,
          // Always set showSoon=true so the category is IMMEDIATELY visible on /store even when it has 0 products!
          showSoon: true,
          parentId: "",
        },
      });
      if (r.ok) {
        await refresh();
        setParentMsg(
          `تم تفعيل وإظهار قسم «${preset.name}» على صفحات المتجر بنجاح ✓`,
        );
      } else {
        setParentMsg(r.message ?? "تعذّر حفظ القسم.");
      }
    } finally {
      setBusy(false);
    }
  };

  const ensureAllCategoriesVisible = async () => {
    setBusy(true);
    try {
      for (const c of cats) {
        if (!c.showSoon || !c.active) {
          await adminSaveCategory({
            data: {
              id: c.id,
              name: c.name,
              slug: c.slug,
              description: c.description,
              icon: c.icon,
              color: c.color,
              imageKey: c.imageKey ?? "",
              sort: String(c.sort),
              active: true,
              showSoon: true,
              parentId: c.parentId ?? "",
            },
          });
        }
      }
      await refresh();
      setParentMsg(
        "تم تفعيل وإظهار جميع أقسام المتجر على الصفحات فوراً (حتى الأقسام الجديدة الفارغة) ✓",
      );
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <StoreCategoryEditor
        c={editing}
        cats={cats}
        onDone={async () => {
          setEditing(null);
          await refresh();
        }}
      />
    );
  }

  const top = cats.filter((c) => !c.parentId);

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-paper p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold">
              {tr("🗂️ أقسام المتجر الرسمي (الذكاء الاصطناعي، نتفليكس، الألعاب، وغيرها)")}
            </h3>
            <p className="text-xs font-semibold text-muted">
              {tr(
                "أي قسم تضيفه هنا يظهر تلقائياً في أعلى صفحة المتجر وتُنشأ له لوحة منتجات مستقلة أسفل الصفحة فوراً.",
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void ensureAllCategoriesVisible()}
              className="rounded-2xl border border-[#16A34A]/40 bg-[#16A34A]/10 px-3.5 py-2 text-xs font-extrabold text-[#16A34A] hover:bg-[#16A34A] hover:text-white"
            >
              {tr("تأكيد ظهور جميع الأقسام على الصفحات ✓")}
            </button>
            <button
              type="button"
              onClick={() =>
                setEditing({
                  active: true,
                  showSoon: true,
                  icon: "sparkles",
                  color: "#f2c94c",
                  sort: cats.length + 1,
                })
              }
              className="btn flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold"
            >
              <Plus className="size-4" aria-hidden />
              {tr("إضافة قسم متجر جديد")}
            </button>
          </div>
        </div>

        {/* 1-Click Presets for AI, Netflix, Gaming, etc. */}
        <div className="mt-4 border-t border-line pt-3.5">
          <p className="mb-2 text-xs font-extrabold text-muted">
            {tr("+ إضافة سريعة بضغطة واحدة لأشهر أقسام المتجر:")}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {STORE_CATEGORY_PRESETS.map((preset) => {
              const exists = cats.some(
                (c) =>
                  c.slug === preset.slug ||
                  c.name.trim() === preset.name.trim(),
              );
              return (
                <button
                  key={preset.slug}
                  type="button"
                  disabled={busy}
                  onClick={() => void quickAddPresetCategory(preset)}
                  className={`flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 text-start text-xs font-extrabold transition ${
                    exists
                      ? "border-[#16A34A] bg-[#16A34A]/10 text-[#16A34A]"
                      : "border-line bg-surface text-ink hover:bg-primary-soft"
                  }`}
                >
                  <span className="truncate">{preset.name}</span>
                  <span className="shrink-0 rounded-lg bg-paper px-2 py-0.5 text-[10px]">
                    {exists ? "مفعّل ✓" : "+ إضافة"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {top.length === 0 ? (
        <p className="stamp p-6 text-center font-bold text-muted">
          {tr("لا توجد أقسام في المتجر بعد. اضغط على «الذكاء الاصطناعي» أو «نتفليكس» بالأعلى لإضافتها فوراً.")}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {top.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-line bg-paper p-3.5 shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <SectionCover c={c} className="size-14 shrink-0 rounded-2xl" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-extrabold text-ink">{trv(c.name)}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                        c.active && (c.productCount > 0 || c.showSoon)
                          ? "bg-[#16A34A]/15 text-[#16A34A]"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {c.active && (c.productCount > 0 || c.showSoon)
                        ? tr("ظاهر على الصفحات ✓")
                        : tr("مخفي — اضغط تعديل وفعّل إظهار القسم")}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-muted">
                    <span dir="ltr">/store/c/{trv(c.slug)}</span> ·{" "}
                    {trv(c.productCount)} {tr("منتج")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-ghost px-3 py-1.5 text-xs"
                  onClick={() => setEditing(c)}
                >
                  <Pencil className="size-4" aria-hidden />
                  {tr("تعديل")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost px-3 py-1.5 text-xs text-[#DC2626]"
                  onClick={async () => {
                    if (!confirm(tr("حذف قسم «{0}»؟", c.name))) return;
                    await adminDeleteCategory({ data: { id: c.id } });
                    await refresh();
                  }}
                >
                  <Trash2 className="size-4" aria-hidden />
                  {tr("حذف")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StoreCategoryEditor({
  c,
  cats,
  onDone,
}: {
  c: Partial<StoreCategory>;
  cats: StoreCategory[];
  onDone: () => void;
}) {
  const [f, setF] = useState({
    id: c.id ?? "",
    name: c.name ?? "",
    slug: c.slug ?? "",
    description: c.description ?? "",
    icon: c.icon ?? "sparkles",
    color: c.color ?? "#f2c94c",
    imageKey: c.imageKey ?? "",
    sort: String(c.sort ?? 0),
    active: c.active ?? true,
    // Default showSoon to TRUE so newly added categories ALWAYS appear on /store immediately!
    showSoon: c.showSoon ?? true,
    parentId: c.parentId ?? "",
  });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (x: Partial<typeof f>) => setF((o) => ({ ...o, ...x }));

  const preview: StoreCategory = {
    id: f.id || "new",
    name: f.name,
    slug: f.slug,
    sort: 0,
    imageKey: f.imageKey || null,
    icon: f.icon as StoreCategory["icon"],
    description: f.description,
    color: f.color,
    active: f.active,
    showSoon: f.showSoon,
    parentId: f.parentId || null,
    productCount: 0,
  };

  return (
    <div className="stamp flex flex-col gap-3 p-5">
      <h3 className="text-lg font-extrabold">
        {f.id ? tr("تعديل قسم في المتجر") : tr("إضافة قسم جديد في المتجر")}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="font-bold text-xs">
          {tr("اسم القسم (مثلاً: الذكاء الاصطناعي أو نتفليكس)")}
          <input
            className="field mt-1"
            maxLength={60}
            value={f.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </label>
        <label className="font-bold text-xs">
          {tr("الرابط بالإنجليزية (slug — اختياري)")}
          <input
            className="field mt-1"
            dir="ltr"
            value={f.slug}
            placeholder="ai-tools أو netflix"
            onChange={(e) => set({ slug: e.target.value })}
          />
        </label>
      </div>

      <label className="font-bold text-xs">
        {tr("وصف القسم (يظهر تحت اسم القسم في لوحة القسم)")}
        <textarea
          className="field mt-1 min-h-16"
          maxLength={500}
          value={f.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </label>

      <div className="flex items-center gap-3">
        <SectionCover c={preview} className="size-20 shrink-0 rounded-2xl" />
        <div className="flex flex-col gap-2">
          <label className="btn btn-ghost px-3 text-xs">
            {busy ? tr("جاري الرفع…") : tr("رفع صورة / أيقونة القسم")}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBusy(true);
                try {
                  set({ imageKey: await uploadSettingImage(file) });
                } catch (err) {
                  setMsg(err instanceof Error ? err.message : tr("تعذّر الرفع."));
                }
                setBusy(false);
              }}
            />
          </label>
          {f.imageKey ? (
            <button
              type="button"
              className="btn btn-ghost px-3 text-xs"
              onClick={() => set({ imageKey: "" })}
            >
              {tr("إزالة الصورة")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className="font-bold text-xs">
          {tr("الأيقونة")}
          <select
            className="field mt-1"
            value={f.icon}
            onChange={(e) => set({ icon: e.target.value as typeof f.icon })}
          >
            {Object.entries(SECTION_ICONS).map(([k, v]) => (
              <option key={k} value={k}>
                {trv(v)}
              </option>
            ))}
          </select>
        </label>
        <label className="font-bold text-xs">
          {tr("لون خلفية المربع")}
          <input
            type="color"
            className="mt-1 h-11 w-full rounded-xl border border-line"
            value={f.color}
            onChange={(e) => set({ color: e.target.value })}
          />
        </label>
        <label className="font-bold text-xs">
          {tr("الترتيب")}
          <input
            className="field mt-1"
            inputMode="numeric"
            dir="ltr"
            value={f.sort}
            onChange={(e) => set({ sort: e.target.value })}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-4 pt-1">
        <label className="flex items-center gap-2 text-xs font-extrabold">
          <input
            type="checkbox"
            className="size-4 accent-[#16A34A]"
            checked={f.active}
            onChange={(e) => set({ active: e.target.checked })}
          />
          {tr("القسم مفعّل")}
        </label>
        <label className="flex items-center gap-2 text-xs font-extrabold">
          <input
            type="checkbox"
            className="size-4 accent-[#16A34A]"
            checked={f.showSoon}
            onChange={(e) => set({ showSoon: e.target.checked })}
          />
          {tr("إظهار القسم فوراً على صفحات المتجر حتى قبل إضافة منتجات بداخله (موصى به ✓)")}
        </label>
      </div>

      {msg ? <p className="text-xs font-bold text-alert">{trv(msg)}</p> : null}

      <div className="grid grid-cols-2 gap-2 pt-2">
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await adminSaveCategory({ data: f });
            setBusy(false);
            if (!r.ok) return setMsg(r.message ?? tr("تعذّر الحفظ."));
            onDone();
          }}
        >
          {tr("حفظ القسم وإظهاره ✓")}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          {tr("إلغاء")}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. Store Products Manager                                                  */
/* -------------------------------------------------------------------------- */

const toShekelStr = (a: number | null | undefined) =>
  a == null ? "" : String(a / 100);

function StoreProductsManager({
  data,
  refresh,
  setParentMsg,
}: {
  data: {
    products: AdminProductRow[];
    categories: StoreCategory[];
    low: { name: string; freeCodes: number }[];
    lowThreshold: number;
  };
  refresh: () => Promise<void>;
  setParentMsg: (m: string) => void;
}) {
  const [editing, setEditing] = useState<Partial<AdminProductRow> | null>(null);

  const visibleStoreProducts = useMemo(
    () =>
      data.products.filter(
        (p) =>
          p.slug !== "hub-cfg-main" &&
          !p.slug.startsWith("offer-") &&
          !p.slug.startsWith("vip-pkg-"),
      ),
    [data.products],
  );

  if (editing) {
    return (
      <StoreProductForm
        p={editing}
        cats={data.categories}
        onDone={async () => {
          setEditing(null);
          await refresh();
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {data.low.length ? (
        <div className="stamp flex gap-2 border-red-300 p-3 text-xs font-bold">
          <AlertTriangle className="size-5 shrink-0 text-red-700" aria-hidden />
          <span>
            {tr("تنبيه: أكواد قليلة متبقية:")}{" "}
            {data.low.map((l) => `${l.name} (${l.freeCodes})`).join("، ")}
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn flex-1"
          onClick={() =>
            setEditing({
              active: true,
              duration: "monthly",
              deliveryType: "fixed",
              badges: [],
            })
          }
        >
          <Plus className="size-4" aria-hidden />
          {tr("إضافة منتج أو اشتراك جديد (نتفليكس / ذكاء اصطناعي / بطاقة)")}
        </button>

        {visibleStoreProducts.some((p) => p.isSample) ? (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={async () => {
              if (!confirm(tr("حذف كل المنتجات التجريبية «مثال»؟"))) return;
              const r = await adminDeleteSamples();
              setParentMsg(
                r.ok ? tr("حُذف {0} منتج تجريبي.", r.n) : tr("تعذّر الحذف."),
              );
              await refresh();
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            {tr("حذف الأمثلة التجريبية")}
          </button>
        ) : null}
      </div>

      {visibleStoreProducts.length === 0 ? (
        <p className="stamp p-6 text-center font-semibold text-muted">
          {tr("لا توجد منتجات مضافة بعد. اضغط «إضافة منتج أو اشتراك جديد» بالأعلى واختر القسم المناسب.")}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {visibleStoreProducts.map((p) => {
            const catObj = data.categories.find((c) => c.id === p.categoryId);
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-line bg-paper p-3.5 shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  {p.imageKey ? (
                    <img
                      src={mediaUrl(p.imageKey)}
                      alt=""
                      className="size-16 shrink-0 rounded-2xl object-cover"
                    />
                  ) : (
                    <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-ink">
                      <ShoppingBag className="size-6" />
                    </span>
                  )}
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          p.active
                            ? "bg-[#16A34A]/15 text-[#16A34A]"
                            : "bg-surface text-muted"
                        }`}
                      >
                        {p.active ? tr("مفعّل في المتجر ✓") : tr("مخفي")}
                      </span>
                      {catObj ? (
                        <span className="rounded-full bg-primary/25 px-2 py-0.5 text-[10px] font-extrabold text-ink">
                          {trv(catObj.name)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 font-extrabold text-ink">{trv(p.name)}</p>
                    <p className="text-xs font-semibold text-muted" dir="ltr">
                      {formatPrice(p.saleAgorot ?? p.priceAgorot)} · /store/
                      {trv(p.slug)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-1.5 text-xs"
                    onClick={() => setEditing(p)}
                  >
                    <Pencil className="size-4" aria-hidden />
                    {tr("تعديل")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost px-3 py-1.5 text-xs text-[#DC2626]"
                    onClick={async () => {
                      if (!confirm(tr("حذف «{0}»؟", p.name))) return;
                      await adminDeleteProduct({ data: { id: p.id } });
                      await refresh();
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    {tr("حذف")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StoreProductForm({
  p,
  cats,
  onDone,
}: {
  p: Partial<AdminProductRow>;
  cats: StoreCategory[];
  onDone: () => void;
}) {
  const [f, setF] = useState({
    id: p.id ?? "",
    name: p.name ?? "",
    slug: p.slug ?? "",
    categoryId: p.categoryId ?? (cats[0]?.id ?? ""),
    price: toShekelStr(p.priceAgorot) || "29",
    sale: toShekelStr(p.saleAgorot),
    imageKey: p.imageKey ?? "",
    shortDesc: p.shortDesc ?? "",
    description: p.description ?? "",
    duration: p.duration ?? "monthly",
    badges: (p.badges ?? []).join("، "),
    stock: p.stock == null ? "" : String(p.stock),
    active: p.active ?? true,
    sort: String(p.sort ?? 0),
    deliveryType: p.deliveryType ?? "fixed",
    delivery: p.delivery ?? "",
    isSample: false,
  });
  const [codes, setCodes] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (x: Partial<typeof f>) => setF((o) => ({ ...o, ...x }));

  const save = async () => {
    setBusy(true);
    setMsg("");
    const r = await adminSaveProduct({
      data: { ...f, badges: f.badges.split(/[،,]/) },
    });
    if (r.ok && codes.trim() && r.id) {
      await adminCodes({ data: { productId: r.id, text: codes } });
    }
    setBusy(false);
    if (!r.ok) return setMsg(r.message ?? tr("تعذّر الحفظ."));
    onDone();
  };

  return (
    <div className="stamp flex flex-col gap-3 p-5">
      <h3 className="text-lg font-extrabold">
        {f.id ? tr("تعديل المنتج") : tr("إضافة منتج جديد للمتجر الرسمي")}
      </h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="font-bold text-xs">
          {tr("اسم المنتج أو الاشتراك")}
          <input
            className="field mt-1"
            value={f.name}
            maxLength={120}
            placeholder="مثال: اشتراك نتفليكس بريميوم 4K"
            onChange={(e) => set({ name: e.target.value })}
          />
        </label>
        <label className="font-bold text-xs">
          {tr("القسم في المتجر (يظهر في لوحة هذا القسم)")}
          <select
            className="field mt-1"
            value={f.categoryId}
            onChange={(e) => set({ categoryId: e.target.value })}
          >
            <option value="">{tr("— اختر قسم المنتج —")}</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="font-bold text-xs">
          {tr("الرابط بالإنجليزية (slug — اختياري)")}
          <input
            className="field mt-1"
            dir="ltr"
            value={f.slug}
            placeholder="netflix-4k"
            onChange={(e) => set({ slug: e.target.value })}
          />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="font-bold text-xs">
          {tr("السعر (₪)")}
          <input
            className="field mt-1"
            inputMode="decimal"
            dir="ltr"
            value={f.price}
            onChange={(e) => set({ price: e.target.value })}
          />
        </label>
        <label className="font-bold text-xs">
          {tr("سعر التخفيض (اختياري ₪)")}
          <input
            className="field mt-1"
            inputMode="decimal"
            dir="ltr"
            value={f.sale}
            onChange={(e) => set({ sale: e.target.value })}
          />
        </label>
        <label className="font-bold text-xs">
          {tr("مدة الاشتراك")}
          <select
            className="field mt-1"
            value={f.duration}
            onChange={(e) =>
              set({ duration: e.target.value as typeof f.duration })
            }
          >
            {Object.entries(DURATIONS).map(([k, v]) => (
              <option key={k} value={k}>
                {trv(v)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-3">
        {f.imageKey ? (
          <img
            src={mediaUrl(f.imageKey)}
            alt=""
            className="size-16 rounded-2xl object-cover"
          />
        ) : (
          <span className="size-16 rounded-2xl bg-primary-soft" />
        )}
        <label className="btn btn-ghost px-3 text-xs">
          {busy ? "…" : tr("رفع صورة المنتج")}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              try {
                set({ imageKey: await uploadSettingImage(file) });
              } catch (err) {
                setMsg(err instanceof Error ? err.message : tr("تعذّر الرفع."));
              }
              setBusy(false);
            }}
          />
        </label>
      </div>

      <label className="font-bold text-xs">
        {tr("وصف قصير (يظهر على بطاقة المنتج في السلايدر)")}
        <input
          className="field mt-1"
          maxLength={200}
          value={f.shortDesc}
          onChange={(e) => set({ shortDesc: e.target.value })}
        />
      </label>

      <label className="font-bold text-xs">
        {tr("تفاصيل المنتج الكاملة")}
        <textarea
          className="field mt-1 min-h-20"
          maxLength={4000}
          value={f.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </label>

      <label className="font-bold text-xs">
        {tr("محتوى التسليم التلقائي للمشتري بعد الدفع (كود / حساب / رابط)")}
        <textarea
          className="field mt-1 min-h-16"
          value={f.delivery}
          onChange={(e) => set({ delivery: e.target.value })}
        />
      </label>

      <label className="flex items-center gap-2 text-xs font-extrabold">
        <input
          type="checkbox"
          className="size-4 accent-[#16A34A]"
          checked={f.active}
          onChange={(e) => set({ active: e.target.checked })}
        />
        {tr("ظاهر ومفعّل في المتجر الرسمي")}
      </label>

      {msg ? <p className="text-xs font-bold text-alert">{trv(msg)}</p> : null}

      <div className="grid grid-cols-2 gap-2 pt-2">
        <button type="button" className="btn" disabled={busy} onClick={save}>
          {tr("حفظ المنتج ✓")}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          {tr("إلغاء")}
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. Promotional Merchant Offers & Custom Green Ribbon Admin                 */
/* -------------------------------------------------------------------------- */

function MerchantPromoOffersAdmin({
  allProducts,
  hubCfg,
  onSaveHubCfg,
  refreshStore,
  busy: parentBusy,
  setParentMsg,
}: {
  allProducts: AdminProductRow[];
  hubCfg: HubMasterConfig;
  onSaveHubCfg: (cfg: HubMasterConfig, msg: string) => Promise<void>;
  refreshStore: () => Promise<void>;
  busy: boolean;
  setParentMsg: (m: string) => void;
}) {
  const [greenTitle, setGreenTitle] = useState(hubCfg.greenSectionTitle);
  const [greenBadge, setGreenBadge] = useState(hubCfg.greenBadgeDefault);

  const [editId, setEditId] = useState("");
  const [offerTitle, setOfferTitle] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [ribbonText, setRibbonText] = useState(hubCfg.greenBadgeDefault);
  const [priceText, setPriceText] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [imageKey, setImageKey] = useState("");
  const [savingOffer, setSavingOffer] = useState(false);

  useEffect(() => {
    setGreenTitle(hubCfg.greenSectionTitle);
    setGreenBadge(hubCfg.greenBadgeDefault);
  }, [hubCfg.greenSectionTitle, hubCfg.greenBadgeDefault]);

  const promoOffers = useMemo(
    () => allProducts.filter((p) => p.slug.startsWith("offer-")),
    [allProducts],
  );

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTitle.trim()) {
      setParentMsg("الرجاء إدخال عنوان العرض الإعلاني.");
      return;
    }
    setSavingOffer(true);
    try {
      const slug = editId
        ? (promoOffers.find((o) => o.id === editId)?.slug ??
          `offer-${Date.now().toString(36)}`)
        : `offer-${Date.now().toString(36)}`;
      const r = await adminSaveProduct({
        data: {
          id: editId,
          name: offerTitle.trim(),
          slug,
          categoryId: "",
          price: "0",
          sale: "",
          imageKey,
          shortDesc: targetUrl.trim() || "/store",
          description: merchantName.trim() || "متجر موثّق في رهط",
          duration: "none",
          badges: [
            ribbonText.trim() || greenBadge || "عرض تاجر موثّق ✓",
            priceText.trim(),
          ].filter(Boolean),
          stock: "",
          active: true,
          sort: "1",
          deliveryType: "fixed",
          delivery: "promo-offer",
          isSample: false,
        },
      });
      if (r.ok) {
        setEditId("");
        setOfferTitle("");
        setMerchantName("");
        setPriceText("");
        setTargetUrl("");
        setImageKey("");
        await refreshStore();
        setParentMsg(
          "تم حفظ العرض الإعلاني في قسم «عروض المتاجر» وتفعيل توهّج قسم العروض بالأصفر في الحراج ✓",
        );
      } else {
        setParentMsg(r.message ?? "تعذّر حفظ العرض الإعلاني.");
      }
    } finally {
      setSavingOffer(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Custom Green Ribbon Title & Badge Name */}
      <div className="rounded-3xl border-2 border-[#16A34A]/45 bg-paper p-5 shadow-2xs">
        <h3 className="text-base font-extrabold text-[#16A34A]">
          {tr("🟢 تخصيص اسم الشريط الأخضر لعروض المتاجر")}
        </h3>
        <p className="mt-0.5 text-xs font-semibold text-muted">
          {tr(
            "يمكنك تغيير عنوان الشريط الأخضر الرئيسي للقسم ونص الشارة الخضراء الافتراضية التي تظهر أعلى كل إعلان تاجر.",
          )}
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-bold">
            {tr("عنوان الشريط الأخضر للقسم في أول الصفحة")}
            <input
              type="text"
              value={greenTitle}
              onChange={(e) => setGreenTitle(e.target.value)}
              placeholder="عروض المتاجر وتجار رهط الموثّقين"
              className="field mt-1 text-xs"
            />
          </label>
          <label className="text-xs font-bold">
            {tr("الاسم المخصّص الافتراضي للشريط الأخضر على البطاقات")}
            <input
              type="text"
              value={greenBadge}
              onChange={(e) => setGreenBadge(e.target.value)}
              placeholder="عرض تاجر موثّق ✓"
              className="field mt-1 text-xs"
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              disabled={parentBusy}
              onClick={() =>
                void onSaveHubCfg(
                  {
                    ...hubCfg,
                    greenSectionTitle:
                      greenTitle.trim() || "عروض المتاجر وتجار رهط الموثّقين",
                    greenBadgeDefault:
                      greenBadge.trim() || "عرض تاجر موثّق ✓",
                  },
                  "تم حفظ الاسم المخصّص للشريط الأخضر بنجاح ✓",
                )
              }
              className="btn w-full bg-[#16A34A] py-2.5 text-xs text-white hover:opacity-95"
            >
              {tr("حفظ اسم الشريط الأخضر ✓")}
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Promotional Merchant Ad Offer */}
      <form
        onSubmit={handleSaveOffer}
        className="rounded-3xl bg-paper p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]"
      >
        <h3 className="text-base font-extrabold">
          {editId
            ? tr("تعديل العرض الإعلاني للتاجر")
            : tr("🏪 إضافة عرض إعلاني جديد في «عروض المتاجر الموثّقة» (أول الصفحة + قسم العروض المتوهج بالأصفر)")}
        </h3>
        <p className="mt-0.5 text-xs font-semibold text-muted">
          {tr(
            "العرض الإعلاني يظهر في أول الصفحة، وعند الضغط عليه ينتقل الزائر مباشرة إلى الرابط المخصّص الذي تحدده هنا.",
          )}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs font-bold">
            {tr("1. عنوان العرض الإعلاني")}
            <input
              type="text"
              required
              value={offerTitle}
              onChange={(e) => setOfferTitle(e.target.value)}
              placeholder="مثال: تنزيلات نهاية الأسبوع على الشاشات"
              className="field mt-1 text-xs"
            />
          </label>

          <label className="text-xs font-bold">
            {tr("2. اسم المتجر / المحل المعلن")}
            <input
              type="text"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder="مثال: معرض النقب للإلكترونيات · رهط"
              className="field mt-1 text-xs"
            />
          </label>

          <label className="text-xs font-bold">
            {tr("3. نص الشريط الأخضر المخصّص لهذا الإعلان")}
            <input
              type="text"
              value={ribbonText}
              onChange={(e) => setRibbonText(e.target.value)}
              placeholder="عرض تاجر موثّق ✓"
              className="field mt-1 text-xs"
            />
          </label>

          <label className="text-xs font-bold">
            {tr("4. شارة السعر أو الخصم (اختياري)")}
            <input
              type="text"
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
              placeholder="مثال: خصم 30% أو ₪199"
              className="field mt-1 text-xs"
            />
          </label>

          <label className="text-xs font-bold sm:col-span-2">
            {tr("5. الرابط المخصّص عند الضغط على الإعلان (واتساب / صفحة متجر / موقع خارجي)")}
            <input
              type="text"
              dir="ltr"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://wa.me/972501234567 أو /directory/... أو https://..."
              className="field mt-1 font-mono text-xs"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {imageKey ? (
              <img
                src={mediaUrl(imageKey)}
                alt=""
                className="h-14 w-24 rounded-xl object-cover"
              />
            ) : (
              <span className="grid h-14 w-24 place-items-center rounded-xl bg-surface text-[11px] font-bold text-muted">
                {tr("بدون صورة")}
              </span>
            )}
            <label className="btn btn-ghost px-3 py-2 text-xs">
              {savingOffer ? "…" : tr("رفع صورة البنر / الإعلان")}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setSavingOffer(true);
                  try {
                    setImageKey(await uploadSettingImage(file));
                  } catch (err) {
                    setParentMsg(
                      err instanceof Error ? err.message : tr("تعذّر رفع الصورة."),
                    );
                  }
                  setSavingOffer(false);
                }}
              />
            </label>
          </div>

          <div className="flex items-center gap-2">
            {editId ? (
              <button
                type="button"
                onClick={() => {
                  setEditId("");
                  setOfferTitle("");
                  setMerchantName("");
                  setPriceText("");
                  setTargetUrl("");
                  setImageKey("");
                }}
                className="btn btn-ghost text-xs"
              >
                {tr("إلغاء التعديل")}
              </button>
            ) : null}
            <button
              type="submit"
              disabled={savingOffer}
              className="btn px-6 py-2.5 text-xs font-extrabold"
            >
              <Plus className="size-4" aria-hidden />
              {editId ? tr("حفظ تعديل الإعلان ✓") : tr("نشر العرض الإعلاني الآن ✓")}
            </button>
          </div>
        </div>
      </form>

      {/* Active Promotional Offers List */}
      <div className="rounded-3xl bg-paper p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <h3 className="mb-3 text-sm font-extrabold">
          {tr("العروض الإعلانية النشطة حالياً")} ({promoOffers.length})
        </h3>
        {promoOffers.length === 0 ? (
          <p className="rounded-2xl bg-surface p-4 text-center text-xs font-bold text-muted">
            {tr("لا توجد عروض متاجر إعلانية مضافة حالياً.")}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {promoOffers.map((p) => (
              <li
                key={p.id}
                className="flex flex-col justify-between gap-2 rounded-2xl border border-[#16A34A]/40 bg-surface p-3"
              >
                <div className="flex items-center justify-between gap-2 rounded-xl bg-[#16A34A] px-3 py-1 text-xs font-extrabold text-white">
                  <span>{p.badges?.[0] || hubCfg.greenBadgeDefault}</span>
                  {p.badges?.[1] ? (
                    <span className="rounded bg-[#f2c94c] px-1.5 py-0.5 text-[10px] text-ink">
                      {p.badges[1]}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  {p.imageKey ? (
                    <img
                      src={mediaUrl(p.imageKey)}
                      alt=""
                      className="h-14 w-20 shrink-0 rounded-xl object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-extrabold text-ink">{p.name}</p>
                    <p className="truncate text-xs font-bold text-muted">
                      {p.description}
                    </p>
                    <p
                      className="truncate font-mono text-[11px] text-primary-ink"
                      dir="ltr"
                    >
                      {p.shortDesc}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-line pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(p.id);
                      setOfferTitle(p.name);
                      setMerchantName(p.description);
                      setRibbonText(p.badges?.[0] || hubCfg.greenBadgeDefault);
                      setPriceText(p.badges?.[1] || "");
                      setTargetUrl(p.shortDesc);
                      setImageKey(p.imageKey ?? "");
                    }}
                    className="btn btn-ghost px-3 py-1 text-xs"
                  >
                    <Pencil className="size-3.5" aria-hidden />
                    {tr("تعديل")}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(tr("حذف هذا العرض الإعلاني؟"))) return;
                      await adminDeleteProduct({ data: { id: p.id } });
                      await refreshStore();
                    }}
                    className="btn btn-ghost px-3 py-1 text-xs text-[#DC2626]"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    {tr("حذف")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. Merchant Role («صلاحية تاجر») & VIP Packages Admin                      */
/* -------------------------------------------------------------------------- */

function MerchantRoleAndVipAdmin({
  hubCfg,
  onSaveHubCfg,
  busy,
}: {
  hubCfg: HubMasterConfig;
  onSaveHubCfg: (cfg: HubMasterConfig, msg: string) => Promise<void>;
  busy: boolean;
}) {
  const [members, setMembers] = useState<
    { id: string; name: string; email: string }[]
  >([]);
  const [q, setQ] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [pkgs, setPkgs] = useState<VipPkgAdmin[]>(hubCfg.vipPackages);

  useEffect(() => {
    setPkgs(hubCfg.vipPackages);
  }, [hubCfg.vipPackages]);

  const loadMembers = useCallback(async (query: string) => {
    const r = await adminListAllMembers({ data: { q: query } }).catch(() => ({
      items: [],
    }));
    setMembers(
      (r.items ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
      })),
    );
  }, []);

  useEffect(() => {
    void loadMembers("");
  }, [loadMembers]);

  const toggleMerchantUser = async (identifier: string, labelName: string) => {
    const clean = identifier.trim().toLowerCase();
    if (!clean) return;
    const exists = hubCfg.merchantUsers.includes(clean);
    const nextUsers = exists
      ? hubCfg.merchantUsers.filter((u) => u !== clean)
      : [...hubCfg.merchantUsers, clean];
    await onSaveHubCfg(
      { ...hubCfg, merchantUsers: nextUsers },
      exists
        ? `تم سحب صلاحية «تاجر» من المشترك «${labelName}»`
        : `تم منح صلاحية «تاجر 🏪» للمشترك «${labelName}» — ستظهر له الآن باقات متاجر رهط وتثبيت الإعلانات (VIP) ✓`,
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-paper p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <h3 className="text-base font-extrabold">
          {tr("👑 منح صلاحية «تاجر» للمشتركين (لإظهار باقات متاجر رهط وتثبيت الإعلانات VIP لهم فقط)")}
        </h3>
        <p className="mt-0.5 text-xs font-semibold text-muted">
          {tr(
            "قسم «باقات متاجر رهط وتثبيت الإعلانات (VIP)» مخفي عن الزوار العاديين، ولا يظهر إلا للمشترك المسجّل الذي تمنحه هنا «صلاحية تاجر».",
          )}
        </p>

        {/* Manual Email / User ID Grant */}
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="text"
            dir="ltr"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="أدخل البريد الإلكتروني للمشترك لمنحه صلاحية تاجر..."
            className="field max-w-md flex-1 text-xs"
          />
          <button
            type="button"
            disabled={busy || !manualInput.trim()}
            onClick={async () => {
              await toggleMerchantUser(manualInput, manualInput);
              setManualInput("");
            }}
            className="btn px-4 py-2 text-xs font-extrabold"
          >
            + {tr("منح صلاحية تاجر بالبريد")}
          </button>
        </div>

        {/* Search & Toggle Members List */}
        <div className="mt-4 border-t border-line pt-3.5">
          <form
            className="mb-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void loadMembers(q);
            }}
          >
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={tr("ابحث في المشتركين بالاسم أو البريد الإلكتروني…")}
              className="field flex-1 text-xs"
            />
            <button type="submit" className="btn btn-ghost px-4 text-xs">
              {tr("بحث")}
            </button>
          </form>

          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {members.slice(0, 20).map((m) => {
              const emailKey = (m.email || m.id).trim().toLowerCase();
              const isMerchant =
                hubCfg.merchantUsers.includes(emailKey) ||
                hubCfg.merchantUsers.includes(m.id.toLowerCase());
              return (
                <li
                  key={m.id}
                  className={`flex items-center justify-between gap-2 rounded-2xl border p-3 text-xs ${
                    isMerchant
                      ? "border-[#16A34A] bg-[#16A34A]/10"
                      : "border-line bg-surface"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-extrabold text-ink">{m.name}</p>
                    <p
                      className="truncate text-[11px] font-semibold text-muted"
                      dir="ltr"
                    >
                      {m.email}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleMerchantUser(emailKey, m.name)}
                    className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
                      isMerchant
                        ? "bg-[#16A34A] text-white"
                        : "bg-ink text-paper hover:opacity-90"
                    }`}
                  >
                    {isMerchant
                      ? tr("✓ لديه صلاحية تاجر")
                      : tr("+ منح صلاحية تاجر")}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Customize the 3 VIP Packages */}
      <div className="rounded-3xl bg-paper p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold">
              {tr("تعديل تفاصيل وأسعار وروابط باقات التجار وتثبيت الإعلانات (VIP)")}
            </h3>
            <p className="text-xs font-semibold text-muted">
              {tr("عدّل عنوان وسعر ورابط كل باقة تظهر للمشتركين الحاصلين على صلاحية تاجر.")}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void onSaveHubCfg(
                { ...hubCfg, vipPackages: pkgs },
                "تم حفظ تعديلات باقات التجار وتثبيت VIP ✓",
              )
            }
            className="btn px-5 py-2 text-xs font-extrabold"
          >
            {tr("حفظ تعديلات الباقات ✓")}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {pkgs.map((pkg, idx) => (
            <div
              key={idx}
              className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-3.5 text-xs"
            >
              <label className="font-bold">
                {tr("الشارة العلوية")}
                <input
                  className="field mt-1 text-xs"
                  value={pkg.badge}
                  onChange={(e) =>
                    setPkgs(
                      pkgs.map((p, i) =>
                        i === idx ? { ...p, badge: e.target.value } : p,
                      ),
                    )
                  }
                />
              </label>
              <label className="font-bold">
                {tr("اسم الباقة")}
                <input
                  className="field mt-1 text-xs"
                  value={pkg.title}
                  onChange={(e) =>
                    setPkgs(
                      pkgs.map((p, i) =>
                        i === idx ? { ...p, title: e.target.value } : p,
                      ),
                    )
                  }
                />
              </label>
              <label className="font-bold">
                {tr("السعر والمدة")}
                <input
                  className="field mt-1 text-xs"
                  value={pkg.price}
                  onChange={(e) =>
                    setPkgs(
                      pkgs.map((p, i) =>
                        i === idx ? { ...p, price: e.target.value } : p,
                      ),
                    )
                  }
                />
              </label>
              <label className="font-bold">
                {tr("الوصف")}
                <textarea
                  className="field mt-1 min-h-14 text-xs"
                  value={pkg.desc}
                  onChange={(e) =>
                    setPkgs(
                      pkgs.map((p, i) =>
                        i === idx ? { ...p, desc: e.target.value } : p,
                      ),
                    )
                  }
                />
              </label>
              <label className="font-bold">
                {tr("رابط مخصّص عند الضغط (اختياري — فارغ = واتساب المتجر)")}
                <input
                  className="field mt-1 font-mono text-xs"
                  dir="ltr"
                  value={pkg.customUrl ?? ""}
                  placeholder="https://wa.me/..."
                  onChange={(e) =>
                    setPkgs(
                      pkgs.map((p, i) =>
                        i === idx ? { ...p, customUrl: e.target.value } : p,
                      ),
                    )
                  }
                />
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. Store Payment & WhatsApp Settings                                       */
/* -------------------------------------------------------------------------- */

function StorePaySettingsAdmin() {
  const [s, setS] = useState<AdminPaySettings | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await adminGetPaySettings();
    if (!r.authed) return setMsg(tr("هذا القسم لمالك الموقع فقط."));
    setS(r.settings);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!s)
    return (
      <p className="stamp p-4 font-semibold">{msg || tr("جاري التحميل…")}</p>
    );

  const save = async () => {
    setMsg("");
    const r = await adminSavePaySettings({
      data: { ...s, secrets: {}, clear: [] },
    });
    setMsg(r.ok ? tr("تم حفظ إعدادات الدفع وواتساب المتجر ✓") : (r.message ?? tr("تعذّر الحفظ.")));
    if (r.ok) await load();
  };

  return (
    <div className="stamp flex flex-col gap-3 p-5">
      <h3 className="text-base font-extrabold">
        {tr("💳 إعدادات العملة، رقم واتساب الطلبات، وبوابة الدفع")}
      </h3>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="font-bold text-xs">
          {tr("العملة")}
          <select
            className="field mt-1"
            value={s.currency}
            onChange={(e) =>
              setS({ ...s, currency: e.target.value as AdminPaySettings["currency"] })
            }
          >
            {Object.entries(CURRENCIES).map(([k, v]) => (
              <option key={k} value={k}>
                {trv(k)} {trv(v)}
              </option>
            ))}
          </select>
        </label>
        <label className="font-bold text-xs">
          {tr("رقم واتساب المتجر (لاستقبال الطلبات وتفعيل باقات التجار)")}
          <input
            className="field mt-1"
            dir="ltr"
            inputMode="tel"
            value={s.whatsapp}
            placeholder="0501234567"
            onChange={(e) => setS({ ...s, whatsapp: e.target.value })}
          />
        </label>
        <label className="font-bold text-xs">
          {tr("بريد التواصل للمتجر")}
          <input
            className="field mt-1"
            dir="ltr"
            type="email"
            value={s.email}
            onChange={(e) => setS({ ...s, email: e.target.value })}
          />
        </label>
      </div>
      {msg ? <p className="text-xs font-extrabold text-primary-ink">{trv(msg)}</p> : null}
      <div className="flex gap-2 pt-2">
        <button type="button" className="btn px-6" onClick={save}>
          {tr("حفظ إعدادات المتجر ✓")}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={async () => {
            setMsg(tr("جاري الاختبار…"));
            const r = await adminTestPayment();
            setMsg(r.message);
          }}
        >
          {tr("اختبار بوابة الدفع")}
        </button>
      </div>
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* Helper for Per-Section Homepage Translation ON/OFF stored in siteSettings  */
/* -------------------------------------------------------------------------- */
function parseAdminTxSecsMap(quickLinks: SiteSettings["quickLinks"] | undefined): Record<string, boolean> {
  const item = (quickLinks ?? []).find((q) => q.id === "txsecscfg");
  const map: Record<string, boolean> = {};
  if (!item?.subtitle) return map;
  for (const part of item.subtitle.split(",")) {
    const [k, v] = part.split(":");
    if (k) map[k.trim()] = v !== "0";
  }
  return map;
}

function encodeAdminTxSecsMap(
  quickLinks: SiteSettings["quickLinks"],
  map: Record<string, boolean>,
): SiteSettings["quickLinks"] {
  const others = (quickLinks ?? []).filter((q) => q.id !== "txsecscfg");
  const pairs = Object.entries(map)
    .map(([k, v]) => `${k}:${v ? "1" : "0"}`)
    .join(",")
    .slice(0, 100);
  return [
    ...others,
    {
      id: "txsecscfg",
      title: "ترجمة الأقسام",
      subtitle: pairs || "all:1",
      url: "/",
      emoji: "🌐",
    },
  ];
}

function isAdminSecTxOn(map: Record<string, boolean>, secId: string, secName?: string): boolean {
  if (secName && secName in map) return map[secName];
  if (secId in map) return map[secId];
  if (secName && /فن|موضة/.test(secName) && "art-fashion" in map) return map["art-fashion"];
  return true;
}

/* -------------------------------------------------------------------------- */
/* Upgraded AutoNewsAdmin («الجلب التلقائي والترجمة») — Old Panel + All Secs */
/* -------------------------------------------------------------------------- */
const AUTO_KIND_LABELS: Record<string, string> = {
  news: "أخبار محلية",
  israel: "أخبار إسرائيل",
  sports: "رياضة",
  tech: "أخبار تقنية",
  "art-fashion": "فن و موضة",
};

function AutoNewsAdmin() {
  const [items, setItems] = useState<AutoItem[] | null>(null);
  const [sources, setSources] = useState<AutoSource[]>([]);
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [extraSecItems, setExtraSecItems] = useState<AutoItem[]>([]);
  const [msg, setMsg] = useState("");
  const [kind, setKind] = useState<string>("");
  const [cat, setCat] = useState("");
  const [src, setSrc] = useState("");
  const [state, setState] = useState<"" | "hidden" | "pinned" | "edited">("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState<{ slug: string; title: string } | null>(null);

  const refresh = useCallback(async () => {
    const [res, secRes, stRes, spRes, tcRes, csRes] = await Promise.all([
      adminListAutoNews(),
      adminListSections().catch(() => ({ authed: false, sections: [] as AdminSection[] })),
      adminGetSiteSettings().catch(() => ({ authed: false, settings: null })),
      getSportsNews().catch(() => null),
      getTechNews().catch(() => null),
      getCustomSectionsNews().catch(() => [] as CustomSectionResult[]),
    ]);
    setItems(res.items);
    setSources(res.sources);
    if (secRes.authed) {
      const hasArt = secRes.sections.some((s) => /فن|موضة/.test(s.name));
      const allSecs = hasArt
        ? secRes.sections
        : [
            ...secRes.sections,
            {
              id: "art-fashion",
              name: "فن و موضة",
              enabled: true,
              home: true,
              position: 5,
              refreshMin: 13,
              maxItems: 40,
              maxAgeDays: 30,
              customFeeds: true,
              isCustom: true,
              feeds: [],
            },
          ];
      setSections(allSecs);
    }
    if (stRes.authed && stRes.settings) setSiteSettings(stRes.settings);

    const extra: AutoItem[] = [];
    if (spRes?.items) {
      for (const it of spRes.items) {
        extra.push({
          slug: it.slug,
          kind: "news",
          source: it.source,
          title: it.title,
          category: "رياضة",
          publishedAt: it.publishedAt,
          link: it.link,
          breaking: it.breaking,
          ov: null,
        });
      }
    }
    if (tcRes?.items) {
      for (const it of tcRes.items) {
        extra.push({
          slug: it.slug,
          kind: "news",
          source: it.source,
          title: it.title,
          category: "تقنية",
          publishedAt: it.publishedAt,
          link: it.link,
          breaking: it.breaking,
          ov: null,
        });
      }
    }
    for (const cs of csRes) {
      for (const it of cs.items) {
        extra.push({
          slug: it.slug,
          kind: "news",
          source: it.source,
          title: it.title,
          category: cs.name,
          publishedAt: it.publishedAt,
          link: it.link,
          breaking: it.breaking,
          ov: null,
        });
      }
    }
    setExtraSecItems(extra);

    setMsg(
      !res.authed ? tr("انتهت الجلسة. سجّل الدخول من جديد.") : res.ok ? "" : tr("تعذّر تحميل الأخبار."),
    );
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const txSecsMap = useMemo(
    () => parseAdminTxSecsMap(siteSettings?.quickLinks),
    [siteSettings?.quickLinks],
  );

  const toggleSectionEnabled = async (sec: AdminSection) => {
    setBusy(`sec-en:${sec.id}`);
    const nextEnabled = !sec.enabled;
    if (sec.id === "art-fashion" && !sections.some((s) => s.id === "art-fashion" && s.feeds.length > 0)) {
      await adminCreateSection({ data: { id: "art-fashion", name: "فن و موضة", home: true } }).catch(() => null);
    }
    const r = await adminSaveSection({
      data: {
        id: sec.id,
        name: sec.name,
        enabled: nextEnabled,
        home: sec.home,
        position: sec.position,
        refreshMin: sec.refreshMin,
        maxItems: sec.maxItems,
        maxAgeDays: sec.maxAgeDays,
      },
    });
    if (r.ok) {
      setSections((all) => all.map((x) => (x.id === sec.id ? { ...x, enabled: nextEnabled } : x)));
      setMsg(nextEnabled ? `✓ تم تشغيل قسم «${sec.name}»` : `✕ تم إيقاف قسم «${sec.name}»`);
    }
    setBusy("");
  };

  const toggleSectionTranslation = async (secKey: string, secName: string) => {
    if (!siteSettings) return;
    setBusy(`sec-tx:${secKey}`);
    const cur = isAdminSecTxOn(txSecsMap, secKey, secName);
    const nextMap = { ...txSecsMap, [secKey]: !cur, [secName]: !cur };
    const nextLinks = encodeAdminTxSecsMap(siteSettings.quickLinks, nextMap);
    const r = await adminSaveSiteSettings({
      data: { ...siteSettings, quickLinks: nextLinks },
    });
    if (r.ok && r.settings) {
      setSiteSettings(r.settings);
      setMsg(
        !cur
          ? `✓ تم تشغيل الترجمة التلقائية لقسم «${secName}» في الصفحة الرئيسية`
          : `✕ تم إيقاف الترجمة التلقائية لقسم «${secName}» في الصفحة الرئيسية`,
      );
    }
    setBusy("");
  };

  const toggleSectionFeed = async (secId: string, feed: AdminSection["feeds"][number]) => {
    setBusy(`feed:${feed.id}`);
    const r = await adminSaveFeed({
      data: {
        section: secId,
        id: feed.id,
        source: feed.source,
        home: feed.home,
        url: feed.url,
        enabled: !feed.enabled,
      },
    });
    if (r.ok) {
      setSections((all) =>
        all.map((s) =>
          s.id === secId
            ? {
                ...s,
                feeds: s.feeds.map((f) => (f.id === feed.id ? { ...f, enabled: !f.enabled } : f)),
              }
            : s,
        ),
      );
    }
    setBusy("");
  };

  const forceRefreshAll = async () => {
    setBusy("force-all");
    setMsg(tr("جاري جلب أحدث الأخبار من جميع مصادر RSS…"));
    const r = await adminRefreshSectionNow({ data: { section: "all" } });
    if (r.ok) {
      await refresh();
      setMsg(
        r.failedSources.length
          ? tr("✓ تم تحديث جميع المصادر في {0} مللي ثانية ({1} خبر) · تعذّر: {2}", r.ms, r.count, r.failedSources.join("، "))
          : tr("✓ تم تحديث وجلب {0} خبر من جميع المصادر في {1} مللي ثانية", r.count, r.ms),
      );
    } else {
      setMsg(trv(r.message ?? tr("تعذّر تحديث المصادر.")));
    }
    setBusy("");
  };

  const combinedItems = useMemo(() => {
    const base = items ?? [];
    const seen = new Set(base.map((i) => i.slug));
    const merged = [...base];
    for (const ex of extraSecItems) {
      if (!seen.has(ex.slug)) {
        seen.add(ex.slug);
        merged.push(ex);
      }
    }
    return merged;
  }, [items, extraSecItems]);

  const effCat = (i: AutoItem) => i.ov?.category ?? i.category;
  const list = useMemo(() => {
    const needle = q.trim();
    return combinedItems.filter(
      (i) =>
        (!kind ||
          (kind === "news" && i.kind === "news") ||
          (kind === "israel" && i.kind === "israel") ||
          effCat(i) === kind ||
          (kind === "فن و موضة" && /فن|موضة|ثقافة/.test(`${effCat(i)} ${i.title}`))) &&
        (!cat || effCat(i) === cat) &&
        (!src || i.source === src) &&
        (!state ||
          (state === "hidden" && i.ov?.hidden) ||
          (state === "pinned" && i.ov?.pinned) ||
          (state === "edited" && i.ov)) &&
        (!needle || `${i.ov?.title ?? ""} ${i.title} ${i.titleHe ?? ""}`.includes(needle)),
    );
  }, [combinedItems, kind, cat, src, state, q]);

  const save = async (i: AutoItem, patch: Partial<NonNullable<AutoItem["ov"]>>) => {
    setBusy(i.slug);
    const base = i.ov ?? {
      hidden: false,
      pinned: false,
      breaking: null,
      category: null,
      title: null,
    };
    const next = { ...base, ...patch };
    const res = await adminSaveAutoNews({ data: { slug: i.slug, kind: i.kind, ...next } });
    if (!res.ok) setMsg(res.message || tr("تعذّر الحفظ."));
    else setItems((all) => (all ?? []).map((x) => (x.slug === i.slug ? { ...x, ov: next } : x)));
    setBusy("");
  };

  const toggleSource = async (s: AutoSource) => {
    setBusy(`src:${s.kind}:${s.name}`);
    const res = await adminSetNewsSource({
      data: { kind: s.kind, name: s.name, enabled: !s.enabled },
    });
    if (res.ok) setSources((all) => all.map((x) => (x === s ? { ...x, enabled: !s.enabled } : x)));
    else setMsg(tr("تعذّر تغيير المصدر."));
    setBusy("");
  };

  const allCategoryOptions = useMemo(() => {
    const customNames = sections.map((s) => s.name.trim()).filter(Boolean);
    return Array.from(new Set([...newsCategories, "إسرائيل", "فن و موضة", ...customNames]));
  }, [sections]);

  const sourceNames = [...new Set(combinedItems.map((i) => i.source))];

  // Non-news/israel sections (sports, tech, فن و موضة, and any other custom sections)
  const additionalSections = useMemo(
    () => sections.filter((s) => s.id !== "news" && s.id !== "israel" && s.id !== "weather"),
    [sections],
  );

  return (
    <>
      <div className="mb-4 rounded-3xl bg-paper p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold">{tr("المصادر التلقائية والجلب الفوري والترجمة")}</h2>
            <p className="text-sm font-semibold text-muted">
              {tr("تحكّم في تشغيل وإيقاف الجلب التلقائي والترجمة لجميع أقسام الصفحة الرئيسية (الأخبار المحلية، أخبار إسرائيل، الرياضة، التقنية، فن و موضة، وباقي الأقسام) ومصادرها.")}
            </p>
          </div>
          <button
            type="button"
            disabled={busy === "force-all"}
            onClick={forceRefreshAll}
            className="btn flex items-center gap-2 px-4 py-2 text-sm"
          >
            <RefreshCw className={`size-4 ${busy === "force-all" ? "animate-spin" : ""}`} aria-hidden />
            {busy === "force-all" ? tr("جاري الجلب…") : tr("تحديث جميع المصادر الآن")}
          </button>
        </div>

        {/* 1. Built-in news & israel sources + translation toggle */}
        {(["news", "israel"] as const).map((k) => {
          const secObj = sections.find((s) => s.id === k);
          const secEnabled = secObj ? secObj.enabled : true;
          const secLabel = AUTO_KIND_LABELS[k];
          const txOn = isAdminSecTxOn(txSecsMap, k, secLabel);
          return (
            <div key={k} className="mt-3 border-t border-line/60 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{trv(secLabel)}</p>
                  {secObj ? (
                    <button
                      type="button"
                      disabled={busy === `sec-en:${k}`}
                      onClick={() => void toggleSectionEnabled(secObj)}
                      className={secEnabled ? "chip chip-ink text-xs" : "chip line-through opacity-60 text-xs"}
                    >
                      {secEnabled ? "✓ القسم شغّال" : "✕ القسم موقوف"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy === `sec-tx:${k}` || !siteSettings}
                    onClick={() => void toggleSectionTranslation(k, secLabel)}
                    className={txOn ? "chip chip-ok text-xs" : "chip line-through opacity-60 text-xs"}
                  >
                    {txOn ? "✓ 🌐 الترجمة شغّالة" : "✕ 🌐 الترجمة موقوفة"}
                  </button>
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {sources
                  .filter((s) => s.kind === k)
                  .map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      className={s.enabled ? "chip chip-ink" : "chip line-through opacity-60"}
                      disabled={busy === `src:${s.kind}:${s.name}`}
                      onClick={() => void toggleSource(s)}
                    >
                      {s.enabled ? "✓ " : "✕ "}
                      {trv(s.name)}
                    </button>
                  ))}
              </div>
            </div>
          );
        })}

        {/* 2. Rest of the sections: فن و موضة, رياضة, أخبار تقنية, and all custom sections */}
        {additionalSections.map((sec) => {
          const txOn = isAdminSecTxOn(txSecsMap, sec.id, sec.name);
          return (
            <div key={sec.id} className="mt-3 border-t border-line/60 pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{trv(sec.name)}</p>
                  <button
                    type="button"
                    disabled={busy === `sec-en:${sec.id}`}
                    onClick={() => void toggleSectionEnabled(sec)}
                    className={sec.enabled ? "chip chip-ink text-xs" : "chip line-through opacity-60 text-xs"}
                  >
                    {sec.enabled ? "✓ القسم شغّال" : "✕ القسم موقوف"}
                  </button>
                  <button
                    type="button"
                    disabled={busy === `sec-tx:${sec.id}` || !siteSettings}
                    onClick={() => void toggleSectionTranslation(sec.id, sec.name)}
                    className={txOn ? "chip chip-ok text-xs" : "chip line-through opacity-60 text-xs"}
                  >
                    {txOn ? "✓ 🌐 الترجمة شغّالة" : "✕ 🌐 الترجمة موقوفة"}
                  </button>
                </div>
              </div>
              {sec.feeds.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {sec.feeds.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={f.enabled ? "chip chip-ink" : "chip line-through opacity-60"}
                      disabled={busy === `feed:${f.id}`}
                      onClick={() => void toggleSectionFeed(sec.id, f)}
                    >
                      {f.enabled ? "✓ " : "✕ "}
                      {trv(f.source)}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-3xl bg-paper p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <input
          className="field col-span-2"
          placeholder={tr("ابحث في العناوين")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="field"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="">{tr("كل الأقسام")}</option>
          <option value="news">{tr("أخبار محلية")}</option>
          <option value="israel">{tr("أخبار إسرائيل")}</option>
          <option value="فن و موضة">{tr("فن و موضة")}</option>
          <option value="رياضة">{tr("رياضة")}</option>
          <option value="تقنية">{tr("أخبار تقنية")}</option>
          {additionalSections
            .filter((s) => !["sports", "tech", "art-fashion"].includes(s.id) && s.name !== "فن و موضة")
            .map((s) => (
              <option key={s.id} value={s.name}>
                {trv(s.name)}
              </option>
            ))}
        </select>
        <select className="field" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">{tr("كل التصنيفات")}</option>
          {allCategoryOptions.map((c) => (
            <option key={c}>{trv(c)}</option>
          ))}
        </select>
        <select className="field" value={src} onChange={(e) => setSrc(e.target.value)}>
          <option value="">{tr("كل المصادر")}</option>
          {sourceNames.map((s) => (
            <option key={s}>{trv(s)}</option>
          ))}
        </select>
        <select
          className="field"
          value={state}
          onChange={(e) => setState(e.target.value as typeof state)}
        >
          <option value="">{tr("كل الحالات")}</option>
          <option value="hidden">{tr("المخفية")}</option>
          <option value="pinned">{tr("المثبتة")}</option>
          <option value="edited">{tr("المعدّلة")}</option>
        </select>
      </div>

      {msg ? <p className="mb-3 rounded-3xl bg-paper p-3.5 font-bold shadow-[0_1px_3px_rgba(16,24,40,0.06)]">{trv(msg)}</p> : null}
      {!items ? (
        <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>
      ) : (
        <>
          <p className="mb-2 font-bold">
            {trv(list.length)} {tr("من")} {trv(combinedItems.length)} {tr("خبر")}
          </p>
          <ul className="flex flex-col gap-3">
            {list.slice(0, 150).map((i) => {
              const ov = i.ov;
              const breaking = ov?.breaking ?? i.breaking;
              const href = i.kind === "news" ? `/news/${i.slug}` : `/israel-news/${i.slug}`;
              return (
                <li key={i.slug} className={`rounded-3xl bg-paper p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)] ${ov?.hidden ? "opacity-60" : ""}`}>
                  <div className="flex flex-wrap gap-2">
                    <span className="chip">{trv(effCat(i) || AUTO_KIND_LABELS[i.kind] || i.kind)}</span>
                    <span className="chip">{trv(i.source)}</span>
                    {ov?.hidden ? <span className="chip chip-ink">{tr("مخفي")}</span> : null}
                    {ov?.pinned ? <span className="chip chip-ink">{tr("📌 مثبّت")}</span> : null}
                    {breaking ? <span className="chip chip-alert">{tr("عاجل")}</span> : null}
                  </div>
                  {editing?.slug === i.slug ? (
                    <form
                      className="mt-2 flex flex-col gap-2"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await save(i, { title: editing.title.trim() || null });
                        setEditing(null);
                      }}
                    >
                      <textarea
                        className="field min-h-20"
                        value={editing.title}
                        maxLength={300}
                        onChange={(e) => setEditing({ slug: i.slug, title: e.target.value })}
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <button type="submit" className="btn">
                          {tr("حفظ")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={async () => {
                            await save(i, { title: null });
                            setEditing(null);
                          }}
                        >
                          {tr("الأصلي")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setEditing(null)}
                        >
                          {tr("إلغاء")}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block text-lg font-bold hover:underline"
                    >
                      {trv(ov?.title ?? i.title)}
                    </a>
                  )}
                  {i.titleHe && i.titleHe !== (ov?.title ?? i.title) ? (
                    <p className="mt-1 text-sm text-muted" dir="rtl" lang="he">
                      {i.titleHe}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className={ov?.hidden ? "btn" : "btn btn-ghost"}
                      disabled={busy === i.slug}
                      onClick={() => void save(i, { hidden: !ov?.hidden })}
                    >
                      {ov?.hidden ? tr("إظهار") : tr("إخفاء")}
                    </button>
                    <button
                      type="button"
                      className={ov?.pinned ? "btn" : "btn btn-ghost"}
                      disabled={busy === i.slug}
                      onClick={() => void save(i, { pinned: !ov?.pinned })}
                    >
                      {ov?.pinned ? tr("إلغاء التثبيت") : tr("تثبيت بأعلى القائمة")}
                    </button>
                    {i.kind === "news" ? (
                      <button
                        type="button"
                        className={breaking ? "btn" : "btn btn-ghost"}
                        disabled={busy === i.slug}
                        onClick={() => void save(i, { breaking: !breaking })}
                      >
                        {breaking ? tr("إلغاء عاجل") : tr("عاجل")}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setEditing({ slug: i.slug, title: ov?.title ?? i.title })}
                    >
                      {tr("تعديل العنوان")}
                    </button>
                    {i.kind === "news" ? (
                      <select
                        className="field w-auto"
                        aria-label={tr("تصنيف الخبر")}
                        value={effCat(i)}
                        disabled={busy === i.slug}
                        onChange={(e) =>
                          void save(i, {
                            category: e.target.value === i.category ? null : e.target.value,
                          })
                        }
                      >
                        {allCategoryOptions.map((c) => (
                          <option key={c} value={c}>{trv(c)}</option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Upgraded GeminiAdmin («الذكاء الاصطناعي والترجمة») — Old Panel + All Secs  */
/* -------------------------------------------------------------------------- */
const GEMINI_USES = [
  ["israel", "ترجمة أخبار إسرائيل (عبري ← عربي)"],
  ["site", "ترجمة لغات الموقع (الواجهة والمحتوى)"],
  ["auto", "ترجمة الأخبار التلقائية"],
] as const;

const GEMINI_PNAME = {
  gemini: "Gemini",
  grok: "Grok (xAI)",
  microsoft: "Microsoft Translator",
  mymemory: "MyMemory",
} as const;

function GeminiAdmin() {
  const [s, setS] = useState<GeminiPublic | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [dbSecs, setDbSecs] = useState<AdminSection[]>([]);
  const [usage, setUsage] = useState<GeminiUsage | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [cache, setCache] = useState<{ lang: string; n: number }[]>([]);
  const [key, setKey] = useState("");
  const [grokKey, setGrokKey] = useState("");
  const [azureKey, setAzureKey] = useState("");
  const [grokModels, setGrokModels] = useState<string[]>([]);
  const [testProv, setTestProv] = useState<"" | "gemini" | "grok" | "microsoft" | "mymemory">("");
  const [msg, setMsg] = useState("");
  const [testText, setTestText] = useState("مرحباً بكم في رهط بوست، أخبار رهط والنقب.");
  const [testLang, setTestLang] = useState("en");
  const [testOut, setTestOut] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [r, stRes, secRes] = await Promise.all([
      adminGetGemini(),
      adminGetSiteSettings().catch(() => ({ authed: false, settings: null })),
      adminListSections().catch(() => ({ authed: false, sections: [] as AdminSection[] })),
    ]);
    if (!r.authed || !r.settings) return setMsg(tr("هذا القسم للمالك والمشرفين فقط."));
    setS(r.settings);
    setUsage(r.usage ?? null);
    setModels(r.models ?? []);
    setGrokModels(r.grokModels ?? []);
    setCache(r.cache ?? []);
    if (stRes.authed && stRes.settings) setSiteSettings(stRes.settings);
    if (secRes.authed) setDbSecs(secRes.sections);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const txSecsMap = useMemo(
    () => parseAdminTxSecsMap(siteSettings?.quickLinks),
    [siteSettings?.quickLinks],
  );

  const allHomeSectionsForTx = useMemo(() => {
    const baseList = [
      { id: "art-fashion", name: "فن و موضة", label: "ترجمة قسم فن و موضة (في الصفحة الرئيسية وداخل القسم)" },
      { id: "news", name: "الأخبار المحلية", label: "ترجمة قسم الأخبار المحلية (في الصفحة الرئيسية)" },
      { id: "sports", name: "رياضة", label: "ترجمة قسم الرياضة (في الصفحة الرئيسية)" },
      { id: "tech", name: "أخبار تقنية", label: "ترجمة قسم أخبار التقنية (في الصفحة الرئيسية)" },
      { id: "store", name: "المتجر والحراج", label: "ترجمة قسم المتجر والحراج (في الصفحة الرئيسية)" },
    ];
    for (const ds of dbSecs) {
      if (
        !["news", "israel", "sports", "tech", "weather", "art-fashion"].includes(ds.id) &&
        !/فن|موضة/.test(ds.name)
      ) {
        baseList.push({
          id: ds.id,
          name: ds.name,
          label: `ترجمة قسم ${ds.name} (في الصفحة الرئيسية)`,
        });
      }
    }
    return baseList;
  }, [dbSecs]);

  const toggleSecTx = async (secId: string, secName: string, nextVal: boolean) => {
    if (!siteSettings) return;
    const nextMap = { ...txSecsMap, [secId]: nextVal, [secName]: nextVal };
    const nextLinks = encodeAdminTxSecsMap(siteSettings.quickLinks, nextMap);
    const updatedSt = { ...siteSettings, quickLinks: nextLinks };
    setSiteSettings(updatedSt);
    await adminSaveSiteSettings({ data: updatedSt }).catch(() => null);
  };

  if (!s) return <p className="stamp p-4 font-semibold">{msg || tr("جاري التحميل…")}</p>;
  const save = async (extra: { apiKey?: string; clearKey?: boolean; grokKey?: string; clearGrokKey?: boolean; azureKey?: string; clearAzureKey?: boolean } = {}) => {
    setBusy(true);
    const r = await adminSaveGemini({ data: { ...s, ...extra } });
    setBusy(false);
    setKey("");
    setGrokKey("");
    setAzureKey("");
    setMsg(r.ok ? tr("تم الحفظ.") : trv(r.message ?? tr("تعذّر الحفظ.")));
    if (r.ok) await load();
  };
  const test = async () => {
    setTestOut(tr("جاري الاختبار…"));
    const r = await adminTestGemini({ data: { text: testText, lang: testLang, provider: testProv } });
    setTestOut(r.ok ? `${r.text}\n\n(${r.provider} · ${r.ms} ms)` : trv(r.message ?? tr("فشل الطلب.")));
    await load();
  };
  const mv = (i: number, d: number) => {
    const o = [...s.order];
    [o[i], o[i + d]] = [o[i + d], o[i]];
    setS({ ...s, order: o });
  };
  const langs = getI18nState().langs;
  const modelList = models.includes(s.model) ? models : [s.model, ...models];
  const totals = (usage?.today ?? []).reduce((a, u) => ({ calls: a.calls + u.calls, cached: a.cached + u.cached, errors: a.errors + u.errors }), { calls: 0, cached: 0, errors: 0 });

  return (
    <div className="flex flex-col gap-4">
      <section className="stamp flex flex-col gap-3 p-4">
        <h2 className="text-lg font-bold">{tr("الذكاء الاصطناعي والترجمة")}</h2>
        <label className="flex items-center gap-2 font-bold">
          <input type="checkbox" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} />
          {tr("تفعيل الترجمة بالذكاء الاصطناعي")}
        </label>
        <div className="flex flex-col gap-1.5 ps-6">
          {GEMINI_USES.map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" disabled={!s.enabled} checked={s.uses[k]} onChange={(e) => setS({ ...s, uses: { ...s.uses, [k]: e.target.checked } })} />
              {trv(label)}
            </label>
          ))}
          {allHomeSectionsForTx.map((secItem) => {
            const checked = isAdminSecTxOn(txSecsMap, secItem.id, secItem.name);
            return (
              <label key={secItem.id} className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  disabled={!s.enabled}
                  checked={checked}
                  onChange={(e) => void toggleSecTx(secItem.id, secItem.name, e.target.checked)}
                />
                {trv(secItem.label)}
              </label>
            );
          })}
        </div>
        <label className="flex flex-col gap-1 text-sm font-bold">
          {tr("النموذج")}
          <select className="field" value={s.model} dir="ltr" onChange={(e) => setS({ ...s, model: e.target.value })}>
            {modelList.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {!models.length ? <span className="text-xs font-semibold text-muted">{tr("تعذّر جلب قائمة النماذج (تحقق من المفتاح).")}</span> : null}
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          {tr("درجة الإبداع (Temperature): {0}", s.temperature)}
          <input type="range" min={0} max={1} step={0.05} value={s.temperature} onChange={(e) => setS({ ...s, temperature: Number(e.target.value) })} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          {tr("أسلوب الترجمة (تعليمات للنموذج)")}
          <textarea className="field min-h-24" dir="auto" value={s.stylePrompt} onChange={(e) => setS({ ...s, stylePrompt: e.target.value })} />
        </label>
        <div className="flex flex-col gap-1 text-sm font-bold">
          {tr("مفتاح API (اختياري)")}
          <p className="text-xs font-semibold text-muted">
            {s.hasOwnKey ? tr("يوجد مفتاح محفوظ ومشفّر.") : s.hasEnvKey ? tr("يُستخدم المفتاح من إعدادات الخادم (GEMINI_API_KEY).") : tr("لا يوجد مفتاح.")}
          </p>
          <div className="flex gap-2">
            <input className="field flex-1" type="password" autoComplete="off" dir="ltr" placeholder="AIza…" value={key} onChange={(e) => setKey(e.target.value)} />
            {s.hasOwnKey ? (
              <button type="button" className="btn btn-ghost px-3" onClick={() => save({ clearKey: true })}>{tr("حذف المفتاح")}</button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 text-sm font-bold">
          {tr("ترتيب مزودي الترجمة (عند الفشل يُستخدم التالي)")}
          {s.order.map((p, i) => (
            <div key={p} className="flex items-center gap-2 rounded-xl bg-surface p-2">
              <input type="checkbox" checked={s.providers[p]} onChange={(e) => setS({ ...s, providers: { ...s.providers, [p]: e.target.checked } })} />
              <span className="flex-1" dir="ltr">{i + 1}. {GEMINI_PNAME[p]}</span>
              <button type="button" className="btn btn-ghost px-2" disabled={i === 0} onClick={() => mv(i, -1)}>↑</button>
              <button type="button" className="btn btn-ghost px-2" disabled={i === s.order.length - 1} onClick={() => mv(i, 1)}>↓</button>
            </div>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-sm font-bold">
          {tr("نموذج Grok")}
          <select className="field" value={s.grokModel} dir="ltr" onChange={(e) => setS({ ...s, grokModel: e.target.value })}>
            {(grokModels.includes(s.grokModel) ? grokModels : [s.grokModel, ...grokModels]).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1 text-sm font-bold">
          {tr("مفتاح xAI (اختياري)")}
          <p className="text-xs font-semibold text-muted">
            {s.hasGrokOwnKey ? tr("يوجد مفتاح محفوظ ومشفّر.") : s.hasGrokEnvKey ? tr("يُستخدم المفتاح من إعدادات الخادم (XAI_API_KEY).") : tr("لا يوجد مفتاح.")}
          </p>
          <div className="flex gap-2">
            <input className="field flex-1" type="password" autoComplete="off" dir="ltr" placeholder="xai-…" value={grokKey} onChange={(e) => setGrokKey(e.target.value)} />
            {s.hasGrokOwnKey ? (
              <button type="button" className="btn btn-ghost px-3" onClick={() => save({ clearGrokKey: true })}>{tr("حذف المفتاح")}</button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-1 text-sm font-bold">
          {tr("مفتاح Microsoft Translator (اختياري)")}
          <p className="text-xs font-semibold text-muted">
            {s.hasAzureOwnKey ? tr("يوجد مفتاح محفوظ ومشفّر.") : s.hasAzureEnvKey ? tr("يُستخدم المفتاح من إعدادات الخادم (AZURE_TRANSLATOR_KEY).") : tr("لا يوجد مفتاح.")}
          </p>
          <div className="flex gap-2">
            <input className="field flex-1" type="password" autoComplete="off" dir="ltr" placeholder="Azure key" value={azureKey} onChange={(e) => setAzureKey(e.target.value)} />
            <input className="field w-36" dir="ltr" placeholder="region" value={s.azureRegion} onChange={(e) => setS({ ...s, azureRegion: e.target.value })} />
            {s.hasAzureOwnKey ? (
              <button type="button" className="btn btn-ghost px-3" onClick={() => save({ clearAzureKey: true })}>{tr("حذف المفتاح")}</button>
            ) : null}
          </div>
        </div>
        <label className="flex flex-col gap-1 text-sm font-bold">
          {tr("بريد MyMemory (يرفع الحصة المجانية اليومية)")}
          <input className="field" dir="ltr" type="email" value={s.myMemoryEmail} onChange={(e) => setS({ ...s, myMemoryEmail: e.target.value })} />
        </label>
        <div className="flex items-center gap-2">
          <button type="button" className="btn" disabled={busy} onClick={() => save({ ...(key.trim() ? { apiKey: key } : {}), ...(grokKey.trim() ? { grokKey } : {}), ...(azureKey.trim() ? { azureKey } : {}) })}>{tr("حفظ")}</button>
          {msg ? <p className="text-sm font-semibold" role="status">{trv(msg)}</p> : null}
        </div>
      </section>

      <section className="stamp flex flex-col gap-3 p-4">
        <h2 className="text-lg font-bold">{tr("صور الذكاء الاصطناعي للأخبار بلا صور")}</h2>
        <p className="text-sm font-semibold text-muted">
          {tr("الافتراضي: صورة بهوية رهط بوست (العنوان والشعار). عند التفعيل تُولَّد رسمة توضيحية عامة (بلا نصوص ولا وجوه حقيقية) في الخلفية، وعند أي خطأ تبقى الصورة الافتراضية.")}
        </p>
        <label className="flex items-center gap-2 font-bold">
          <input type="checkbox" checked={s.aiImages.enabled} onChange={(e) => setS({ ...s, aiImages: { ...s.aiImages, enabled: e.target.checked } })} />
          {tr("تفعيل صور الذكاء الاصطناعي")}
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-bold">
            {tr("المزوّد")}
            <select className="field" dir="ltr" value={s.aiImages.provider} onChange={(e) => setS({ ...s, aiImages: { ...s.aiImages, provider: e.target.value as "gemini" | "grok" } })}>
              <option value="gemini">Gemini (image)</option>
              <option value="grok">Grok (xAI image)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            {tr("الحد اليومي للصور")}
            <input className="field" type="number" min={0} max={500} value={s.aiImages.dailyCap} onChange={(e) => setS({ ...s, aiImages: { ...s.aiImages, dailyCap: Number(e.target.value) } })} />
          </label>
        </div>
        <button type="button" className="btn self-start" disabled={busy} onClick={() => save()}>{tr("حفظ")}</button>
      </section>

      <section className="stamp flex flex-col gap-3 p-4">
        <h2 className="text-lg font-bold">{tr("تجربة")}</h2>
        <textarea className="field min-h-20" dir="auto" value={testText} onChange={(e) => setTestText(e.target.value)} />
        <div className="flex gap-2">
          <select className="field w-auto" value={testLang} onChange={(e) => setTestLang(e.target.value)}>
            {[...langs.map((l) => [l.code, l.name]), ...(langs.some((l) => l.code === "fr") ? [] : [["fr", "Français"]])].map(([c, n]) => (
              <option key={c} value={c}>{n}</option>
            ))}
          </select>
          <select className="field w-auto" dir="ltr" value={testProv} onChange={(e) => setTestProv(e.target.value as typeof testProv)}>
            <option value="">{tr("السلسلة")}</option>
            {s.order.map((p) => <option key={p} value={p}>{GEMINI_PNAME[p]}</option>)}
          </select>
          <button type="button" className="btn" onClick={test}>{tr("ترجم")}</button>
        </div>
        {testOut ? <pre className="whitespace-pre-wrap rounded-xl bg-surface p-3 text-sm" dir="auto">{testOut}</pre> : null}
      </section>

      <section className="stamp flex flex-col gap-3 p-4">
        <h2 className="text-lg font-bold">{tr("الاستخدام اليوم")}</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-surface p-3"><p className="text-2xl font-bold">{totals.calls}</p><p className="text-xs font-semibold text-muted">{tr("طلبات")}</p></div>
          <div className="rounded-xl bg-surface p-3"><p className="text-2xl font-bold">{totals.cached}</p><p className="text-xs font-semibold text-muted">{tr("من الذاكرة")}</p></div>
          <div className="rounded-xl bg-surface p-3"><p className="text-2xl font-bold">{totals.errors}</p><p className="text-xs font-semibold text-muted">{tr("أخطاء")}</p></div>
        </div>
        {usage?.today.length ? (
          <ul className="text-sm font-semibold">
            {usage.today.map((u) => (
              <li key={u.kind}>{u.kind}: {u.calls} / {u.cached} / {u.errors}</li>
            ))}
          </ul>
        ) : null}
        <h3 className="font-bold">{tr("آخر الأخطاء")}</h3>
        {usage?.errors.length ? (
          <ul className="flex flex-col gap-1 text-xs" dir="ltr">
            {usage.errors.map((e, i) => (
              <li key={i} className="rounded-lg bg-surface p-2"><b>{e.at.slice(0, 19)} · {e.kind}</b> {e.message}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm font-semibold text-muted">{tr("لا توجد أخطاء.")}</p>
        )}
      </section>

      <section className="stamp flex flex-col gap-3 p-4">
        <h2 className="text-lg font-bold">{tr("ذاكرة الترجمة")}</h2>
        {langs.filter((l) => l.code !== "ar").map((l) => (
          <div key={l.code} className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex-1">{l.name} · {tr("{0} نص محفوظ", cache.find((c) => c.lang === l.code)?.n ?? 0)}</span>
            <button
              type="button"
              className="btn btn-ghost px-3"
              onClick={async () => {
                if (!confirm(tr("حذف الترجمات الآلية المحفوظة لهذه اللغة؟ (التعديلات اليدوية تبقى)"))) return;
                const r = await adminClearLangCache({ data: l.code });
                setMsg(tr("حُذف {0} ترجمة محفوظة.", r.n));
                await load();
              }}
            >
              {tr("مسح")}
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
