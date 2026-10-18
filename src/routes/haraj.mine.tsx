import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { SellerCard } from "@/components/haraj";
import { Shell } from "@/components/shell";
import { SignInButtons } from "@/components/sign-in";
import { getAuthConfig } from "@/lib/auth/api";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { tr, trv } from "@/lib/i18n/core";
import { listMyListings, ownerAction } from "@/lib/market/api";
import { priceLabel, STATUS_LABEL, type OwnListing } from "@/lib/market/types";
import { mediaUrl } from "@/lib/media/types";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/haraj/mine")({
  head: () => seo({ title: tr("إعلاناتي · حراج رهط"), description: tr("إدارة إعلاناتك في حراج رهط."), path: "/haraj/mine", robots: "private" }),
  loader: () => getAuthConfig(),
  component: MinePage,
});

function MinePage() {
  const auth = Route.useLoaderData();
  const { user, isPending } = useCurrentUserState();
  const [items, setItems] = useState<OwnListing[] | null>(null);
  const load = useCallback(() => listMyListings().then(setItems).catch(() => setItems([])), []);
  useEffect(() => {
    if (user) load();
  }, [user, load]);
  const act = async (id: string, action: "sold" | "unsold" | "renew" | "delete") => {
    if (action === "delete" && !confirm(tr("حذف الإعلان نهائياً؟"))) return;
    await ownerAction({ data: { id, action } });
    load();
  };

  return (
    <Shell>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{tr("إعلاناتي")}</h1>
        <Link to="/haraj/new" className="btn">{tr("أضف إعلان")}</Link>
      </div>
      {isPending ? (
        <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>
      ) : !user ? (
        <div className="stamp flex flex-col gap-3 p-4">
          <p className="font-bold">{tr("سجّل الدخول لترى إعلاناتك.")}</p>
          <SignInButtons config={auth} redirect="/haraj/mine" />
        </div>
      ) : items === null ? (
        <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>
      ) : !items.length ? (
        <p className="stamp p-4 font-semibold">{tr("لم تنشر أي إعلان بعد.")}</p>
      ) : (
        <>
          <div className="mb-3"><SellerCard seller={items[0].seller} /></div>
          <ul className="flex flex-col gap-3">
            {items.map((l) => (
              <li key={l.id} className="stamp p-3">
                <div className="flex gap-3">
                  {l.photos[0] ? <img src={mediaUrl(l.photos[0])} alt="" className="thumb size-20" /> : <span className="thumb size-20 bg-surface" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap gap-1">
                      <span className={l.status === "approved" ? "chip chip-deep" : "chip"}>{trv(STATUS_LABEL[l.status])}</span>
                      {l.sold ? <span className="chip chip-ink">{tr("انباع")}</span> : null}
                      {l.expired ? <span className="chip">{tr("منتهي")}</span> : null}
                    </div>
                    {l.status === "approved" ? (
                      <Link to="/haraj/$id" params={{ id: l.id }} className="mt-1 block font-bold underline-offset-4 hover:underline">{trv(l.title)}</Link>
                    ) : (
                      <p className="mt-1 font-bold">{trv(l.title)}</p>
                    )}
                    <p className="text-sm font-semibold text-muted">{trv(priceLabel(l))}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-sm">
                  <Link to="/haraj/new" search={{ edit: l.id }} className="chip justify-center bg-paper py-2">{tr("تعديل")}</Link>
                  <button type="button" className="chip justify-center bg-paper py-2" onClick={() => act(l.id, l.sold ? "unsold" : "sold")}>{l.sold ? tr("إلغاء انباع") : tr("انباع")}</button>
                  <button type="button" className="chip justify-center bg-paper py-2" onClick={() => act(l.id, "renew")}>{tr("تجديد")}</button>
                  <button type="button" className="chip justify-center bg-paper py-2 text-red-700" onClick={() => act(l.id, "delete")}>{tr("حذف")}</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Shell>
  );
}
