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
import { tr, trv } from "@/lib/i18n/core";

export const Route = createFileRoute("/my-posts")({
  head: () => ({
    meta: [{ title: tr("منشوراتي · رهط بوست") }, { name: "robots", content: "noindex" }],
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
      setError(tr("تعذّر تحميل منشوراتك."));
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
        <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <h1 className="mb-3 text-2xl font-bold">{tr("منشوراتي")}</h1>
        <div className="stamp flex flex-col gap-3 p-4">
          <p className="font-semibold">{tr("سجّل الدخول لترى أخبارك وإعلاناتك وطلبات نشاطك وحالتها.")}</p>
          <Link to="/login" search={{ redirect: "/my-posts" }} className="btn">
            {tr("تسجيل الدخول")}
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{tr("منشوراتي")}</h1>
        <Link to="/submit" className="btn px-4">
          <Plus className="size-4" aria-hidden />
          {tr("أضف")}
        </Link>
      </div>
      {error ? <p className="stamp mb-3 p-3 font-bold">{trv(error)}</p> : null}
      <h2 className="mb-3 text-xl font-bold">{tr("إعلاناتي")}</h2>
      <Link to="/haraj/mine" className="stamp press block p-4 font-bold">
        {tr("إعلاناتك في الحراج: تعديل، انباع، تجديد وحذف")}
      </Link>

      <h2 className="mt-8 mb-3 text-xl font-bold">{tr("أخباري")}</h2>
      {news === null ? (
        <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>
      ) : news.length === 0 ? (
        <p className="stamp p-4 font-semibold">{tr("لم ترسل أي خبر بعد.")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {news.map((item) => (
            <li key={item.id} className="stamp p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip">{tr("خبر")}</span>
                <span className={STATUS_CHIP[item.status]}>{trv(AD_STATUS_LABEL[item.status])}</span>
              </div>
              <h3 className="mt-2 text-lg font-bold">
                {item.status === "approved" ? (
                  <Link
                    to="/news/$slug"
                    params={{ slug: `reader-${item.id}` }}
                    className="underline decoration-primary-deep"
                  >
                    {trv(item.title)}
                  </Link>
                ) : (
                  item.title
                )}
              </h3>
              <p className="text-sm font-semibold text-muted">{trv(item.neighborhood)}</p>
              <DeleteButton
                busy={busyId === item.id}
                label={tr("حذف الخبر نهائياً؟")}
                onDelete={async () => {
                  setBusyId(item.id);
                  try {
                    await deleteMyNews({ data: { id: item.id } });
                    await refresh();
                  } catch {
                    setError(tr("تعذّر الحذف."));
                  } finally {
                    setBusyId("");
                  }
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-8 mb-3 text-xl font-bold">{tr("طلبات نشاطي في الدليل")}</h2>
      {businesses === null ? (
        <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>
      ) : businesses.length === 0 ? (
        <p className="stamp p-4 font-semibold">{tr("لم ترسل أي طلب نشاط بعد.")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {businesses.map((item) => (
            <li key={item.id} className="stamp p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip">{trv(item.category)}</span>
                <span className={STATUS_CHIP[item.status]}>{trv(AD_STATUS_LABEL[item.status])}</span>
              </div>
              <h3 className="mt-2 text-lg font-bold">
                {item.status === "approved" ? (
                  <Link
                    to="/directory/$slug"
                    params={{ slug: `biz-${item.id}` }}
                    className="underline decoration-primary-deep"
                  >
                    {trv(item.name)}
                  </Link>
                ) : (
                  item.name
                )}
              </h3>
              <p className="text-sm font-semibold text-muted">{trv(item.area)}</p>
              <PhotoStrip keys={item.photo ? [item.photo] : []} size="size-16" />
              <DeleteButton
                busy={busyId === item.id}
                label={
                  item.status === "approved"
                    ? tr("حذف الطلب يزيل النشاط من الدليل. متأكد؟")
                    : tr("سحب الطلب وحذفه؟")
                }
                onDelete={async () => {
                  setBusyId(item.id);
                  try {
                    await deleteMyBusiness({ data: { id: item.id } });
                    await refresh();
                  } catch {
                    setError(tr("تعذّر الحذف."));
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
      {tr("حذف")}
    </button>
  );
}
