import { Link } from "@tanstack/react-router";
import { Bus, ChevronLeft, House, Megaphone, Newspaper, Plus, Siren, Store } from "lucide-react";
import type { ReactNode } from "react";
import logoUrl from "@/assets/logo.jpg";

const nav = [
  { to: "/", label: "الرئيسية", icon: House, exact: true },
  { to: "/news", label: "الأخبار", icon: Newspaper, exact: false },
  { to: "/today", label: "اليوم", icon: Siren, exact: true },
  { to: "/buses", label: "باصات", icon: Bus, exact: true },
  { to: "/directory", label: "الدليل", icon: Store, exact: false },
  { to: "/ads", label: "الإعلانات", icon: Megaphone, exact: false },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="edge-b sticky top-0 z-30 bg-paper">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2">
          <Link to="/" className="shrink-0 rounded-2xl" aria-label="رهط بوست، الرئيسية">
            <img src={logoUrl} alt="" className="h-12 w-12 rounded-2xl object-cover" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold leading-tight">رهط بوست</p>
            <p className="text-xs font-semibold text-muted">رهط والنقب</p>
          </div>
          <Link to="/submit" className="btn px-4" aria-label="أضف خبراً أو إعلاناً أو نشاطاً">
            <Plus className="size-4" aria-hidden />
            أضف
          </Link>
        </div>
        <nav className="mx-auto hidden max-w-3xl gap-1 px-3 pb-2 md:flex" aria-label="الأقسام">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="pill"
              activeProps={{ className: "bg-primary-soft text-primary-deep" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-28 md:pb-16">{children}</main>

      <footer className="mx-auto hidden max-w-3xl px-4 pb-8 text-sm font-semibold text-muted md:block">
        أرقام الطوارئ الوطنية حقيقية. الأخبار والدليل والباصات من مصادر حقيقية مذكورة في كل صفحة، وبقية الإعلانات نماذج.
      </footer>

      <nav
        className="edge-t fixed inset-x-0 bottom-0 z-30 bg-paper pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="التنقل"
      >
        <div className="mx-auto flex max-w-3xl">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} activeOptions={{ exact: item.exact }} className="tabbar-link">
                <Icon className="size-6" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function SectionTitle({
  title,
  to,
  more,
}: {
  title: string;
  to?: "/" | "/news" | "/today" | "/buses" | "/directory" | "/ads";
  more?: string;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-lg font-bold">{title}</h2>
      {to && more ? (
        <Link to={to} className="see-all">
          {more}
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
