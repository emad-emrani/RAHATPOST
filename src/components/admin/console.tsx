import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  Bus,
  ChevronDown,
  ClipboardCheck,
  Flag,
  Globe,
  House,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Moon,
  Newspaper,
  Settings,
  ShoppingBag,
  Store,
  Sun,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Toaster } from "sonner";
import { LangSwitcher } from "@/components/lang-switcher";
import { AdminSearch } from "@/components/admin/admin-v2";
import { tr, trv } from "@/lib/i18n/core";
import type { AdminLevel } from "@/lib/admin-auth";

export type NavTab = { key: string; label: string };
export type NavItem = { key: string; label: string; icon: LucideIcon; tabs?: NavTab[] };
export type NavGroup = { id: string; label: string; icon: LucideIcon; items: NavItem[] };

/**
 * Specialty groups. Each item is one screen; `tabs` merges the old separate
 * pages that did the same job (store, members, news sections, settings).
 */
export const NAV: NavGroup[] = [
  {
    id: "home",
    label: "الرئيسية",
    icon: House,
    items: [
      {
        key: "home",
        label: "نظرة عامة",
        icon: House,
        tabs: [
          { key: "home", label: "المتابعة" },
          { key: "stats", label: "الإحصائيات" },
        ],
      },
    ],
  },
  {
    id: "content",
    label: "المحتوى",
    icon: Newspaper,
    items: [
      {
        key: "publish",
        label: "الأخبار",
        icon: Newspaper,
        tabs: [
          { key: "publish", label: "نشر خبر" },
          { key: "news", label: "أخبار القراء" },
          { key: "auto", label: "الجلب والترجمة" },
          { key: "matches", label: "المباريات" },
        ],
      },
      {
        key: "sec-news",
        label: "أقسام الأخبار",
        icon: Newspaper,
        tabs: [
          { key: "sec-news", label: "محلي" },
          { key: "sec-israel", label: "إسرائيل" },
          { key: "sec-sports", label: "رياضة" },
          { key: "sec-tech", label: "تقنية" },
          { key: "sec-weather", label: "الطقس" },
          { key: "sec-manage", label: "إدارة الأقسام" },
          { key: "sec-add", label: "قسم جديد" },
        ],
      },
      {
        key: "duty",
        label: "اليوم والتنبيهات",
        icon: Bell,
        tabs: [
          { key: "duty", label: "صيدلية المناوبة" },
          { key: "alerts", label: "شريط التنبيهات" },
        ],
      },
    ],
  },
  {
    id: "transit",
    label: "المواصلات",
    icon: Bus,
    items: [{ key: "buses", label: "الباصات ورب-كاف", icon: Bus }],
  },
  {
    id: "directory",
    label: "الدليل",
    icon: Store,
    items: [{ key: "directory", label: "طلبات الدليل", icon: Store }],
  },
  {
    id: "haraj",
    label: "الحراج والإعلانات",
    icon: Megaphone,
    items: [
      {
        key: "ads",
        label: "الإعلانات",
        icon: Megaphone,
        tabs: [
          { key: "ads", label: "المراجعة" },
          { key: "haraj-cats", label: "الأقسام والفلاتر" },
        ],
      },
      { key: "reports", label: "البلاغات", icon: Flag },
    ],
  },
  {
    id: "store",
    label: "المتجر",
    icon: ShoppingBag,
    items: [
      {
        key: "store-orders",
        label: "المتجر",
        icon: ShoppingBag,
        tabs: [
          { key: "store-orders", label: "الطلبات" },
          { key: "store-cats", label: "الأقسام" },
          { key: "store", label: "المنتجات" },
          { key: "store-offers", label: "العروض" },
          { key: "store-merchants", label: "التجار" },
          { key: "store-pay", label: "الدفع" },
        ],
      },
    ],
  },
  {
    id: "members",
    label: "الأعضاء",
    icon: Users,
    items: [
      {
        key: "members-list",
        label: "الأعضاء",
        icon: Users,
        tabs: [
          { key: "members-list", label: "القائمة" },
          { key: "members-roles", label: "الأدوار" },
          { key: "members-passwords", label: "كلمات المرور" },
          { key: "members-invite", label: "دعوة" },
          { key: "members-methods", label: "تسجيل الدخول" },
          { key: "members-blocks", label: "الحظر" },
        ],
      },
    ],
  },
  {
    id: "review",
    label: "المراجعة",
    icon: ClipboardCheck,
    items: [
      { key: "review", label: "طابور المراجعة", icon: ClipboardCheck },
      { key: "comments", label: "التعليقات", icon: MessageSquare },
    ],
  },
  {
    id: "settings",
    label: "الموقع والإعدادات",
    icon: Settings,
    items: [
      {
        key: "set-menus",
        label: "القوائم والمظهر",
        icon: Menu,
        tabs: [
          { key: "set-menus", label: "القوائم" },
          { key: "set-home", label: "ترتيب الرئيسية" },
          { key: "set-slider", label: "السلايدر" },
          { key: "set-texts", label: "النصوص والشعار" },
          { key: "set-theme", label: "الألوان" },
          { key: "set-links", label: "روابط سريعة" },
        ],
      },
      {
        key: "push",
        label: "الإشعارات",
        icon: Bell,
        tabs: [
          { key: "push", label: "الهاتف" },
          { key: "popups", label: "النوافذ" },
          { key: "emails", label: "البريد" },
        ],
      },
      {
        key: "set-google",
        label: "جوجل والترجمة",
        icon: Globe,
        tabs: [
          { key: "set-google", label: "SEO وAdSense" },
          { key: "languages", label: "اللغات" },
          { key: "gemini", label: "الذكاء الاصطناعي" },
        ],
      },
    ],
  },
];

function itemKeys(item: NavItem): string[] {
  return item.tabs?.map((t) => t.key) ?? [item.key];
}

export function allSectionKeys(): string[] {
  const keys: string[] = [];
  for (const group of NAV) for (const item of group.items) keys.push(...itemKeys(item));
  return keys;
}

export function allowedSections(
  level: AdminLevel | null,
  perms: string[],
  isMod: boolean,
  tabPerm: Partial<Record<string, string>>,
): Set<string> {
  return new Set(
    allSectionKeys().filter((key) => {
      if (level === "owner") return true;
      if (level === "writer") return key === "publish";
      if (key === "home" || key === "review") return isMod;
      const need = tabPerm[key];
      return Boolean(need && perms.includes(need));
    }),
  );
}

function visibleNav(allowed: Set<string>): NavGroup[] {
  const groups: NavGroup[] = [];
  for (const group of NAV) {
    const items: NavItem[] = [];
    for (const item of group.items) {
      const tabs = (item.tabs ?? [{ key: item.key, label: item.label }]).filter((t) => allowed.has(t.key));
      if (!tabs.length) continue;
      items.push({ ...item, key: tabs[0].key, tabs: tabs.length > 1 ? tabs : undefined });
    }
    if (items.length) groups.push({ ...group, items });
  }
  return groups;
}

export function searchEntries(allowed: Set<string>): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  for (const group of visibleNav(allowed)) {
    for (const item of group.items) {
      if (item.tabs) for (const tab of item.tabs) out.push({ key: tab.key, label: `${group.label} · ${item.label} · ${tab.label}` });
      else out.push({ key: item.key, label: `${group.label} · ${item.label}` });
    }
  }
  return out;
}

function findContext(section: string, allowed: Set<string>) {
  for (const group of visibleNav(allowed)) {
    for (const item of group.items) {
      const tabs = item.tabs ?? [{ key: item.key, label: item.label }];
      if (tabs.some((t) => t.key === section) || item.key === section) return { group, item, tabs: item.tabs ?? [] };
    }
  }
  return null;
}

const LEVEL_LABEL: Record<string, string> = { owner: "المالك", moderator: "مشرف", writer: "كاتب" };

function SideNav({
  allowed,
  section,
  reviewCount,
  onGo,
  onLogout,
}: {
  allowed: Set<string>;
  section: string;
  reviewCount: number | null;
  onGo: (key: string) => void;
  onLogout: () => void;
}) {
  const groups = useMemo(() => visibleNav(allowed), [allowed]);
  const activeGroup = groups.find((g) => g.items.some((item) => (item.tabs ?? [{ key: item.key }]).some((t) => t.key === section)))?.id;
  const [open, setOpen] = useState<Record<string, boolean>>(() => ({ home: true, ...(activeGroup ? { [activeGroup]: true } : {}) }));

  useEffect(() => {
    if (activeGroup) setOpen((prev) => ({ ...prev, [activeGroup]: true }));
  }, [activeGroup]);

  return (
    <nav aria-label={tr("أقسام الإدارة")} className="flex min-h-0 flex-1 flex-col gap-1">
      <div className="flex flex-col gap-1 overflow-y-auto pe-1">
        {groups.map((group) => {
          const expanded = open[group.id] ?? false;
          const Icon = group.icon;
          const active = group.id === activeGroup;
          return (
            <div key={group.id}>
              <button
                type="button"
                aria-expanded={expanded}
                className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2.5 text-start text-sm font-extrabold ${active ? "text-brand" : "text-paper/80 hover:bg-white/5"}`}
                onClick={() => setOpen((prev) => ({ ...prev, [group.id]: !expanded }))}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="flex-1 truncate">{tr(group.label)}</span>
                <ChevronDown className={`size-4 shrink-0 transition ${expanded ? "rotate-180" : ""}`} aria-hidden />
              </button>
              {expanded ? (
                <ul className="mb-1 flex flex-col gap-0.5 ps-3">
                  {group.items.map((item) => {
                    const on = (item.tabs ?? [{ key: item.key }]).some((t) => t.key === section);
                    const Sub = item.icon;
                    return (
                      <li key={item.key}>
                        <button
                          type="button"
                          aria-current={on ? "page" : undefined}
                          onClick={() => onGo(item.key)}
                          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-start text-sm font-bold ${on ? "bg-brand text-ink" : "text-paper/75 hover:bg-white/8"}`}
                        >
                          <Sub className="size-3.5 shrink-0" aria-hidden />
                          <span className="flex-1 truncate">{tr(item.label)}</span>
                          {item.key === "review" && reviewCount ? (
                            <span className="rounded-full bg-alert px-1.5 text-[10px] font-extrabold text-paper">{reviewCount}</span>
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
      <button type="button" className="mt-auto flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-sm font-bold text-paper/70 hover:bg-white/5" onClick={onLogout}>
        <LogOut className="size-4" aria-hidden />
        {tr("تسجيل الخروج")}
      </button>
    </nav>
  );
}

const BOTTOM = [
  { key: "home", label: "الرئيسية", icon: House },
  { key: "review", label: "المراجعة", icon: ClipboardCheck },
  { key: "ads", label: "الحراج", icon: Megaphone },
  { key: "publish", label: "المحتوى", icon: Newspaper },
] as const;

export function AdminChrome({
  level,
  name,
  section,
  allowed,
  reviewCount,
  onGo,
  onLogout,
  children,
}: {
  level: AdminLevel;
  name: string;
  section: string;
  allowed: Set<string>;
  reviewCount: number | null;
  onGo: (key: string) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [drawer, setDrawer] = useState(false);
  const ctx = findContext(section, allowed);
  const entries = useMemo(() => searchEntries(allowed), [allowed]);

  useEffect(() => {
    const saved = window.localStorage.getItem("rp-admin-theme");
    if (saved === "dark" || saved === "light") setTheme(saved);
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
  }, []);
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("rp-admin-theme", next);
  };
  const go = (key: string) => {
    if (!allowed.has(key)) return;
    onGo(key);
    setDrawer(false);
  };

  return (
    <div className="rp-console min-h-screen" data-theme={theme}>
      <Toaster position="top-center" dir="rtl" richColors closeButton />
      <div className="lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
        <aside className="rp-side sticky top-0 hidden h-screen flex-col gap-4 p-3 lg:flex">
          <Link to="/" className="flex items-center gap-2 px-2 pt-1">
            <span className="grid size-9 place-items-center rounded-xl bg-brand text-sm font-black text-ink">ر</span>
            <span>
              <span className="block text-sm font-black text-paper">{tr("رهط بوست")}</span>
              <span className="block text-[11px] font-bold text-paper/60">{tr("غرفة الإدارة")}</span>
            </span>
          </Link>
          <SideNav allowed={allowed} section={section} reviewCount={reviewCount} onGo={go} onLogout={onLogout} />
        </aside>
        <div className="min-w-0 pb-24 lg:pb-8">
          <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-paper/95 px-3 py-2.5 backdrop-blur lg:px-5">
            <button type="button" className="grid size-11 place-items-center rounded-xl bg-surface lg:hidden" aria-label={tr("فتح القائمة")} onClick={() => setDrawer(true)}>
              <Menu className="size-5" aria-hidden />
            </button>
            <div className="hidden min-w-0 lg:block">
              <p className="truncate text-[11px] font-bold text-muted">{trv(ctx?.group.label ?? "الإدارة")}</p>
              <h1 className="truncate text-lg font-black">{trv(ctx?.item.label ?? "لوحة التحكم")}</h1>
            </div>
            <div className="min-w-0 flex-1 lg:max-w-md lg:ms-auto">
              <AdminSearch sections={entries} go={go} />
            </div>
            <button type="button" className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface" aria-label={theme === "dark" ? tr("الوضع الفاتح") : tr("الوضع الداكن")} onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>
            <LangSwitcher />
            <span className="hidden rounded-full bg-brand px-2.5 py-1 text-[11px] font-extrabold text-ink sm:inline" title={name}>
              {tr(LEVEL_LABEL[level] ?? "الإدارة")}
            </span>
          </header>
          {ctx && ctx.tabs.length > 1 ? (
            <div className="flex gap-1.5 overflow-x-auto border-b border-line bg-paper px-3 py-2 lg:px-5" role="tablist">
              {ctx.tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={section === tab.key}
                  onClick={() => go(tab.key)}
                  className={`shrink-0 rounded-full px-3 py-2 text-xs font-extrabold ${section === tab.key ? "bg-ink text-paper" : "bg-surface text-ink"}`}
                >
                  {tr(tab.label)}
                </button>
              ))}
            </div>
          ) : null}
          <main className="px-3 py-4 lg:px-5">{children}</main>
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-paper lg:hidden" aria-label={tr("اختصارات الإدارة")}>
        {BOTTOM.filter((b) => allowed.has(b.key)).map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" onClick={() => go(key)} className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-extrabold ${section === key ? "text-primary-ink" : "text-muted"}`}>
            <Icon className="size-5" aria-hidden />
            {tr(label)}
          </button>
        ))}
        <button type="button" onClick={() => setDrawer(true)} className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-extrabold text-muted">
          <Menu className="size-5" aria-hidden />
          {tr("المزيد")}
        </button>
      </nav>
      <div className={`fixed inset-0 z-50 lg:hidden ${drawer ? "" : "pointer-events-none"}`}>
        <button type="button" className={`absolute inset-0 bg-black/50 transition ${drawer ? "opacity-100" : "opacity-0"}`} aria-label={tr("إغلاق القائمة")} onClick={() => setDrawer(false)} />
        <div className={`rp-side absolute inset-y-0 start-0 flex w-72 max-w-[86vw] flex-col gap-3 p-3 transition ${drawer ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full"}`}>
          <div className="flex items-center justify-between px-1">
            <p className="font-black text-paper">{tr("أقسام الإدارة")}</p>
            <button type="button" className="grid size-10 place-items-center rounded-xl bg-white/10 text-paper" aria-label={tr("إغلاق")} onClick={() => setDrawer(false)}>
              <X className="size-5" />
            </button>
          </div>
          {drawer ? <SideNav allowed={allowed} section={section} reviewCount={reviewCount} onGo={go} onLogout={onLogout} /> : null}
          <Link to="/" className="flex items-center gap-2 px-2 text-sm font-bold text-paper/70">
            <ArrowRight className="size-4 ltr:rotate-180" aria-hidden />
            {tr("العودة للموقع")}
          </Link>
        </div>
      </div>
    </div>
  );
}
