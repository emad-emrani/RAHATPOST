import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/shell";

export const Route = createFileRoute("/submit")({
  head: () => ({ meta: [{ title: "أضف · رهط بوست" }] }),
  component: SubmitPage,
});

const modes = ["خبر", "إعلان", "نشاط"] as const;

function SubmitPage() {
  const [mode, setMode] = useState<(typeof modes)[number]>("خبر");
  const [sent, setSent] = useState(false);

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
          className="stamp flex flex-col gap-3 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setSent(true);
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
              <Field label="اسم النشاط" name="name" />
              <Field label="التصنيف" name="category" />
              <Field label="الحي" name="area" />
              <Field label="سطر وصف" name="about" />
            </>
          ) : null}
          <Field label="هاتف للتواصل" name="phone" />
          <button type="submit" className="btn">
            إرسال للمراجعة
          </button>
        </form>
      )}
    </Shell>
  );
}

function Field({ label, name, long }: { label: string; name: string; long?: boolean }) {
  return (
    <label className="block font-bold">
      {label}
      {long ? (
        <textarea name={name} required className="field mt-1 min-h-28" />
      ) : (
        <input name={name} required className="field mt-1" />
      )}
    </label>
  );
}
