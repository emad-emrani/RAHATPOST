import { Link } from "@tanstack/react-router";
import { Bus, ChevronLeft, ShoppingCart, House, MapPin, Megaphone, Newspaper, Plus, Siren, Store } from "lucide-react";
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

const NAV = [
  { to: "/", label: "الرئيسية", icon: House, exact: true },
  { to: "/news", label: "الأخبار", icon: Newspaper, exact: false },
  { to: "/buses", label: "باصات", icon: Bus, exact: true },
  { to: "/directory", label: "الدليل", icon: MapPin, exact: false },
  { to: "/haraj", label: "حراج", icon: Megaphone, exact: false },
  { to: "/today", label: "اليوم", icon: Siren, exact: true },
  { to: "/store", label: "المتجر", icon: Store, exact: false },
] as const;

export function Shell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const st = useSiteSettings();
  const t = st.texts;
  const nav = st.nav
    .filter((n) => n.visible)
    .map((n) => NAV.find((x) => x.to === n.id))
    .filter((x): x is (typeof NAV)[number] => Boolean(x));

  // Keep mobile bottom bar comfortable with the 5 most essential destinations
  const mobilePriority = ["/", "/news", "/buses", "/directory", "/haraj"];
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
          <nav className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-3" aria-label={tr("أقسام رهط بوست")}>
            <Link to="/" className="inline-flex min-h-8 items-center font-bold text-ink underline-offset-4 hover:underline">
              {tr("الرئيسية")}
            </Link>
            <Link to="/news" className="inline-flex min-h-8 items-center font-bold text-ink underline-offset-4 hover:underline">
              {tr("أخبار رهط والنقب")}
            </Link>
            <Link to="/today" className="inline-flex min-h-8 items-center font-bold text-ink underline-offset-4 hover:underline">
              {tr("لوحة اليوم والطقس والصلاة")}
            </Link>
            <Link to="/buses" className="inline-flex min-h-8 items-center font-bold text-ink underline-offset-4 hover:underline">
              {tr("باصات رهط")}
            </Link>
            <Link to="/directory" className="inline-flex min-h-8 items-center font-bold text-ink underline-offset-4 hover:underline">
              {tr("دليل محلات وخدمات رهط")}
            </Link>
            <Link
              to="/directory/guide/$guide"
              params={{ guide: "post" }}
              className="inline-flex min-h-8 items-center font-bold text-ink underline-offset-4 hover:underline"
            >
              {tr("دليل بريد رهط")}
            </Link>
            <Link
              to="/directory/guide/$guide"
              params={{ guide: "municipality" }}
              className="inline-flex min-h-8 items-center font-bold text-ink underline-offset-4 hover:underline"
            >
              {tr("دليل بلدية رهط والأرنونا")}
            </Link>
            <Link
              to="/directory/guide/$guide"
              params={{ guide: "health" }}
              className="inline-flex min-h-8 items-center font-bold text-ink underline-offset-4 hover:underline"
            >
              {tr("دليل الصحة والطوارئ")}
            </Link>
            <Link
              to="/directory/guide/$guide"
              params={{ guide: "transport" }}
              className="inline-flex min-h-8 items-center font-bold text-ink underline-offset-4 hover:underline"
            >
              {tr("دليل خطوط باصات رهط")}
            </Link>
            <Link to="/haraj" className="inline-flex min-h-8 items-center font-bold text-ink underline-offset-4 hover:underline">
              {tr("حراج رهط")}
            </Link>
            <Link to="/store" className="inline-flex min-h-8 items-center font-bold text-ink underline-offset-4 hover:underline">
              {tr("المتجر")}
            </Link>
            <Link to="/sports-news" className="inline-flex min-h-8 items-center font-bold text-ink underline-offset-4 hover:underline">
              {tr("أخبار الرياضة")}
            </Link>
            <Link to="/tech-news" className="inline-flex min-h-8 items-center font-bold text-ink underline-offset-4 hover:underline">
              {tr("أخبار التقنية")}
            </Link>
            <Link to="/israel-news" className="inline-flex min-h-8 items-center font-bold text-ink underline-offset-4 hover:underline">
              {tr("أخبار إسرائيل بالعربية")}
            </Link>
          </nav>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-xs">
            <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label={tr("روابط الموقع")}>
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
  more,
}: {
  title: string;
  to?:
    | "/"
    | "/news"
    | "/israel-news"
    | "/sports-news"
    | "/tech-news"
    | "/today"
    | "/buses"
    | "/directory"
    | "/store"
    | "/haraj"
    | "/directory/guide/$guide";
  params?: { guide: string };
  more?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-extrabold tracking-tight sm:text-xl">{trv(title)}</h2>
      {to && more ? (
        to === "/directory/guide/$guide" ? (
          <Link to="/directory/guide/$guide" params={{ guide: params?.guide || "post" }} className="see-all">
            {trv(more)}
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
        ) : (
          <Link to={to} className="see-all">
            {trv(more)}
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
        )
      ) : null}
    </div>
  );
}

function CartButton() {
  const n = cartCount(useCart());
  if (!n) return null;
  return (
    <Link to="/cart" className="btn btn-ghost relative size-11 shrink-0 p-0" aria-label={tr("السلة ({0})", n)}>
      <ShoppingCart className="size-5" aria-hidden />
      <span className="absolute -top-1 -end-1 grid min-w-5 place-items-center rounded-full bg-ink px-1 text-xs font-bold text-paper">
        {trv(n)}
      </span>
    </Link>
  );
}
