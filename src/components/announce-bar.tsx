import { useLocation } from "@tanstack/react-router";
import { Megaphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSiteSettings } from "@/lib/site-settings/context";
import { trv, tr } from "@/lib/i18n/core";
import type { Announcement } from "@/lib/site-settings/types";

const STYLE: Record<Announcement["kind"], string> = {
  info: "bg-[#FFF6DB] text-ink border-[#FDB700]",
  warning: "bg-[#FFE4B5] text-ink border-[#F59E0B]",
  urgent: "bg-[#B91C1C] text-white border-[#7F1D1D]",
};

/** Admin-managed announcement bar. Dismissal is remembered per message revision. */
export function AnnounceBar() {
  const a = useSiteSettings().announce;
  const path = useLocation({ select: (l) => l.pathname });
  const [hidden, setHidden] = useState(false);
  const key = `rp_announce_${a?.rev ?? ""}`;
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(key) === "1");
    } catch {
      /* private mode */
    }
  }, [key]);
  if (!a?.enabled || !a.text || hidden) return null;
  if (a.scope === "buses" && !path.startsWith("/buses")) return null;
  const body = <span className="font-bold leading-snug">{trv(a.text)}</span>;
  return (
    <div className={`border-b ${STYLE[a.kind] ?? STYLE.info}`} role="status">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2 text-sm">
        <Megaphone className="size-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          {a.link ? (
            <a href={a.link} className="underline-offset-2 hover:underline" target={a.link.startsWith("/") ? undefined : "_blank"} rel="noopener">
              {body}
            </a>
          ) : (
            body
          )}
        </div>
        <button
          type="button"
          className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-black/10"
          aria-label={tr("إغلاق")}
          onClick={() => {
            try {
              localStorage.setItem(key, "1");
            } catch {
              /* private mode */
            }
            setHidden(true);
          }}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
