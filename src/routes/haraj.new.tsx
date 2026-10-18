import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ListingForm, useHarajName } from "@/components/haraj";
import { Shell } from "@/components/shell";
import { SignInButtons } from "@/components/sign-in";
import { getAuthConfig } from "@/lib/auth/api";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { tr, trv } from "@/lib/i18n/core";
import { createMyListing, getAllHarajCategories, listMyListings, updateMyListing } from "@/lib/market/api";
import type { OwnListing } from "@/lib/market/types";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/haraj/new")({
  validateSearch: (s: Record<string, unknown>): { edit?: string } => ({
    edit: typeof s.edit === "string" && /^[a-f0-9]{16}$/.test(s.edit) ? s.edit : undefined,
  }),
  head: () => seo({ title: tr("أضف إعلاناً · حراج رهط"), description: tr("اعرض غرضاً للبيع في حراج رهط."), path: "/haraj/new", robots: "noindex" }),
  loader: async () => {
    const [auth, cats] = await Promise.all([getAuthConfig(), getAllHarajCategories()]);
    return { auth, cats };
  },
  component: NewPage,
});

function NewPage() {
  const { edit } = Route.useSearch();
  const { auth, cats } = Route.useLoaderData();
  const name = useHarajName();
  const navigate = useNavigate();
  const { user, isPending } = useCurrentUserState();
  const [existing, setExisting] = useState<OwnListing | null | undefined>(edit ? undefined : null);
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (edit && user) listMyListings().then((all) => setExisting(all.find((x) => x.id === edit) ?? null));
  }, [edit, user]);

  return (
    <Shell>
      <h1 className="mb-1 text-2xl font-bold">{edit ? tr("تعديل الإعلان") : tr("أضف إعلاناً")}</h1>
      <p className="mb-3 font-semibold text-muted">{trv(name)}</p>
      {sent ? (
        <div className="stamp flex flex-col gap-3 p-4">
          <p className="text-lg font-bold">{tr("وصلنا. يظهر الإعلان بعد المراجعة.")}</p>
          <Link to="/haraj/mine" className="btn">{tr("إعلاناتي")}</Link>
        </div>
      ) : isPending || existing === undefined ? (
        <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>
      ) : !user ? (
        <div className="stamp flex flex-col gap-3 p-4">
          <p className="text-lg font-bold">{tr("سجّل الدخول لتنشر إعلاناً باسمك.")}</p>
          <p className="font-semibold text-muted">{tr("يظهر اسمك وصورتك من الحساب مع الإعلان، ليعرف المشتري من البائع.")}</p>
          <SignInButtons config={auth} redirect={edit ? `/haraj/new?edit=${edit}` : "/haraj/new"} />
        </div>
      ) : edit && !existing ? (
        <p className="stamp p-4 font-semibold">{tr("إعلان غير موجود.")}</p>
      ) : (
        <ListingForm
          cats={cats}
          initial={existing ?? undefined}
          submitLabel={edit ? tr("حفظ وإرسال للمراجعة") : tr("إرسال للمراجعة")}
          onSubmit={async (data) => {
            const res = edit ? await updateMyListing({ data: { ...data, id: edit } }) : await createMyListing({ data });
            if (!res.ok) return res.message ?? tr("تعذّر الإرسال.");
            if (edit) navigate({ to: "/haraj/mine" });
            else setSent(true);
            return null;
          }}
        />
      )}
    </Shell>
  );
}
