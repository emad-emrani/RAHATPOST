import { useState } from "react";
import { authClient, signInWith, type SocialProvider } from "@/lib/auth/client";
import { tr, trv } from "@/lib/i18n/core";

export type AuthConfig = {
  google: boolean;
  facebook: boolean;
  apple?: boolean;
  devLogin: boolean;
  /** Email + password (sign up / sign in). */
  email?: boolean;
  /** «نسيت كلمة المرور» (needs a mail sender on the server). */
  resetEmail?: boolean;
};

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z"
      />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12Z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill="currentColor">
      <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.5 1.2 0 1.7-.8 3.2-.8s1.9.8 3.2.8c1.3 0 2.2-1.2 3-2.4a10 10 0 0 0 1.4-2.8 4.3 4.3 0 0 1-2.1-4.2ZM13.9 5a4.4 4.4 0 0 0 1-3.2 4.5 4.5 0 0 0-2.9 1.5 4.2 4.2 0 0 0-1 3.1A3.7 3.7 0 0 0 13.9 5Z" />
    </svg>
  );
}

/**
 * The sign-in buttons (only providers that are configured), returning to `redirect` afterwards.
 * Used on /login and inline wherever posting needs an account (/submit).
 */
export function SignInButtons({
  config,
  redirect,
  initialError = "",
}: {
  config: AuthConfig;
  redirect: string;
  initialError?: string;
}) {
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState(initialError);

  const go = async (provider: SocialProvider) => {
    setBusy(provider);
    setError("");
    try {
      await signInWith(provider, redirect);
    } catch {
      setError(tr("تعذّر بدء تسجيل الدخول. حاول مرة أخرى."));
      setBusy("");
    }
  };

  const none = !config.google && !config.facebook && !config.apple && !config.devLogin && !config.email;
  return (
    <>
      {config.apple ? (
        // Apple's guidelines: a black button of equal prominence to the other providers.
        <button
          type="button"
          className="btn border-black bg-black text-white hover:bg-black"
          disabled={Boolean(busy)}
          onClick={() => go("apple")}
        >
          <AppleMark />
          {busy === "apple" ? tr("جاري التحويل…") : tr("المتابعة باستخدام Apple")}
        </button>
      ) : null}
      {config.google ? (
        <button
          type="button"
          className="btn btn-ghost"
          disabled={Boolean(busy)}
          onClick={() => go("google")}
        >
          <GoogleMark />
          {busy === "google" ? tr("جاري التحويل…") : tr("المتابعة باستخدام Google")}
        </button>
      ) : null}
      {config.facebook ? (
        <button
          type="button"
          className="btn btn-ghost"
          disabled={Boolean(busy)}
          onClick={() => go("facebook")}
        >
          <FacebookMark />
          {busy === "facebook" ? tr("جاري التحويل…") : tr("المتابعة باستخدام Facebook")}
        </button>
      ) : null}
      {config.email ? (
        <>
          {config.google || config.facebook || config.apple ? (
            <p className="flex items-center gap-2 text-sm font-bold text-muted" aria-hidden>
              <span className="h-px flex-1 bg-line" />
              {tr("أو بالبريد الإلكتروني")}
              <span className="h-px flex-1 bg-line" />
            </p>
          ) : null}
          <EmailAuth redirect={redirect} canReset={Boolean(config.resetEmail)} />
        </>
      ) : config.devLogin ? (
        <DevLogin redirect={redirect} />
      ) : null}
      {none ? <p className="font-semibold">{tr("تسجيل الدخول غير متاح حالياً. حاول لاحقاً.")}</p> : null}
      {error ? (
        <p role="alert" className="font-bold">
          {trv(error)}
        </p>
      ) : null}
    </>
  );
}

/** Local testing only — the server enables it only off Vercel with RP_DEV_LOGIN=1 and no DATABASE_URL. */
function DevLogin({ redirect }: { redirect: string }) {
  const [msg, setMsg] = useState("");
  return (
    <form
      className="flex flex-col gap-2 rounded-xl border border-dashed border-line p-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const f = new FormData(event.currentTarget);
        const email = String(f.get("email") ?? "");
        const password = String(f.get("password") ?? "");
        const name = String(f.get("name") ?? "") || email.split("@")[0];
        let res = await authClient.signIn.email({ email, password });
        if (res.error)
          res = (await authClient.signUp.email({ email, password, name })) as typeof res;
        if (res.error) setMsg(res.error.message ?? tr("خطأ"));
        else window.location.href = redirect;
      }}
    >
      <p className="text-sm font-bold">{tr("دخول تجريبي (محلي فقط)")}</p>
      <input name="name" placeholder={tr("الاسم")} className="field" />
      <input name="email" type="email" required placeholder="email" dir="ltr" className="field" />
      <input
        name="password"
        type="password"
        required
        minLength={8}
        placeholder="password"
        dir="ltr"
        className="field"
      />
      <button type="submit" className="btn btn-ghost">
        {tr("دخول تجريبي")}
      </button>
      {msg ? <p className="text-sm font-bold">{trv(msg)}</p> : null}
    </form>
  );
}

type EmailMode = "in" | "up" | "forgot";

/** Email + password: sign in, create an account (with name), or request a reset link. */
function EmailAuth({ redirect, canReset }: { redirect: string; canReset: boolean }) {
  const [mode, setMode] = useState<EmailMode>("in");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");

  const friendly = (code?: string, fallback = tr("تعذّر تسجيل الدخول. حاول مرة أخرى.")) => {
    if (!code) return fallback;
    if (/INVALID_EMAIL_OR_PASSWORD|INVALID_PASSWORD|CREDENTIAL/i.test(code)) return tr("البريد أو كلمة المرور غير صحيحة.");
    if (/USER_ALREADY_EXISTS|ALREADY_EXIST/i.test(code)) return tr("هذا البريد مسجّل. سجّل الدخول، أو ادخل بـ Google/Facebook إن سجّلت بهما.");
    if (/PASSWORD_TOO_SHORT/i.test(code)) return tr("كلمة المرور قصيرة (8 أحرف على الأقل).");
    if (/موقوف/.test(code)) return code;
    return fallback;
  };

  return (
    <form
      className="flex flex-col gap-2"
      method="post"
      action="/login"
      autoComplete="on"
      onSubmit={async (event) => {
        event.preventDefault();
        setMsg("");
        setOk("");
        const f = new FormData(event.currentTarget);
        const email = String(f.get("email") ?? "").trim();
        const password = String(f.get("password") ?? "");
        setBusy(true);
        try {
          if (mode === "forgot") {
            const res = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
            if (res.error) setMsg(friendly(res.error.message, tr("تعذّر إرسال الرابط. حاول لاحقاً.")));
            else setOk(tr("إن كان البريد مسجّلاً فستصلك رسالة فيها رابط لتعيين كلمة مرور جديدة."));
            return;
          }
          if (mode === "up") {
            const name = String(f.get("name") ?? "").trim();
            if (name.length < 2) return setMsg(tr("اكتب اسمك (حرفان على الأقل)."));
            if (password !== String(f.get("password2") ?? "")) return setMsg(tr("كلمتا المرور غير متطابقتين."));
            const res = await authClient.signUp.email({ email, password, name, rememberMe: f.get("remember") === "on" } as { email: string; password: string; name: string });
            if (res.error) return setMsg(friendly(res.error.code ?? res.error.message, tr("تعذّر إنشاء الحساب.")));
          } else {
            const res = await authClient.signIn.email({ email, password, rememberMe: f.get("remember") === "on" });
            if (res.error) return setMsg(friendly(res.error.code ?? res.error.message));
          }
          window.location.href = redirect;
        } catch {
          setMsg(tr("تعذّر الاتصال. حاول مرة أخرى."));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1" role="tablist">
        {(["in", "up"] as const).map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} className={mode === m ? "chip chip-ink justify-center py-2" : "chip justify-center py-2"} onClick={() => { setMode(m); setMsg(""); setOk(""); }}>
            {m === "in" ? tr("تسجيل الدخول") : tr("حساب جديد")}
          </button>
        ))}
      </div>
      {mode === "up" ? <input name="name" required minLength={2} maxLength={60} autoComplete="name" placeholder={tr("الاسم الكامل")} aria-label={tr("الاسم الكامل")} className="field" /> : null}
      <input name="email" id="auth-email" type="email" required autoComplete="username" dir="ltr" placeholder={tr("البريد الإلكتروني")} aria-label={tr("البريد الإلكتروني")} className="field" />
      {mode !== "forgot" ? (
        <input name="password" type="password" required minLength={8} maxLength={128} autoComplete={mode === "up" ? "new-password" : "current-password"} dir="ltr" placeholder={tr("كلمة المرور")} aria-label={tr("كلمة المرور")} className="field" />
      ) : null}
      {mode === "up" ? (
        <input name="password2" type="password" required minLength={8} maxLength={128} autoComplete="new-password" dir="ltr" placeholder={tr("تأكيد كلمة المرور")} aria-label={tr("تأكيد كلمة المرور")} className="field" />
      ) : null}
      {mode !== "forgot" ? (
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" name="remember" defaultChecked className="size-5 accent-[#FDB700]" />
          {tr("تذكرني")}
        </label>
      ) : null}
      <button type="submit" className="btn" disabled={busy}>
        {busy ? tr("لحظة…") : mode === "in" ? tr("دخول") : mode === "up" ? tr("إنشاء الحساب") : tr("أرسل رابط إعادة التعيين")}
      </button>
      {mode === "in" && canReset ? (
        <button type="button" className="text-sm font-bold underline" onClick={() => { setMode("forgot"); setMsg(""); }}>
          {tr("نسيت كلمة المرور؟")}
        </button>
      ) : null}
      {mode === "in" && !canReset ? (
        <p className="text-xs font-semibold text-muted">{tr("نسيت كلمة المرور؟ ادخل بـ Google أو Facebook بنفس البريد، أو راسل إدارة الموقع.")}</p>
      ) : null}
      {mode === "forgot" ? (
        <button type="button" className="text-sm font-bold underline" onClick={() => setMode("in")}>{tr("رجوع لتسجيل الدخول")}</button>
      ) : null}
      {msg ? <p role="alert" className="font-bold text-red-700">{msg}</p> : null}
      {ok ? <p role="status" className="font-bold">{ok}</p> : null}
    </form>
  );
}
