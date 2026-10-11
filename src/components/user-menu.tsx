import { Link } from "@tanstack/react-router";
import { ListChecks, LogOut, UserRound, Smartphone, UserX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

/** Top-bar account control: «دخول» when signed out, avatar menu when signed in. */
export function UserMenu() {
  const { user, isPending } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
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

  if (!user) {
    return (
      <Link to="/login" className="btn btn-ghost size-12 shrink-0 p-0" aria-label="تسجيل الدخول">
        <UserRound className="size-5" aria-hidden />
      </Link>
    );
  }

  const initial = user.displayName.trim().charAt(0) || "؟";

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        className="grid size-12 place-items-center rounded-full"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`حسابي: ${user.displayName}`}
        onClick={() => setOpen((v) => !v)}
      >
        {user.image ? (
          <img
            src={user.image}
            alt=""
            width={40}
            height={40}
            referrerPolicy="no-referrer"
            className="size-10 rounded-full border border-primary-deep object-cover"
          />
        ) : (
          <span className="grid size-10 place-items-center rounded-full border border-primary-deep bg-primary font-bold text-ink">
            {initial}
          </span>
        )}
      </button>
      {open ? (
        <div
          role="menu"
          className="stamp absolute end-0 top-full z-40 mt-2 w-60 overflow-hidden p-1"
        >
          <p className="truncate px-3 py-2 text-sm font-bold">{user.displayName}</p>
          <Link
            to="/my-posts"
            role="menuitem"
            className="flex min-h-12 items-center gap-2 rounded-xl px-3 font-bold hover:bg-surface"
            onClick={() => setOpen(false)}
          >
            <ListChecks className="size-5 text-primary-ink" aria-hidden />
            منشوراتي
          </Link>
          <Link
            to="/app"
            role="menuitem"
            className="flex min-h-12 items-center gap-2 rounded-xl px-3 font-bold hover:bg-surface"
            onClick={() => setOpen(false)}
          >
            <Smartphone className="size-5 text-primary-ink" aria-hidden />
            تطبيق رهط بوست
          </Link>
          <a
            href="/my-posts#delete-account"
            role="menuitem"
            className="flex min-h-12 items-center gap-2 rounded-xl px-3 font-bold hover:bg-surface"
            onClick={() => setOpen(false)}
          >
            <UserX className="size-5 text-primary-ink" aria-hidden />
            حذف حسابي
          </a>
          <button
            type="button"
            role="menuitem"
            className="flex min-h-12 w-full items-center gap-2 rounded-xl px-3 text-start font-bold hover:bg-surface"
            onClick={async () => {
              try {
                await signOut("/");
              } catch {
                setError("تعذّر تسجيل الخروج. حاول مرة أخرى.");
              }
            }}
          >
            <LogOut className="size-5 text-primary-ink" aria-hidden />
            تسجيل خروج
          </button>
          {error ? <p className="px-3 py-2 text-sm font-bold">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
