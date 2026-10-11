import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { adminDecide, adminList, adminLogin, adminLogout } from "@/lib/directory/api";
import type { BusinessSubmission } from "@/lib/directory/types";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "إدارة · رهط بوست" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminPage,
});

const STATUS: Record<BusinessSubmission["status"], string> = {
  pending: "بانتظار المراجعة",
  approved: "موافَق عليه",
  rejected: "مرفوض",
};

function AdminPage() {
  const [state, setState] = useState<"loading" | "login" | "ready">("loading");
  const [items, setItems] = useState<BusinessSubmission[]>([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [tab, setTab] = useState<BusinessSubmission["status"]>("pending");

  const refresh = useCallback(async () => {
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
        <h1 className="mb-3 text-3xl font-bold">إدارة الدليل</h1>
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
            <input name="password" type="password" required autoComplete="current-password" className="field mt-1" dir="ltr" />
          </label>
          {error ? <p className="font-bold">{error}</p> : null}
          <button type="submit" className="btn">
            دخول
          </button>
        </form>
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
        <h1 className="text-3xl font-bold">إدارة الدليل</h1>
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
              <p className="mt-1 font-bold" dir="ltr">
                {item.phone}
              </p>
              <p className="text-sm font-semibold text-muted">
                {new Date(item.createdAt).toLocaleString("ar-u-nu-latn", { timeZone: "Asia/Jerusalem" })}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {item.status !== "approved" ? (
                  <button type="button" className="btn" disabled={busyId === item.id} onClick={() => act(item.id, "approved")}>
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
    </Shell>
  );
}
