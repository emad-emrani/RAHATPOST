import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { signInWith, type SocialProvider } from "@/lib/auth/client";
import { safeAppRedirect } from "@/lib/auth/native";

/** Store app sign-in, step 1 — opened in the system browser: start the normal OAuth redirect. */
export const Route = createFileRoute("/app-auth/start")({
  head: () => ({
    meta: [{ title: "تسجيل الدخول · رهط بوست" }, { name: "robots", content: "noindex" }],
  }),
  validateSearch: (s: Record<string, unknown>): { provider?: string; redirect?: string } => ({
    provider: s.provider === "facebook" || s.provider === "apple" ? s.provider : "google",
    redirect: typeof s.redirect === "string" ? s.redirect.slice(0, 200) : undefined,
  }),
  component: Start,
});

function Start() {
  const { provider, redirect } = Route.useSearch();
  const [error, setError] = useState("");
  useEffect(() => {
    const done = `/app-auth/done?${new URLSearchParams({ redirect: safeAppRedirect(redirect) })}`;
    signInWith((provider ?? "google") as SocialProvider, done).catch(() =>
      setError("تعذّر بدء تسجيل الدخول. أغلق هذه الصفحة وحاول مرة أخرى من التطبيق."),
    );
  }, [provider, redirect]);
  return (
    <Shell>
      <p className="stamp p-4 font-bold" role={error ? "alert" : undefined}>
        {error || "جاري التحويل إلى صفحة تسجيل الدخول…"}
      </p>
    </Shell>
  );
}
