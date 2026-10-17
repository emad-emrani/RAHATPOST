import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { appReturnUrl, safeAppRedirect } from "@/lib/auth/native";
import { tr, trv } from "@/lib/i18n/core";

/**
 * Store app sign-in, step 2 — still in the system browser, now signed in: get a single-use token
 * and hand it to the app through its deep link.
 */
export const Route = createFileRoute("/app-auth/done")({
  head: () => ({
    meta: [{ title: tr("العودة إلى التطبيق · رهط بوست") }, { name: "robots", content: "noindex" }],
  }),
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof s.redirect === "string" ? s.redirect.slice(0, 200) : undefined,
  }),
  component: Done,
});

function Done() {
  const { redirect } = Route.useSearch();
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/one-time-token/generate", { credentials: "include" });
        if (!res.ok) throw new Error(String(res.status));
        const { token } = (await res.json()) as { token?: string };
        if (!token) throw new Error("no token");
        const deep = appReturnUrl(
          new URLSearchParams({ token, redirect: safeAppRedirect(redirect) }),
          navigator.userAgent,
        );
        setLink(deep);
        // Let the fallback button paint first, then try opening the app automatically.
        setTimeout(() => {
          window.location.href = deep;
        }, 400);
      } catch {
        setError(tr("لم يكتمل تسجيل الدخول. ارجع إلى التطبيق وحاول مرة أخرى."));
      }
    })();
  }, [redirect]);
  return (
    <Shell>
      <div className="stamp flex flex-col gap-3 p-4">
        {error ? (
          <>
            <p role="alert" className="font-bold">
              {trv(error)}
            </p>
            <Link to="/login" className="btn btn-ghost">
              {tr("تسجيل الدخول في المتصفح")}
            </Link>
          </>
        ) : (
          <>
            <p className="text-lg font-bold">{tr("تم تسجيل الدخول.")}</p>
            <p className="font-semibold text-muted">{tr("إذا لم يُفتح التطبيق تلقائياً، اضغط الزر.")}</p>
            {link ? (
              <a href={link} className="btn">
                {tr("العودة إلى التطبيق")}
              </a>
            ) : null}
          </>
        )}
      </div>
    </Shell>
  );
}
