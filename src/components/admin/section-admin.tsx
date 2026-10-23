import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Rss, CheckCircle2, FolderPlus, RefreshCw, Activity } from "lucide-react";
import {
  adminCreateSection,
  adminDeleteFeed,
  adminDeleteSection,
  adminListSections,
  adminRefreshSectionNow,
  adminResetFeeds,
  adminSaveFeed,
  adminSaveSection,
  adminTestFeed,
  type AdminSection,
} from "@/lib/news/auto-admin";
import { tr, trv } from "@/lib/i18n/core";

type Id = AdminSection["id"];
type Feed = AdminSection["feeds"][number];

const BUILTIN_IDS = new Set(["news", "israel", "sports", "tech", "weather"]);
const PRESET_SECTIONS: { name: string; slug: string }[] = [
  { name: "أخبار محلية", slug: "local-news" },
  { name: "أخبار رهط والنقب", slug: "rahat-negev" },
  { name: "بلدية ومجتمع", slug: "municipality" },
  { name: "تعليم ومدارس", slug: "education" },
  { name: "اقتصاد وأعمال", slug: "business" },
  { name: "ثقافة وفعاليات", slug: "events" },
];

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("ar-u-nu-latn", { timeZone: "Asia/Jerusalem", dateStyle: "short", timeStyle: "short" }) : "—";

/**
 * Unified Sections & High-Speed RSS Manager:
 * - Lets the owner/admin switch between all sections (built-in + custom) from a clean top bar.
 * - Includes a prominent «+ إضافة قسم جديد» button (with 1-click presets like «أخبار محلية»).
 * - Includes «تحديث وجلب الأخبار الآن» (instant server refresh with ms latency) and «فحص جميع المصادر» (parallel health check).
 */
export function SectionAdmin({ id }: { id: Id }) {
  const [sections, setSections] = useState<AdminSection[]>([]);
  const [activeId, setActiveId] = useState<string>(id || "news");
  const [sec, setSec] = useState<AdminSection | null>(null);
  const [msg, setMsg] = useState("");
  const [refreshMsg, setRefreshMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [edit, setEdit] = useState<Partial<Feed> | null>(null);
  const [tests, setTests] = useState<Record<string, string>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newHome, setNewHome] = useState(true);

  useEffect(() => {
    if (id) setActiveId(id);
  }, [id]);

  const load = useCallback(async (preferId?: string) => {
    const r = await adminListSections();
    if (!r.authed) return setMsg(tr("هذا القسم للمالك والمشرفين فقط."));
    setSections(r.sections);
    const targetId = preferId ?? activeId;
    const found = r.sections.find((s) => s.id === targetId) ?? r.sections[0] ?? null;
    if (found) {
      setActiveId(found.id);
      setSec(found);
    }
  }, [activeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectSection = (nextId: string) => {
    setActiveId(nextId);
    const found = sections.find((s) => s.id === nextId) ?? null;
    setSec(found);
    setEdit(null);
    setMsg("");
    setRefreshMsg("");
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return setMsg(tr("أدخل اسم القسم الجديد (مثل: أخبار محلية)."));
    setBusy("create-sec");
    setMsg("");
    const r = await adminCreateSection({
      data: {
        name: newName.trim(),
        id: newSlug.trim() || undefined,
        home: newHome,
      },
    });
    setBusy("");
    if (!r.ok) {
      setMsg(trv(r.message ?? tr("تعذّر إنشاء القسم.")));
      return;
    }
    setNewName("");
    setNewSlug("");
    setShowCreate(false);
    setMsg(tr("تمت إضافة القسم الجديد بنجاح ✓"));
    await load(r.id);
  };

  const handleDeleteSection = async () => {
    if (!sec || BUILTIN_IDS.has(sec.id)) return;
    if (!confirm(tr("هل أنت متأكد من حذف قسم «{0}» وجميع مصادره؟", sec.name))) return;
    setBusy("del-sec");
    const r = await adminDeleteSection({ data: { id: sec.id } });
    setBusy("");
    if (!r.ok) {
      setMsg(trv(r.message ?? tr("تعذّر حذف القسم.")));
      return;
    }
    setMsg(tr("تم حذف القسم."));
    await load("news");
  };

  if (!sec) return <p className="stamp p-4 font-semibold">{msg || tr("جاري التحميل…")}</p>;
  const hasFeeds = sec.id !== "weather";
  const isCustom = !BUILTIN_IDS.has(sec.id);

  const saveSec = async () => {
    setBusy("sec");
    const r = await adminSaveSection({ data: sec });
    setBusy("");
    setMsg(r.ok ? tr("تم حفظ إعدادات القسم ✓") : trv(r.message ?? tr("تعذّر الحفظ.")));
    if (r.ok) await load(sec.id);
  };

  const saveFeed = async (f: Partial<Feed>) => {
    setBusy(f.id ?? "new");
    const r = await adminSaveFeed({
      data: {
        section: sec.id,
        id: f.id,
        source: f.source ?? "",
        home: f.home ?? "",
        url: f.url ?? "",
        enabled: f.enabled !== false,
      },
    });
    setBusy("");
    setMsg(r.ok ? tr("تم حفظ المصدر ✓") : trv(r.message ?? tr("تعذّر الحفظ.")));
    if (r.ok) {
      setEdit(null);
      await load(sec.id);
    }
  };

  const del = async (f: Feed) => {
    if (!confirm(tr("حذف هذا المصدر؟"))) return;
    setBusy(f.id);
    await adminDeleteFeed({ data: { section: sec.id, id: f.id } });
    setBusy("");
    await load(sec.id);
  };

  const test = async (url: string, key: string) => {
    setTests((t) => ({ ...t, [key]: tr("جاري الاختبار…") }));
    const r = await adminTestFeed({ data: { section: sec.id, url } });
    setTests((t) => ({
      ...t,
      [key]: r.ok
        ? tr("✓ يعمل ({0} مللي ثانية): {1} خبر، {2} بصورة، الأحدث {3}", r.ms, r.count, r.images, fmt(r.latest ?? null))
        : tr("✕ خطأ ({0} مللي ثانية): {1}", r.ms, r.error ?? ""),
    }));
    void load(sec.id);
  };

  const testAllFeeds = async () => {
    if (!sec.feeds.length) return;
    setBusy("test-all");
    const nextTests: Record<string, string> = {};
    sec.feeds.forEach((f) => {
      nextTests[f.id] = tr("جاري الفحص…");
    });
    setTests((prev) => ({ ...prev, ...nextTests }));
    await Promise.all(
      sec.feeds.map(async (f) => {
        const r = await adminTestFeed({ data: { section: sec.id, url: f.url } });
        setTests((prev) => ({
          ...prev,
          [f.id]: r.ok
            ? tr("✓ يعمل ({0}ms) · {1} خبر ({2} بصورة)", r.ms, r.count, r.images)
            : tr("✕ خطأ ({0}ms): {1}", r.ms, r.error ?? ""),
        }));
      }),
    );
    setBusy("");
    await load(sec.id);
  };

  const refreshSectionNow = async () => {
    setBusy("refresh-now");
    setRefreshMsg(tr("جاري الجلب الفوري من المصادر…"));
    const r = await adminRefreshSectionNow({ data: { section: sec.id } });
    setBusy("");
    if (r.ok) {
      setRefreshMsg(
        r.failedSources.length
          ? tr("✓ تم التحديث في {0} مللي ثانية ({1} خبر) · تعذّر: {2}", r.ms, r.count, r.failedSources.join("، "))
          : tr("✓ تم جلب وتحديث {0} خبر بنجاح في {1} مللي ثانية", r.count, r.ms),
      );
      await load(sec.id);
    } else {
      setRefreshMsg(trv(r.message ?? tr("تعذّر التحديث الفوري.")));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Bar: All Sections + "Add New Section" Button */}
      <section className="rounded-3xl bg-paper p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold">{tr("إدارة أقسام الموقع ومصادر RSS")}</h2>
            <p className="text-xs font-semibold text-muted">
              {tr("اختر قسماً لتعديل إعداداته وفحص سرعة مصادره، أو أضف قسماً جديداً مثل «أخبار محلية» ليظهر في الموقع وعند نشر الأخبار.")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center gap-2 rounded-2xl bg-[#16A34A] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#15803D]"
          >
            <Plus className="size-4" aria-hidden />
            {tr("إضافة قسم جديد")}
          </button>
        </div>

        {/* Create New Section Modal/Drawer Card */}
        {showCreate ? (
          <form onSubmit={handleCreateSection} className="mt-4 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-extrabold">
                <FolderPlus className="size-4 text-primary-ink" aria-hidden />
                {tr("إنشاء قسم جديد في الموقع")}
              </h3>
              <button type="button" className="text-xs font-bold text-muted underline" onClick={() => setShowCreate(false)}>
                {tr("إغلاق")}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-muted">{tr("أقسام مقترحة جاهزة:")}</span>
              {PRESET_SECTIONS.map((p) => (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => {
                    setNewName(p.name);
                    setNewSlug(p.slug);
                  }}
                  className="rounded-full bg-paper px-3 py-1 text-xs font-bold shadow-xs transition hover:bg-brand hover:text-ink"
                >
                  + {trv(p.name)}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-bold">
                {tr("اسم القسم (بالعربية)")}
                <input
                  className="field"
                  required
                  placeholder={tr("مثال: أخبار محلية")}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-bold">
                {tr("المعرّف بالرابط (اختياري - بالإنجليزية)")}
                <input
                  className="field"
                  dir="ltr"
                  placeholder="local-news"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={newHome} onChange={(e) => setNewHome(e.target.checked)} />
              {tr("إظهار هذا القسم في الصفحة الرئيسية تلقائياً")}
            </label>

            <div className="flex flex-wrap gap-2">
              <button type="submit" className="btn" disabled={busy === "create-sec"}>
                {busy === "create-sec" ? tr("جاري الإنشاء…") : tr("حفظ وإضافة القسم")}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                {tr("إلغاء")}
              </button>
            </div>
          </form>
        ) : null}

        {/* Section Selector Chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {sections.map((s) => {
            const active = s.id === sec.id;
            const custom = !BUILTIN_IDS.has(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => selectSection(s.id)}
                className={`flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-bold transition ${
                  active ? "bg-ink text-paper shadow-xs" : "bg-surface text-ink hover:bg-primary-soft"
                }`}
              >
                <span>{trv(s.name)}</span>
                {custom ? (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold ${active ? "bg-brand text-ink" : "bg-paper text-muted"}`}>
                    {tr("مخصص")}
                  </span>
                ) : null}
                {!s.enabled ? (
                  <span className="rounded-full bg-alert/20 px-1.5 py-0.5 text-[10px] text-alert">{tr("موقوف")}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      {/* Active Section Settings */}
      <section className="rounded-3xl bg-paper p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)] flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold">{trv(sec.name)}</h2>
            <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold text-muted" dir="ltr">
              #{sec.id}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasFeeds ? (
              <button
                type="button"
                disabled={busy === "refresh-now"}
                onClick={refreshSectionNow}
                className="flex items-center gap-1.5 rounded-xl bg-primary-soft px-3 py-1.5 text-xs font-extrabold text-primary-ink transition hover:bg-brand hover:text-ink"
              >
                <RefreshCw className={`size-3.5 ${busy === "refresh-now" ? "animate-spin" : ""}`} aria-hidden />
                {busy === "refresh-now" ? tr("جاري الجلب…") : tr("تحديث وجلب الأخبار الآن")}
              </button>
            ) : null}
            {isCustom ? (
              <button
                type="button"
                disabled={busy === "del-sec"}
                onClick={handleDeleteSection}
                className="flex items-center gap-1.5 rounded-xl bg-surface px-3 py-1.5 text-xs font-bold text-alert hover:bg-alert/10"
              >
                <Trash2 className="size-4" aria-hidden />
                {tr("حذف هذا القسم")}
              </button>
            ) : null}
          </div>
        </div>

        {refreshMsg ? (
          <p className="rounded-2xl bg-surface px-3 py-2 text-xs font-bold text-ink" role="status">
            {refreshMsg}
          </p>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 rounded-2xl bg-surface p-3 font-bold">
            <input type="checkbox" checked={sec.enabled} onChange={(e) => setSec({ ...sec, enabled: e.target.checked })} />
            {tr("القسم مفعّل (عند الإيقاف يختفي من الموقع)")}
          </label>
          <label className="flex items-center gap-2 rounded-2xl bg-surface p-3 font-bold">
            <input type="checkbox" checked={sec.home} onChange={(e) => setSec({ ...sec, home: e.target.checked })} />
            {tr("يظهر في الصفحة الرئيسية")}
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm font-bold">
            {tr("اسم القسم")}
            <input className="field" value={sec.name} onChange={(e) => setSec({ ...sec, name: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            {tr("الترتيب في العرض")}
            <input className="field" type="number" min={0} max={99} value={sec.position} onChange={(e) => setSec({ ...sec, position: Number(e.target.value) })} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            {tr("التحديث التلقائي كل (دقائق)")}
            <input className="field" type="number" min={1} max={1440} value={sec.refreshMin} onChange={(e) => setSec({ ...sec, refreshMin: Number(e.target.value) })} />
          </label>
          {hasFeeds ? (
            <>
              <label className="flex flex-col gap-1 text-sm font-bold">
                {tr("أقصى عدد للأخبار")}
                <input className="field" type="number" min={5} max={300} value={sec.maxItems} onChange={(e) => setSec({ ...sec, maxItems: Number(e.target.value) })} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-bold">
                {tr("أقصى عمر للخبر (أيام، 0 = بلا حد)")}
                <input className="field" type="number" min={0} max={365} value={sec.maxAgeDays} onChange={(e) => setSec({ ...sec, maxAgeDays: Number(e.target.value) })} />
              </label>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="button" className="btn flex items-center gap-2" disabled={busy === "sec"} onClick={saveSec}>
            <CheckCircle2 className="size-4" aria-hidden />
            {tr("حفظ إعدادات القسم")}
          </button>
          {msg ? <p className="text-sm font-bold text-primary-ink" role="status">{trv(msg)}</p> : null}
        </div>
        {isCustom ? (
          <p className="text-xs font-semibold text-muted">
            {tr("ملاحظة: يمكنك نشر أخبار مباشرة داخل هذا القسم من زر «نشر خبر» واختيار تصنيف «{0}»، أو ربطه بمصادر RSS بالأسفل.", sec.name)}
          </p>
        ) : null}
      </section>

      {/* Feeds (RSS) for Active Section */}
      {hasFeeds ? (
        <section className="rounded-3xl bg-paper p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)] flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-base font-extrabold">
                <Rss className="size-4 text-primary-ink" aria-hidden />
                {tr("مصادر التغذية (RSS) لقسم")} «{trv(sec.name)}» ({sec.feeds.length})
              </h2>
              <p className="text-xs font-semibold text-muted">
                {tr("الجلب يعمل بتقنية التخزين الشرطي السريع (ETag/304) مع مهلة قصوى 4.5 ثانية لضمان سرعة استجابة الموقع.")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {sec.feeds.length > 0 ? (
                <button
                  type="button"
                  disabled={busy === "test-all"}
                  className="btn btn-ghost px-3 text-sm"
                  onClick={testAllFeeds}
                >
                  <Activity className="size-4" aria-hidden />
                  {busy === "test-all" ? tr("جاري الفحص…") : tr("فحص جميع المصادر")}
                </button>
              ) : null}
              <button type="button" className="btn px-3 text-sm" onClick={() => setEdit({ enabled: true })}>
                + {tr("إضافة مصدر RSS")}
              </button>
              {sec.customFeeds && !isCustom ? (
                <button
                  type="button"
                  className="btn btn-ghost px-3 text-sm"
                  onClick={async () => {
                    if (confirm(tr("استعادة المصادر الافتراضية؟"))) {
                      await adminResetFeeds({ data: { section: sec.id } });
                      await load(sec.id);
                    }
                  }}
                >
                  {tr("استعادة الافتراضي")}
                </button>
              ) : null}
            </div>
          </div>
          {edit ? (
            <FeedForm
              feed={edit}
              busy={busy !== ""}
              onCancel={() => setEdit(null)}
              onSave={saveFeed}
              onTest={(u) => test(u, "form")}
              testMsg={tests.form}
            />
          ) : null}
          <ul className="flex flex-col gap-2">
            {sec.feeds.map((f) => {
              const hasErr = Boolean(f.stat?.lastError);
              const isHealthy = Boolean(f.stat?.lastOk && !hasErr);
              return (
                <li key={f.id} className="rounded-2xl border border-line p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="checkbox"
                      aria-label={tr("تفعيل")}
                      checked={f.enabled}
                      disabled={busy === f.id}
                      onChange={(e) => saveFeed({ ...f, enabled: e.target.checked })}
                    />
                    <span className="font-bold">{trv(f.source)}</span>
                    {!f.enabled ? (
                      <span className="chip">{tr("موقوف")}</span>
                    ) : isHealthy ? (
                      <span className="chip chip-ok">{tr("متصل")} · {f.stat?.lastCount ?? 0} {tr("خبر")}</span>
                    ) : hasErr ? (
                      <span className="chip chip-alert">{tr("تنبيه اتصال")}</span>
                    ) : null}
                    <span className="ms-auto flex gap-1">
                      <button type="button" className="btn btn-ghost px-2 text-sm" onClick={() => test(f.url, f.id)}>
                        {tr("اختبار السرعة")}
                      </button>
                      <button type="button" className="btn btn-ghost px-2 text-sm" onClick={() => setEdit(f)}>
                        {tr("تعديل")}
                      </button>
                      <button type="button" className="btn btn-ghost px-2 text-sm" onClick={() => del(f)}>
                        {tr("حذف")}
                      </button>
                    </span>
                  </div>
                  <p className="mt-1 break-all text-xs font-semibold text-muted" dir="ltr">
                    {f.url}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {f.stat
                      ? tr("آخر جلب: {0} · العناصر: {1} · آخر نجاح: {2}", fmt(f.stat.lastFetch), f.stat.lastCount, fmt(f.stat.lastOk))
                      : tr("لم يُجلب بعد.")}
                    {f.stat?.lastError ? <span className="block text-alert">{tr("آخر خطأ: {0}", f.stat.lastError)}</span> : null}
                  </p>
                  {tests[f.id] ? <p className="mt-1 text-sm font-bold text-primary-ink" role="status">{tests[f.id]}</p> : null}
                </li>
              );
            })}
            {sec.feeds.length === 0 ? (
              <li className="rounded-2xl bg-surface p-4 text-center text-sm font-semibold text-muted">
                {tr("لا توجد مصادر RSS مضافة لهذا القسم حالياً. يمكنك إضافة مصدر RSS أو الاكتفاء بنشر الأخبار يدوياً من «نشر خبر».")}
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function FeedForm({
  feed,
  busy,
  onSave,
  onCancel,
  onTest,
  testMsg,
}: {
  feed: Partial<Feed>;
  busy: boolean;
  onSave: (f: Partial<Feed>) => void;
  onCancel: () => void;
  onTest: (url: string) => void;
  testMsg?: string;
}) {
  const [f, setF] = useState(feed);
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-surface p-3">
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
        <button type="button" className="btn" disabled={busy} onClick={() => onSave(f)}>
          {tr("حفظ")}
        </button>
        <button type="button" className="btn btn-ghost" disabled={!f.url} onClick={() => onTest(f.url ?? "")}>
          {tr("اختبار السرعة")}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          {tr("إلغاء")}
        </button>
      </div>
      {testMsg ? <p className="text-sm font-semibold" role="status">{testMsg}</p> : null}
    </div>
  );
}
