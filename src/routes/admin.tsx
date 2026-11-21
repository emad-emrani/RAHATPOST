import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpToLine,
  BarChart3,
  Bell,
  Bus,
  Check,
  ClipboardCheck,
  Eye,
  EyeOff,
  Flag,
  GalleryHorizontal,
  Globe,
  House,
  LayoutGrid,
  Link2,
  Lock,
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
  RefreshCw,
  Rss,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Siren,
  Sparkles,
  Store,
  Tag,
  Type,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/shell";
import { AuthLayout } from "@/components/auth-layout";
import { CardBoundary, Skeleton } from "@/components/admin/admin-v2";
import { adminLogin, adminLogout } from "@/lib/directory/api";
import { adminGate, adminWhoami } from "@/lib/team/api";
import type { AdminLevel } from "@/lib/admin-auth";
import {
  adminGetSiteSettings,
  adminSaveSiteSettings,
} from "@/lib/site-settings/api";
import { broadcastSiteSettingsUpdate } from "@/lib/site-settings/context";
import {
  HOME_SECTIONS,
  syncHomeOrderToSliderCfg,
  type HomeSectionId,
  type SiteSettings,
} from "@/lib/site-settings/types";
import { CityAdminPanelEmbedded, useRahatCityState } from "@/components/rahat-city-3d";
import { tr, trv } from "@/lib/i18n/core";

/* ----------------------------------------------------------- Lazy Admin Modules */
const DashboardHome = lazy(() =>
  import("@/components/admin/admin-v2").then((m) => ({ default: m.DashboardHome })),
);
const ReviewQueue = lazy(() =>
  import("@/components/admin/admin-v2").then((m) => ({ default: m.ReviewQueue })),
);
const AdminSearch = lazy(() =>
  import("@/components/admin/admin-v2").then((m) => ({ default: m.AdminSearch })),
);
const SiteSettingsAdmin = lazy(() =>
  import("@/components/admin/site-settings-admin").then((m) => ({
    default: m.SiteSettingsAdmin,
  })),
);
const PublishAdmin = lazy(() =>
  import("@/components/admin/publish-admin").then((m) => ({ default: m.PublishAdmin })),
);
const AutoNewsAdmin = lazy(() =>
  import("@/components/admin/auto-news-admin").then((m) => ({ default: m.AutoNewsAdmin })),
);
const SectionAdmin = lazy(() =>
  import("@/components/admin/section-admin").then((m) => ({ default: m.SectionAdmin })),
);
const DutyAdmin = lazy(() =>
  import("@/components/admin/content-admin").then((m) => ({ default: m.DutyAdmin })),
);
const AnnounceBarAdmin = lazy(() =>
  import("@/components/admin/content-admin").then((m) => ({ default: m.AnnounceBarAdmin })),
);
const AlertsAdmin = lazy(() =>
  import("@/components/admin/content-admin").then((m) => ({ default: m.AlertsAdmin })),
);
const ReportsAdmin = lazy(() =>
  import("@/components/admin/content-admin").then((m) => ({ default: m.ReportsAdmin })),
);
const PushAdmin = lazy(() =>
  import("@/components/admin/content-admin").then((m) => ({ default: m.PushAdmin })),
);
const BusLinesAdmin = lazy(() =>
  import("@/components/admin/bus-admin").then((m) => ({ default: m.BusLinesAdmin })),
);
const StoreAdmin = lazy(() =>
  import("@/components/admin/store-admin").then((m) => ({ default: m.StoreAdmin })),
);
const HarajCategoriesAdmin = lazy(() =>
  import("@/components/admin/haraj-categories-admin").then((m) => ({
    default: m.HarajCategoriesAdmin,
  })),
);
const CommentsAdmin = lazy(() =>
  import("@/components/admin/comments-admin").then((m) => ({ default: m.CommentsAdmin })),
);
const PopupsAdmin = lazy(() =>
  import("@/components/admin/popups-admin").then((m) => ({ default: m.PopupsAdmin })),
);
const MembersAdmin = lazy(() =>
  import("@/components/admin/members-admin").then((m) => ({ default: m.MembersAdmin })),
);
const LanguagesAdmin = lazy(() =>
  import("@/components/admin/languages-admin").then((m) => ({ default: m.LanguagesAdmin })),
);
const EmailAdmin = lazy(() =>
  import("@/components/admin/email-admin").then((m) => ({ default: m.EmailAdmin })),
);
const GeminiAdmin = lazy(() =>
  import("@/components/admin/gemini-admin").then((m) => ({ default: m.GeminiAdmin })),
);
const StatsAdmin = lazy(() =>
  import("@/components/admin/stats-admin").then((m) => ({ default: m.StatsAdmin })),
);

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: tr("لوحة التحكم · رهط بوست") },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: () => adminGate(),
  component: AdminPage,
});

/* ----------------------------------------------------------- Navigation Catalog */

type NavTab = {
  key: string;
  label: string;
  icon: LucideIcon;
  ownerOnly?: boolean;
};

type NavGroup = {
  id: string;
  title: string;
  items: NavTab[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "home",
    title: "الواجهة والترتيب",
    items: [
      { key: "dashboard", label: "نظرة عامة", icon: House },
      { key: "home-order", label: "ترتيب أقسام الرئيسية", icon: LayoutGrid, ownerOnly: true },
      { key: "menus", label: "القوائم والأيقونات", icon: Menu, ownerOnly: true },
      { key: "theme", label: "الألوان والمظهر", icon: Palette, ownerOnly: true },
      { key: "texts", label: "النصوص والشعار", icon: Type, ownerOnly: true },
      { key: "slider", label: "السلايدر الرئيسي", icon: GalleryHorizontal, ownerOnly: true },
      { key: "links", label: "روابط سريعة", icon: Link2, ownerOnly: true },
      { key: "announce", label: "شريط أعلى الموقع", icon: Megaphone, ownerOnly: true },
      { key: "popups", label: "النوافذ المنبثقة", icon: MonitorUp, ownerOnly: true },
    ],
  },
  {
    id: "news",
    title: "الأخبار و RSS",
    items: [
      { key: "publish", label: "نشر مقال", icon: PenSquare },
      { key: "auto-news", label: "الأخبار التلقائية", icon: Newspaper },
      { key: "rss", label: "مصادر وأقسام RSS", icon: Rss },
      { key: "alerts", label: "تنبيهات وإشعارات", icon: Bell },
    ],
  },
  {
    id: "services",
    title: "خدمات رهط",
    items: [
      { key: "buses", label: "باصات غاليم", icon: Bus },
      { key: "duty", label: "صيدلية المناوبة", icon: Pill },
      { key: "city", label: "مدينة رهط 3D", icon: Sparkles, ownerOnly: true },
      { key: "haraj-cats", label: "أقسام الحراج", icon: Tag, ownerOnly: true },
      { key: "store", label: "المتجر الرسمي", icon: ShoppingBag },
    ],
  },
  {
    id: "moderation",
    title: "المراجعة والطلبات",
    items: [
      { key: "review", label: "طابور المراجعة", icon: ClipboardCheck },
      { key: "comments", label: "التعليقات", icon: MessageSquare },
      { key: "reports", label: "البلاغات", icon: Flag },
    ],
  },
  {
    id: "team",
    title: "الأعضاء والفريق",
    items: [{ key: "members", label: "الأعضاء والأدوار", icon: Users, ownerOnly: true }],
  },
  {
    id: "system",
    title: "النظام والمزامنة",
    items: [
      { key: "stats", label: "الإحصائيات", icon: BarChart3 },
      { key: "google", label: "جوجل والإعلانات", icon: Activity, ownerOnly: true },
      { key: "languages", label: "اللغات والترجمة", icon: Globe, ownerOnly: true },
      { key: "email", label: "البريد الإلكتروني", icon: Mail, ownerOnly: true },
      { key: "gemini", label: "الذكاء الاصطناعي", icon: Settings, ownerOnly: true },
      { key: "maintenance", label: "الصيانة والمزامنة", icon: Wrench, ownerOnly: true },
    ],
  },
];

const DASHBOARD_ICONS: Record<string, LucideIcon> = {
  review: ClipboardCheck,
  publish: PenSquare,
  "auto-news": Newspaper,
  rss: Rss,
  comments: MessageSquare,
  reports: Flag,
  buses: Bus,
  store: Store,
  "home-order": LayoutGrid,
  stats: BarChart3,
};

const SECTION_EMOJI: Record<HomeSectionId, string> = {
  weather: "🌤️",
  slider: "🎞️",
  search: "🔍",
  tiles: "🧭",
  quicklinks: "⚡",
  news: "📰",
  matches: "⚽",
  social: "📱",
  israel: "🌐",
  sports: "🏆",
  tech: "💻",
  post: "📮",
  install: "📲",
  buses: "🚌",
  directory: "🏪",
  ads: "🏷️",
  duty: "💊",
  emergency: "🚨",
};

/* ----------------------------------------------------------- Main Admin Page */

function AdminPage() {
  const { denied } = Route.useLoaderData();
  const [auth, setAuth] = useState<{
    loaded: boolean;
    level: AdminLevel | null;
    name: string;
    signedIn: boolean;
  }>({ loaded: false, level: null, name: "", signedIn: false });
  const [active, setActive] = useState<string>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const checkAuth = useCallback(async () => {
    try {
      const me = await adminWhoami();
      setAuth({
        loaded: true,
        level: me.level,
        name: me.name || "الإدارة",
        signedIn: me.signedIn,
      });
    } catch {
      setAuth({ loaded: true, level: null, name: "", signedIn: false });
    }
  }, []);

  useEffect(() => {
    void checkAuth();
  }, [checkAuth]);

  const isOwner = auth.level === "owner";

  const visibleGroups = useMemo(
    () =>
      NAV_GROUPS.map((g) => ({
        ...g,
        items: g.items.filter((i) => !i.ownerOnly || isOwner),
      })).filter((g) => g.items.length > 0),
    [isOwner],
  );

  const allTabs = useMemo(
    () => visibleGroups.flatMap((g) => g.items),
    [visibleGroups],
  );

  const go = useCallback(
    (key: string) => {
      const mapLegacy: Record<string, string> = {
        settings: "home-order",
        home: "home-order",
        sections: "rss",
        news: "publish",
        directory: "review",
        haraj: "review",
        ads: "review",
        push: "alerts",
      };
      const resolved = mapLegacy[key] ?? key;
      const exists = allTabs.some((t) => t.key === resolved);
      setActive(exists ? resolved : "dashboard");
      setMobileMenuOpen(false);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [allTabs],
  );

  if (denied) {
    return (
      <Shell>
        <div className="mx-auto max-w-md rounded-3xl border border-line bg-paper p-6 text-center shadow-sm">
          <Lock className="mx-auto size-10 text-alert" />
          <h1 className="mt-3 text-xl font-extrabold">{tr("صلاحية غير كافية")}</h1>
          <p className="mt-2 text-sm font-semibold text-muted">
            {tr("حسابك الحالي لا يملك صلاحية الدخول إلى لوحة التحكم.")}
          </p>
          <Link to="/" className="btn mt-4 inline-flex">
            {tr("العودة للرئيسية")}
          </Link>
        </div>
      </Shell>
    );
  }

  if (!auth.loaded) {
    return (
      <Shell>
        <div className="mx-auto max-w-3xl py-6">
          <Skeleton rows={3} tiles={4} />
        </div>
      </Shell>
    );
  }

  if (!auth.level) {
    return <AdminLoginScreen onSuccess={() => void checkAuth()} />;
  }

  const activeTab = allTabs.find((t) => t.key === active) ?? allTabs[0];

  const handleLogout = async () => {
    await adminLogout().catch(() => {});
    setAuth({ loaded: true, level: null, name: "", signedIn: false });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-surface text-ink">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:px-5">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="grid size-10 place-items-center rounded-2xl border border-line bg-surface text-ink lg:hidden"
              aria-label={tr("قائمة التحكم")}
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-2xl bg-primary text-ink shadow-2xs">
                <ShieldCheck className="size-5" />
              </span>
              <div className="leading-tight">
                <h1 className="text-sm font-extrabold sm:text-base">
                  {tr("لوحة تحكم رهط بوست")}
                </h1>
                <p className="text-[11px] font-semibold text-muted">
                  {trv(auth.name)} · {isOwner ? tr("مدير شامل") : tr("مشرف")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-extrabold text-ink hover:border-primary"
            >
              {tr("عرض الموقع")}
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center gap-1 rounded-xl border border-line bg-paper px-3 py-1.5 text-xs font-extrabold text-alert hover:bg-alert/10"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">{tr("خروج")}</span>
            </button>
          </div>
        </div>

        {/* Mobile Quick Horizontal Pills */}
        <div className="flex gap-1.5 overflow-x-auto border-t border-line/60 px-3 py-2 lg:hidden">
          {allTabs.map((t) => {
            const Icon = t.icon;
            const on = t.key === active;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => go(t.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold transition ${
                  on
                    ? "bg-primary text-ink shadow-2xs"
                    : "border border-line bg-paper text-muted"
                }`}
              >
                <Icon className="size-3.5" />
                {tr(t.label)}
              </button>
            );
          })}
        </div>
      </header>

      {/* Mobile Full Categorized Drawer */}
      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <aside
            className="h-full w-72 max-w-[85vw] overflow-y-auto bg-paper p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between border-b border-line pb-2.5">
              <span className="text-sm font-extrabold">{tr("جميع الأقسام والأدوات")}</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="grid size-8 place-items-center rounded-xl bg-surface"
              >
                <X className="size-4" />
              </button>
            </div>
            <AdminSidebarNav
              groups={visibleGroups}
              active={active}
              pendingCount={pendingCount}
              onSelect={go}
            />
          </aside>
        </div>
      ) : null}

      {/* Main Grid: Desktop Sidebar + Active Panel */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-3 py-5 sm:px-5 lg:grid-cols-12">
        <aside className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-3xl border border-line bg-paper p-3 shadow-2xs">
            <AdminSidebarNav
              groups={visibleGroups}
              active={active}
              pendingCount={pendingCount}
              onSelect={go}
            />
          </div>
        </aside>

        <main className="min-w-0 space-y-4 lg:col-span-9">
          {/* Quick Search Bar */}
          <CardBoundary>
            <Suspense fallback={null}>
              <AdminSearch
                sections={allTabs.map((t) => ({ key: t.key, label: tr(t.label) }))}
                go={go}
              />
            </Suspense>
          </CardBoundary>

          {/* Active Section Header */}
          {activeTab ? (
            <div className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-paper px-4 py-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-primary/25 text-ink">
                  <activeTab.icon className="size-5" />
                </span>
                <h2 className="text-base font-extrabold sm:text-lg">{tr(activeTab.label)}</h2>
              </div>
              <span className="rounded-full bg-[#16A34A]/15 px-2.5 py-1 text-[11px] font-extrabold text-[#15803D]">
                ● {tr("متصل بالموقع والتطبيق")}
              </span>
            </div>
          ) : null}

          {/* Active Panel Body */}
          <CardBoundary key={active}>
            <Suspense fallback={<Skeleton rows={4} tiles={2} />}>
              <ActivePanel
                active={active}
                isOwner={isOwner}
                go={go}
                onReviewCount={setPendingCount}
              />
            </Suspense>
          </CardBoundary>
        </main>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- Sidebar Component */

function AdminSidebarNav({
  groups,
  active,
  pendingCount,
  onSelect,
}: {
  groups: NavGroup[];
  active: string;
  pendingCount: number;
  onSelect: (key: string) => void;
}) {
  return (
    <nav className="space-y-4" aria-label={tr("أقسام لوحة التحكم")}>
      {groups.map((group) => (
        <div key={group.id}>
          <p className="mb-1.5 px-2.5 text-[11px] font-extrabold tracking-wide text-muted">
            {tr(group.title)}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const isOn = active === item.key;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => onSelect(item.key)}
                    className={`flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2 text-start text-xs font-extrabold transition ${
                      isOn
                        ? "bg-primary text-ink shadow-2xs"
                        : "text-ink hover:bg-surface"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="size-4 shrink-0" />
                      <span>{tr(item.label)}</span>
                    </span>
                    {item.key === "review" && pendingCount > 0 ? (
                      <span className="rounded-full bg-alert px-2 py-0.5 text-[10px] text-white">
                        {pendingCount}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/* ----------------------------------------------------------- Active Panel Router */

function ActivePanel({
  active,
  isOwner,
  go,
  onReviewCount,
}: {
  active: string;
  isOwner: boolean;
  go: (k: string) => void;
  onReviewCount: (n: number) => void;
}) {
  switch (active) {
    case "dashboard":
      return <DashboardHome icons={DASHBOARD_ICONS} go={go} />;
    case "home-order":
      return <HomeOrderManager />;
    case "menus":
      return <SiteSettingsAdmin only="menus" />;
    case "theme":
      return <SiteSettingsAdmin only="theme" />;
    case "texts":
      return <SiteSettingsAdmin only="texts" />;
    case "slider":
      return <SiteSettingsAdmin only="slider" />;
    case "links":
      return <SiteSettingsAdmin only="links" />;
    case "google":
      return <SiteSettingsAdmin only="google" />;
    case "announce":
      return <AnnounceBarAdmin />;
    case "popups":
      return <PopupsAdmin />;
    case "publish":
      return <PublishAdmin />;
    case "auto-news":
      return <AutoNewsAdmin />;
    case "rss":
      return <SectionAdmin id="news" />;
    case "alerts":
      return (
        <div className="space-y-4">
          <AlertsAdmin />
          <PushAdmin />
        </div>
      );
    case "buses":
      return <BusLinesAdmin />;
    case "duty":
      return <DutyAdmin />;
    case "city":
      return <EmbeddedCityAdmin />;
    case "haraj-cats":
      return <HarajCategoriesAdmin />;
    case "store":
      return <StoreAdmin isOwner={isOwner} />;
    case "review":
      return <ReviewQueue onCount={onReviewCount} />;
    case "comments":
      return <CommentsAdmin />;
    case "reports":
      return <ReportsAdmin />;
    case "members":
      return <MembersAdmin />;
    case "stats":
      return <StatsAdmin />;
    case "languages":
      return <LanguagesAdmin />;
    case "email":
      return <EmailAdmin />;
    case "gemini":
      return <GeminiAdmin />;
    case "maintenance":
      return <MaintenanceAndSyncPanel />;
    default:
      return <DashboardHome icons={DASHBOARD_ICONS} go={go} />;
  }
}

/* ----------------------------------------------------------- Brand-New Home Order Manager */

function HomeOrderManager() {
  const router = useRouter();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{ kind: "idle" | "ok" | "err"; text: string }>({
    kind: "idle",
    text: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminGetSiteSettings();
      if (r.authed && r.settings) {
        setSettings(r.settings);
      } else {
        setStatus({ kind: "err", text: tr("هذا القسم لمالك الموقع فقط.") });
      }
    } catch {
      setStatus({ kind: "err", text: tr("تعذّر تحميل ترتيب الأقسام.") });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = async (next: SiteSettings) => {
    setSaving(true);
    setStatus({ kind: "idle", text: "" });
    const synced: SiteSettings = {
      ...next,
      quickLinks: syncHomeOrderToSliderCfg(next.quickLinks, next.home),
    };

    let saved: SiteSettings | null = null;
    let errMsg = "";
    try {
      const res = await adminSaveSiteSettings({ data: synced });
      if (res?.ok && res.settings) {
        saved = res.settings;
      } else if (res?.message) {
        errMsg = res.message;
      }
    } catch (e) {
      errMsg = e instanceof Error ? e.message : "";
    }

    if (!saved) {
      try {
        const r = await fetch("/api/media?kind=live-settings", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ settings: synced }),
        });
        const j = await r.json().catch(() => null);
        if (r.ok && j?.ok && j?.settings) {
          saved = j.settings;
        } else if (j?.message) {
          errMsg = j.message;
        } else if (r.status === 401) {
          errMsg = tr("انتهت جلسة الدخول — سجّل الدخول مجدداً.");
        }
      } catch {
        // ignore network error
      }
    }

    setSaving(false);
    if (saved) {
      setSettings(saved);
      setDirty(false);
      broadcastSiteSettingsUpdate(saved);
      setStatus({
        kind: "ok",
        text: tr("تم حفظ الترتيب وتطبيقه فوراً على الموقع وتطبيقي أندرويد وآبل ✓"),
      });
      await router.invalidate().catch(() => {});
    } else {
      setStatus({
        kind: "err",
        text: errMsg || tr("تعذّر حفظ الترتيب — تحقق من الاتصال أو قاعدة البيانات."),
      });
    }
  };

  if (loading) return <Skeleton rows={4} />;
  if (!settings) {
    return (
      <div className="rounded-3xl border border-line bg-paper p-5 text-sm font-bold text-alert">
        {status.text || tr("تعذّر التحميل.")}
      </div>
    );
  }

  const move = (idx: number, delta: number) => {
    const target = idx + delta;
    if (target < 0 || target >= settings.home.length) return;
    const list = [...settings.home];
    [list[idx], list[target]] = [list[target], list[idx]];
    setSettings({ ...settings, home: list });
    setDirty(true);
    setStatus({ kind: "idle", text: "" });
  };

  const moveTop = (idx: number) => {
    if (idx <= 0) return;
    const list = [...settings.home];
    const [picked] = list.splice(idx, 1);
    list.unshift(picked);
    setSettings({ ...settings, home: list });
    setDirty(true);
    setStatus({ kind: "idle", text: "" });
  };

  const toggleVis = (idx: number) => {
    const list = settings.home.map((h, i) =>
      i === idx ? { ...h, visible: !h.visible } : h,
    );
    setSettings({ ...settings, home: list });
    setDirty(true);
    setStatus({ kind: "idle", text: "" });
  };

  const visibleCount = settings.home.filter((h) => h.visible).length;

  return (
    <section className="rounded-3xl border border-line bg-paper p-4 shadow-2xs sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3.5">
        <div>
          <p className="text-sm font-extrabold text-ink">
            {tr("تحكّم بترتيب وإظهار أقسام الصفحة الرئيسية")} ({visibleCount} / {settings.home.length})
          </p>
          <p className="mt-0.5 text-xs font-semibold text-muted">
            {tr("رتّب الأقسام بالأسهم أو أخفِ ما لا تريده، ثم اضغط حفظ لتطبيق التغيير على الموقع والتطبيقين فوراً.")}
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void persist(settings)}
          className="btn px-4 py-2 text-xs font-extrabold disabled:opacity-60"
        >
          {saving ? (
            <>
              <RefreshCw className="size-4 animate-spin" />
              {tr("جاري الحفظ…")}
            </>
          ) : (
            <>
              <Check className="size-4" />
              {dirty ? tr("حفظ الترتيب الآن *") : tr("حفظ الترتيب الآن")}
            </>
          )}
        </button>
      </div>

      {status.text ? (
        <div
          className={`mt-3 rounded-2xl px-3.5 py-2.5 text-xs font-extrabold ${
            status.kind === "ok"
              ? "bg-[#16A34A]/15 text-[#15803D]"
              : "bg-alert/15 text-alert"
          }`}
          role="status"
        >
          {status.text}
        </div>
      ) : null}

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {settings.home.map((item, idx) => (
          <li
            key={item.id}
            className={`flex items-center justify-between gap-2 rounded-2xl border p-2.5 transition ${
              item.visible
                ? "border-line bg-surface/40"
                : "border-line/50 bg-surface/20 opacity-60"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-xl bg-ink text-xs font-extrabold text-paper">
                {idx + 1}
              </span>
              <span className="text-lg" aria-hidden>
                {SECTION_EMOJI[item.id] ?? "📌"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-extrabold text-ink sm:text-sm">
                  {tr(HOME_SECTIONS[item.id])}
                </p>
                <p
                  className={`text-[10px] font-bold ${
                    item.visible ? "text-[#15803D]" : "text-muted"
                  }`}
                >
                  {item.visible ? tr("ظاهر") : tr("مخفي")}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => moveTop(idx)}
                title={tr("نقل للأول")}
                className="grid size-8 place-items-center rounded-xl border border-line bg-paper text-ink hover:border-primary disabled:opacity-30"
              >
                <ArrowUpToLine className="size-3.5" />
              </button>
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => move(idx, -1)}
                title={tr("أعلى")}
                className="grid size-8 place-items-center rounded-xl border border-line bg-paper text-ink hover:border-primary disabled:opacity-30"
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                type="button"
                disabled={idx === settings.home.length - 1}
                onClick={() => move(idx, 1)}
                title={tr("أسفل")}
                className="grid size-8 place-items-center rounded-xl border border-line bg-paper text-ink hover:border-primary disabled:opacity-30"
              >
                <ArrowDown className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => toggleVis(idx)}
                title={item.visible ? tr("إخفاء") : tr("إظهار")}
                className={`grid size-8 place-items-center rounded-xl border transition ${
                  item.visible
                    ? "border-[#16A34A]/40 bg-[#16A34A]/10 text-[#15803D]"
                    : "border-line bg-paper text-muted"
                }`}
              >
                {item.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ----------------------------------------------------------- Embedded 3D City Admin */

function EmbeddedCityAdmin() {
  const city = useRahatCityState();
  return (
    <div className="rounded-3xl border border-line bg-paper p-4 shadow-2xs">
      <CityAdminPanelEmbedded
        residents={city.residents}
        setResidents={city.setResidents}
        landmarks={city.landmarks}
        setLandmarks={city.setLandmarks}
        settings={city.settings}
        setSettings={city.setSettings}
        saveToast={city.saveToast}
        syncCityToCloud={city.syncCityToCloud}
        onClose={() => {}}
      />
    </div>
  );
}

/* ----------------------------------------------------------- Maintenance & Live Sync Panel */

function MaintenanceAndSyncPanel() {
  const [active, setActive] = useState(false);
  const [reason, setReason] = useState(
    "جاري تحديث وتطوير منصة رهط بوست... سيعود الموقع تلقائياً خلال لحظات",
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    void fetch(`/api/media?kind=maintenance-status&_t=${Date.now()}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok && d.maintenance) {
          setActive(Boolean(d.maintenance.active));
          if (d.maintenance.reason) setReason(String(d.maintenance.reason));
        }
      })
      .catch(() => {});
  }, []);

  const toggleMaint = async (enable: boolean) => {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/media?kind=maintenance-status", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: enable ? "enable" : "disable",
          mode: "manual",
          reason,
        }),
      });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.ok) {
        setActive(enable);
        setMsg(
          enable
            ? tr("تم تفعيل وضع الصيانة على الموقع والتطبيقين ✓")
            : tr("تم إيقاف وضع الصيانة وعودة الموقع والتطبيقين للعمل ✓"),
        );
      } else {
        setMsg(j?.message || tr("تعذّر تحديث وضع الصيانة."));
      }
    } catch {
      setMsg(tr("تعذّر الاتصال بالخادم."));
    } finally {
      setBusy(false);
    }
  };

  const forceSyncAll = async () => {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(`/api/media?kind=live-settings&_t=${Date.now()}`, {
        cache: "no-store",
      });
      const j = await r.json().catch(() => null);
      if (r.ok && j?.ok && j.settings) {
        broadcastSiteSettingsUpdate(j.settings);
        setMsg(tr("تمت مزامنة أحدث الإعدادات مع الموقع وتطبيقي أندرويد وآبل ✓"));
      } else {
        setMsg(tr("تعذّرت المزامنة."));
      }
    } catch {
      setMsg(tr("تعذّر الاتصال."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-line bg-paper p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold">{tr("وضع الصيانة الفوري")}</h3>
            <p className="mt-1 text-xs font-semibold text-muted">
              {tr("يعرض صفحة صيانة مؤقتة للزوار في الموقع وتطبيقي أندرويد وآبل مع بقاء لوحة التحكم متاحة لك.")}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-extrabold ${
              active
                ? "bg-alert/15 text-alert"
                : "bg-[#16A34A]/15 text-[#15803D]"
            }`}
          >
            {active ? tr("الصيانة مفعّلة") : tr("الموقع يعمل بشكل طبيعي")}
          </span>
        </div>

        <label className="mt-4 block text-xs font-extrabold text-muted">
          {tr("رسالة الصيانة للزوار")}
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input mt-1.5 w-full"
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void toggleMaint(!active)}
            className={`btn px-4 py-2 text-xs font-extrabold ${
              active ? "bg-[#16A34A] text-white" : ""
            }`}
          >
            <Siren className="size-4" />
            {active ? tr("إيقاف الصيانة وإعادة التشغيل") : tr("تفعيل وضع الصيانة")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void forceSyncAll()}
            className="rounded-2xl border border-line bg-surface px-4 py-2 text-xs font-extrabold text-ink hover:border-primary"
          >
            <RefreshCw className={`inline size-3.5 me-1.5 ${busy ? "animate-spin" : ""}`} />
            {tr("مزامنة فورية مع الموقع والتطبيق")}
          </button>
        </div>

        {msg ? (
          <p className="mt-3 text-xs font-extrabold text-primary-ink" role="status">
            {msg}
          </p>
        ) : null}
      </section>
    </div>
  );
}

/* ----------------------------------------------------------- Login Screen */

function AdminLoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const res = await adminLogin({ data: { password, remember } });
      if (res.ok) {
        onSuccess();
      } else {
        setErr(res.message || tr("كلمة المرور غير صحيحة."));
      }
    } catch {
      setErr(tr("تعذّر تسجيل الدخول."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title={tr("دخول لوحة التحكم")} subtitle={tr("إدارة موقع وتطبيقات رهط بوست")}>
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <label className="block text-sm font-bold">
          {tr("كلمة مرور الإدارة")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            className="input mt-1.5 w-full"
            required
          />
        </label>

        <label className="flex items-center gap-2 text-xs font-bold text-muted">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="size-4 accent-primary"
          />
          {tr("تذكّر دخولي على هذا الجهاز")}
        </label>

        {err ? (
          <p className="rounded-xl bg-alert/15 px-3 py-2 text-xs font-extrabold text-alert">
            {err}
          </p>
        ) : null}

        <button type="submit" disabled={busy} className="btn w-full py-2.5 text-sm font-extrabold">
          {busy ? tr("جاري الدخول…") : tr("دخول لوحة التحكم")}
        </button>
      </form>
    </AuthLayout>
  );
}
