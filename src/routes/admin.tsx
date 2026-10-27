import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BadgeCheck,
  BarChart3,
  Bell,
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
  ShieldX,
  ShoppingBag,
  Siren,
  Sparkles,
  Star,
  Store,
  Trash2,
  Trophy,
  Type,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { PhotoStrip } from "@/components/photo-picker";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
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

const CommentsAdmin = lazy(() => import("@/components/admin/comments-admin").then((m) => ({ default: m.CommentsAdmin })));
const AlertsAdmin = lazy(() => import("@/components/admin/content-admin").then((m) => ({ default: m.AlertsAdmin })));
const DutyAdmin = lazy(() => import("@/components/admin/content-admin").then((m) => ({ default: m.DutyAdmin })));
const PushAdmin = lazy(() => import("@/components/admin/content-admin").then((m) => ({ default: m.PushAdmin })));
const ReportsAdmin = lazy(() => import("@/components/admin/content-admin").then((m) => ({ default: m.ReportsAdmin })));
const HarajCategoriesAdmin = lazy(() => import("@/components/admin/haraj-categories-admin").then((m) => ({ default: m.HarajCategoriesAdmin })));
const AutoNewsAdmin = lazy(() => import("@/components/admin/auto-news-admin").then((m) => ({ default: m.AutoNewsAdmin })));
const SectionAdmin = lazy(() => import("@/components/admin/section-admin").then((m) => ({ default: m.SectionAdmin })));
const SiteSettingsAdmin = lazy(() => import("@/components/admin/site-settings-admin").then((m) => ({ default: m.SiteSettingsAdmin })));
const MembersAdmin = lazy(() => import("@/components/admin/members-admin").then((m) => ({ default: m.MembersAdmin })));
const PopupsAdmin = lazy(() => import("@/components/admin/popups-admin").then((m) => ({ default: m.PopupsAdmin })));
const EmailAdmin = lazy(() => import("@/components/admin/email-admin").then((m) => ({ default: m.EmailAdmin })));
const PublishAdmin = lazy(() => import("@/components/admin/publish-admin").then((m) => ({ default: m.PublishAdmin })));
const StoreAdmin = lazy(() => import("@/components/admin/store-admin").then((m) => ({ default: m.StoreAdmin })));
const StatsAdmin = lazy(() => import("@/components/admin/stats-admin").then((m) => ({ default: m.StatsAdmin })));
const LanguagesAdmin = lazy(() => import("@/components/admin/languages-admin").then((m) => ({ default: m.LanguagesAdmin })));
const GeminiAdmin = lazy(() => import("@/components/admin/gemini-admin").then((m) => ({ default: m.GeminiAdmin })));

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
  | "duty"
  | "alerts"
  | "push"
  | "languages"
  | "gemini"
  | "sec-news"
  | "sec-israel"
  | "sec-sports"
  | "sec-tech"
  | "sec-weather";

const ALL_TABS: { key: Section; label: string; icon: LucideIcon }[] = [
  { key: "home", label: "نظرة عامة", icon: House },
  { key: "review", label: "طابور المراجعة", icon: ClipboardCheck },
  { key: "stats", label: "الإحصائيات والزوار", icon: BarChart3 },
  { key: "publish", label: "نشر خبر جديد", icon: PenSquare },
  { key: "sec-news", label: "إدارة الأقسام (+ إضافة قسم)", icon: FolderPlus },
  { key: "matches", label: "المباريات والدوريات (الليغا)", icon: Trophy },
  { key: "auto", label: "الجلب التلقائي والترجمة", icon: Rss },
  { key: "news", label: "أخبار القراء", icon: Newspaper },
  { key: "sec-israel", label: "أخبار إسرائيل", icon: Globe },
  { key: "sec-sports", label: "أخبار الرياضة", icon: Trophy },
  { key: "sec-tech", label: "أخبار التقنية", icon: Cpu },
  { key: "sec-weather", label: "حالة الطقس", icon: CloudSun },
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
    desc: "ملخص الموقع والمراجعات والإحصائيات",
    icon: House,
    keys: ["home", "review", "stats"],
  },
  {
    id: "editorial",
    label: "الأخبار والأقسام والمباريات",
    desc: "نشر الأخبار، إضافة أقسام، وجدول المباريات والليغا",
    icon: Newspaper,
    keys: ["publish", "sec-news", "matches", "auto", "news", "sec-israel", "sec-sports", "sec-tech", "sec-weather"],
  },
  {
    id: "community",
    label: "الحراج والمتجر والدليل",
    desc: "إعلانات السوق، المتجر، دليل رهط، والصيدلية",
    icon: Store,
    keys: ["ads", "haraj-cats", "store", "directory", "duty", "comments", "reports"],
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
    label: "الفريق والأعضاء",
    desc: "إدارة المشرفين والكتّاب والأعضاء",
    icon: Users,
    keys: ["members-list", "members-roles", "members-invite", "members-methods"],
  },
  {
    id: "settings",
    label: "تصميم وإعدادات الموقع",
    desc: "ترتيب الصفحة الرئيسية، القوائم، الألوان، واللغات",
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

        {tabs.some((t) => t.key === "sec-news") ? (
          <button
            type="button"
            aria-current={section === "sec-news" ? "page" : undefined}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-extrabold transition-colors ${
              section.startsWith("sec-")
                ? "bg-ink text-paper"
                : "bg-brand text-ink hover:opacity-90"
            }`}
            onClick={() => onSelect("sec-news")}
          >
            <FolderPlus className="size-4 shrink-0" aria-hidden />
            {tr("+ إضافة / إدارة قسم")}
          </button>
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

  if (gate.denied || (state === "login" && who.signedIn)) {
    return (
      <AuthLayout title={tr("عذراً، لا تملك صلاحية الدخول إلى لوحة التحكم")} subtitle={tr("لوحة الإدارة لأعضاء الفريق الذين منحهم مالك الموقع صلاحية من قسم الأعضاء.")}>
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-primary-soft text-primary-ink" aria-hidden>
          <ShieldX className="size-8" />
        </div>
        <Link to="/" className="btn">{tr("العودة إلى الصفحة الرئيسية")}</Link>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={async () => {
            const { authClient } = await import("@/lib/auth/client");
            await authClient.signOut().catch(() => {});
            window.location.href = "/login?redirect=%2Fadmin";
          }}
        >
          {tr("تسجيل الخروج أو التبديل إلى حساب آخر")}
        </button>
      </AuthLayout>
    );
  }

  if (state === "login") {
    return (
      <AuthLayout title={tr("لوحة الإدارة")} subtitle={tr("دخول المالك بكلمة المرور، أو أعضاء الفريق بحساباتهم.")}>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const fd = new FormData(event.currentTarget);
            const password = String(fd.get("password") ?? "");
            const res = await adminLogin({ data: { password, remember: fd.get("remember") === "on" } });
            if (res.ok) {
              setError("");
              await refresh();
            } else setError(res.message ?? tr("تعذّر الدخول."));
          }}
        >
          <label className="block font-bold">
            {tr("كلمة المرور")}
            <input type="text" name="username" value="admin" autoComplete="username" readOnly hidden />
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="field mt-1"
              dir="ltr"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" name="remember" defaultChecked className="size-5 accent-[#FDB700]" />
            {tr("تذكرني (30 يوماً)")}
          </label>
          {error ? <p className="font-bold">{trv(error)}</p> : null}
          <button type="submit" className="btn">
            {tr("دخول")}
          </button>
        </form>
        <div className="mt-2 flex flex-col gap-2 border-t border-line pt-4">
          <p className="font-bold">{tr("أعضاء الفريق (مشرف / كاتب)")}</p>
          {who.signedIn ? (
            <p className="font-semibold text-muted">
              {tr("حسابك ليس له صلاحية في لوحة الإدارة. اطلب من مالك الموقع إضافتك.")}
            </p>
          ) : (
            <a className="btn btn-ghost" href="/login?redirect=%2Fadmin">
              {tr("دخول أعضاء الفريق بحساباتهم")}
            </a>
          )}
        </div>
      </AuthLayout>
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
              {level === "owner" ? (
                <>
                  <button
                    type="button"
                    onClick={() => go("matches")}
                    className="hidden sm:flex items-center gap-1.5 rounded-2xl bg-ink px-3.5 py-2 text-xs font-extrabold text-paper shadow-2xs transition hover:opacity-90"
                  >
                    <Trophy className="size-4" aria-hidden />
                    {tr("نتائج المباريات والليغا")}
                  </button>
                  <button
                    type="button"
                    onClick={() => go("sec-news")}
                    className="hidden sm:flex items-center gap-1.5 rounded-2xl bg-brand px-3.5 py-2 text-xs font-extrabold text-ink shadow-2xs transition hover:opacity-90"
                  >
                    <FolderPlus className="size-4" aria-hidden />
                    {tr("إضافة قسم جديد")}
                  </button>
                </>
              ) : null}
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

          {level !== "writer" ? (
            <div className="mb-4">
              <AdminSearch sections={tabs.map((t) => ({ key: t.key, label: t.label }))} go={go} />
            </div>
          ) : null}
          {curGroup && groupItems(curGroup, tabs).length > 1 ? (
            <div className="scroll-row -mx-4 mb-4 px-4 lg:mx-0 lg:px-0" role="tablist" aria-label={trv(curGroup.label)}>
              {groupItems(curGroup, tabs).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={current === key}
                  onClick={() => go(key)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition ${
                    current === key ? "bg-ink text-paper shadow-xs" : "bg-paper shadow-[0_1px_3px_rgba(16,24,40,0.06)] hover:bg-primary-soft"
                  }`}
                >
                  <Icon className="size-4" aria-hidden />
                  {trv(label)}
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
          ) : current.startsWith("sec-") ? (
            <SectionAdmin key={current} id={current.slice(4)} />
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
    const item: CustomMatch = {
      id: `cm-${Date.now()}`,
      leagueId: matchLeagueId.trim() || "local.negev",
      leagueNameAr: matchLeagueName.trim() || "مباريات رهط والنقب",
      homeTeam: homeTeam.trim(),
      awayTeam: awayTeam.trim(),
      homeScore: Number(homeScore) || 0,
      awayScore: Number(awayScore) || 0,
      kickoff: kickoff.trim() || "20:00",
      dateOffset,
      status: matchStatus,
      minute: matchMinute.trim() || undefined,
      note: matchNote.trim() || undefined,
    };
    const next: MatchesSettings = {
      ...settings,
      customMatches: [item, ...settings.customMatches],
    };
    void save(next, `تمت إضافة مباراة «${item.homeTeam} ضد ${item.awayTeam}» ✓`);
    setHomeTeam("");
    setAwayTeam("");
    setHomeScore(0);
    setAwayScore(0);
    setMatchMinute("");
    setMatchNote("");
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
        <h3 className="text-base font-extrabold">{tr("إضافة مباراة يدوية (فرق رهط والنقب أو مباريات خاصة)")}</h3>
        <p className="mb-4 text-xs font-semibold text-muted">
          {tr("يمكنك إضافة مباريات فرق رهط والنقب (مثل شباب رهط، هبوعيل رهط، أو البطولات المحلية) وتحديث نتيجتها مباشرة.")}
        </p>

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

          <div className="flex items-end">
            <button
              type="button"
              onClick={addCustomMatch}
              className="btn flex w-full items-center justify-center gap-1.5 py-2.5 text-xs"
            >
              <Plus className="size-4" aria-hidden />
              {tr("إضافة المباراة للجدول")}
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
                <div>
                  <span className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-bold text-muted">
                    {cm.leagueNameAr} · {cm.kickoff}
                  </span>
                  <p className="mt-1 text-sm font-extrabold">
                    {cm.homeTeam} <span className="mx-1 text-primary-ink">({cm.homeScore} - {cm.awayScore})</span> {cm.awayTeam}
                  </p>
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
