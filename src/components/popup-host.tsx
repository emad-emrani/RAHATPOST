import { useEffect, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { X } from "lucide-react";
import { getActivePopups, trackPopup } from "@/lib/popups/api";
import { pageOf, type Popup } from "@/lib/popups/types";
import { mediaUrl } from "@/lib/media/types";
import { tr, trv } from "@/lib/i18n/core";

const KEY = (id: string) => `popup-seen-${id}`;
function seen(p: Popup): boolean {
  try {
    if (p.freq === "session") return sessionStorage.getItem(KEY(p.id)) === "1";
    if (p.freq === "day") return localStorage.getItem(KEY(p.id)) === new Date().toDateString();
  } catch {
    /* storage blocked */
  }
  return false;
}
function markSeen(p: Popup) {
  try {
    if (p.freq === "session") sessionStorage.setItem(KEY(p.id), "1");
    if (p.freq === "day") localStorage.setItem(KEY(p.id), new Date().toDateString());
  } catch {
    /* storage blocked */
  }
}

/** «الإعلانات المنبثقة»: fetched after the page is idle (no effect on LCP/SEO); one popup at a time. */
export function PopupHost() {
  const { pathname } = useLocation();
  const [list, setList] = useState<Popup[] | null>(null);
  const [open, setOpen] = useState<Popup | null>(null);
  const shownHere = useRef(new Set<string>());
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const start = () => getActivePopups().then(setList).catch(() => setList([]));
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const t = setTimeout(() => (w.requestIdleCallback ? w.requestIdleCallback(start, { timeout: 4000 }) : start()), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!list || open || pathname.startsWith("/admin")) return;
    const page = pageOf(pathname);
    const p = list.find((x) => !shownHere.current.has(x.id) && !seen(x) && (x.pages.includes("all") || x.pages.includes(page)));
    if (!p) return;
    const t = setTimeout(() => {
      shownHere.current.add(p.id);
      markSeen(p);
      setOpen(p);
      void trackPopup({ data: { id: p.id, ev: "view" } }).catch(() => {});
    }, p.delay * 1000);
    return () => clearTimeout(t);
  }, [list, pathname, open]);

  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    window.addEventListener("keydown", onKey);
    const t = open.autoClose > 0 ? setTimeout(() => setOpen(null), open.autoClose * 1000) : undefined;
    return () => {
      window.removeEventListener("keydown", onKey);
      if (t) clearTimeout(t);
    };
  }, [open]);

  if (!open) return null;
  const click = () => void trackPopup({ data: { id: open.id, ev: "click" } }).catch(() => {});
  const body =
    open.kind === "image" ? (
      <img src={mediaUrl(open.image)} alt={open.title || tr("إعلان")} className="mx-auto block h-auto max-h-[85vh] w-auto max-w-full rounded-3xl object-contain" decoding="async" />
    ) : (
      <div className="max-h-[85vh] overflow-y-auto rounded-3xl bg-paper p-6 pt-12 text-center">
        {open.title ? <p className="mb-2 text-xl font-extrabold">{trv(open.title)}</p> : null}
        <p className="whitespace-pre-line text-base font-semibold">{trv(open.text)}</p>
        {open.link ? <span className="btn mt-4 inline-flex">{tr("التفاصيل")}</span> : null}
      </div>
    );
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center pb-[max(1rem,env(safe-area-inset-bottom))] pe-[max(1rem,env(safe-area-inset-right))] ps-[max(1rem,env(safe-area-inset-left))] pt-[max(1rem,env(safe-area-inset-top))]"
      role="dialog" aria-modal="true" aria-label={open.title || tr("إعلان")}>
      <button type="button" className="absolute inset-0 h-full w-full cursor-default bg-black/55" aria-label={tr("إغلاق")} tabIndex={-1} onClick={() => setOpen(null)} />
      <div className={`relative max-w-[min(90vw,32rem)] ${open.kind === "image" ? "w-fit" : "w-[min(90vw,26rem)]"}`}>
        <button
          ref={closeBtn}
          type="button"
          onClick={() => setOpen(null)}
          aria-label={tr("إغلاق الإعلان")}
          className="absolute end-2 top-2 z-10 grid size-11 place-items-center rounded-full bg-paper/95 text-ink shadow-lg ring-1 ring-line"
        >
          <X className="size-5" aria-hidden />
        </button>
        {open.link ? (
          <a href={open.link} target="_blank" rel="noopener sponsored" onClick={click} className="block">
            {body}
          </a>
        ) : (
          body
        )}
      </div>
    </div>
  );
}
