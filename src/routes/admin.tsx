import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronLeft,
  ClipboardCheck,
  CloudSun,
  Cpu,
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
  Rss,
  Settings,
  ShieldX,
  ShoppingBag,
  Siren,
  Sparkles,
  Store,
  Trophy,
  Type,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { PhotoStrip } from "@/components/photo-picker";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { AuthLayout } from "@/components/auth-layout";
import { priceLabel, STATUS_LABEL, type ListingStatus, type OwnListing } from "@/lib/market/types";
import { adminDecide, adminList, adminLogin, adminLogout } from "@/lib/directory/api";
import type { BusinessSubmission } from "@/lib/directory/types";
import { adminWhoami } from "@/lib/team/api";
import type { AdminLevel } from "@/lib/admin-auth";
import { type OwnReaderNews, type ReaderNewsStatus } from "@/lib/reader-news/types";
import { tr, trv } from "@/lib/i18n/core";
import { AdminSearch, CardBoundary, DashboardHome, ReviewQueue, Skeleton } from "@/components/admin/admin-v2";
import type { SiteSettingsPart } from "@/components/admin/site-settings-admin";
import { LangSwitcher } from "@/components/lang-switcher";

const SiteSettingsAdmin = lazy(() => import("@/components/admin/site-settings-admin").then((m) => ({ default: m.SiteSettingsAdmin })));
const AutoNewsAdmin = lazy(() => import("@/components/admin/auto-news-admin").then((m) => ({ default: m.AutoNewsAdmin })));
const SectionAdmin = lazy(() => import("@/components/admin/section-admin").then((m) => ({ default: m.SectionAdmin })));
const PublishAdmin = lazy(() => import("@/components/admin/publish-admin").then((m) => ({ default: m.PublishAdmin })));
const MatchesAdmin = lazy(() => import("@/components/matches").then((m) => ({ default: m.MatchesAdmin })));
const MembersAdmin = lazy(() => import("@/components/admin/members-admin").then((m) => ({ default: m.MembersAdmin })));
const EmailAdmin = lazy(() => import("@/components/admin/email-admin").then((m) => ({ default: m.EmailAdmin })));
const PopupsAdmin = lazy(() => import("@/components/admin/popups-admin").then((m) => ({ default: m.PopupsAdmin })));
const LanguagesAdmin = lazy(() => import("@/components/admin/languages-admin").then((m) => ({ default: m.LanguagesAdmin })));
const GeminiAdmin = lazy(() => import("@/components/admin/gemini-admin").then((m) => ({ default: m.GeminiAdmin })));
const StatsAdmin = lazy(() => import("@/components/admin/stats-admin").then((m) => ({ default: m.StatsAdmin })));
const StoreAdmin = lazy(() => import("@/components/admin/store-admin").then((m) => ({ default: m.StoreAdmin })));
const CommentsAdmin = lazy(() => import("@/components/admin/moderation-tabs").then((m) => ({ default: m.CommentsAdmin })));
const ReportsAdmin = lazy(() => import("@/components/admin/moderation-tabs").then((m) => ({ default: m.ReportsAdmin })));
const DutyAdmin = lazy(() => import("@/components/admin/moderation-tabs").then((m) => ({ default: m.DutyAdmin })));
const AlertsAdmin = lazy(() => import("@/components/admin/moderation-tabs").then((m) => ({ default: m.AlertsAdmin })));
const PushAdmin = lazy(() => import("@/components/admin/moderation-tabs").then((m) => ({ default: m.PushAdmin })));
const HarajCategoriesAdmin = lazy(() => import("@/components/admin/moderation-tabs").then((m) => ({ default: m.HarajCategoriesAdmin })));
const AdsAdmin = lazy(() => import("@/components/admin/moderation-tabs").then((m) => ({ default: m.AdsAdmin })));
const NewsAdmin = lazy(() => import("@/components/admin/moderation-tabs").then((m) => ({ default: m.NewsAdmin })));

const adminGate = createServerFn({ method: "GET" }).handler(async (): Promise<{ denied: boolean }> => {
  try {
    const { getAdminAccess } = await import("@/lib/admin-auth");
    if (await getAdminAccess()) return { denied: false };
    const { getSessionUser } = await import("@/lib/auth/verify.server");
    const u = await getSessionUser();
    return { denied: Boolean(u) };
  } catch {
    return { denied: false };
  }
});

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: tr("لوحة التحكم · رهط بوست") },
      { name: "robots", content: "noindex, nofollow" },
    ],
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
              const h = new Headers(result.response.headers);
              h.set("cache-control", "private, no-store");
              return { ...result, response: new Response(result.response.body, { status: 403, headers: h }) };
            }
          }
        } catch {
          // ignore
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
  { key: "matches", label: "نتائج المباريات والليغا", icon: Trophy },
  { key: "sec-news", label: "إدارة الأقسام (+ إضافة قسم)", icon: FolderPlus },
  { key: "auto", label: "الأخبار التلقائية", icon: Rss },
  { key: "news", label: "أخبار القراء", icon: Newspaper },
  { key: "comments", label: "التعليقات", icon: MessageSquare },
  { key: "sec-israel", label: "أخبار إسرائيل", icon: Rss },
  { key: "sec-sports", label: "أخبار الرياضة (RSS)", icon: Trophy },
  { key: "sec-tech", label: "أخبار تقنية", icon: Cpu },
  { key: "sec-weather", label: "الطقس", icon: CloudSun },
  { key: "ads", label: "إعلانات الحراج", icon: Megaphone },
  { key: "haraj-cats", label: "تصنيفات الحراج", icon: LayoutGrid },
  { key: "reports", label: "البلاغات", icon: Flag },
  { key: "directory", label: "طلبات الدليل التجاري", icon: Store },
  { key: "duty", label: "صيدلية المناوبة", icon: Pill },
  { key: "store", label: "إدارة المتجر", icon: ShoppingBag },
  { key: "members-list", label: "قائمة الأعضاء", icon: Users },
  { key: "members-roles", label: "الأدوار والصلاحيات", icon: BadgeCheck },
  { key: "members-invite", label: "دعوة عضو للفريق", icon: UserPlus },
  { key: "members-methods", label: "طرق تسجيل الدخول", icon: KeyRound },
  { key: "alerts", label: "شريط التنبيهات العاجلة", icon: Siren },
  { key: "push", label: "إشعارات الهواتف (Push)", icon: Bell },
  { key: "popups", label: "النوافذ الترويجية", icon: MonitorUp },
  { key: "emails", label: "قوالب البريد الإلكتروني", icon: Mail },
  { key: "set-home", label: "ترتيب الصفحة الرئيسية", icon: LayoutGrid },
  { key: "set-menus", label: "القوائم والأيقونات", icon: Menu },
  { key: "set-texts", label: "الهوية والنصوص والشعار", icon: Type },
  { key: "set-theme", label: "المظهر والألوان", icon: Palette },
  { key: "set-slider", label: "السلايدر الرئيسي", icon: GalleryHorizontal },
  { key: "set-links", label: "الروابط السريعة", icon: Link2 },
  { key: "set-google", label: "خدمات جوجل والسيو", icon: Settings },
  { key: "languages", label: "اللغات والترجمة", icon: Globe },
  { key: "gemini", label: "الذكاء الاصطناعي (Gemini)", icon: Sparkles },
];

const GROUPS: { id: string; label: string; icon: LucideIcon; keys: Section[] }[] = [
  { id: "main", label: "لوحة المتابعة", icon: House, keys: ["home", "review", "stats"] },
  {
    id: "content",
    label: "الأخبار والأقسام والمباريات",
    icon: Newspaper,
    keys: ["publish", "matches", "sec-news", "auto", "news", "comments", "sec-israel", "sec-sports", "sec-tech", "sec-weather"],
  },
  { id: "haraj", label: "الحراج والخدمات", icon: Megaphone, keys: ["ads", "haraj-cats", "directory", "duty", "reports", "store"] },
  {
    id: "settings",
    label: "تنظيم المظهر والموقع",
    icon: LayoutGrid,
    keys: ["set-home", "set-menus", "set-texts", "set-theme", "set-slider", "set-links", "languages", "gemini"],
  },
  { id: "marketing", label: "التنبيهات والتسويق", icon: Bell, keys: ["alerts", "push", "popups", "emails", "set-google"] },
  { id: "members", label: "الفريق والأعضاء", icon: Users, keys: ["members-list", "members-roles", "members-invite", "members-methods"] },
];

const groupItems = (g: (typeof GROUPS)[number], tabs: typeof ALL_TABS) =>
  g.keys.map((k) => tabs.find((t) => t.key === k)).filter((t): t is (typeof ALL_TABS)[number] => Boolean(t));

function GroupLanding({ group, tabs, go }: { group: (typeof GROUPS)[number]; tabs: typeof ALL_TABS; go: (k: string) => void }) {
  return (
    <ul className="flex flex-col gap-2">
      {groupItems(group, tabs).map(({ key, label, icon: Icon }) => (
        <li key={key}>
          <button type="button" onClick={() => go(key)} className="flex w-full items-center gap-3 rounded-3xl bg-paper p-4 text-start shadow-[0_1px_3px_rgba(16,24,40,0.06)] active:scale-[0.99]">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary-ink"><Icon className="size-5" aria-hidden /></span>
            <span className="min-w-0 flex-1 font-bold">{trv(label)}</span>
            <ChevronLeft className="size-5 text-muted ltr:rotate-180" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
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
  const activeGroup = GROUPS.find((g) => g.keys.includes(section))?.id ?? "main";
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ [activeGroup]: true, main: true, content: true });

  useEffect(() => {
    if (activeGroup) setExpanded((prev) => ({ ...prev, [activeGroup]: true }));
  }, [activeGroup]);

  return (
    <nav aria-label={tr("أقسام الإدارة")} className="flex flex-col gap-2">
      {/* Primary Quick Actions at Top of Sidebar */}
      <div className="grid grid-cols-1 gap-2 pb-2 border-b border-line">
        {tabs.some((t) => t.key === "publish") ? (
          <button
            type="button"
            aria-current={section === "publish" ? "page" : undefined}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-[#16A34A] px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#15803D] ${
              section === "publish" ? "ring-2 ring-[#16A34A]/40 ring-offset-2" : ""
            }`}
            onClick={() => onSelect("publish")}
          >
            <PenSquare className="size-4 shrink-0" aria-hidden />
            {tr("نشر خبر جديد")}
          </button>
        ) : null}
        {tabs.some((t) => t.key === "matches") ? (
          <button
            type="button"
            aria-current={section === "matches" ? "page" : undefined}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-2.5 text-sm font-bold text-paper shadow-xs transition hover:opacity-90 ${
              section === "matches" ? "ring-2 ring-ink/30 ring-offset-2" : ""
            }`}
            onClick={() => onSelect("matches")}
          >
            <Trophy className="size-4 shrink-0" aria-hidden />
            {tr("نتائج المباريات والليغا")}
          </button>
        ) : null}
        {tabs.some((t) => t.key === "sec-news") ? (
          <button
            type="button"
            aria-current={section === "sec-news" ? "page" : undefined}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-2.5 text-sm font-bold text-ink shadow-xs transition hover:opacity-90 ${
              section === "sec-news" ? "ring-2 ring-ink/30 ring-offset-2" : ""
            }`}
            onClick={() => onSelect("sec-news")}
          >
            <FolderPlus className="size-4 shrink-0" aria-hidden />
            {tr("إضافة وتعديل الأقسام")}
          </button>
        ) : null}
      </div>

      {/* Organized Collapsible Groups */}
      <div className="flex flex-col gap-1">
        {GROUPS.map((g) => {
          const items = groupItems(g, tabs);
          if (!items.length) return null;
          const active = g.keys.includes(section);
          const isOpen = Boolean(expanded[g.id]);
          const Icon = g.icon;
          return (
            <div key={g.id} className="rounded-2xl bg-surface/50 p-1">
              <button
                type="button"
                aria-expanded={isOpen}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm font-extrabold transition-colors ${
                  active ? "bg-paper text-ink shadow-2xs" : "text-ink/80 hover:bg-paper/60"
                }`}
                onClick={() => {
                  setExpanded((prev) => ({ ...prev, [g.id]: !isOpen }));
                  if (!active) onSelect(items[0].key);
                }}
              >
                <Icon className="size-4 shrink-0 text-primary-ink" aria-hidden />
                <span className="flex-1 truncate">{trv(g.label)}</span>
                <ChevronDown className={`size-4 shrink-0 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
              </button>
              {isOpen ? (
                <ul className="mt-1 flex flex-col gap-0.5 ps-2">
                  {items.map((item) => {
                    const SubIcon = item.icon;
                    const subActive = section === item.key;
                    return (
                      <li key={item.key}>
                        <button
                          type="button"
                          aria-current={subActive ? "page" : undefined}
                          onClick={() => onSelect(item.key)}
                          className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start text-xs font-bold transition ${
                            subActive ? "bg-brand text-ink shadow-2xs" : "text-muted hover:bg-paper hover:text-ink"
                          }`}
                        >
                          <SubIcon className="size-3.5 shrink-0" aria-hidden />
                          <span className="flex-1 truncate">{trv(item.label)}</span>
                          {item.key === "review" && reviewCount ? (
                            <span className="rounded-full bg-alert px-1.5 py-0.5 text-[10px] font-extrabold text-white">
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
        className="mt-2 flex w-full items-center gap-3 rounded-2xl border border-line px-3 py-2.5 text-start text-sm font-bold text-muted hover:bg-surface hover:text-ink"
        onClick={onLogout}
      >
        <LogOut className="size-[18px] shrink-0" aria-hidden />
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
          className={`absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col gap-3 overflow-y-auto bg-paper p-4 shadow-2xl transition-transform duration-200 ${
            menuOpen ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-sm font-bold text-muted">
              <ArrowRight className="size-4 rtl:rotate-0 ltr:rotate-180" aria-hidden />
              {tr("العودة للموقع")}
            </Link>
            <button type="button" className="grid size-9 place-items-center rounded-xl bg-surface" aria-label={tr("إغلاق")} onClick={() => setMenuOpen(false)}>
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <AdminMenu tabs={tabs} section={current} reviewCount={reviewCount} onSelect={go} onLogout={logout} />
        </div>
      </div>
    </div>
  );
}
export const __unused = { notFound, priceLabel, STATUS_LABEL };
export type { ListingStatus, OwnListing, OwnReaderNews, ReaderNewsStatus };
