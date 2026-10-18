import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdForm } from "@/components/ad-form";
import { NewsForm } from "@/components/news-form";
import { PhotoPicker } from "@/components/photo-picker";
import { Shell } from "@/components/shell";
import { SignInButtons } from "@/components/sign-in";
import { createMyAd } from "@/lib/ads/api";
import { getAuthConfig } from "@/lib/auth/api";
import { createMyNews } from "@/lib/reader-news/api";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { submitBusiness } from "@/lib/directory/api";
import { ownerCategories } from "@/lib/directory/types";
import { seo } from "@/lib/seo";
import { tr, trv } from "@/lib/i18n/core";

const modes = ["خبر", "إعلان", "نشاط"] as const;
type Mode = (typeof modes)[number];

const SIGN_IN_TITLE: Record<Mode, string> = {
  خبر: "سجّل الدخول لترسل خبراً باسمك.",
  إعلان: "سجّل الدخول لتنشر إعلاناً باسمك.",
  نشاط: "سجّل الدخول لتضيف نشاطك إلى الدليل.",
};

export const Route = createFileRoute("/submit")({
  head: () =>
    seo({
      title: tr("أضف خبراً أو إعلاناً أو نشاطاً · رهط بوست"),
      description: tr("أرسل خبراً من رهط، أو إعلاناً مبوباً، أو أضف نشاطك التجاري إلى دليل رهط."),
      path: "/submit",
      robots: "noindex",
    }),
  validateSearch: (search: Record<string, unknown>): { mode?: Mode; name?: string } => ({
    mode: modes.includes(search.mode as Mode) ? (search.mode as Mode) : undefined,
    name: typeof search.name === "string" ? search.name.slice(0, 80) : undefined,
  }),
  loader: () => getAuthConfig(),
  component: SubmitPage,
});

function SubmitPage() {
  const search = Route.useSearch();
  const [mode, setMode] = useState<Mode>(search.mode ?? "خبر");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [bizPhotos, setBizPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  useEffect(() => setStartedAt(Date.now()), [mode]);
  const { user, isPending } = useCurrentUserState();
  const authConfig = Route.useLoaderData();
  // Come back to the same mode (and prefilled business name) after signing in.
  const back = `/submit?${new URLSearchParams({
    mode,
    ...(search.name ? { name: search.name } : {}),
  })}`;

  return (
    <Shell>
      <h1 className="mb-3 text-2xl font-bold">{tr("أضف")}</h1>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {modes.map((item) => (
          <button
            key={item}
            type="button"
            className={
              item === mode
                ? "chip chip-ink justify-center py-2"
                : "chip justify-center bg-paper py-2"
            }
            onClick={() => {
              setMode(item);
              setSent(false);
              setError("");
            }}
          >
            {trv(item)}
          </button>
        ))}
      </div>
      {sent ? (
        <div className="stamp flex flex-col gap-3 p-4">
          <p className="text-lg font-bold">{tr("وصلنا. لن يُنشر قبل المراجعة.")}</p>
          <p className="font-semibold text-muted">{tr("تتابع حالته من صفحة «منشوراتي».")}</p>
          <Link to="/my-posts" className="btn">
            {tr("منشوراتي")}
          </Link>
        </div>
      ) : isPending ? (
        <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>
      ) : !user ? (
        <div className="stamp flex flex-col gap-3 p-4">
          <p className="text-lg font-bold">{trv(SIGN_IN_TITLE[mode])}</p>
          <p className="font-semibold text-muted">
            {tr("لا نقبل منشورات بلا حساب، حتى نعرف من نشر ونمنع الرسائل المزعجة. بعد الدخول تعود إلى هذه الصفحة مباشرة، وتتابع ما أرسلته وحالته من «منشوراتي».")}
          </p>
          <SignInButtons config={authConfig} redirect={back} />
          <p className="text-sm font-semibold text-muted">
            {tr("نعرض اسمك من الحساب مع ما تنشره فقط، ولا ننشر شيئاً على حسابك.")}
          </p>
        </div>
      ) : mode === "خبر" ? (
        <NewsForm
          onSubmit={async (data) => {
            const res = await createMyNews({ data });
            if (!res.ok) return res.message ?? tr("تعذّر الإرسال.");
            setSent(true);
            return null;
          }}
        />
      ) : mode === "إعلان" ? (
        <Link to="/haraj/new" className="btn">{tr("انتقل إلى نموذج إعلان الحراج")}</Link>
      ) : false ? (
        <AdForm
          submitLabel={tr("إرسال للمراجعة")}
          onSubmit={async (data) => {
            const res = await createMyAd({ data });
            if (!res.ok) return res.message ?? tr("تعذّر الإرسال.");
            setSent(true);
            return null;
          }}
        />
      ) : (
        <form
          key={mode}
          className="stamp flex flex-col gap-3 p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            if (uploading) {
              setError(tr("انتظر حتى يكتمل رفع الصورة."));
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
                  photos: bizPhotos,
                  website: get("website"),
                  startedAt,
                },
              });
              if (res.ok) {
                setSent(true);
                setBizPhotos([]);
              } else setError(res.message ?? tr("تعذّر الإرسال."));
            } catch (err) {
              setError(
                err instanceof Error && /[\u0600-\u06ff]/.test(err.message)
                  ? err.message
                  : tr("تحقق من الحقول وحاول مرة أخرى."),
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {mode === "نشاط" ? (
            <>
              <Field label={tr("اسم النشاط")} name="name" max={80} defaultValue={search.name} />
              <label className="block font-bold">
                {tr("التصنيف")}
                <select name="category" required className="field mt-1" defaultValue="">
                  <option value="" disabled>
                    {tr("اختر التصنيف")}
                  </option>
                  {ownerCategories.map((c) => (
                    <option key={c} value={c}>
                      {trv(c)}
                    </option>
                  ))}
                </select>
              </label>
              <Field label={tr("الحي")} name="area" max={60} />
              <Field label={tr("سطر وصف")} name="about" max={160} />
              <PhotoPicker
                kind="business"
                max={1}
                value={bizPhotos}
                onChange={setBizPhotos}
                onBusyChange={setUploading}
                label={tr("شعار أو صورة للمحل (اختياري)")}
                hint={tr("صورة واحدة تظهر في صفحة نشاطك بعد الموافقة.")}
              />
              {/* Honeypot: hidden from people, bots tend to fill it. */}
              <div aria-hidden="true" className="absolute -z-10 h-0 w-0 overflow-hidden opacity-0">
                <label>
                  {tr("الموقع")}
                  <input name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>
            </>
          ) : null}
          <Field label={tr("هاتف للتواصل")} name="phone" type="tel" max={20} />
          {mode === "نشاط" ? (
            <p className="text-sm font-semibold text-muted">
              {tr("يظهر النشاط في الدليل بعلامة «موثّق» بعد أن نراجعه ونتأكد منه، مع الرقم الذي تكتبه هنا.")}
            </p>
          ) : null}
          {error ? <p className="font-bold text-ink">{trv(error)}</p> : null}
          <button type="submit" className="btn" disabled={busy || uploading}>
            {busy ? tr("جاري الإرسال…") : uploading ? tr("جاري رفع الصورة…") : tr("إرسال للمراجعة")}
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
      {trv(label)}
      {long ? (
        <textarea name={name} required maxLength={max} className="field mt-1 min-h-28" />
      ) : (
        <input
          name={name}
          type={type}
          required
          maxLength={max}
          defaultValue={defaultValue}
          className="field mt-1"
        />
      )}
    </label>
  );
}
