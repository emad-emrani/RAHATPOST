import { useEffect, useState } from "react";
import { tr, trv } from "@/lib/i18n/core";
import { adminDeletePopup, adminListPopups, adminResetPopupStats, adminSavePopup } from "@/lib/popups/api";
import { NEW_POPUP, type AdminPopup, type PopupData, type PopupPage } from "@/lib/popups/types";
import { mediaUrl } from "@/lib/media/types";
import { uploadImage } from "@/components/admin/site-settings-admin";

const PAGES: Record<PopupPage, string> = { all: "كل الصفحات", home: "الرئيسية", haraj: "الحراج", news: "الأخبار" };
const FREQ = { visit: "كل زيارة", session: "مرة لكل جلسة", day: "مرة في اليوم" } as const;

/** «الإعلانات المنبثقة» (owner only): list with real counters + editor. */
export function PopupsAdmin() {
  const [items, setItems] = useState<AdminPopup[] | null>(null);
  const [authed, setAuthed] = useState(true);
  const [edit, setEdit] = useState<{ id: string; data: PopupData } | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => adminListPopups().then((r) => { setAuthed(r.authed); setItems(r.items); });
  useEffect(() => { void load(); }, []);
  if (!authed) return <p className="stamp p-4 font-bold">{tr("هذا القسم لمالك الموقع فقط.")}</p>;
  if (!items) return <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>;

  if (edit) {
    const d = edit.data;
    const set = (p: Partial<PopupData>) => setEdit({ ...edit, data: { ...d, ...p } });
    return (
      <div className="flex flex-col gap-3">
        <div className="stamp flex flex-col gap-3 p-4">
          <label className="block font-bold">{tr("الاسم (للإدارة ونص بديل للصورة)")}
            <input className="field mt-1" value={d.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["image", "text"] as const).map((k) => (
              <button key={k} type="button" className={d.kind === k ? "chip chip-ink justify-center py-2" : "chip justify-center py-2"} onClick={() => set({ kind: k })}>
                {k === "image" ? tr("صورة") : tr("نص")}
              </button>
            ))}
          </div>
          {d.kind === "image" ? (
            <div className="flex items-center gap-3">
              {d.image ? <img src={mediaUrl(d.image)} alt="" className="h-24 w-24 rounded-2xl object-cover" /> : <span className="grid h-24 w-24 place-items-center rounded-2xl bg-primary-soft text-xs font-bold">{tr("لا صورة")}</span>}
              <label className="btn btn-ghost">
                {busy ? tr("جاري الرفع…") : tr("رفع صورة")}
                <input type="file" accept="image/*" className="sr-only" disabled={busy} onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setBusy(true);
                  try { set({ image: await uploadImage(f) }); } catch (err) { setMsg(err instanceof Error ? err.message : tr("تعذّر رفع الصورة.")); } finally { setBusy(false); }
                }} />
              </label>
            </div>
          ) : (
            <label className="block font-bold">{tr("النص")}
              <textarea className="field mt-1 min-h-28" maxLength={600} value={d.text} onChange={(e) => set({ text: e.target.value })} />
            </label>
          )}
          <label className="block font-bold">{tr("الرابط عند الضغط (يفتح في نافذة جديدة)")}
            <input className="field mt-1" dir="ltr" placeholder="https://" value={d.link} onChange={(e) => set({ link: e.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block font-bold">{tr("الظهور بعد (ثوانٍ)")}
              <input className="field mt-1" type="number" min={0} max={120} value={d.delay} onChange={(e) => set({ delay: Number(e.target.value) })} />
            </label>
            <label className="block font-bold">{tr("إغلاق تلقائي بعد (0 = لا)")}
              <input className="field mt-1" type="number" min={0} max={300} value={d.autoClose} onChange={(e) => set({ autoClose: Number(e.target.value) })} />
            </label>
            <label className="block font-bold">{tr("من تاريخ (اختياري)")}
              <input className="field mt-1" type="date" value={d.start} onChange={(e) => set({ start: e.target.value })} />
            </label>
            <label className="block font-bold">{tr("حتى تاريخ (اختياري)")}
              <input className="field mt-1" type="date" value={d.end} onChange={(e) => set({ end: e.target.value })} />
            </label>
          </div>
          <label className="block font-bold">{tr("التكرار")}
            <select className="field mt-1" value={d.freq} onChange={(e) => set({ freq: e.target.value as PopupData["freq"] })}>
              {(Object.keys(FREQ) as (keyof typeof FREQ)[]).map((k) => <option key={k} value={k}>{tr(FREQ[k])}</option>)}
            </select>
          </label>
          <fieldset>
            <legend className="font-bold">{tr("الصفحات")}</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {(Object.keys(PAGES) as PopupPage[]).map((k) => {
                const on = d.pages.includes(k);
                return (
                  <button key={k} type="button" aria-pressed={on} className={on ? "chip chip-ink" : "chip"} onClick={() => {
                    const next = k === "all" ? ["all"] : on ? d.pages.filter((x) => x !== k) : [...d.pages.filter((x) => x !== "all"), k];
                    set({ pages: (next.length ? next : ["all"]) as PopupPage[] });
                  }}>{tr(PAGES[k])}</button>
                );
              })}
            </div>
          </fieldset>
          <label className="flex items-center gap-3 font-bold">
            <input type="checkbox" className="size-5" checked={d.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
            {tr("مفعّل")}
          </label>
        </div>
        {msg ? <p className="stamp p-3 font-bold" role="status">{trv(msg)}</p> : null}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn" disabled={busy} onClick={async () => {
            const r = await adminSavePopup({ data: { id: edit.id, data: d } });
            if (!r.ok) return setMsg(tr("تعذّر الحفظ."));
            setMsg(""); setEdit(null); await load();
          }}>{tr("حفظ")}</button>
          <button type="button" className="btn btn-ghost" onClick={() => { setEdit(null); setMsg(""); }}>{tr("إلغاء")}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button type="button" className="btn" onClick={() => setEdit({ id: "", data: { ...NEW_POPUP } })}>{tr("+ إعلان منبثق جديد")}</button>
      {items.length === 0 ? <p className="stamp p-4 font-semibold">{tr("لا إعلانات منبثقة بعد.")}</p> : null}
      {items.map((p) => (
        <div key={p.id} className="stamp flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            {p.kind === "image" && p.image ? <img src={mediaUrl(p.image)} alt="" className="size-14 rounded-2xl object-cover" /> : <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft text-xs font-bold">{tr("نص")}</span>}
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{p.title || p.text.slice(0, 40) || tr("بلا اسم")}</p>
              <p className="text-xs font-semibold text-muted">
                {p.pages.map((x) => tr(PAGES[x])).join("، ")} · {tr(FREQ[p.freq])}{p.start || p.end ? ` · ${p.start || "…"} → ${p.end || "…"}` : ""}
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" className="size-5" checked={p.enabled} aria-label={tr("مفعّل")} onChange={async (e) => {
                const { views: _v, clicks: _c, id, ...data } = p;
                await adminSavePopup({ data: { id, data: { ...data, enabled: e.target.checked } } });
                await load();
              }} />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-surface p-2"><p className="text-lg font-extrabold tabular-nums">{p.views}</p><p className="text-xs font-semibold text-muted">{tr("مشاهدات")}</p></div>
            <div className="rounded-2xl bg-surface p-2"><p className="text-lg font-extrabold tabular-nums">{p.clicks}</p><p className="text-xs font-semibold text-muted">{tr("نقرات")}</p></div>
            <div className="rounded-2xl bg-surface p-2"><p className="text-lg font-extrabold tabular-nums">{p.views ? ((p.clicks / p.views) * 100).toFixed(1) : "0"}%</p><p className="text-xs font-semibold text-muted">CTR</p></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => { const { views: _v, clicks: _c, id, ...data } = p; setEdit({ id, data }); }}>{tr("تعديل")}</button>
            <button type="button" className="btn btn-ghost" onClick={async () => { if (confirm(tr("تصفير العدادات؟"))) { await adminResetPopupStats({ data: { id: p.id } }); await load(); } }}>{tr("تصفير")}</button>
            <button type="button" className="btn btn-ghost" onClick={async () => { if (confirm(tr("حذف الإعلان المنبثق؟"))) { await adminDeletePopup({ data: { id: p.id } }); await load(); } }}>{tr("حذف")}</button>
          </div>
        </div>
      ))}
    </div>
  );
}
