import { useCallback, useEffect, useState } from "react";
import {
  adminDeleteFeed,
  adminListSections,
  adminResetFeeds,
  adminSaveFeed,
  adminSaveSection,
  adminTestFeed,
  type AdminSection,
} from "@/lib/news/auto-admin";
import { tr, trv } from "@/lib/i18n/core";

type Id = AdminSection["id"];
type Feed = AdminSection["feeds"][number];
const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("ar-u-nu-latn", { timeZone: "Asia/Jerusalem", dateStyle: "short", timeStyle: "short" }) : "—";

/** One auto section (owner + مشرف): on/off, name, order, home, refresh minutes, and its own feeds. */
export function SectionAdmin({ id }: { id: Id }) {
  const [sec, setSec] = useState<AdminSection | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [edit, setEdit] = useState<Partial<Feed> | null>(null);
  const [tests, setTests] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const r = await adminListSections();
    if (!r.authed) return setMsg(tr("هذا القسم للمالك والمشرفين فقط."));
    setSec(r.sections.find((s) => s.id === id) ?? null);
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  if (!sec) return <p className="stamp p-4 font-semibold">{msg || tr("جاري التحميل…")}</p>;
  const hasFeeds = id !== "weather";

  const saveSec = async () => {
    setBusy("sec");
    const r = await adminSaveSection({ data: sec });
    setBusy("");
    setMsg(r.ok ? tr("تم الحفظ.") : trv(r.message ?? tr("تعذّر الحفظ.")));
    if (r.ok) await load();
  };
  const saveFeed = async (f: Partial<Feed>) => {
    setBusy(f.id ?? "new");
    const r = await adminSaveFeed({ data: { section: id, id: f.id, source: f.source ?? "", home: f.home ?? "", url: f.url ?? "", enabled: f.enabled !== false } });
    setBusy("");
    setMsg(r.ok ? tr("تم الحفظ.") : trv(r.message ?? tr("تعذّر الحفظ.")));
    if (r.ok) {
      setEdit(null);
      await load();
    }
  };
  const del = async (f: Feed) => {
    if (!confirm(tr("حذف هذا المصدر؟"))) return;
    setBusy(f.id);
    await adminDeleteFeed({ data: { section: id, id: f.id } });
    setBusy("");
    await load();
  };
  const test = async (url: string, key: string) => {
    setTests((t) => ({ ...t, [key]: tr("جاري الاختبار…") }));
    const r = await adminTestFeed({ data: { section: id, url } });
    setTests((t) => ({
      ...t,
      [key]: r.ok
        ? tr("يعمل: {0} خبر، {1} بصورة، الأحدث {2}", r.count, r.images, fmt(r.latest ?? null))
        : tr("خطأ: {0}", r.error ?? ""),
    }));
    void load();
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="stamp flex flex-col gap-3 p-4">
        <h2 className="text-lg font-bold">{trv(sec.name)}</h2>
        <label className="flex items-center gap-2 font-bold">
          <input type="checkbox" checked={sec.enabled} onChange={(e) => setSec({ ...sec, enabled: e.target.checked })} />
          {tr("القسم مفعّل (عند الإيقاف يختفي من الموقع)")}
        </label>
        <label className="flex items-center gap-2 font-bold">
          <input type="checkbox" checked={sec.home} onChange={(e) => setSec({ ...sec, home: e.target.checked })} />
          {tr("يظهر في الصفحة الرئيسية")}
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-bold">
            {tr("الاسم")}
            <input className="field" value={sec.name} onChange={(e) => setSec({ ...sec, name: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            {tr("الترتيب")}
            <input className="field" type="number" min={0} max={99} value={sec.position} onChange={(e) => setSec({ ...sec, position: Number(e.target.value) })} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            {tr("التحديث كل (دقائق)")}
            <input className="field" type="number" min={1} max={1440} value={sec.refreshMin} onChange={(e) => setSec({ ...sec, refreshMin: Number(e.target.value) })} />
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn" disabled={busy === "sec"} onClick={saveSec}>{tr("حفظ")}</button>
          {msg ? <p className="text-sm font-semibold" role="status">{trv(msg)}</p> : null}
        </div>
        <p className="text-xs font-semibold text-muted">{tr("ترتيب الأقسام في الصفحة الرئيسية يُضبط من «إعدادات الموقع».")}</p>
      </section>

      {hasFeeds ? (
        <section className="stamp flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">{tr("المصادر (RSS)")}</h2>
            <div className="flex gap-2">
              <button type="button" className="btn px-3" onClick={() => setEdit({ enabled: true })}>{tr("إضافة مصدر")}</button>
              {sec.customFeeds ? (
                <button type="button" className="btn btn-ghost px-3" onClick={async () => { if (confirm(tr("استعادة المصادر الافتراضية؟"))) { await adminResetFeeds({ data: { section: id } }); await load(); } }}>
                  {tr("استعادة الافتراضي")}
                </button>
              ) : null}
            </div>
          </div>
          {edit ? <FeedForm feed={edit} busy={busy !== ""} onCancel={() => setEdit(null)} onSave={saveFeed} onTest={(u) => test(u, "form")} testMsg={tests.form} /> : null}
          <ul className="flex flex-col gap-2">
            {sec.feeds.map((f) => (
              <li key={f.id} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input type="checkbox" aria-label={tr("تفعيل")} checked={f.enabled} disabled={busy === f.id} onChange={(e) => saveFeed({ ...f, enabled: e.target.checked })} />
                  <span className="font-bold">{trv(f.source)}</span>
                  {!f.enabled ? <span className="chip">{tr("موقوف")}</span> : null}
                  <span className="ms-auto flex gap-1">
                    <button type="button" className="btn btn-ghost px-2 text-sm" onClick={() => test(f.url, f.id)}>{tr("اختبار")}</button>
                    <button type="button" className="btn btn-ghost px-2 text-sm" onClick={() => setEdit(f)}>{tr("تعديل")}</button>
                    <button type="button" className="btn btn-ghost px-2 text-sm" onClick={() => del(f)}>{tr("حذف")}</button>
                  </span>
                </div>
                <p className="mt-1 break-all text-xs font-semibold text-muted" dir="ltr">{f.url}</p>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {f.stat
                    ? tr("آخر جلب: {0} · العناصر: {1} · آخر نجاح: {2}", fmt(f.stat.lastFetch), f.stat.lastCount, fmt(f.stat.lastOk))
                    : tr("لم يُجلب بعد.")}
                  {f.stat?.lastError ? <span className="block text-alert">{tr("آخر خطأ: {0}", f.stat.lastError)}</span> : null}
                </p>
                {tests[f.id] ? <p className="mt-1 text-sm font-semibold" role="status">{tests[f.id]}</p> : null}
              </li>
            ))}
            {sec.feeds.length === 0 ? <li className="text-sm font-semibold text-muted">{tr("لا توجد مصادر.")}</li> : null}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function FeedForm({ feed, busy, onSave, onCancel, onTest, testMsg }: { feed: Partial<Feed>; busy: boolean; onSave: (f: Partial<Feed>) => void; onCancel: () => void; onTest: (url: string) => void; testMsg?: string }) {
  const [f, setF] = useState(feed);
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-surface p-3">
      <label className="flex flex-col gap-1 text-sm font-bold">
        {tr("اسم المصدر")}
        <input className="field" value={f.source ?? ""} onChange={(e) => setF({ ...f, source: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-bold">
        {tr("رابط RSS")}
        <input className="field" dir="ltr" value={f.url ?? ""} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://example.com/feed/" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-bold">
        {tr("رابط الموقع (اختياري)")}
        <input className="field" dir="ltr" value={f.home ?? ""} onChange={(e) => setF({ ...f, home: e.target.value })} />
      </label>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" checked={f.enabled !== false} onChange={(e) => setF({ ...f, enabled: e.target.checked })} />
        {tr("مفعّل")}
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" disabled={busy} onClick={() => onSave(f)}>{tr("حفظ")}</button>
        <button type="button" className="btn btn-ghost" disabled={!f.url} onClick={() => onTest(f.url ?? "")}>{tr("اختبار")}</button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>{tr("إلغاء")}</button>
      </div>
      {testMsg ? <p className="text-sm font-semibold" role="status">{testMsg}</p> : null}
    </div>
  );
}
