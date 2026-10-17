import { Flag } from "lucide-react";
import { useRef, useState } from "react";
import { Sheet } from "@/components/sheet";
import { reportContent } from "@/lib/reports/api";
import { REPORT_REASONS, type ReportTarget } from "@/lib/reports/types";
import { tr, trv } from "@/lib/i18n/core";

/** «إبلاغ» link + sheet for reporting a reader post, ad, business or comment (no sign-in needed). */
export function ReportButton({
  type,
  id,
  label = tr("إبلاغ عن مشكلة"),
  compact = false,
}: {
  type: ReportTarget;
  id: string;
  label?: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`inline-flex ${compact ? "min-h-10" : "min-h-12"} items-center gap-1 text-sm font-bold text-muted underline-offset-4 hover:underline`}
        onClick={() => setOpen(true)}
        disabled={done}
      >
        <Flag className="size-4" aria-hidden />
        {done ? tr("تم الإبلاغ") : label}
      </button>
      {open ? (
        <ReportSheet
          type={type}
          id={id}
          onClose={() => setOpen(false)}
          onDone={() => setDone(true)}
        />
      ) : null}
    </>
  );
}

function ReportSheet({
  type,
  id,
  onClose,
  onDone,
}: {
  type: ReportTarget;
  id: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const startedAt = useRef(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <Sheet title={tr("شكراً لك")} onClose={onClose}>
        <p className="font-semibold">
          {tr("وصل البلاغ إلى فريق رهط بوست وسنراجعه قريباً. المنشورات التي تتلقى عدة بلاغات تُخفى مؤقتاً حتى المراجعة.")}
        </p>
        <button type="button" className="btn mt-5 w-full" onClick={onClose}>
          {tr("إغلاق")}
        </button>
      </Sheet>
    );
  }

  return (
    <Sheet title={tr("إبلاغ عن هذا المنشور")} onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          setBusy(true);
          setError("");
          try {
            const res = await reportContent({
              data: {
                type,
                id,
                reason: String(form.get("reason") ?? ""),
                note: String(form.get("note") ?? ""),
                website: String(form.get("website") ?? ""),
                startedAt: startedAt.current,
              },
            });
            if (res.ok) {
              setSent(true);
              onDone();
            } else setError(res.message ?? tr("تعذّر إرسال البلاغ."));
          } catch {
            setError(tr("تعذّر إرسال البلاغ. تحقق من الاتصال."));
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-bold">{tr("ما المشكلة؟")}</legend>
          {REPORT_REASONS.map((reason) => (
            <label key={reason} className="chip min-h-12 cursor-pointer justify-start gap-3 px-4">
              <input
                type="radio"
                name="reason"
                value={reason}
                required
                className="size-5 accent-[var(--color-ink)]"
              />
              <span className="font-semibold">{trv(reason)}</span>
            </label>
          ))}
        </fieldset>
        <label className="block font-bold">
          {tr("ملاحظة (اختياري)")}
          <textarea
            name="note"
            maxLength={500}
            rows={3}
            className="field mt-1"
            placeholder={tr("أضف تفاصيل تساعدنا في المراجعة")}
          />
        </label>
        {/* Honeypot: hidden from people, filled by bots. */}
        <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
        {error ? (
          <p role="alert" className="font-bold">
            {trv(error)}
          </p>
        ) : null}
        <button type="submit" className="btn w-full" disabled={busy}>
          {busy ? tr("جاري الإرسال…") : tr("أرسل البلاغ")}
        </button>
      </form>
    </Sheet>
  );
}
