import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
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
    <Shell>
      <div className="mx-auto max-w-md">
        <h1 className="mb-1 text-2xl font-bold">{tr("تسجيل الدخول")}</h1>
        <p className="mb-4 font-semibold text-muted">
          {tr("سجّل الدخول لتنشر أخباراً وإعلانات وتضيف نشاطك باسمك، وتتابعها من «منشوراتي».")}
        </p>

        {!isPending && user ? (
          <div className="stamp flex flex-col gap-3 p-4">
            <p className="font-bold">{tr("أنت مسجّل الدخول باسم")} {trv(user.displayName)}.</p>
            <Link to="/my-posts" className="btn">
              {tr("منشوراتي")}
            </Link>
          </div>
        ) : (
          <div className="stamp flex flex-col gap-3 p-4">
            <SignInButtons
              config={config}
              redirect={redirect}
              initialError={search.error ? tr("لم يكتمل تسجيل الدخول. حاول مرة أخرى.") : ""}
            />
            <p className="text-sm font-semibold text-muted">
              {tr("نستخدم اسمك وصورتك من الحساب لعرضهما مع منشوراتك فقط، ولا ننشر شيئاً على حسابك. بتسجيل الدخول أنت توافق على")}{" "}
              <Link to="/terms" className="font-bold underline">
                {tr("شروط الاستخدام")}
              </Link>{" "}
              {tr("و")}
              <Link to="/privacy" className="font-bold underline">
                {tr("سياسة الخصوصية")}
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </Shell>
  );
}
