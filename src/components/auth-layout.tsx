import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import logoUrl from "@/assets/logo.jpg";
import { LangSwitcher } from "@/components/lang-switcher";
import { mediaUrl } from "@/lib/media/types";
import { useSiteSettings } from "@/lib/site-settings/context";
import { tr, trv } from "@/lib/i18n/core";

/** Sign-in / reset / admin login: amber band with the logo, one white rounded card on the grey canvas. */
export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  const st = useSiteSettings();
  return (
    <div className="min-h-screen bg-surface text-ink">
      <div className="relative bg-brand pb-20 pt-4">
        <div className="mx-auto flex max-w-md items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-1 rounded-full bg-paper/70 px-3 py-1.5 text-sm font-bold">
            <ArrowRight className="size-4 ltr:rotate-180" aria-hidden />
            {tr("الموقع")}
          </Link>
          <LangSwitcher />
        </div>
        <div className="mx-auto mt-4 flex max-w-md flex-col items-center gap-2 px-4 text-center">
          <img src={st.logoKey ? mediaUrl(st.logoKey) : logoUrl} alt="" width={72} height={72} className="size-[72px] rounded-3xl bg-paper object-cover shadow-md ring-4 ring-paper/60" />
          <p className="text-lg font-extrabold">{trv(st.texts.siteName)}</p>
        </div>
      </div>
      <main className="auth-card relative z-10 mx-auto -mt-14 max-w-md px-4 pb-10">
        <div className="rounded-[2rem] bg-paper p-5 shadow-[0_8px_30px_rgba(16,24,40,0.08)] sm:p-6">
          <h1 className="text-2xl font-extrabold">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm font-semibold text-muted">{subtitle}</p> : null}
          <div className="mt-5 flex flex-col gap-3">{children}</div>
        </div>
        {footer ? <div className="mt-4 px-2 text-center text-xs font-semibold text-muted">{footer}</div> : null}
      </main>
    </div>
  );
}
