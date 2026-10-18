import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { authClient } from "@/lib/auth/client";
import { tr } from "@/lib/i18n/core";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: tr("كلمة مرور جديدة · رهط بوست") }, { name: "robots", content: "noindex" }] }),
  validateSearch: (s: Record<string, unknown>): { token?: string; error?: string } => ({
    token: typeof s.token === "string" ? s.token.slice(0, 200) : undefined,
    error: typeof s.error === "string" ? "1" : undefined,
  }),
  component: ResetPage,
});

function ResetPage() {
  const { token, error } = Route.useSearch();
  const [msg, setMsg] = useState(error || !token ? tr("الرابط غير صالح أو انتهت مدته. اطلب رابطاً جديداً.") : "");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <AuthLayout title={tr("كلمة مرور جديدة")} subtitle={tr("اختر كلمة مرور من 8 أحرف على الأقل.")}>
        {done ? (
          <div className="flex flex-col gap-3">
            <p className="font-bold">{tr("تم تغيير كلمة المرور. سجّل الدخول بها الآن.")}</p>
            <Link to="/login" className="btn">{tr("تسجيل الدخول")}</Link>
          </div>
        ) : (
          <form
            className="flex flex-col gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const p1 = String(f.get("p1") ?? "");
              if (p1 !== String(f.get("p2") ?? "")) return setMsg(tr("كلمتا المرور غير متطابقتين."));
              setBusy(true);
              const res = await authClient.resetPassword({ newPassword: p1, token: token ?? "" });
              setBusy(false);
              if (res.error) setMsg(tr("الرابط غير صالح أو انتهت مدته. اطلب رابطاً جديداً."));
              else setDone(true);
            }}
          >
            <input name="p1" type="password" required minLength={8} maxLength={128} autoComplete="new-password" dir="ltr" placeholder={tr("كلمة المرور")} aria-label={tr("كلمة المرور")} className="field" disabled={!token} />
            <input name="p2" type="password" required minLength={8} maxLength={128} autoComplete="new-password" dir="ltr" placeholder={tr("تأكيد كلمة المرور")} aria-label={tr("تأكيد كلمة المرور")} className="field" disabled={!token} />
            <button className="btn" disabled={busy || !token}>{busy ? tr("لحظة…") : tr("حفظ كلمة المرور")}</button>
            {msg ? <p role="alert" className="font-bold">{msg}</p> : null}
            <Link to="/login" className="text-sm font-bold underline">{tr("رجوع لتسجيل الدخول")}</Link>
          </form>
        )}
    </AuthLayout>
  );
}
