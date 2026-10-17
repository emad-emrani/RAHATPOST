import { useCallback, useEffect, useState } from "react";
import { compress } from "@/components/photo-picker";
import { mediaUrl } from "@/lib/media/types";
import { newsCategories } from "@/lib/news/types";
import { adminSaveStaffNews, adminListStaffNews, adminUpdateStaffNews } from "@/lib/staff-news/api";
import type { StaffNews } from "@/lib/staff-news/types";

/** «نشر خبر»: the team publishes news directly (server functions behind the admin cookie). */
export function PublishAdmin() {
  const [items, setItems] = useState<StaffNews[] | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(newsCategories[0]);
  const [body, setBody] = useState("");
  const [breaking, setBreaking] = useState(false);
  const [imageKey, setImageKey] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [msg, setMsg] = useState("");
  const [editId, setEditId] = useState("");

  const refresh = useCallback(async () => {
    const res = await adminListStaffNews();
    setItems(res.items);
    if (!res.authed) setMsg("انتهت الجلسة. سجّل الدخول من جديد.");
    else if (!res.ok) setMsg("تعذّر تحميل الأخبار المنشورة.");
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMsg("اختر ملف صورة.");
    setUploading(true);
    setMsg("");
    try {
      const blob = await compress(file);
      const res = await fetch("/api/media?kind=staff", {
        method: "POST",
        headers: { "content-type": blob.type },
        body: blob,
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        key?: string;
        message?: string;
      };
      if (!res.ok || !data.ok || !data.key) throw new Error(data.message || "تعذّر رفع الصورة.");
      setImageKey(data.key);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "تعذّر رفع الصورة.");
    } finally {
      setUploading(false);
    }
  };

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await adminSaveStaffNews({
        data: { title, category, body, imageKey, breaking, ...(editId ? { id: editId } : {}) },
      });
      if (!res.ok) return setMsg(res.message || "تعذّر النشر.");
      setTitle("");
      setBody("");
      setBreaking(false);
      setImageKey("");
      setEditId("");
      setMsg(editId ? "تم حفظ التعديل ✓" : "تم نشر الخبر ✓ (يظهر في الموقع خلال دقيقة)");
      await refresh();
    } catch {
      setMsg("تعذّر النشر. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (n: StaffNews | null) => {
    setEditId(n?.id ?? "");
    setTitle(n?.title ?? "");
    setCategory(n?.category ?? newsCategories[0]);
    setBody(n?.body ?? "");
    setImageKey(n?.imageKey ?? "");
    setBreaking(n?.breaking ?? false);
    setMsg("");
    if (n) window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const act = async (id: string, action: "delete" | "breaking-on" | "breaking-off") => {
    if (action === "delete" && !confirm("حذف الخبر نهائياً؟")) return;
    setBusyId(id);
    try {
      const res = await adminUpdateStaffNews({ data: { id, action } });
      if (!res.ok) setMsg("تعذّر تنفيذ العملية.");
      await refresh();
    } finally {
      setBusyId("");
    }
  };

  return (
    <>
      <form className="stamp flex flex-col gap-3 p-4" onSubmit={publish}>
        <h2 className="text-lg font-bold">{editId ? "تعديل الخبر" : "نشر خبر جديد أو عاجل"}</h2>
        <label className="block font-bold">
          العنوان
          <input
            className="field mt-1"
            value={title}
            maxLength={160}
            required
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block font-bold">
          التصنيف
          <select
            className="field mt-1"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {newsCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block font-bold">
          نص الخبر
          <textarea
            className="field mt-1 min-h-40"
            value={body}
            maxLength={8000}
            required
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        <label className="block font-bold">
          صورة (اختياري)
          <input
            type="file"
            accept="image/*"
            className="field mt-1"
            disabled={uploading}
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </label>
        {uploading ? <p className="text-sm font-semibold text-muted">جاري رفع الصورة…</p> : null}
        {imageKey ? (
          <div className="flex items-center gap-3">
            <span className="chip">تم رفع الصورة ✓</span>
            <button type="button" className="btn btn-ghost px-3" onClick={() => setImageKey("")}>
              إزالة
            </button>
          </div>
        ) : null}
        <label className="flex items-center gap-2 font-bold">
          <input
            type="checkbox"
            checked={breaking}
            onChange={(e) => setBreaking(e.target.checked)}
          />
          خبر عاجل (يظهر في شريط «عاجل» بالصفحة الرئيسية)
        </label>
        <button type="submit" className="btn" disabled={saving || uploading}>
          {saving ? "جاري الحفظ…" : editId ? "حفظ التعديل" : "نشر الخبر"}
        </button>
        {editId ? (
          <button type="button" className="btn btn-ghost" onClick={() => startEdit(null)}>
            إلغاء التعديل
          </button>
        ) : null}
        {msg ? <p className="font-bold">{msg}</p> : null}
      </form>

      <h2 className="mt-6 mb-3 text-lg font-bold">الأخبار المنشورة ({items?.length ?? 0})</h2>
      {!items ? (
        <p className="stamp p-4 font-semibold">جاري التحميل…</p>
      ) : items.length === 0 ? (
        <p className="stamp p-4 font-semibold">لا أخبار منشورة بعد.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((n) => (
            <li key={n.id} className="stamp flex gap-3 p-4">
              {n.imageKey ? (
                <img
                  src={mediaUrl(n.imageKey)}
                  alt=""
                  className="size-20 shrink-0 rounded-xl object-cover"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  {n.breaking ? <span className="chip chip-alert">عاجل</span> : null}
                  <span className="chip">{n.category}</span>
                  <span className="chip">{n.authorName ? `كتبه: ${n.authorName}` : "الإدارة"}</span>
                </div>
                <a
                  href={`/news/rp-${n.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block text-lg font-bold underline"
                >
                  {n.title}
                </a>
                <p className="text-sm font-semibold text-muted">
                  {new Date(n.createdAt).toLocaleString("ar-u-nu-latn", {
                    timeZone: "Asia/Jerusalem",
                  })}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button type="button" className="btn btn-ghost" onClick={() => startEdit(n)}>
                    تعديل
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busyId === n.id}
                    onClick={() => act(n.id, n.breaking ? "breaking-off" : "breaking-on")}
                  >
                    {n.breaking ? "إلغاء العاجل" : "جعله عاجلاً"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busyId === n.id}
                    onClick={() => act(n.id, "delete")}
                  >
                    حذف
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
