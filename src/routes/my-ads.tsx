import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AdForm } from "@/components/ad-form";
import { Shell } from "@/components/shell";
import { deleteMyAd, listMyAds, updateMyAd } from "@/lib/ads/api";
import { AD_STATUS_LABEL, type OwnAd } from "@/lib/ads/types";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/my-ads")({
  head: () => ({
    meta: [{ title: "إعلاناتي · رهط بوست" }, { name: "robots", content: "noindex" }],
  }),
  component: MyAdsPage,
});

const STATUS_CHIP: Record<OwnAd["status"], string> = {
  pending: "chip chip-deep",
  approved: "chip chip-ok",
  rejected: "chip chip-alert",
};

function MyAdsPage() {
  const { user, isPending } = useCurrentUserState();
  const [ads, setAds] = useState<OwnAd[] | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState("");
  const [busyId, setBusyId] = useState("");

  const refresh = useCallback(async () => {
    try {
      setAds(await listMyAds());
      setError("");
    } catch {
      setError("تعذّر تحميل إعلاناتك.");
      setAds([]);
    }
  }, []);

  const userId = user?.id;
  useEffect(() => {
    if (userId) void refresh();
  }, [userId, refresh]);

  if (isPending) {
    return (
      <Shell>
        <p className="stamp p-4 font-semibold">جاري التحميل…</p>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <h1 className="mb-3 text-2xl font-bold">إعلاناتي</h1>
        <div className="stamp flex flex-col gap-3 p-4">
          <p className="font-semibold">سجّل الدخول لترى إعلاناتك وتعدّلها.</p>
          <Link to="/login" search={{ redirect: "/my-ads" }} className="btn">
            تسجيل الدخول
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">إعلاناتي</h1>
        <Link to="/submit" search={{ mode: "إعلان" }} className="btn px-4">
          <Plus className="size-4" aria-hidden />
          إعلان جديد
        </Link>
      </div>
      {error ? <p className="stamp mb-3 p-3 font-bold">{error}</p> : null}
      {ads === null ? (
        <p className="stamp p-4 font-semibold">جاري التحميل…</p>
      ) : ads.length === 0 ? (
        <p className="stamp p-4 font-semibold">لم تنشر أي إعلان بعد.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {ads.map((ad) =>
            editing === ad.id ? (
              <li key={ad.id}>
                <AdForm
                  initial={{ ...ad, price: ad.price ?? "" }}
                  submitLabel="حفظ وإرسال للمراجعة"
                  onCancel={() => setEditing("")}
                  onSubmit={async (data) => {
                    const res = await updateMyAd({ data: { ...data, id: ad.id } });
                    if (!res.ok) return res.message ?? "تعذّر الحفظ.";
                    setEditing("");
                    await refresh();
                    return null;
                  }}
                />
              </li>
            ) : (
              <li key={ad.id} className="stamp p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="chip">{ad.type}</span>
                  <span className={STATUS_CHIP[ad.status]}>{AD_STATUS_LABEL[ad.status]}</span>
                </div>
                <h2 className="mt-2 text-lg font-bold">
                  {ad.status === "approved" ? (
                    <Link
                      to="/ads/$id"
                      params={{ id: ad.id }}
                      className="underline decoration-primary-deep"
                    >
                      {ad.title}
                    </Link>
                  ) : (
                    ad.title
                  )}
                </h2>
                <p className="text-sm font-semibold text-muted">
                  {ad.neighborhood}
                  {ad.price ? ` · ${ad.price}` : ""}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" className="btn btn-ghost" onClick={() => setEditing(ad.id)}>
                    <Pencil className="size-4" aria-hidden />
                    تعديل
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busyId === ad.id}
                    onClick={async () => {
                      if (!confirm("حذف الإعلان نهائياً؟")) return;
                      setBusyId(ad.id);
                      try {
                        await deleteMyAd({ data: { id: ad.id } });
                        await refresh();
                      } catch {
                        setError("تعذّر الحذف.");
                      } finally {
                        setBusyId("");
                      }
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden />
                    حذف
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </Shell>
  );
}
