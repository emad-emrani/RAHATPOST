import {
  ArrowDown,
  ArrowRight,
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
import { lazy, Suspense, useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Shell } from "@/components/shell";
import { AuthLayout } from "@/components/auth-layout";
import { adminDecideListing, adminListListings, adminSamples } from "@/lib/market/api";
import { priceLabel, STATUS_LABEL, type ListingStatus, type OwnListing } from "@/lib/market/types";
import { adminDecide, adminList, adminLogin, adminLogout } from "@/lib/directory/api";
import type { BusinessSubmission } from "@/lib/directory/types";
import { adminGate, adminWhoami } from "@/lib/team/api";
import type { AdminLevel } from "@/lib/admin-auth";
import { adminDecideNews, adminListNews } from "@/lib/reader-news/api";
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
import { tr, trv } from "@/lib/i18n/core";
import { AdminSearch, CardBoundary, DashboardHome, ReviewQueue, Skeleton } from "@/components/admin/admin-v2";
import type { SiteSettingsPart } from "@/components/admin/site-settings-admin";
import { LangSwitcher } from "@/components/lang-switcher";
import logoUrl from "@/assets/logo.jpg";
import { useSiteSettings } from "@/lib/site-settings/context";

const CommentsAdmin = lazy(() => import("@/components/admin/comments-admin").then((m) => ({ default: m.CommentsAdmin })));
const AlertsAdmin = lazy(() => import("@/components/admin/content-admin").then((m) => ({ default: m.AlertsAdmin })));
const DutyAdmin = lazy(() => import("@/components/admin/content-admin").then((m) => ({ default: m.DutyAdmin })));
const PushAdmin = lazy(() => import("@/components/admin/content-admin").then((m) => ({ default: m.PushAdmin })));
const ReportsAdmin = lazy(() => import("@/components/admin/content-admin").then((m) => ({ default: m.ReportsAdmin })));
const HarajCategoriesAdmin = lazy(() => import("@/components/admin/haraj-categories-admin").then((m) => ({ default: m.HarajCategoriesAdmin })));
const AutoNewsAdmin = lazy(() => import("@/components/admin/auto-news-admin").then((m) => ({ default: m.AutoNewsAdmin })));
const SectionAdmin = lazy(() => import("@/components/admin/section-admin").then((m) => ({ default: m.SectionAdmin })));
const MembersAdmin = lazy(() => import("@/components/admin/members-admin").then((m) => ({ default: m.MembersAdmin })));
const PopupsAdmin = lazy(() => import("@/components/admin/popups-admin").then((m) => ({ default: m.PopupsAdmin })));
const EmailAdmin = lazy(() => import("@/components/admin/email-admin").then((m) => ({ default: m.EmailAdmin })));
const PublishAdmin = lazy(() => import("@/components/admin/publish-admin").then((m) => ({ default: m.PublishAdmin })));
const StoreAdmin = lazy(() => import("@/components/admin/store-admin").then((m) => ({ default: m.StoreAdmin })));
const StatsAdmin = lazy(() => import("@/components/admin/stats-admin").then((m) => ({ default: m.StatsAdmin })));
const LanguagesAdmin = lazy(() => import("@/components/admin/languages-admin").then((m) => ({ default: m.LanguagesAdmin })));
const GeminiAdmin = lazy(() => import("@/components/admin/gemini-admin").then((m) => ({ default: m.GeminiAdmin })));
const BusLinesAdmin = lazy(() => import("@/components/admin/bus-admin").then((m) => ({ default: m.BusLinesAdmin })));

type QuickCustomSection = {
  id: string;
  name: string;
  category: string;
  home: boolean;
  emoji: string;
};

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: tr("إدارة · رهط بوست") }, { name: "robots", content: "noindex, nofollow" }],
  }),
  loader: () => adminGate(),
  server: {
    middleware: [
      createMiddleware().server(async ({ next }) => {
        const result = await next();
        try {
          const { getAdminAccess } = await import("@/lib/admin-auth");
          if (!(await getAdminAccess())) {
            const { getSessionUser } = await import("@/lib/auth/verify.server");
            if (await getSessionUser()) {
              const r = (result as { response?: Response }).response;
              if (r) return { ...result, response: new Response(r.body, { status: 403, headers: r.headers }) } as typeof result;
            }
          }
        } catch {
          /* auth not configured */
        }
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
  { key: "ads", label: "إعلانات الحراج", icon: Megaphone },
  { key: "haraj-cats", label: "تصنيفات الحراج", icon: LayoutGrid },
  { key: "store", label: "المتجر والمنتجات", icon: ShoppingBag },
  { key: "alerts", label: "شريط التنبيهات العاجلة", icon: Siren },
  { key: "push", label: "إشعارات الهواتف (Push)", icon: Bell },
  { key: "popups", label: "النوافذ الترويجية (Popups)", icon: MonitorUp },
  { key: "emails", label: "قوالب البريد الإلكتروني", icon: Mail },
  { key: "set-google", label: "جوجل وSEO وAdSense", icon: Settings },
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
    id: "community",
    label: "الحراج والمتجر والدليل",
    desc: "إعلانات السوق، المتجر، دليل رهط، والصيدلية",
    icon: Store,
    keys: ["buses", "ads", "haraj-cats", "store", "directory", "duty", "comments", "reports"],
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
    keys: ["sec-manage", "sec-add", "members-list", "members-roles", "members-invite", "members-methods"],
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
                      const res = await adminLogin({ data: { password, remember } });
                      if (res.ok) {
                        setError("");
                        await onSuccess();
                      } else {
                        setError(res.message ?? tr("كلمة المرور غير صحيحة."));
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
            <DashboardHome
              go={go}
              icons={{ haraj: Megaphone, comments: MessageSquare, news: Newspaper, reports: Flag, members: Users, sold: ShoppingBag, stats: BarChart3 }}
            />
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
          ) : current === "store" ? (
            <StoreAdmin isOwner={level === "owner"} />
          ) : landing ? (
            <GroupLanding group={landing} tabs={tabs} go={go} />
          ) : current.startsWith("set-") ? (
            <SiteSettingsAdmin key={current} only={current.slice(4) as SiteSettingsPart} />
          ) : current === "sec-add" ? (
            <QuickCustomSectionsBar mode="add" currentId="news" onSelectSection={(id) => go(`sec-${id}`)} />
          ) : current === "sec-manage" ? (
            <div className="space-y-4">
              <QuickCustomSectionsBar mode="manage" currentId="news" onSelectSection={(id) => go(`sec-${id}`)} />
              <SectionAdmin key="sec-news" id="news" />
            </div>
          ) : current.startsWith("sec-") ? (
            <SectionAdmin key={current} id={current.slice(4) as "news"} />
          ) : current === "auto" ? (
            <AutoNewsAdmin />
          ) : current === "popups" ? (
            <PopupsAdmin />
          ) : current === "emails" ? (
            <EmailAdmin />
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
          {tr("إعلانات المثال: {0} (تظهر بشارة «مثال» ولا تُفهرس).", items.filter((i) => i.sample).length)}
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
                {l.sample ? <span className="chip">{tr("مثال")}</span> : null}
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
    const cleanStream = matchStreamUrl.trim() || undefined;
    const cleanChan = matchChannel.trim() || undefined;
    const cleanNote = matchNote.trim();
    const combinedNote =
      [
        cleanChan ? `[${cleanChan}]` : "",
        cleanNote,
        cleanStream ?? "",
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

          <div className="flex items-end">
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
                          const chanPrefix = cm.channel ? `[${cm.channel}] ` : "";
                          updateCustomMatch(cm.id, {
                            streamUrl: val || undefined,
                            note: `${chanPrefix}${val}`.trim() || undefined,
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
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateCustomMatch(cm.id, { homeScore: cm.homeScore + 1 })}
                    className="rounded-xl border border-line bg-paper px-2.5 py-1 text-xs font-bold"
                  >
                    +1 {cm.homeTeam}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCustomMatch(cm.id, { awayScore: cm.awayScore + 1 })}
                    className="rounded-xl border border-line bg-paper px-2.5 py-1 text-xs font-bold"
                  >
                    +1 {cm.awayTeam}
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


const QUICK_SECTION_PRESETS: { id: string; name: string; category: string; emoji: string }[] = [
  { id: "seclocal", name: "أخبار محلية", category: "رهط", emoji: "📰" },
  { id: "secrahat", name: "أخبار رهط والنقب", category: "النقب", emoji: "📍" },
  { id: "seclive", name: "بث مباشر المباريات", category: "رياضة", emoji: "🔴" },
  { id: "seccomm", name: "بلدية ومجتمع", category: "بلدية", emoji: "🏛️" },
  { id: "seceduc", name: "تعليم ومدارس", category: "تعليم", emoji: "🎓" },
  { id: "sececon", name: "اقتصاد وأعمال", category: "أعمال", emoji: "💼" },
];

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
  const [name, setName] = useState("");
  const [category, setCategory] = useState("رهط");
  const [home, setHome] = useState(true);
  const [liveTileLabel, setLiveTileLabel] = useState("بث مباريات");
  const [liveTileVisible, setLiveTileVisible] = useState(true);
  const [dirtyLiveTile, setDirtyLiveTile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await adminGetSiteSettings();
    if (res.authed && res.settings) {
      setSiteSettings(res.settings);
      const cfg = (res.settings.quickLinks ?? []).find((q) => q.id === "tilelive");
      if (cfg) {
        setLiveTileLabel(cfg.title || "بث مباريات");
        setLiveTileVisible(cfg.subtitle !== " مَخفي");
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const customSections: QuickCustomSection[] = (siteSettings?.quickLinks ?? [])
    .filter((q) => q.id.startsWith("sec"))
    .map((q) => ({
      id: q.id,
      name: q.title,
      category: q.url.includes("q=") ? decodeURIComponent(q.url.split("q=")[1] ?? "رهط") : "رهط",
      home: q.subtitle !== " مَخفي",
      emoji: q.emoji || "📰",
    }));

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

  const handleAdd = async (preset?: { id: string; name: string; category: string; emoji: string }) => {
    if (!siteSettings) return;
    const targetName = (preset?.name ?? name).trim();
    const targetCat = (preset?.category ?? category).trim() || "رهط";
    const targetEmoji = preset?.emoji ?? "📰";
    const targetId = preset?.id ?? `sec${Date.now().toString(36).replace(/[^a-z0-9]/g, "").slice(-10)}`;
    if (!targetName) {
      setMsg("الرجاء كتابة اسم القسم (مثلاً: أخبار محلية)");
      return;
    }
    const existing = siteSettings.quickLinks.filter((q) => q.id !== targetId);
    const nextLinks: SiteSettings["quickLinks"] = [
      ...existing,
      {
        id: targetId,
        title: targetName,
        subtitle: home ? "قسم في الرئيسية" : " مَخفي",
        url: targetCat === "رياضة" ? "/sports-news" : `/news?q=${encodeURIComponent(targetCat)}`,
        emoji: targetEmoji,
      },
    ];
    await saveQuickLinks(nextLinks, `تمت إضافة القسم «${targetName}» بنجاح ✓`);
    if (!preset) setName("");
  };

  const toggleHome = async (s: QuickCustomSection) => {
    if (!siteSettings) return;
    const nextLinks = siteSettings.quickLinks.map((q) =>
      q.id === s.id
        ? { ...q, subtitle: s.home ? " مَخفي" : "قسم في الرئيسية" }
        : q,
    );
    await saveQuickLinks(nextLinks, s.home ? `تم إخفاء «${s.name}» من الرئيسية` : `تم إظهار «${s.name}» في الصفحة الرئيسية ✓`);
  };

  const removeSec = async (secId: string) => {
    if (!siteSettings || !confirm("حذف هذا القسم؟")) return;
    const nextLinks = siteSettings.quickLinks.filter((q) => q.id !== secId);
    await saveQuickLinks(nextLinks, "تم حذف القسم ✓");
  };

  return (
    <div className="space-y-4">
      {msg ? (
        <div className="rounded-2xl bg-primary-soft/60 px-4 py-2.5 text-xs font-extrabold text-ink">
          {trv(msg)}
        </div>
      ) : null}

      {mode === "add" || mode === "all" ? (
        <div className="rounded-3xl bg-paper p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-2xl bg-brand text-ink">
              <FolderPlus className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-extrabold">{tr("إضافة قسم جديد للموقع والصفحة الرئيسية")}</h2>
              <p className="text-xs font-semibold text-muted">
                {tr("أضف قسماً جديداً (مثل: أخبار محلية، أخبار رهط والنقب، بث مباشر) ليظهر في شريط الأقسام والصفحة الرئيسية والسلايدر.")}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-extrabold text-muted">{tr("إضافة سريعة بضغطة واحدة:")}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {QUICK_SECTION_PRESETS.map((p) => {
                const exists = customSections.some((s) => s.id === p.id && s.home);
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void handleAdd(p)}
                    className={`flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-xs font-extrabold transition ${
                      exists ? "bg-[#16A34A] text-white" : "border border-line bg-surface hover:bg-primary-soft"
                    }`}
                  >
                    {exists ? <Check className="size-3.5" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
                    <span>{p.emoji} {p.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 rounded-2xl bg-surface p-4 sm:grid-cols-3">
            <label className="text-xs font-bold">
              {tr("اسم القسم الجديد")}
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: أخبار محلية"
                className="field mt-1 text-xs"
              />
            </label>
            <label className="text-xs font-bold">
              {tr("تصنيف الأخبار المرتبط")}
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="field mt-1 text-xs"
              >
                <option value="رهط">رهط</option>
                <option value="النقب">النقب</option>
                <option value="بلدية">بلدية</option>
                <option value="تعليم">تعليم</option>
                <option value="صحة">صحة</option>
                <option value="رياضة">رياضة ومباريات</option>
                <option value="مجتمع">مجتمع</option>
                <option value="أعمال">أعمال واقتصاد</option>
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-xl bg-paper px-3 py-2 text-xs font-extrabold sm:mt-5">
              <input
                type="checkbox"
                checked={home}
                onChange={(e) => setHome(e.target.checked)}
                className="size-4 accent-[#16A34A]"
              />
              {tr("إظهار القسم في الصفحة الرئيسية")}
            </label>
          </div>

          {name.trim().length > 0 ? (
            <div className="mt-3 flex justify-end">
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
          ) : null}
        </div>
      ) : null}

      {mode === "manage" || mode === "all" ? (
        <div className="rounded-3xl bg-paper p-5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-2xl bg-primary-soft text-primary-ink">
              <LayoutGrid className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-extrabold">{tr("إدارة الأقسام الحالية وأيقونة «بث مباريات»")}</h2>
              <p className="text-xs font-semibold text-muted">
                {tr("تحكم في إظهار أو إخفاء الأقسام في الصفحة الرئيسية وفي شريط الأيقونات العلوي.")}
              </p>
            </div>
          </div>

          {/* Dedicated control for the "بث مباريات" icon tile in the Homepage top tiles row */}
          <div className="mt-4 rounded-2xl border border-[#DC2626]/30 bg-[#DC2626]/5 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="size-2.5 animate-ping rounded-full bg-[#DC2626]" />
                <p className="text-sm font-extrabold text-ink">
                  {tr("أيقونة قسم «بث مباريات» في شريط الأيقونات العلوي بالرئيسية")}
                </p>
              </div>
              <button
                type="button"
                disabled={busy || !siteSettings}
                onClick={async () => {
                  if (!siteSettings) return;
                  const nextVis = !liveTileVisible;
                  setLiveTileVisible(nextVis);
                  const others = siteSettings.quickLinks.filter((q) => q.id !== "tilelive");
                  await saveQuickLinks(
                    [
                      {
                        id: "tilelive",
                        title: liveTileLabel.trim() || "بث مباريات",
                        subtitle: nextVis ? "قسم في الشريط" : " مَخفي",
                        url: "/sports-news",
                        emoji: "🔴",
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
                    const others = siteSettings.quickLinks.filter((q) => q.id !== "tilelive");
                    await saveQuickLinks(
                      [
                        {
                          id: "tilelive",
                          title: liveTileLabel.trim() || "بث مباريات",
                          subtitle: liveTileVisible ? "قسم في الشريط" : " مَخفي",
                          url: "/sports-news",
                          emoji: "🔴",
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

          <div className="mt-4">
            <p className="mb-2 text-xs font-extrabold text-muted">{tr("الأقسام المضافة وحالة ظهورها في الصفحة الرئيسية:")}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {customSections.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-xs font-bold"
                >
                  <span className="font-extrabold">{s.emoji} {s.name}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void toggleHome(s)}
                      className={`rounded-xl px-2.5 py-1 text-[11px] font-extrabold text-white ${
                        s.home ? "bg-[#16A34A]" : "bg-muted"
                      }`}
                    >
                      {s.home ? tr("في الرئيسية ✓") : tr("مخفي")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeSec(s.id)}
                      className="grid size-7 place-items-center rounded-lg border border-line bg-paper text-[#DC2626] hover:opacity-80"
                      title={tr("حذف القسم")}
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 border-t border-line pt-3">
            <p className="mb-2 text-xs font-extrabold text-muted">{tr("إدارة مصادر الأقسام الأساسية:")}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[
                { id: "news", label: "الأخبار المحلية" },
                { id: "israel", label: "أخبار إسرائيل" },
                { id: "sports", label: "الرياضة" },
                { id: "tech", label: "التقنية" },
                { id: "weather", label: "الطقس" },
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onSelectSection(b.id)}
                  className={`rounded-2xl border px-3 py-2.5 text-xs font-extrabold transition ${
                    currentId === b.id ? "border-ink bg-ink text-paper" : "border-line bg-surface hover:bg-primary-soft"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
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
type BottomBarStyleKey = "classic" | "floating" | "dark" | "dock" | "minimal" | "hidden";
type BarBtnItem = { icon: string; label: string; to: string };

const DEFAULT_TOP_BAR_BTNS: BarBtnItem[] = [
  { icon: "news", label: "الأخبار", to: "/news" },
  { icon: "tv", label: "بث مباريات", to: "/sports-news" },
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
  { key: "cpu", label: "💻 تقنية" },
  { key: "plus", label: "➕ إضافة" },
];

function parseSliderConfig(quickLinks: SiteSettings["quickLinks"]): {
  size: SliderSizeKey;
  sections: string[];
  ampAds: boolean;
} {
  const item = (quickLinks ?? []).find((q) => q.id === "slidercfg");
  const raw = item?.subtitle ?? "";
  const titleFlags = item?.title ?? "";
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
  return { size, sections, ampAds };
}

function encodeSliderConfig(
  quickLinks: SiteSettings["quickLinks"],
  size: SliderSizeKey,
  sections: string[],
  ampAds?: boolean,
): SiteSettings["quickLinks"] {
  const current = parseSliderConfig(quickLinks);
  const nextAmp = ampAds !== undefined ? ampAds : current.ampAds;
  const others = (quickLinks ?? []).filter((q) => q.id !== "slidercfg");
  const sub = `size:${size}|secs:${sections.join(",")}`.slice(0, 100);
  return [
    ...others,
    {
      id: "slidercfg",
      title: `amp:${nextAmp ? "1" : "0"}`,
      subtitle: sub,
      url: "/",
      emoji: "🎞️",
    },
  ];
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
    const to = colon > 0 ? p.slice(colon + 1) : p;
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
    rawStyle === "hidden"
      ? rawStyle
      : "classic";
  const labels = (item.subtitle ?? "").split("|");
  const pairs = item.url.slice(7).split("|").filter(Boolean);
  const btns: BarBtnItem[] = pairs.map((p, idx) => {
    const colon = p.indexOf(":");
    const icon = colon > 0 ? p.slice(0, colon) : "home";
    const to = colon > 0 ? p.slice(colon + 1) : p;
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
      {part === "home" ? (
        <SettingsCard title={tr("أقسام الصفحة الرئيسية")} hint={tr("أظهر أو أخفِ الأقسام ورتّبها بالأسهم.")}>
          <ToggleList list={s.home} labels={HOME_SECTIONS} onChange={(home) => set({ home })} />
        </SettingsCard>
      ) : null}
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
    (l) => l.id === "tilelive" || l.id === "slidercfg" || l.id === "topbarcfg" || l.id === "botbarcfg" || l.id.startsWith("sec"),
  );
  const userLinks = (s.quickLinks ?? []).filter(
    (l) => l.id !== "tilelive" && l.id !== "slidercfg" && l.id !== "topbarcfg" && l.id !== "botbarcfg" && !l.id.startsWith("sec"),
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

  return (
    <div className="space-y-4">
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
            {QUICK_PRESET_DESTINATIONS.filter((d) => d.to !== "/").map((preset) => {
              const exists = topBtns.some((b) => b.to === preset.to && b.label === preset.label);
              return (
                <button
                  key={`${preset.to}-${preset.label}`}
                  type="button"
                  onClick={() => {
                    if (exists) {
                      updateTop(topBtns.filter((b) => !(b.to === preset.to && b.label === preset.label)));
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

      {/* 2. Bottom Bar Styles / Shapes */}
      <SettingsCard
        title={tr("2. أشكال وتصاميم البار السفلي (اختر شكل البار السفلي)")}
        hint={tr("يمكنك تغيير شكل وتصميم البار السفلي للهواتف بين 5 أشكال احترافية أو إخفاؤه.")}
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
                key: "hidden",
                label: "إخفاء البار السفلي",
                desc: "إلغاء إظهار البار السفلي في الموقع",
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
      </SettingsCard>

      {/* 3. Bottom Bar Buttons Add / Remove / Reorder */}
      <SettingsCard
        title={tr("3. أزرار البار السفلي (إضافة أزرار، إلغاء أزرار، وترتيبها)")}
        hint={tr("تحكّم في كل زر يظهر في البار السفلي: يمكنك إلغاء أي زر أو إضافة زر جديد أو تغيير اسمه وأيقونته.")}
      >
        <ul className="space-y-2">
          {botCfg.btns.map((btn, idx) => (
            <li
              key={`${btn.to}-${idx}`}
              className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface/60 p-2.5"
            >
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
            {QUICK_PRESET_DESTINATIONS.map((preset) => {
              const exists = botCfg.btns.some((b) => b.to === preset.to && b.label === preset.label);
              return (
                <button
                  key={`${preset.to}-${preset.label}`}
                  type="button"
                  onClick={() => {
                    if (exists) {
                      updateBot(
                        botCfg.style,
                        botCfg.btns.filter((b) => !(b.to === preset.to && b.label === preset.label)),
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
