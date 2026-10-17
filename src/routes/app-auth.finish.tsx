import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { safeAppRedirect } from "@/lib/auth/native";
import { tr } from "@/lib/i18n/core";

/** Store app sign-in, step 3 — inside the app's WebView: redeem the token (sets the session cookie). */
export const Route = createFileRoute("/app-auth/finish")({
  head: () => ({
    meta: [{ title: tr("تسجيل الدخول · رهط بوست") }, { name: "robots", content: "noindex" }],
  }),
  validateSearch: (s: Record<string, unknown>): { token?: string; redirect?: string } => ({
    token: typeof s.token === "string" ? s.token.slice(0, 128) : undefined,
    redirect: typeof s.redirect === "string" ? s.redirect.slice(0, 200) : undefined,
  }),
  component: Finish,
});

function Finish() {
  const { token, redirect } = Route.useSearch();
  const [error, setError] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/one-time-token/verify", {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token: token ?? "" }),
        });
        if (!res.ok) throw new Error(String(res.status));
        // Full reload so every component picks up the new session.
        window.location.replace(safeAppRedirect(redirect));
      } catch {
        setError(tr("انتهت صلاحية رابط الدخول أو استُخدم من قبل. حاول تسجيل الدخول مرة أخرى."));
      }
    })();
  }, [token, redirect]);
  return (
    <Shell>
      <p className="stamp p-4 font-bold" role={error ? "alert" : undefined}>
        {error || tr("جاري تسجيل الدخول…")}
      </p>
    </Shell>
  );
}
