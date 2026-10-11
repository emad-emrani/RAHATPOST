import { createFileRoute, Link } from "@tanstack/react-router";
import { PhotoStrip } from "@/components/photo-picker";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AdForm } from "@/components/ad-form";
import { DeleteAccount } from "@/components/delete-account";
import { Shell } from "@/components/shell";
import { deleteMyAd, listMyAds, updateMyAd } from "@/lib/ads/api";
import { deleteMyBusiness, listMyBusinesses } from "@/lib/directory/api";
import type { BusinessSubmission } from "@/lib/directory/types";
import { deleteMyNews, listMyNews } from "@/lib/reader-news/api";
import type { OwnReaderNews } from "@/lib/reader-news/types";
import { AD_STATUS_LABEL, type OwnAd } from "@/lib/ads/types";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

export const Route = createFileRoute("/my-posts")({
  head: () => ({
    meta: [{ title: "منشوراتي · رهط بوست" }, { name: "robots", content: "noindex" }],
  }),
  component: MyPostsPage,
});

const STATUS_CHIP: Record<OwnAd["status"], string> = {
  pending: "chip chip-deep",
  approved: "chip chip-ok",
  rejected: "chip chip-alert",
};

function MyPostsPage() {
  const { user, isPending } = useCurrentUserState();
  const [ads, setAds] = useState<OwnAd[] | null>(null);
  const [news, setNews] = useState<OwnReaderNews[] | null>(null);
  const [businesses, setBusinesses] = useState<BusinessSubmission[] | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState("");
  const [busyId, setBusyId] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [a, n, b] = await Promise.all([listMyAds(), listMyNews(), listMyBusinesses()]);
      setAds(a);
      setNews(n);
      setBusinesses(b);
      setError("");
    } catch {
      setError("تعذّر تحميل منشوراتك.");
      setAds([]);
      setNews([]);
      setBusinesses([]);
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
        <h1 className="mb-3 text-2xl font-bold">منشوراتي</h1>
        <div className="stamp flex flex-col gap-3 p-4">
          <p className="font-semibold">سجّل الدخول لترى أخبارك وإعلاناتك وطلبات نشاطك وحالتها.</p>
          <Link to="/login" search={{ redirect: "/my-posts" }} className="btn">
            تسجيل الدخول
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">منشوراتي</h1>
        <Link to="/submit" className="btn px-4">
          <Plus className="size-4" aria-hidden />
          أضف
        </Link>
      </div>
      {error ? <p className="stamp mb-3 p-3 font-bold">{error}</p> : null}
      <h2 className="mb-3 text-xl font-bold">إعلاناتي</h2>
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
                <h3 className="mt-2 text-lg font-bold">
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
                </h3>
                <p className="text-sm font-semibold text-muted">
                  {ad.neighborhood}
                  {ad.price ? ` · ${ad.price}` : ""}
                </p>
                <PhotoStrip keys={ad.photos} size="size-16" />
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

      <h2 className="mt-8 mb-3 text-xl font-bold">أخباري</h2>
      {news === null ? (
        <p className="stamp p-4 font-semibold">جاري التحميل…</p>
      ) : news.length === 0 ? (
        <p className="stamp p-4 font-semibold">لم ترسل أي خبر بعد.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {news.map((item) => (
            <li key={item.id} className="stamp p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip">خبر</span>
                <span className={STATUS_CHIP[item.status]}>{AD_STATUS_LABEL[item.status]}</span>
              </div>
              <h3 className="mt-2 text-lg font-bold">
                {item.status === "approved" ? (
                  <Link
                    to="/news/$slug"
                    params={{ slug: `reader-${item.id}` }}
                    className="underline decoration-primary-deep"
                  >
                    {item.title}
                  </Link>
                ) : (
                  item.title
                )}
              </h3>
              <p className="text-sm font-semibold text-muted">{item.neighborhood}</p>
              <DeleteButton
                busy={busyId === item.id}
                label="حذف الخبر نهائياً؟"
                onDelete={async () => {
                  setBusyId(item.id);
                  try {
                    await deleteMyNews({ data: { id: item.id } });
                    await refresh();
                  } catch {
                    setError("تعذّر الحذف.");
                  } finally {
                    setBusyId("");
                  }
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 mb-3 text-xl font-bold">طلبات نشاطي في الدليل</h2>
      {businesses === null ? (
        <p className="stamp p-4 font-semibold">جاري التحميل…</p>
      ) : businesses.length === 0 ? (
        <p className="stamp p-4 font-semibold">لم ترسل أي طلب نشاط بعد.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {businesses.map((item) => (
            <li key={item.id} className="stamp p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip">{item.category}</span>
                <span className={STATUS_CHIP[item.status]}>{AD_STATUS_LABEL[item.status]}</span>
              </div>
              <h3 className="mt-2 text-lg font-bold">
                {item.status === "approved" ? (
                  <Link
                    to="/directory/$slug"
                    params={{ slug: `biz-${item.id}` }}
                    className="underline decoration-primary-deep"
                  >
                    {item.name}
                  </Link>
                ) : (
                  item.name
                )}
              </h3>
              <p className="text-sm font-semibold text-muted">{item.area}</p>
              <PhotoStrip keys={item.photo ? [item.photo] : []} size="size-16" />
              <DeleteButton
                busy={busyId === item.id}
                label={
                  item.status === "approved"
                    ? "حذف الطلب يزيل النشاط من الدليل. متأكد؟"
                    : "سحب الطلب وحذفه؟"
                }
                onDelete={async () => {
                  setBusyId(item.id);
                  try {
                    await deleteMyBusiness({ data: { id: item.id } });
                    await refresh();
                  } catch {
                    setError("تعذّر الحذف.");
                  } finally {
                    setBusyId("");
                  }
                }}
              />
            </li>
          ))}
        </ul>
      )}
      <DeleteAccount />
    </Shell>
  );
}

function DeleteButton({
  busy,
  label,
  onDelete,
}: {
  busy: boolean;
  label: string;
  onDelete: () => Promise<void>;
}) {
  return (
    <button
      type="button"
      className="btn btn-ghost mt-3 w-full"
      disabled={busy}
      onClick={() => {
        if (confirm(label)) void onDelete();
      }}
    >
      <Trash2 className="size-4" aria-hidden />
      حذف
    </button>
  );
}
