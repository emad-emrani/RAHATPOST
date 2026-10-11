import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { submitBusiness } from "@/lib/directory/api";
import { ownerCategories } from "@/lib/directory/types";

const modes = ["خبر", "إعلان", "نشاط"] as const;
type Mode = (typeof modes)[number];

export const Route = createFileRoute("/submit")({
  head: () => ({ meta: [{ title: "أضف · رهط بوست" }] }),
  validateSearch: (search: Record<string, unknown>): { mode?: Mode; name?: string } => ({
    mode: modes.includes(search.mode as Mode) ? (search.mode as Mode) : undefined,
    name: typeof search.name === "string" ? search.name.slice(0, 80) : undefined,
  }),
  component: SubmitPage,
});

function SubmitPage() {
  const search = Route.useSearch();
  const [mode, setMode] = useState<Mode>(search.mode ?? "خبر");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  useEffect(() => setStartedAt(Date.now()), [mode]);

  return (
    <Shell>
      <h1 className="mb-3 text-3xl font-bold">أضف</h1>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {modes.map((item) => (
          <button
            key={item}
            type="button"
            className={item === mode ? "chip chip-ink justify-center py-2" : "chip justify-center bg-paper py-2"}
            onClick={() => {
              setMode(item);
              setSent(false);
              setError("");
            }}
          >
            {item}
          </button>
        ))}
      </div>
      {sent ? (
        <p className="stamp p-4 text-lg font-bold">وصلنا. لن يُنشر قبل المراجعة.</p>
      ) : (
        <form
          key={mode}
          className="stamp flex flex-col gap-3 p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            if (mode !== "نشاط") {
              setSent(true);
              return;
            }
            const form = new FormData(event.currentTarget);
            const get = (k: string) => String(form.get(k) ?? "");
            setBusy(true);
            try {
              const res = await submitBusiness({
                data: {
                  name: get("name"),
                  category: get("category"),
                  area: get("area"),
                  about: get("about"),
                  phone: get("phone"),
                  website: get("website"),
                  startedAt,
                },
              });
              if (res.ok) setSent(true);
              else setError(res.message ?? "تعذّر الإرسال.");
            } catch (err) {
              setError(err instanceof Error && /[\u0600-\u06ff]/.test(err.message) ? err.message : "تحقق من الحقول وحاول مرة أخرى.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {mode === "خبر" ? (
            <>
              <Field label="ماذا حدث؟" name="what" />
              <Field label="أين في رهط؟" name="where" />
            </>
          ) : null}
          {mode === "إعلان" ? (
            <>
              <Field label="عنوان الإعلان" name="title" />
              <Field label="التفاصيل" name="body" long />
              <Field label="الحي" name="area" />
            </>
          ) : null}
          {mode === "نشاط" ? (
            <>
              <Field label="اسم النشاط" name="name" max={80} defaultValue={search.name} />
              <label className="block font-bold">
                التصنيف
                <select name="category" required className="field mt-1" defaultValue="">
                  <option value="" disabled>
                    اختر التصنيف
                  </option>
                  {ownerCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="الحي" name="area" max={60} />
              <Field label="سطر وصف" name="about" max={160} />
              {/* Honeypot: hidden from people, bots tend to fill it. */}
              <div aria-hidden="true" className="absolute -z-10 h-0 w-0 overflow-hidden opacity-0">
                <label>
                  الموقع
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
            </>
          ) : null}
          <Field label="هاتف للتواصل" name="phone" type="tel" max={20} />
          {mode === "نشاط" ? (
            <p className="text-sm font-semibold text-muted">
              يظهر النشاط في الدليل بعلامة «موثّق» بعد أن نراجعه ونتأكد منه، مع الرقم الذي تكتبه هنا.
            </p>
          ) : null}
          {error ? <p className="font-bold text-ink">{error}</p> : null}
          <button type="submit" className="btn" disabled={busy}>
            {busy ? "جاري الإرسال…" : "إرسال للمراجعة"}
          </button>
        </form>
      )}
    </Shell>
  );
}

function Field({
  label,
  name,
  long,
  max,
  type = "text",
  defaultValue,
}: {
  label: string;
  name: string;
  long?: boolean;
  max?: number;
  type?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block font-bold">
      {label}
      {long ? (
        <textarea name={name} required maxLength={max} className="field mt-1 min-h-28" />
      ) : (
        <input name={name} type={type} required maxLength={max} defaultValue={defaultValue} className="field mt-1" />
      )}
    </label>
  );
}
