import { useEffect, useState } from "react";
import { tr, trv } from "@/lib/i18n/core";

export type NewsFormData = {
  title: string;
  body: string;
  sourceUrl: string;
  neighborhood: string;
  website: string;
  startedAt: number;
};

/** Reader news form: title, text, optional source link, place. Returns an error message or null. */
export function NewsForm({
  onSubmit,
  submitLabel = tr("إرسال للمراجعة"),
}: {
  onSubmit: (data: NewsFormData) => Promise<string | null>;
  submitLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [startedAt, setStartedAt] = useState(0);
  useEffect(() => setStartedAt(Date.now()), []);

  return (
    <form
      className="stamp flex flex-col gap-3 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const get = (k: string) => String(form.get(k) ?? "");
        setBusy(true);
        setError("");
        try {
          const message = await onSubmit({
            title: get("title"),
            body: get("body"),
            sourceUrl: get("sourceUrl"),
            neighborhood: get("neighborhood"),
            website: get("website"),
            startedAt,
          });
          if (message) setError(message);
        } catch {
          setError(tr("تعذّر الإرسال. حاول مرة أخرى."));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block font-bold">
        {tr("عنوان الخبر")}
        <input name="title" required minLength={5} maxLength={120} className="field mt-1" />
      </label>
      <label className="block font-bold">
        {tr("نص الخبر: ماذا حدث، متى، ومن المعنيّون؟")}
        <textarea
          name="body"
          required
          minLength={20}
          maxLength={4000}
          className="field mt-1 min-h-40"
        />
      </label>
      <label className="block font-bold">
        {tr("أين؟ (الحي أو المكان)")}
        <input name="neighborhood" required minLength={2} maxLength={60} className="field mt-1" />
      </label>
      <label className="block font-bold">
        {tr("رابط المصدر")} <span className="font-semibold text-muted">{tr("(اختياري)")}</span>
        <input
          name="sourceUrl"
          type="url"
          inputMode="url"
          maxLength={500}
          placeholder="https://"
          dir="ltr"
          className="field mt-1"
        />
      </label>
      {/* Honeypot: hidden from people, bots tend to fill it. */}
      <div aria-hidden="true" className="absolute -z-10 h-0 w-0 overflow-hidden opacity-0">
        <label>
          {tr("الموقع")}
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p className="text-sm font-semibold text-muted">
        {tr("يُنشر الخبر باسمك بعد أن يراجعه فريق رهط بوست. اكتب ما تعرفه بدقة ولا تنشر معلومات شخصية عن أحد.")}
      </p>
      {error ? (
        <p role="alert" className="font-bold">
          {trv(error)}
        </p>
      ) : null}
      <button type="submit" className="btn" disabled={busy}>
        {busy ? tr("جاري الإرسال…") : submitLabel}
      </button>
    </form>
  );
}
