import { Download, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { listenForNativeAuth } from "@/lib/auth/native";

/* --------------------------------------------------------------------------------------------
 * Install as an app (PWA): Chromium's beforeinstallprompt on Android/desktop, a short
 * instruction sheet on iOS (Share → إضافة إلى الشاشة الرئيسية). Hidden inside the installed app
 * (display-mode: standalone), inside the store app (Capacitor) and after the user dismisses it.
 * ------------------------------------------------------------------------------------------ */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "rp-install-dismissed";
const DISMISS_DAYS = 30;

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== "undefined") {
  // Registered at module load (part of the main bundle) so an early event isn't missed.
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    notify();
  });
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export type InstallMode = "none" | "prompt" | "ios" | "installed";

function detect(): InstallMode {
  if (typeof window === "undefined") return "none";
  const nav = navigator as Navigator & { standalone?: boolean };
  const w = window as Window & { Capacitor?: { isNativePlatform?: () => boolean } };
  if (
    installed ||
    nav.standalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: minimal-ui)").matches ||
    w.Capacitor?.isNativePlatform?.()
  )
    return "installed";
  if (deferred) return "prompt";
  const ua = nav.userAgent;
  const ios =
    /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && (nav.maxTouchPoints ?? 0) > 1);
  // In-app browsers (Instagram, Facebook…) can't add to the home screen.
  if (ios && !/FBAN|FBAV|Instagram|Line\/|GSA\//.test(ua)) return "ios";
  return "none";
}

/** Current install capability; "none" during SSR and until mounted (no hydration mismatch). */
export function useInstallMode(): InstallMode {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const mode = useSyncExternalStore(subscribe, detect, () => "none" as const);
  return mounted ? mode : "none";
}

function isDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  deferred = null;
  notify();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === "accepted";
}

/** Dismissible banner (home page). Shows only where installing is possible. */
export function InstallBanner() {
  const mode = useInstallMode();
  const [dismissed, setDismissed] = useState(true);
  const [sheet, setSheet] = useState(false);
  useEffect(() => setDismissed(isDismissed()), []);

  if (dismissed || (mode !== "prompt" && mode !== "ios")) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // private mode: just hide for now
    }
    setDismissed(true);
  };

  return (
    <>
      <section className="stamp p-3" aria-label="تثبيت التطبيق">
        <div className="flex items-center gap-3">
          <img src="/icons/icon-192.png" alt="" className="size-12 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="font-bold leading-snug">رهط بوست على شاشتك الرئيسية</p>
            <p className="text-sm font-semibold text-muted">افتحه كتطبيق بلمسة، بدون متجر.</p>
          </div>
          <button
            type="button"
            className="grid size-12 shrink-0 place-items-center rounded-xl text-muted"
            aria-label="إخفاء"
            onClick={dismiss}
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <button
          type="button"
          className="btn mt-3 w-full"
          onClick={async () => {
            if (mode === "ios") setSheet(true);
            else if (await promptInstall()) setDismissed(true);
          }}
        >
          <Download className="size-4" aria-hidden />
          ثبّت التطبيق
        </button>
      </section>
      {sheet ? <IosInstallSheet onClose={() => setSheet(false)} /> : null}
    </>
  );
}

/** Full-width button (the /app page). */
export function InstallButton() {
  const mode = useInstallMode();
  const [sheet, setSheet] = useState(false);
  const [done, setDone] = useState(false);
  if (mode === "installed" || done)
    return (
      <p className="stamp p-4 font-bold">التطبيق مثبّت على هذا الجهاز. افتحه من الشاشة الرئيسية.</p>
    );
  if (mode === "none")
    return (
      <p className="stamp p-4 font-semibold">
        افتح هذه الصفحة في Chrome على أندرويد أو في Safari على آيفون لتثبيت التطبيق. على الكمبيوتر
        استخدم زر التثبيت في شريط عنوان Chrome أو Edge.
      </p>
    );
  return (
    <>
      <button
        type="button"
        className="btn w-full"
        onClick={async () => {
          if (mode === "ios") setSheet(true);
          else if (await promptInstall()) setDone(true);
        }}
      >
        <Download className="size-5" aria-hidden />
        ثبّت التطبيق
      </button>
      {sheet ? <IosInstallSheet onClose={() => setSheet(false)} /> : null}
    </>
  );
}

export function IosInstallSheet({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ios-install-title"
        className="w-full max-w-md rounded-t-3xl bg-paper p-5 pb-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="ios-install-title" className="text-xl font-bold">
            ثبّت رهط بوست على آيفون
          </h2>
          <button
            type="button"
            className="grid size-12 place-items-center rounded-xl"
            aria-label="إغلاق"
            onClick={onClose}
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <ol className="flex flex-col gap-3">
          <li className="flex items-center gap-3">
            <span className="icon-badge shrink-0">
              <Share className="size-5" aria-hidden />
            </span>
            <span className="font-semibold">
              اضغط زر <b>المشاركة</b> في Safari (المربّع مع السهم، أسفل الشاشة أو أعلاها).
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="icon-badge shrink-0">
              <SquarePlus className="size-5" aria-hidden />
            </span>
            <span className="font-semibold">
              اختر <b>«إضافة إلى الشاشة الرئيسية»</b> (قد تحتاج للتمرير للأسفل).
            </span>
          </li>
          <li className="flex items-center gap-3">
            <span className="icon-badge shrink-0 font-bold">3</span>
            <span className="font-semibold">
              اضغط <b>«إضافة»</b>. ستجد أيقونة رهط بوست على شاشتك الرئيسية.
            </span>
          </li>
        </ol>
        <button type="button" className="btn mt-5 w-full" onClick={onClose}>
          فهمت
        </button>
      </div>
    </div>
  );
}

/** Registers /sw.js in production builds only (dev keeps Vite HMR untouched); in the store app,
 * also listens for the sign-in deep link. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    listenForNativeAuth();
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    const register = () =>
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
        console.warn("[sw] registration failed", error);
      });
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
