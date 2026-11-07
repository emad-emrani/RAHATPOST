import { Link } from "@tanstack/react-router";
import {
  ShoppingBag,
  ListChecks,
  LogIn,
  LogOut,
  Moon,
  Sun,
  UserRound,
  Smartphone,
  UserX,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { tr, trv } from "@/lib/i18n/core";

export function readDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const saved = window.localStorage.getItem("rp_dark_mode");
    if (saved === "1" || saved === "true" || saved === "dark") return true;
    if (saved === "0" || saved === "false" || saved === "light") return false;
    return document.documentElement.getAttribute("data-theme") === "dark";
  } catch {
    return false;
  }
}

export function applyDarkMode(dark: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("rp_dark_mode", dark ? "1" : "0");
    if (dark) {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      document.documentElement.classList.remove("dark");
    }
    window.dispatchEvent(new CustomEvent("rp-dark-mode-changed", { detail: { dark } }));
  } catch {
    /* ignore */
  }
}

export function useDarkMode(): [boolean, (next?: boolean) => void] {
  const [dark, setDark] = useState<boolean>(() => readDarkMode());

  useEffect(() => {
    setDark(readDarkMode());
    const onSync = () => setDark(readDarkMode());
    window.addEventListener("rp-dark-mode-changed", onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener("rp-dark-mode-changed", onSync);
      window.removeEventListener("storage", onSync);
    };
  }, []);

  const toggle = useCallback((forced?: boolean) => {
    const next = typeof forced === "boolean" ? forced : !readDarkMode();
    applyDarkMode(next);
    setDark(next);
  }, []);

  return [dark, toggle];
}

/** Reusable Dark Mode switch card for Profile dropdown, /my-posts, and /login. */
export function DarkModeProfileSwitch({ compact = false }: { compact?: boolean }) {
  const [dark, toggleDark] = useDarkMode();
  return (
    <button
      type="button"
      onClick={() => toggleDark(!dark)}
      className={`flex w-full items-center justify-between gap-2.5 rounded-xl transition ${
        compact
          ? "min-h-12 px-3 py-2 hover:bg-surface"
          : "border border-line bg-surface/80 px-4 py-3 shadow-xs hover:border-primary-deep"
      }`}
      aria-pressed={dark}
    >
      <span className="flex items-center gap-2.5 text-start">
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-xl transition ${
            dark
              ? "bg-primary text-[#111827] shadow-xs"
              : "bg-primary-soft text-primary-ink"
          }`}
        >
          {dark ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-extrabold text-ink">
            {dark ? tr("الوضع الداكن مفعّل") : tr("الوضع الداكن")}
          </span>
          <span className="block text-[11px] font-bold text-muted">
            {dark ? tr("مظهر ليلي مريح للعين") : tr("اضغط لتفعيل المظهر الليلي")}
          </span>
        </span>
      </span>

      <span
        dir="ltr"
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
          dark
            ? "border-primary-deep bg-primary"
            : "border-line bg-muted/25"
        }`}
      >
        <span
          className={`inline-block size-4.5 rounded-full shadow-sm transition-transform ${
            dark
              ? "translate-x-5 bg-[#111827]"
              : "translate-x-0.5 bg-white"
          }`}
        />
      </span>
    </button>
  );
}

/** Top-bar account & profile control with built-in Dark Mode toggle. */
export function UserMenu() {
  const { user, isPending } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [dark] = useDarkMode();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (isPending) return <span className="size-12 shrink-0" aria-hidden />;

  const initial = user ? user.displayName.trim().charAt(0) || tr("؟") : "";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        className={
          user
            ? "relative grid size-12 place-items-center rounded-full"
            : "btn btn-ghost relative size-12 shrink-0 p-0"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={user ? tr("حسابي: {0}", user.displayName) : tr("الملف الشخصي وتسجيل الدخول")}
        onClick={() => setOpen((v) => !v)}
      >
        {user ? (
          user.image ? (
            <img
              src={user.image}
              alt=""
              width={40}
              height={40}
              referrerPolicy="no-referrer"
              className="size-10 rounded-full border border-primary-deep object-cover"
            />
          ) : (
            <span className="grid size-10 place-items-center rounded-full border border-primary-deep bg-primary font-bold text-[#111827]">
              {trv(initial)}
            </span>
          )
        ) : (
          <UserRound className="size-5" aria-hidden />
        )}
        {dark ? (
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-0.5 -end-0.5 grid size-4 place-items-center rounded-full border border-paper bg-[#111827] text-[9px] text-[#f2c94c] shadow-xs"
          >
            🌙
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="stamp absolute end-0 top-full z-50 mt-2 w-68 overflow-hidden p-1.5 shadow-2xl"
        >
          {user ? (
            <div className="mb-1 flex items-center gap-2.5 rounded-xl bg-surface/70 px-3 py-2.5">
              {user.image ? (
                <img
                  src={user.image}
                  alt=""
                  width={36}
                  height={36}
                  referrerPolicy="no-referrer"
                  className="size-9 shrink-0 rounded-full border border-primary-deep object-cover"
                />
              ) : (
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-primary-deep bg-primary text-sm font-extrabold text-[#111827]">
                  {trv(initial)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-ink">{trv(user.displayName)}</p>
                <p className="truncate text-[11px] font-semibold text-muted">
                  {tr("الملف الشخصي وإعدادات الحساب")}
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-1 rounded-xl bg-surface/70 px-3 py-2.5">
              <p className="text-sm font-extrabold text-ink">{tr("الملف الشخصي والمظهر")}</p>
              <p className="text-[11px] font-semibold text-muted">
                {tr("خصّص مظهر التصفح أو سجّل دخولك")}
              </p>
            </div>
          )}

          {/* Dark Mode Toggle inside Profile Menu */}
          <div className="my-1 border-y border-line/70 py-1">
            <DarkModeProfileSwitch compact />
          </div>

          {user ? (
            <>
              <Link
                to="/my-posts"
                role="menuitem"
                className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-bold hover:bg-surface"
                onClick={() => setOpen(false)}
              >
                <ListChecks className="size-5 text-primary-ink" aria-hidden />
                {tr("ملفي الشخصي ومنشوراتي")}
              </Link>
              <Link
                to="/my-orders"
                role="menuitem"
                className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-bold hover:bg-surface"
                onClick={() => setOpen(false)}
              >
                <ShoppingBag className="size-5 text-primary-ink" aria-hidden />
                {tr("طلباتي")}
              </Link>
              <Link
                to="/app"
                role="menuitem"
                className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-bold hover:bg-surface"
                onClick={() => setOpen(false)}
              >
                <Smartphone className="size-5 text-primary-ink" aria-hidden />
                {tr("تطبيق رهط بوست")}
              </Link>
              <a
                href="/my-posts#delete-account"
                role="menuitem"
                className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-bold hover:bg-surface"
                onClick={() => setOpen(false)}
              >
                <UserX className="size-5 text-primary-ink" aria-hidden />
                {tr("حذف حسابي")}
              </a>
              <button
                type="button"
                role="menuitem"
                className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-start text-sm font-bold text-red-600 hover:bg-surface"
                onClick={async () => {
                  try {
                    await signOut("/");
                  } catch {
                    setError(tr("تعذّر تسجيل الخروج. حاول مرة أخرى."));
                  }
                }}
              >
                <LogOut className="size-5" aria-hidden />
                {tr("تسجيل خروج")}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                role="menuitem"
                className="mt-1 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-extrabold text-[#111827] shadow-xs transition hover:brightness-95"
                onClick={() => setOpen(false)}
              >
                <LogIn className="size-4" aria-hidden />
                {tr("تسجيل الدخول / حساب جديد")}
              </Link>
              <Link
                to="/app"
                role="menuitem"
                className="mt-1 flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-bold hover:bg-surface"
                onClick={() => setOpen(false)}
              >
                <Smartphone className="size-5 text-primary-ink" aria-hidden />
                {tr("تطبيق رهط بوست")}
              </Link>
              <div className="mt-1 flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-muted">
                <ShieldCheck className="size-3.5 text-emerald-600" aria-hidden />
                {tr("حماية وأمان بيانات المستخدمين مفعّلة")}
              </div>
            </>
          )}
          {error ? <p className="px-3 py-2 text-sm font-bold text-red-600">{trv(error)}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
