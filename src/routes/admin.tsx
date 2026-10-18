import {
  BarChart3,
  Bell,
  Flag,
  Globe,
  Sparkles,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Newspaper,
  PenSquare,
  Pill,
  Rss,
  Settings,
  ShoppingBag,
  Siren,
  Store,
  Users,
  X,
  type LucideIcon,
  Cpu,
  Trophy,
  CloudSun,
  House,
  ClipboardCheck,
  LayoutGrid,
  BadgeCheck,
  ArrowRight,
  UserPlus,
  KeyRound,
  Palette,
  Type,
  GalleryHorizontal,
  Link2,
  Mail,
  ChevronLeft,
  MonitorUp,
} from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { PhotoStrip } from "@/components/photo-picker";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { AuthLayout } from "@/components/auth-layout";
import { CommentsAdmin } from "@/components/admin/comments-admin";
import { AlertsAdmin, DutyAdmin, PushAdmin, ReportsAdmin } from "@/components/admin/content-admin";
import { HarajCategoriesAdmin } from "@/components/admin/haraj-categories-admin";
import { adminDecideListing, adminListListings, adminSamples } from "@/lib/market/api";
import { priceLabel, STATUS_LABEL, type ListingStatus, type OwnListing } from "@/lib/market/types";
import type { OwnAd } from "@/lib/ads/types";
import { adminDecide, adminList, adminLogin, adminLogout } from "@/lib/directory/api";
import type { BusinessSubmission } from "@/lib/directory/types";
import { AutoNewsAdmin } from "@/components/admin/auto-news-admin";
import { SectionAdmin } from "@/components/admin/section-admin";
import { SiteSettingsAdmin, type SiteSettingsPart } from "@/components/admin/site-settings-admin";
import { MembersAdmin } from "@/components/admin/members-admin";
import { PopupsAdmin } from "@/components/admin/popups-admin";
import { EmailAdmin } from "@/components/admin/email-admin";
import { adminWhoami } from "@/lib/team/api";
import type { AdminLevel } from "@/lib/admin-auth";
import { PublishAdmin } from "@/components/admin/publish-admin";
import { StoreAdmin } from "@/components/admin/store-admin";
import { StatsAdmin } from "@/components/admin/stats-admin";
import { LanguagesAdmin } from "@/components/admin/languages-admin";
import { GeminiAdmin } from "@/components/admin/gemini-admin";
import { adminDecideNews, adminListNews } from "@/lib/reader-news/api";
import type { OwnReaderNews } from "@/lib/reader-news/types";
import { tr, trv } from "@/lib/i18n/core";
import { AdminSearch, DashboardHome, ReviewQueue } from "@/components/admin/admin-v2";
import { LangSwitcher } from "@/components/lang-switcher";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: tr("إدارة · رهط بوست") }, { name: "robots", content: "noindex, nofollow" }],
  }),
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
  { key: "home", label: "الرئيسية", icon: House },
  { key: "review", label: "المراجعة", icon: ClipboardCheck },
  { key: "stats", label: "الإحصائيات", icon: BarChart3 },
  { key: "publish", label: "نشر خبر", icon: PenSquare },
  { key: "auto", label: "الأخبار التلقائية", icon: Rss },
  { key: "sec-news", label: "الأخبار المحلية", icon: Newspaper },
  { key: "sec-israel", label: "أخبار إسرائيل", icon: Rss },
  { key: "sec-sports", label: "رياضة", icon: Trophy },
  { key: "sec-tech", label: "أخبار تقنية", icon: Cpu },
  { key: "sec-weather", label: "الطقس", icon: CloudSun },
  { key: "news", label: "أخبار القراء", icon: Newspaper },
  { key: "ads", label: "الإعلانات", icon: Megaphone },
  { key: "haraj-cats", label: "تصنيفات الحراج", icon: Megaphone },
  { key: "store", label: "المتجر", icon: ShoppingBag },
  { key: "directory", label: "طلبات الدليل", icon: Store },
  { key: "comments", label: "التعليقات", icon: MessageSquare },
  { key: "reports", label: "البلاغات", icon: Flag },
  { key: "duty", label: "صيدلية المناوبة", icon: Pill },
  { key: "alerts", label: "التنبيهات", icon: Siren },
  { key: "push", label: "الإشعارات", icon: Bell },
  { key: "members-list", label: "قائمة الأعضاء", icon: Users },
  { key: "members-roles", label: "الأدوار والصلاحيات", icon: BadgeCheck },
  { key: "members-invite", label: "إضافة عضو بالبريد", icon: UserPlus },
  { key: "members-methods", label: "طرق تسجيل الدخول", icon: KeyRound },
  { key: "emails", label: "قوالب رسائل البريد", icon: Mail },
  { key: "popups", label: "الإعلانات المنبثقة", icon: MonitorUp },
  { key: "set-theme", label: "المظهر والألوان", icon: Palette },
  { key: "set-texts", label: "النصوص والشعار", icon: Type },
  { key: "set-home", label: "أقسام الرئيسية", icon: LayoutGrid },
  { key: "set-menus", label: "القوائم والأيقونات", icon: Menu },
  { key: "set-slider", label: "السلايدر", icon: GalleryHorizontal },
  { key: "set-links", label: "روابط سريعة", icon: Link2 },
  { key: "set-google", label: "خدمات جوجل (Analytics وAdSense وSearch Console)", icon: Settings },
  { key: "languages", label: "اللغات", icon: Globe },
  { key: "gemini", label: "الذكاء الاصطناعي والترجمة", icon: Sparkles },
];

const GROUPS: { id: string; label: string; icon: LucideIcon; keys: Section[] }[] = [
  { id: "main", label: "الرئيسية", icon: House, keys: ["home", "review", "stats"] },
  {
    id: "content",
    label: "المحتوى والأخبار",
    icon: Newspaper,
    keys: ["publish", "news", "comments", "auto", "sec-news", "sec-israel", "sec-sports", "sec-tech", "sec-weather", "duty", "directory"],
  },
  { id: "haraj", label: "الحراج", icon: Megaphone, keys: ["ads", "haraj-cats", "reports", "store"] },
  { id: "members", label: "الأعضاء والصلاحيات", icon: Users, keys: ["members-list", "members-roles", "members-invite"] },
  { id: "marketing", label: "التسويق والتواصل", icon: MonitorUp, keys: ["popups", "emails", "push", "alerts", "set-google"] },
  {
    id: "settings",
    label: "الإعدادات",
    icon: Settings,
    keys: ["set-texts", "set-theme", "set-home", "set-menus", "set-slider", "set-links", "languages", "gemini", "members-methods"],
  },
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
  onSelect,
  onLogout,
}: {
  tabs: typeof ALL_TABS;
  section: Section;
  onSelect: (key: Section) => void;
  onLogout: () => void;
}) {
  return (
    <nav aria-label={tr("أقسام الإدارة")} className="flex flex-col gap-1">
      {GROUPS.map((g) => {
        const items = groupItems(g, tabs);
        if (!items.length) return null;
        const active = g.keys.includes(section);
        const Icon = g.icon;
        return (
          <button
            key={g.id}
            type="button"
            aria-current={active ? "page" : undefined}
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-start font-bold transition-colors ${active ? "bg-brand text-ink" : "hover:bg-surface"}`}
            onClick={() => onSelect(`grp-${g.id}`)}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            <span className="flex-1">{trv(g.label)}</span>
            <span className="text-xs font-semibold opacity-60">{items.length}</span>
          </button>
        );
      })}
      <button type="button" className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-start text-sm font-bold hover:bg-surface" onClick={onLogout}>
        <LogOut className="size-[18px] shrink-0" aria-hidden />
        {tr("خروج")}
      </button>
    </nav>
  );
}

function AdminPage() {
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
              {tr("دخول بحساب Google")}
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
  // Signed-in moderators get a limited view: only the tabs their role's permissions cover.
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
  const BOTTOM: { key: Section; label: string; icon: LucideIcon }[] = (
    [
      { key: "home", label: "الرئيسية", icon: House },
      { key: "review", label: "المراجعة", icon: ClipboardCheck },
      { key: "grp-haraj", label: "الحراج", icon: Megaphone },
      { key: "grp-members", label: "الأعضاء", icon: Users },
    ] as const
  ).filter((b) => tabs.some((t) => t.key === b.key) || visibleGroups.some((g) => `grp-${g.id}` === b.key));
  const landing = undefined as (typeof GROUPS)[number] | undefined;
  const curGroup = landing ?? GROUPS.find((g) => g.keys.includes(current));
  const logout = async () => {
    setMenuOpen(false);
    await adminLogout();
    setState("login");
  };

  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-6 lg:px-6 lg:py-6">
        <aside className="hidden lg:block">
          <div className="sticky top-6 flex max-h-[calc(100vh-3rem)] flex-col gap-4 overflow-y-auto rounded-3xl bg-paper p-3 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
            <Link to="/" className="flex items-center gap-2 px-2 pt-1 text-sm font-bold text-muted hover:text-ink">
              <ArrowRight className="size-4 rtl:rotate-0 ltr:rotate-180" aria-hidden />
              {tr("العودة للموقع")}
            </Link>
            <AdminMenu tabs={tabs} section={current} onSelect={go} onLogout={logout} />
          </div>
        </aside>
        <div className="min-w-0 px-4 pb-28 pt-4 lg:px-0 lg:pb-10 lg:pt-0">
          <header className="mb-4 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-muted">{tr("لوحة الإدارة")}</p>
              <h1 className="truncate text-2xl font-extrabold">{trv(curGroup?.label ?? "الإدارة")}</h1>
            </div>
            <LangSwitcher />
            <span
              className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-sm font-extrabold text-ink"
              title={level === "owner" ? tr("المالك") : who.name}
              aria-label={level === "owner" ? tr("المالك") : who.name}
            >
              {level === "owner" && !who.name ? <BadgeCheck className="size-5" aria-hidden /> : (who.name || "?").slice(0, 1)}
            </span>
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
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold ${current === key ? "bg-ink text-paper" : "bg-paper shadow-[0_1px_3px_rgba(16,24,40,0.06)]"}`}
                >
                  <Icon className="size-4" aria-hidden />
                  {trv(label)}
                </button>
              ))}
            </div>
          ) : null}
          {menuOpen ? (
            <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={tr("قائمة الإدارة")}>
              <button type="button" className="absolute inset-0 h-full w-full bg-black/40" aria-label={tr("إغلاق القائمة")} onClick={() => setMenuOpen(false)} />
              <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl bg-paper p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl">
                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line" />
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-lg font-extrabold">{tr("كل الأقسام")}</p>
                  <button type="button" className="grid size-9 place-items-center rounded-full bg-surface" aria-label={tr("إغلاق")} onClick={() => setMenuOpen(false)}>
                    <X className="size-5" aria-hidden />
                  </button>
                </div>
                <AdminMenu tabs={tabs} section={current} onSelect={go} onLogout={logout} />
                <Link to="/" className="mt-3 flex items-center gap-2 px-3 text-sm font-bold text-muted">{tr("العودة للموقع")}</Link>
              </div>
            </div>
          ) : null}
          {current === "home" ? (
            <DashboardHome
              go={go}
              icons={{ haraj: Megaphone, comments: MessageSquare, news: Newspaper, reports: Flag, members: Users, sold: ShoppingBag, stats: BarChart3 }}
            />
          ) : current === "review" ? (
            <ReviewQueue onCount={setReviewCount} />
          ) : current === "publish" ? (
            <PublishAdmin />
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
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label={tr("تنقل الإدارة")}>
        <div className="mx-auto flex max-w-xl">
          {BOTTOM.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" aria-current={current === key || (key.startsWith("grp-") && curGroup && `grp-${curGroup.id}` === key) ? "page" : undefined} onClick={() => go(key)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-bold ${current === key || (curGroup && `grp-${curGroup.id}` === key) ? "text-ink" : "text-muted"}`}>
              <span className={`grid h-7 w-12 place-items-center rounded-full ${current === key || (curGroup && `grp-${curGroup.id}` === key) ? "bg-brand" : ""}`}><Icon className="size-5" aria-hidden /></span>
              {trv(label)}
              {key === "review" && reviewCount ? <span className="absolute top-1 start-[55%] rounded-full bg-alert px-1.5 text-[10px] text-white">{reviewCount}</span> : null}
            </button>
          ))}
          <button type="button" aria-label={tr("فتح القائمة")} aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-bold ${!BOTTOM.some((b) => b.key === current || (curGroup && `grp-${curGroup.id}` === b.key)) ? "text-ink" : "text-muted"}`}>
            <span className={`grid h-7 w-12 place-items-center rounded-full ${!BOTTOM.some((b) => b.key === current || (curGroup && `grp-${curGroup.id}` === b.key)) ? "bg-brand" : ""}`}><LayoutGrid className="size-5" aria-hidden /></span>
            {tr("المزيد")}
          </button>
        </div>
      </nav>
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
