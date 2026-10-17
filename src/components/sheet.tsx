import { X } from "lucide-react";
import { useEffect, useId, type ReactNode } from "react";
import { tr, trv } from "@/lib/i18n/core";

/** Bottom sheet dialog (mobile-first), closes on Escape / backdrop / X. */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const id = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-paper p-5 pb-8 shadow-xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={id} className="text-xl font-bold">
            {trv(title)}
          </h2>
          <button
            type="button"
            className="grid size-12 shrink-0 place-items-center rounded-xl"
            aria-label={tr("إغلاق")}
            onClick={onClose}
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
