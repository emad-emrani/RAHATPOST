import { Link } from "@tanstack/react-router";
import { Bus, House, Megaphone, Newspaper, Siren, Store } from "lucide-react";
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
    <div className="min-h-screen bg-brand text-ink">
      <header className="edge-b sticky top-0 z-30 bg-brand">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2">
          <Link to="/" className="shrink-0 rounded-lg">
            <img src={logoUrl} alt="" className="h-16 w-16 object-cover" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold leading-none">رهط بوست</p>
            <p className="text-sm font-semibold text-ink/70">رهط والنقب</p>
          </div>
          <Link to="/submit" className="btn px-4">
            أضف
          </Link>
        </div>
        <nav className="mx-auto hidden max-w-3xl gap-2 px-4 pb-3 md:flex">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="pill"
              activeProps={{ className: "bg-ink text-brand" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pt-4 pb-28 md:pb-16">{children}</main>

      <footer className="mx-auto hidden max-w-3xl px-4 pb-8 text-sm font-semibold text-ink/70 md:block">
        نسخة عرض بألوان الشعار. أرقام الطوارئ الوطنية حقيقية، وبقية الأرقام نماذج.
      </footer>

      <nav className="edge-t fixed inset-x-0 bottom-0 z-30 bg-brand md:hidden">
        <div className="mx-auto flex max-w-3xl">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                className="flex flex-1 flex-col items-center gap-1 py-2 text-xs font-bold"
                activeProps={{ className: "bg-ink text-brand" }}
                inactiveProps={{ className: "text-ink" }}
              >
                <Icon className="size-5" aria-hidden />
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
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="text-xl font-bold">{title}</h2>
      {to && more ? (
        <Link to={to} className="text-sm font-bold underline decoration-2 underline-offset-4">
          {more}
        </Link>
      ) : null}
    </div>
  );
}
