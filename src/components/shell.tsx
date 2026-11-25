import { Link } from "@tanstack/react-router";
import { Bus, ChevronLeft, Globe, ShoppingCart, House, MapPin, Megaphone, Newspaper, Plus, Siren, Sparkles, Store } from "lucide-react";
import type { ReactNode } from "react";
import logoUrl from "@/assets/logo.jpg";
import { UserMenu } from "@/components/user-menu";
import { LangSwitcher } from "@/components/lang-switcher";
import { PopupHost } from "@/components/popup-host";
import { mediaUrl } from "@/lib/media/types";
import { useSiteSettings } from "@/lib/site-settings/context";
import { cartCount, useCart } from "@/lib/store/cart";
import { tr, trv } from "@/lib/i18n/core";
import { AnnounceBar } from "@/components/announce-bar";
import { isDigitalStoreHref, useNativeShell } from "@/components/native-shell";
import { isHomeStoreVisible } from "@/lib/site-settings/types";

const NAV = [
  { to: "/", label: "الرئيسية", icon: House, exact: true },
  { to: "/news", label: "الأخبار", icon: Newspaper, exact: false },
  { to: "/buses", label: "باصات", icon: Bus, exact: true },
  { to: "/directory", label: "الدليل", icon: MapPin, exact: false },
  { to: "/haraj", label: "حراج", icon: Megaphone, exact: false },
  { to: "/social", label: "تواصل", icon: Globe, exact: true },
  { to: "/today", label: "اليوم", icon: Siren, exact: true },
  { to: "/store", label: "المتجر", icon: Store, exact: false },
] as const;

export function Shell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const st = useSiteSettings();
  const nativeShell = useNativeShell();
  const showHomeStore = isHomeStoreVisible(st.quickLinks);
  const t = st.texts;
  const nav = st.nav
    .filter((n) => n.visible)
    .map((n) => NAV.find((x) => x.to === n.id))
    .filter((x): x is (typeof NAV)[number] => Boolean(x))
    .filter((x) => !((nativeShell || !showHomeStore) && isDigitalStoreHref(x.to)));

  // Keep mobile bottom bar comfortable with the 5 most essential destinations
  const mobilePriority = ["/", "/news", "/social", "/today", "/buses", "/directory", "/haraj"];
  const mobileNav = [
    ...mobilePriority.map((id) => nav.find((n) => n.to === id)).filter((x): x is (typeof NAV)[number] => Boolean(x)),
    ...nav.filter((n) => !mobilePriority.includes(n.to)),
  ].slice(0, 5);

  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="edge-b sticky top-0 z-30 bg-paper/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6">
          <Link to="/" className="shrink-0 rounded-2xl" aria-label={tr("{0}، الرئيسية", t.siteName)}>
            <img
              src={st.logoKey ? mediaUrl(st.logoKey) : logoUrl}
              alt={trv(t.siteName)}
              width={48}
              height={48}
              className="size-10 rounded-2xl object-cover shadow-2xs sm:size-12"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-extrabold leading-tight sm:text-xl">{trv(t.siteName)}</p>
            {t.tagline ? <p className="truncate text-xs font-semibold text-muted">{trv(t.tagline)}</p> : null}
          </div>
          <CartButton />
          <LangSwitcher />
          <UserMenu />
          <Link to="/submit" className="btn px-3 sm:px-4" aria-label={tr("أضف خبراً أو إعلاناً أو نشاطاً")}>
            <Plus className="size-4" aria-hidden />
            {trv(t.addButton)}
          </Link>
        </div>
        <nav className="mx-auto hidden max-w-5xl gap-1.5 px-6 pb-2.5 md:flex" aria-label={tr("الأقسام")}>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                className="pill gap-1.5"
                activeProps={{
                  className: "bg-primary text-ink shadow-[inset_0_0_0_1px_var(--color-primary-deep)]",
                }}
              >
                <Icon className="size-4" aria-hidden />
                {item.to === "/haraj" ? trv(t.harajNav) : trv(item.label)}
              </Link>
            );
          })}
        </nav>
      </header>
      <AnnounceBar />

      <main
        className={`mx-auto w-full ${wide ? "max-w-6xl" : "max-w-5xl"} px-4 pt-4 pb-8 sm:px-6`}
      >
        {children}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-28 text-sm font-semibold text-muted sm:px-6 md:pb-12">
        <div className="rounded-3xl border border-line bg-paper p-5 shadow-2xs">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-base font-extrabold text-ink">{trv(t.siteName)} — {tr("بوابة رهط والنقب")}</p>
            <Link to="/submit" className="text-xs font-extrabold text-primary-ink underline underline-offset-4">
              + {tr("أضف خبراً أو مصلحة تجارية أو إعلاناً مجاناً")}
            </Link>
          </div>

          {/* 1. Only Sections Present on the Site Menus (أقسام القوائم فقط) */}
          <nav className="mb-3 flex flex-wrap gap-2 border-t border-line pt-3" aria-label={tr("أقسام الموقع")}>
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface/70 px-3 py-1.5 text-xs font-extrabold text-ink transition hover:border-primary hover:bg-primary-soft"
                >
                  <Icon className="size-3.5 text-primary-ink" aria-hidden />
                  <span>{item.to === "/haraj" ? trv(t.harajNav) : trv(item.label)}</span>
                </Link>
              );
            })}
          </nav>

          {/* 2. SEO Keywords for Google Search Optimization (كلمات دلالية لتحسين البحث في جوجل) */}
          <div className="mb-3 rounded-2xl border border-line/70 bg-surface/40 p-3">
            <p className="mb-2 text-[11px] font-extrabold text-ink">
              🔍 {tr("كلمات دلالية وبحثية — رهط والنقب (Google SEO):")}
            </p>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
              {[
                { kw: "رهط بوست", to: "/" as const },
                { kw: "أخبار رهط اليوم", to: "/news" as const },
                { kw: "أخبار النقب عاجل", to: "/news" as const },
                { kw: "باصات غاليم رهط", to: "/buses" as const },
                { kw: "مواعيد باصات رهط بئر السبع", to: "/buses" as const },
                { kw: "خريطة باصات رهط المباشرة", to: "/buses" as const },
                { kw: "دليل محلات وخدمات رهط", to: "/directory" as const },
                { kw: "مطاعم وصيدليات رهط", to: "/directory" as const },
                { kw: "حراج رهط والنقب للبيع", to: "/haraj" as const },
                { kw: "إعلانات مبوبة رهط", to: "/haraj" as const },
                { kw: "تواصل رهط والنقب", to: "/social" as const },
                { kw: "مدينة رهط بوست التفاعلية 3D", to: "/city" as const },
                { kw: "لوحة اليوم وطقس رهط", to: "/today" as const },
                { kw: "أوقات الصلاة وصيدلية المناوبة رهط", to: "/today" as const },
                ...(nativeShell || !showHomeStore ? [] : [{ kw: "متجر رهط بوست", to: "/store" as const }]),
              ].map((tag) => (
                <Link
                  key={tag.kw}
                  to={tag.to}
                  className="rounded-lg border border-line/80 bg-paper px-2 py-0.5 text-muted transition hover:border-primary hover:text-ink"
                >
                  #{trv(tag.kw)}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-xs">
            <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label={tr("روابط الموقع")}>
              <Link to="/support" className="underline-offset-4 hover:underline">
                {tr("الدعم والمساعدة")}
              </Link>
              <Link to="/privacy" className="underline-offset-4 hover:underline">
                {tr("سياسة الخصوصية")}
              </Link>
              <Link to="/terms" className="underline-offset-4 hover:underline">
                {tr("شروط الاستخدام")}
              </Link>
              <Link to="/app" className="underline-offset-4 hover:underline">
                {tr("تطبيق الهاتف")}
              </Link>
            </nav>
            {t.contactEmail ? (
              <p>
                {tr("للتواصل:")}{" "}
                <a href={`mailto:${t.contactEmail}`} className="underline" dir="ltr">
                  {trv(t.contactEmail)}
                </a>
              </p>
            ) : null}
          </div>
          {t.footer ? <p className="mt-2 text-xs text-muted">{trv(t.footer)}</p> : null}
        </div>
      </footer>

      <nav
        className="edge-t fixed inset-x-0 bottom-0 z-30 bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        aria-label={tr("التنقل")}
      >
        <div className="mx-auto flex max-w-xl">
          {mobileNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                className="tabbar-link"
              >
                <span className="tab-icon">
                  <Icon className="size-5" aria-hidden />
                </span>
                {item.to === "/haraj" ? trv(t.harajNav) : trv(item.label)}
              </Link>
            );
          })}
        </div>
      </nav>
      <PopupHost />
    </div>
  );
}

export function SectionTitle({
  title,
  to,
  params,
  search,
  more,
}: {
  title: string;
  to?:
    | "/"
    | "/news"
    | "/israel-news"
    | "/sports-news"
    | "/tech-news"
    | "/social"
    | "/city"
    | "/today"
    | "/buses"
    | "/directory"
    | "/store"
    | "/haraj"
    | "/directory/guide/$guide";
  params?: { guide: string };
  search?: Record<string, string>;
  more?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      {to ? (
        to === "/directory/guide/$guide" ? (
          <Link
            to="/directory/guide/$guide"
            params={{ guide: params?.guide || "post" }}
            className="text-lg font-extrabold tracking-tight text-ink transition hover:text-primary-ink sm:text-xl"
          >
            {trv(title)}
          </Link>
        ) : (
          <Link
            to={to}
            search={search as never}
            className="text-lg font-extrabold tracking-tight text-ink transition hover:text-primary-ink sm:text-xl"
          >
            {trv(title)}
          </Link>
        )
      ) : (
        <h2 className="text-lg font-extrabold tracking-tight sm:text-xl">{trv(title)}</h2>
      )}
      {to && more ? (
        to === "/directory/guide/$guide" ? (
          <Link to="/directory/guide/$guide" params={{ guide: params?.guide || "post" }} className="see-all">
            {trv(more)}
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
        ) : (
          <Link to={to} search={search as never} className="see-all">
            {trv(more)}
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
        )
      ) : null}
    </div>
  );
}

function CartButton() {
  const nativeShell = useNativeShell();
  const showHomeStore = isHomeStoreVisible(useSiteSettings().quickLinks);
  const n = cartCount(useCart());
  if (nativeShell || !showHomeStore || !n) return null;
  return (
    <Link to="/cart" className="btn btn-ghost relative size-11 shrink-0 p-0" aria-label={tr("السلة ({0})", n)}>
      <ShoppingCart className="size-5" aria-hidden />
      <span className="absolute -top-1 -end-1 grid min-w-5 place-items-center rounded-full bg-ink px-1 text-xs font-bold text-paper">
        {trv(n)}
      </span>
    </Link>
  );
}
