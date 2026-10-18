import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n/core";
import { adminGetEmailTemplates, adminSaveEmailTemplates, adminTestEmail } from "@/lib/email/api";
import { EMAIL_LANGS, type EmailKind, type EmailLang, type EmailTemplates, type EmailText } from "@/lib/email/templates";

const LANG_LABEL: Record<EmailLang, string> = { ar: "العربية", he: "עברית", en: "English" };

/** «رسائل البريد»: welcome + password-reset texts (ar/he/en), welcome on/off, test send. */
export function EmailAdmin() {
  const [t, setT] = useState<EmailTemplates | null>(null);
  const [meta, setMeta] = useState({ authed: true, ready: false, myEmail: "" });
  const [kind, setKind] = useState<EmailKind>("welcome");
  const [lang, setLang] = useState<EmailLang>("ar");
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    adminGetEmailTemplates().then((r) => {
      setMeta({ authed: r.authed, ready: r.ready, myEmail: r.myEmail });
      setT(r.templates);
    });
  }, []);
  if (!meta.authed) return <p className="stamp p-4 font-bold">{tr("هذا القسم لمالك الموقع فقط.")}</p>;
  if (!t) return <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>;
  const cur = t[kind][lang];
  const set = (p: Partial<EmailText>) => setT({ ...t, [kind]: { ...t[kind], [lang]: { ...cur, ...p } } });
  const field = (k: keyof EmailText, label: string, area = false) => (
    <label className="block text-sm font-bold">
      {label}
      {area ? (
        <textarea className="field mt-1 min-h-48" dir={lang === "en" ? "ltr" : "rtl"} value={cur[k]} onChange={(e) => set({ [k]: e.target.value })} />
      ) : (
        <input className="field mt-1" dir={lang === "en" ? "ltr" : "rtl"} value={cur[k]} onChange={(e) => set({ [k]: e.target.value })} />
      )}
    </label>
  );
  return (
    <div className="flex flex-col gap-3">
      {!meta.ready ? <p className="stamp p-3 font-bold">{tr("مزوّد البريد غير مضبوط (RESEND_API_KEY و STORE_EMAIL_FROM)، فلن تُرسل الرسائل.")}</p> : null}
      <label className="stamp flex items-center gap-3 p-3 font-bold">
        <input type="checkbox" className="size-5" checked={t.welcomeEnabled} onChange={(e) => setT({ ...t, welcomeEnabled: e.target.checked })} />
        {tr("إرسال رسالة ترحيب لكل عضو جديد (Google وFacebook والبريد)")}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {(["welcome", "reset"] as const).map((k) => (
          <button key={k} type="button" className={kind === k ? "chip chip-ink justify-center py-2" : "chip justify-center py-2"} onClick={() => setKind(k)}>
            {k === "welcome" ? tr("رسالة الترحيب") : tr("إعادة تعيين كلمة المرور")}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {EMAIL_LANGS.map((l) => (
          <button key={l} type="button" className={lang === l ? "chip chip-ink justify-center" : "chip justify-center"} onClick={() => setLang(l)}>
            {LANG_LABEL[l]}
          </button>
        ))}
      </div>
      <div className="stamp flex flex-col gap-2 p-4">
        {field("subject", tr("العنوان (Subject)"))}
        {field("heading", tr("العنوان داخل الرسالة"))}
        {field("body", tr("النص (سطر فارغ = فقرة جديدة)"), true)}
        {field("button", tr("نص الزر"))}
        <p className="text-xs font-semibold text-muted">{tr("المتغيرات: {name} اسم العضو، {site} اسم الموقع، {link} الرابط. تُرسل الرسالة بلغة الموقع التي كان العضو يتصفح بها.")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn flex-1" onClick={async () => setMsg((await adminSaveEmailTemplates({ data: { templates: t } })).ok ? tr("تم الحفظ.") : tr("تعذّر الحفظ."))}>
          {tr("حفظ")}
        </button>
      </div>
      <div className="stamp flex flex-col gap-2 p-4">
        <p className="font-bold">{tr("إرسال تجربة")}</p>
        {meta.myEmail ? (
          <p className="text-sm font-semibold text-muted" dir="ltr">{meta.myEmail}</p>
        ) : (
          <input className="field" type="email" dir="ltr" placeholder={tr("بريدك")} value={to} onChange={(e) => setTo(e.target.value)} />
        )}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={async () => {
            await adminSaveEmailTemplates({ data: { templates: t } });
            const r = await adminTestEmail({ data: { kind, lang, to } });
            setMsg(r.ok ? tr("أُرسلت التجربة إلى {0}.", r.to) : tr("تعذّر الإرسال."));
          }}
        >
          {tr("احفظ وأرسل تجربة لي")}
        </button>
      </div>
      {msg ? <p className="stamp p-3 font-bold" role="status">{msg}</p> : null}
    </div>
  );
}
