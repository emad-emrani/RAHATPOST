import { Link } from "@tanstack/react-router";
import { AnnounceBar } from "@/components/announce-bar";
import { Bus, ChevronLeft, ShoppingCart, House, Megaphone, Newspaper, Plus, Siren, Store } from "lucide-react";
import type { ReactNode } from "react";
import logoUrl from "@/assets/logo.jpg";
import { UserMenu } from "@/components/user-menu";
import { LangSwitcher } from "@/components/lang-switcher";
import { PopupHost } from "@/components/popup-host";
import { mediaUrl } from "@/lib/media/types";
import { useSiteSettings } from "@/lib/site-settings/context";
import { cartCount, useCart } from "@/lib/store/cart";
import { tr, trv } from "@/lib/i18n/core";

const NAV = [
  { to: "/", label: "الرئيسية", icon: House, exact: true },
  { to: "/news", label: "الأخبار", icon: Newspaper, exact: false },
  { to: "/today", label: "اليوم", icon: Siren, exact: true },
  { to: "/buses", label: "باصات", icon: Bus, exact: true },
  { to: "/store", label: "المتجر", icon: Store, exact: false },
  { to: "/haraj", label: "حراج", icon: Megaphone, exact: false },
] as const;

export function Shell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const st = useSiteSettings();
  const t = st.texts;
  const nav = st.nav
    .filter((n) => n.visible)
    .map((n) => NAV.find((x) => x.to === n.id))
    .filter((x): x is (typeof NAV)[number] => Boolean(x));
  return (
    <div className="min-h-screen bg-surface text-ink">
      <AnnounceBar />
      <header className="edge-b sticky top-0 z-30 bg-paper">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
          <Link to="/" className="shrink-0 rounded-2xl" aria-label={tr("{0}، الرئيسية", t.siteName)}>
            <img
              src={st.logoKey ? mediaUrl(st.logoKey) : logoUrl}
              alt=""
              width={48}
              height={48}
              className="size-10 rounded-2xl object-cover sm:size-12"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold leading-tight">{trv(t.siteName)}</p>
            {t.tagline ? <p className="text-xs font-semibold text-muted">{trv(t.tagline)}</p> : null}
          </div>
          <CartButton />
          <LangSwitcher />
          <UserMenu />
          <Link to="/submit" className="btn px-3 sm:px-4" aria-label={tr("أضف خبراً أو إعلاناً أو نشاطاً")}>
            <Plus className="size-4" aria-hidden />
            {trv(t.addButton)}
          </Link>
        </div>
        <nav className="mx-auto hidden max-w-3xl gap-1 px-3 pb-2 md:flex" aria-label={tr("الأقسام")}>
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="pill"
              activeProps={{
                className: "bg-primary text-ink shadow-[inset_0_0_0_1px_var(--color-primary-deep)]",
              }}
            >
              {item.to === "/haraj" ? trv(t.harajNav) : trv(item.label)}
            </Link>
          ))}
        </nav>
      </header>

      <main
        className={`mx-auto w-full ${wide ? "max-w-3xl lg:max-w-6xl" : "max-w-3xl"} px-4 pt-4 pb-6`}
      >
        {children}
      </main>

      <footer className="mx-auto max-w-3xl px-4 pb-28 text-sm font-semibold text-muted md:pb-10">
        <nav className="flex flex-wrap gap-x-4 gap-y-1" aria-label={tr("روابط الموقع")}>
          <Link
            to="/privacy"
            className="inline-flex min-h-10 items-center underline-offset-4 hover:underline"
          >
            {tr("سياسة الخصوصية")}
          </Link>
          <Link
            to="/terms"
            className="inline-flex min-h-10 items-center underline-offset-4 hover:underline"
          >
            {tr("شروط الاستخدام")}
          </Link>
          <Link
            to="/app"
            className="inline-flex min-h-10 items-center underline-offset-4 hover:underline"
          >
            {tr("التطبيق")}
          </Link>
        </nav>
        {t.footer ? <p className="mt-1">{trv(t.footer)}</p> : null}
        {t.contactEmail ? (
          <p className="mt-1">
            {tr("للتواصل:")}{" "}
            <a href={`mailto:${t.contactEmail}`} className="underline" dir="ltr">
              {trv(t.contactEmail)}
            </a>
          </p>
        ) : null}
      </footer>

      <nav
        className="edge-t fixed inset-x-0 bottom-0 z-30 bg-paper pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label={tr("التنقل")}
      >
        <div className="mx-auto flex max-w-3xl">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                className="tabbar-link"
              >
                <span className="tab-icon">
                  <Icon className="size-6" aria-hidden />
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
  more,
}: {
  title: string;
  to?: "/" | "/news" | "/israel-news" | "/sports-news" | "/tech-news" | "/today" | "/buses" | "/directory" | "/store" | "/haraj";
  more?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold">{trv(title)}</h2>
      {to && more ? (
        <Link to={to} className="see-all">
          {trv(more)}
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

function CartButton() {
  const n = cartCount(useCart());
  if (!n) return null;
  return (
    <Link to="/cart" className="btn btn-ghost relative size-12 shrink-0 p-0" aria-label={tr("السلة ({0})", n)}>
      <ShoppingCart className="size-5" aria-hidden />
      <span className="absolute -top-1 -end-1 grid min-w-5 place-items-center rounded-full bg-ink px-1 text-xs font-bold text-paper">
        {trv(n)}
      </span>
    </Link>
  );
}
