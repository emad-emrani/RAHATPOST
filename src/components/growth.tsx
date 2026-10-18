import { Bell, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SITE_URL } from "@/lib/seo";
import { tr } from "@/lib/i18n/core";

function WhatsAppIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.2-.6-.4zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zm8.4-18.2A11.8 11.8 0 0 0 1.7 17.9L0 24l6.3-1.7A11.8 11.8 0 0 0 23.8 12c0-3.2-1.2-6.2-3.4-8.4z" />
    </svg>
  );
}

/** Green «شارك على واتساب» button: wa.me/?text=<title> + the page's canonical URL. */
export function ShareWhatsApp({ title, path, className = "" }: { title: string; path: string; className?: string }) {
  const url = `${SITE_URL}${path}`;
  const href = `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-[#1EBE5A] ${className}`}
    >
      <WhatsAppIcon />
      {tr("شارك على واتساب")}
    </a>
  );
}

const KEY = "rp_push_cta_dismissed";

/**
 * Small «فعّل التنبيهات» banner. Hidden when push is unsupported, already subscribed, denied,
 * or dismissed (remembered 30 days). The push client loads only after the page is idle.
 */
export function PushCta({ className = "" }: { className?: string }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  useEffect(() => {
    try {
      const t = Number(localStorage.getItem(KEY) || 0);
      if (t && Date.now() - t < 30 * 864e5) return;
    } catch {}
    if (!("serviceWorker" in navigator && "PushManager" in window && "Notification" in window)) return;
    if (Notification.permission === "denied") return;
    const id = setTimeout(async () => {
      const { currentSubscription } = await import("@/lib/push/client");
      if (!(await currentSubscription().catch(() => null))) setShow(true);
    }, 1500);
    return () => clearTimeout(id);
  }, []);
  if (!show) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {}
    setShow(false);
  };
  return (
    <div className={`stamp flex items-center gap-3 border-[#FDB700] bg-[#FFF6DB] p-3 ${className}`} role="region" aria-label={tr("التنبيهات")}>
      <span className="icon-badge shrink-0">
        <Bell className="size-5" aria-hidden />
      </span>
      <p className="min-w-0 flex-1 text-sm font-bold leading-snug">
        {msg || tr("وصلك خبر رهط العاجل أولاً بأول — بدون إزعاج.")}
      </p>
      <button
        type="button"
        disabled={busy}
        className="shrink-0 rounded-xl bg-[#FDB700] px-3 py-2 text-sm font-bold text-ink disabled:opacity-60"
        onClick={async () => {
          setBusy(true);
          const { enablePush } = await import("@/lib/push/client");
          const err = await enablePush().catch(() => tr("تعذّر التفعيل."));
          setBusy(false);
          if (err) setMsg(err);
          else {
            setMsg(tr("تم تفعيل التنبيهات ✓"));
            setTimeout(() => setShow(false), 2500);
          }
        }}
      >
        {tr("فعّل التنبيهات")}
      </button>
      <button type="button" onClick={dismiss} className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-black/5" aria-label={tr("إغلاق")}>
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
