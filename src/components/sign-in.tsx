import { useState } from "react";
import { authClient, signInWith, type SocialProvider } from "@/lib/auth/client";

export type AuthConfig = { google: boolean; facebook: boolean; devLogin: boolean };

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
      setError("تعذّر بدء تسجيل الدخول. حاول مرة أخرى.");
      setBusy("");
    }
  };

  const none = !config.google && !config.facebook && !config.devLogin;
  return (
    <>
      {config.google ? (
        <button
          type="button"
          className="btn btn-ghost"
          disabled={Boolean(busy)}
          onClick={() => go("google")}
        >
          <GoogleMark />
          {busy === "google" ? "جاري التحويل…" : "المتابعة باستخدام Google"}
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
          {busy === "facebook" ? "جاري التحويل…" : "المتابعة باستخدام Facebook"}
        </button>
      ) : null}
      {config.devLogin ? <DevLogin redirect={redirect} /> : null}
      {none ? <p className="font-semibold">تسجيل الدخول غير متاح حالياً. حاول لاحقاً.</p> : null}
      {error ? (
        <p role="alert" className="font-bold">
          {error}
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
        if (res.error) setMsg(res.error.message ?? "خطأ");
        else window.location.href = redirect;
      }}
    >
      <p className="text-sm font-bold">دخول تجريبي (محلي فقط)</p>
      <input name="name" placeholder="الاسم" className="field" />
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
        دخول تجريبي
      </button>
      {msg ? <p className="text-sm font-bold">{msg}</p> : null}
    </form>
  );
}
