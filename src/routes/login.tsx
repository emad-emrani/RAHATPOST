import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthLayout } from "@/components/auth-layout";
import { SignInButtons } from "@/components/sign-in";
import { getAuthConfig } from "@/lib/auth/api";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { tr, trv } from "@/lib/i18n/core";

/** Only same-site relative paths are allowed as the post-login destination. */
function safeRedirect(value: unknown): string {
  const s = typeof value === "string" ? value : "";
  return /^\/(?!\/)[^\s\\]*$/.test(s) && !s.startsWith("/api/") ? s : "/my-posts";
}

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: tr("تسجيل الدخول · رهط بوست") }, { name: "robots", content: "noindex" }],
  }),
  validateSearch: (search: Record<string, unknown>): { redirect?: string; error?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect.slice(0, 200) : undefined,
    error: search.error ? "1" : undefined,
  }),
  loader: () => getAuthConfig(),
  component: LoginPage,
});

function LoginPage() {
  const config = Route.useLoaderData();
  const search = Route.useSearch();
  const redirect = safeRedirect(search.redirect);
  const { user, isPending } = useCurrentUserState();

  return (
    <AuthLayout
      title={!isPending && user ? tr("أهلاً بعودتك") : redirect.startsWith("/admin") ? tr("دخول فريق الإدارة") : tr("تسجيل الدخول")}
      subtitle={redirect.startsWith("/admin") ? tr("للحسابات الموجودة فقط. لا يمكن إنشاء حساب جديد من هنا.") : tr("سجّل الدخول لتنشر أخباراً وإعلانات وتضيف نشاطك باسمك، وتتابعها من «منشوراتي».")}
      footer={
        <>
          {tr("نستخدم اسمك وصورتك من الحساب لعرضهما مع منشوراتك فقط، ولا ننشر شيئاً على حسابك. بتسجيل الدخول أنت توافق على")}{" "}
          <Link to="/terms" className="font-bold underline">{tr("شروط الاستخدام")}</Link> {tr("و")}
          <Link to="/privacy" className="font-bold underline">{tr("سياسة الخصوصية")}</Link>.
        </>
      }
    >
      {!isPending && user ? (
        <>
          <p className="font-bold">{tr("أنت مسجّل الدخول باسم")} {trv(user.displayName)}.</p>
          <Link to="/my-posts" className="btn">{tr("منشوراتي")}</Link>
        </>
      ) : (
        <SignInButtons
          config={config}
          redirect={redirect}
          noSignUp={redirect.startsWith("/admin")}
          initialError={search.error ? tr("لم يكتمل تسجيل الدخول. حاول مرة أخرى.") : ""}
        />
      )}
    </AuthLayout>
  );
}
