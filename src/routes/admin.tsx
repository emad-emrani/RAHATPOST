import { createFileRoute } from "@tanstack/react-router";
import { PhotoStrip } from "@/components/photo-picker";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { CommentsAdmin } from "@/components/admin/comments-admin";
import { AlertsAdmin, DutyAdmin, PushAdmin, ReportsAdmin } from "@/components/admin/content-admin";
import { adminDecideAd, adminListAds } from "@/lib/ads/api";
import type { OwnAd } from "@/lib/ads/types";
import { adminDecide, adminList, adminLogin, adminLogout } from "@/lib/directory/api";
import type { BusinessSubmission } from "@/lib/directory/types";
import { AutoNewsAdmin } from "@/components/admin/auto-news-admin";
import { MembersAdmin } from "@/components/admin/members-admin";
import { adminWhoami } from "@/lib/team/api";
import type { AdminLevel } from "@/lib/admin-auth";
import { PublishAdmin } from "@/components/admin/publish-admin";
import { adminDecideNews, adminListNews } from "@/lib/reader-news/api";
import type { OwnReaderNews } from "@/lib/reader-news/types";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "إدارة · رهط بوست" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminPage,
});

const STATUS: Record<BusinessSubmission["status"], string> = {
  pending: "بانتظار المراجعة",
  approved: "موافَق عليه",
  rejected: "مرفوض",
};

type Section =
  | "auto"
  | "publish"
  | "members"
  | "news"
  | "ads"
  | "directory"
  | "comments"
  | "reports"
  | "duty"
  | "alerts"
  | "push";

function AdminPage() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [items, setItems] = useState<BusinessSubmission[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [tab, setTab] = useState<BusinessSubmission["status"]>("pending");
  const [section, setSection] = useState<Section>("news");
  const [level, setLevel] = useState<AdminLevel | null>(null);
  const [who, setWho] = useState({ name: "", signedIn: false });

  const refresh = useCallback(async () => {
    const me = await adminWhoami();
    setLevel(me.level);
    setWho({ name: me.name, signedIn: me.signedIn });
    if (!me.level) {
      setState("login");
      return;
    }
    if (me.level === "writer") {
      setSection("publish");
      setState("ready");
      return;
    }
    const res = await adminList();
    if (!res.authed) {
      setState("login");
      return;
    }
    setItems(res.items);
    setError(res.ok ? "" : "تعذّر تحميل الطلبات من التخزين.");
    setState("ready");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (state === "loading") {
    return (
      <Shell>
        <p className="stamp p-4 font-semibold">جاري التحميل…</p>
      </Shell>
    );
  }

  if (state === "login") {
    return (
      <Shell>
        <h1 className="mb-3 text-2xl font-bold">الإدارة</h1>
        <form
          className="stamp flex flex-col gap-3 p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const password = String(new FormData(event.currentTarget).get("password") ?? "");
            const res = await adminLogin({ data: { password } });
            if (res.ok) {
              setError("");
              await refresh();
            } else setError(res.message ?? "تعذّر الدخول.");
          }}
        >
          <label className="block font-bold">
            كلمة المرور
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="field mt-1"
              dir="ltr"
            />
          </label>
          {error ? <p className="font-bold">{error}</p> : null}
          <button type="submit" className="btn">
            دخول
          </button>
        </form>
        <div className="stamp mt-4 flex flex-col gap-2 p-4">
          <p className="font-bold">أعضاء الفريق (مشرف / كاتب)</p>
          {who.signedIn ? (
            <p className="font-semibold text-muted">
              حسابك ليس له صلاحية في لوحة الإدارة. اطلب من مالك الموقع إضافتك.
            </p>
          ) : (
            <a className="btn btn-ghost" href="/login?redirect=%2Fadmin">
              دخول بحساب Google
            </a>
          )}
        </div>
      </Shell>
    );
  }

  const act = async (id: string, action: "approved" | "rejected" | "pending" | "delete") => {
    if (action === "delete" && !confirm("حذف الطلب نهائياً؟")) return;
    setBusyId(id);
    try {
      await adminDecide({ data: { id, action } });
      await refresh();
    } catch {
      setError("تعذّر تنفيذ العملية.");
    } finally {
      setBusyId("");
    }
  };

  const list = items.filter((i) => i.status === tab);

  return (
    <Shell>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">الإدارة</h1>
          {level !== "owner" ? (
            <p className="text-sm font-semibold text-muted">
              {who.name} · {level === "writer" ? "كاتب" : "مشرف"}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="btn btn-ghost px-4"
          onClick={async () => {
            await adminLogout();
            setState("login");
          }}
        >
          خروج
        </button>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4" role="tablist" aria-label="القسم">
        {(
          [
            ["publish", "نشر خبر"],
            ["auto", "الأخبار التلقائية"],
            ["news", "أخبار القراء"],
            ["ads", "الإعلانات"],
            ["directory", "طلبات الدليل"],
            ["comments", "التعليقات"],
            ["reports", "البلاغات"],
            ["duty", "صيدلية المناوبة"],
            ["alerts", "التنبيهات"],
            ["push", "الإشعارات"],
            ["members", "الأعضاء والصلاحيات"],
          ] as const
        )
          .filter(([key]) =>
            level === "writer" ? key === "publish" : key !== "members" || level === "owner",
          )
          .map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={section === key}
              className={section === key ? "chip chip-ink justify-center" : "chip justify-center"}
              onClick={() => setSection(key)}
            >
              {label}
            </button>
          ))}
      </div>
      {section === "publish" || level === "writer" ? (
        <PublishAdmin />
      ) : section === "auto" ? (
        <AutoNewsAdmin />
      ) : section === "members" && level === "owner" ? (
        <MembersAdmin />
      ) : section === "comments" ? (
        <CommentsAdmin />
      ) : section === "reports" ? (
        <ReportsAdmin />
      ) : section === "duty" ? (
        <DutyAdmin />
      ) : section === "alerts" ? (
        <AlertsAdmin />
      ) : section === "push" ? (
        <PushAdmin />
      ) : section === "ads" ? (
        <AdsAdmin />
      ) : section === "news" ? (
        <NewsAdmin />
      ) : (
        <>
          <div className="scroll-row mb-4">
            {(Object.keys(STATUS) as BusinessSubmission["status"][]).map((s) => (
              <button
                key={s}
                type="button"
                className={tab === s ? "chip chip-ink shrink-0" : "chip shrink-0 bg-paper"}
                onClick={() => setTab(s)}
              >
                {STATUS[s]} ({items.filter((i) => i.status === s).length})
              </button>
            ))}
          </div>
          {error ? <p className="stamp mb-3 p-3 font-bold">{error}</p> : null}
          {list.length === 0 ? (
            <p className="stamp p-4 font-semibold">لا طلبات هنا.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {list.map((item) => (
                <li key={item.id} className="stamp p-4">
                  <span className="chip">{item.category}</span>
                  <h2 className="mt-2 text-xl font-bold">{item.name}</h2>
                  <p className="font-semibold">{item.area}</p>
                  <p className="mt-1">{item.about}</p>
                  <PhotoStrip keys={item.photo ? [item.photo] : []} />
                  <p className="mt-1 font-bold" dir="ltr">
                    {item.phone}
                  </p>
                  <p className="text-sm font-semibold text-muted">
                    {item.posterName ? `${item.posterName} · ` : ""}
                    {new Date(item.createdAt).toLocaleString("ar-u-nu-latn", {
                      timeZone: "Asia/Jerusalem",
                    })}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {item.status !== "approved" ? (
                      <button
                        type="button"
                        className="btn"
                        disabled={busyId === item.id}
                        onClick={() => act(item.id, "approved")}
                      >
                        موافقة
                      </button>
                    ) : null}
                    {item.status !== "rejected" ? (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={busyId === item.id}
                        onClick={() => act(item.id, "rejected")}
                      >
                        رفض
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={busyId === item.id}
                      onClick={() => act(item.id, "delete")}
                    >
                      حذف
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Shell>
  );
}

function AdsAdmin() {
  const [items, setItems] = useState<OwnAd[] | null>(null);
  const [tab, setTab] = useState<OwnAd["status"]>("pending");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const refresh = useCallback(async () => {
    const res = await adminListAds();
    setItems(res.items);
    setError(
      !res.authed ? "انتهت الجلسة. سجّل الدخول من جديد." : res.ok ? "" : "تعذّر تحميل الإعلانات.",
    );
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (id: string, action: "approved" | "rejected" | "delete") => {
    if (action === "delete" && !confirm("حذف الإعلان نهائياً؟")) return;
    setBusyId(id);
    try {
      await adminDecideAd({ data: { id, action } });
      await refresh();
    } catch {
      setError("تعذّر تنفيذ العملية.");
    } finally {
      setBusyId("");
    }
  };

  if (!items) return <p className="stamp p-4 font-semibold">جاري التحميل…</p>;
  const list = items.filter((i) => i.status === tab);

  return (
    <>
      <div className="scroll-row mb-4">
        {(Object.keys(STATUS) as OwnAd["status"][]).map((s) => (
          <button
            key={s}
            type="button"
            className={tab === s ? "chip chip-ink shrink-0" : "chip shrink-0"}
            onClick={() => setTab(s)}
          >
            {STATUS[s]} ({items.filter((i) => i.status === s).length})
          </button>
        ))}
      </div>
      {error ? <p className="stamp mb-3 p-3 font-bold">{error}</p> : null}
      {list.length === 0 ? (
        <p className="stamp p-4 font-semibold">لا إعلانات هنا.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((ad) => (
            <li key={ad.id} className="stamp p-4">
              <span className="chip">{ad.type}</span>
              <h2 className="mt-2 text-xl font-bold">{ad.title}</h2>
              <p className="font-semibold">
                {ad.neighborhood}
                {ad.price ? ` · ${ad.price}` : ""}
              </p>
              <p className="mt-1 whitespace-pre-line">{ad.description}</p>
              <PhotoStrip keys={ad.photos} />
              <p className="mt-1 font-bold" dir="ltr">
                {ad.phone}
              </p>
              <p className="text-sm font-semibold text-muted">
                {ad.posterName} ·{" "}
                {new Date(ad.updatedAt).toLocaleString("ar-u-nu-latn", {
                  timeZone: "Asia/Jerusalem",
                })}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ad.status !== "approved" ? (
                  <button
                    type="button"
                    className="btn"
                    disabled={busyId === ad.id}
                    onClick={() => act(ad.id, "approved")}
                  >
                    موافقة
                  </button>
                ) : null}
                {ad.status !== "rejected" ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busyId === ad.id}
                    onClick={() => act(ad.id, "rejected")}
                  >
                    رفض
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busyId === ad.id}
                  onClick={() => act(ad.id, "delete")}
                >
                  حذف
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function NewsAdmin() {
  const [items, setItems] = useState<OwnReaderNews[] | null>(null);
  const [tab, setTab] = useState<OwnReaderNews["status"]>("pending");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const refresh = useCallback(async () => {
    const res = await adminListNews();
    setItems(res.items);
    setError(
      !res.authed ? "انتهت الجلسة. سجّل الدخول من جديد." : res.ok ? "" : "تعذّر تحميل الأخبار.",
    );
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const act = async (id: string, action: "approved" | "rejected" | "delete") => {
    if (action === "delete" && !confirm("حذف الخبر نهائياً؟")) return;
    setBusyId(id);
    try {
      await adminDecideNews({ data: { id, action } });
      await refresh();
    } catch {
      setError("تعذّر تنفيذ العملية.");
    } finally {
      setBusyId("");
    }
  };

  if (!items) return <p className="stamp p-4 font-semibold">جاري التحميل…</p>;
  const list = items.filter((i) => i.status === tab);

  return (
    <>
      <div className="scroll-row mb-4">
        {(Object.keys(STATUS) as OwnReaderNews["status"][]).map((s) => (
          <button
            key={s}
            type="button"
            className={tab === s ? "chip chip-ink shrink-0" : "chip shrink-0"}
            onClick={() => setTab(s)}
          >
            {STATUS[s]} ({items.filter((i) => i.status === s).length})
          </button>
        ))}
      </div>
      {error ? <p className="stamp mb-3 p-3 font-bold">{error}</p> : null}
      {list.length === 0 ? (
        <p className="stamp p-4 font-semibold">لا أخبار هنا.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((item) => (
            <li key={item.id} className="stamp p-4">
              <span className="chip">{item.neighborhood}</span>
              <h2 className="mt-2 text-xl font-bold">{item.title}</h2>
              <p className="mt-1 whitespace-pre-line">{item.body}</p>
              {item.sourceUrl ? (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="mt-1 block break-all text-sm font-bold underline"
                  dir="ltr"
                >
                  {item.sourceUrl}
                </a>
              ) : null}
              <p className="mt-1 text-sm font-semibold text-muted">
                {item.posterName} ·{" "}
                {new Date(item.updatedAt).toLocaleString("ar-u-nu-latn", {
                  timeZone: "Asia/Jerusalem",
                })}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {item.status !== "approved" ? (
                  <button
                    type="button"
                    className="btn"
                    disabled={busyId === item.id}
                    onClick={() => act(item.id, "approved")}
                  >
                    موافقة
                  </button>
                ) : null}
                {item.status !== "rejected" ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busyId === item.id}
                    onClick={() => act(item.id, "rejected")}
                  >
                    رفض
                  </button>
                ) : null}
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busyId === item.id}
                  onClick={() => act(item.id, "delete")}
                >
                  حذف
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
