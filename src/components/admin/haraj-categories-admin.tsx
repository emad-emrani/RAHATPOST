import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { tr, trv } from "@/lib/i18n/core";
import { adminGetHarajCategories, adminSaveHarajCategories } from "@/lib/market/api";
import type { HarajCategory } from "@/lib/market/categories";
import type { SpecField, SpecType } from "@/lib/market/types";

const TYPE_LABEL: Record<SpecType, string> = { text: "نص", number: "رقم", select: "قائمة اختيارات", month: "شهر/سنة" };

function move<T>(arr: T[], i: number, d: number): T[] {
  const j = i + d;
  if (j < 0 || j >= arr.length) return arr;
  const out = [...arr];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/** «تصنيفات الحراج»: categories (order, names ar/he/en, icon, on/off) and each one's optional spec fields. */
export function HarajCategoriesAdmin() {
  const [cats, setCats] = useState<HarajCategory[] | null>(null);
  const [defaults, setDefaults] = useState<HarajCategory[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    adminGetHarajCategories().then((r) => {
      if (!r.authed) return setMsg(tr("انتهت الجلسة. سجّل الدخول من جديد."));
      setCats(r.cats);
      setCounts(r.counts);
      setDefaults(r.defaults);
    });
  }, []);
  if (!cats) return <p className="stamp p-4 font-semibold">{msg || tr("جاري التحميل…")}</p>;

  const update = (next: HarajCategory[]) => {
    setCats(next);
    setDirty(true);
    setMsg("");
  };
  const patch = (key: string, p: Partial<HarajCategory>) => update(cats.map((c) => (c.key === key ? { ...c, ...p } : c)));
  const save = async () => {
    setBusy(true);
    try {
      const r = await adminSaveHarajCategories({ data: { cats } });
      if (r.ok) {
        setCats(r.cats);
        setDirty(false);
        setMsg(tr("تم الحفظ."));
      } else setMsg(trv(r.message ?? "تعذّر الحفظ."));
    } catch {
      setMsg(tr("تعذّر الحفظ."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="font-semibold text-muted">
        {tr("رتّب التصنيفات وفعّلها أو أوقفها، وحدّد لكل تصنيف حقول المواصفات الاختيارية التي تظهر في نموذج الإعلان وصفحة الإعلان والفلاتر.")}
      </p>
      <ul className="flex flex-col gap-2">
        {cats.map((c, i) => (
          <li key={c.key} className="stamp p-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden>{c.icon}</span>
              <button type="button" className="min-w-0 flex-1 text-start" onClick={() => setOpen(open === c.key ? "" : c.key)} aria-expanded={open === c.key}>
                <span className="block truncate font-bold">{c.name}</span>
                <span className="block text-xs font-semibold text-muted">
                  {tr("{0} حقول", c.fields.length)} · {tr("{0} إعلان", counts[c.key] ?? 0)}
                  {!c.enabled ? ` · ${tr("موقوف")}` : ""}
                </span>
              </button>
              <label className="flex items-center gap-1 text-sm font-bold">
                <input type="checkbox" className="size-5" checked={c.enabled} onChange={(e) => patch(c.key, { enabled: e.target.checked })} />
                {tr("مفعّل")}
              </label>
              <button type="button" className="btn btn-ghost px-2" aria-label={tr("أعلى")} onClick={() => update(move(cats, i, -1))}><ArrowUp className="size-4" /></button>
              <button type="button" className="btn btn-ghost px-2" aria-label={tr("أسفل")} onClick={() => update(move(cats, i, 1))}><ArrowDown className="size-4" /></button>
              <ChevronDown className={`size-5 transition-transform ${open === c.key ? "rotate-180" : ""}`} aria-hidden />
            </div>
            {open === c.key ? (
              <CategoryEditor
                cat={c}
                count={counts[c.key] ?? 0}
                onChange={(p) => patch(c.key, p)}
                onDelete={() => {
                  const n = counts[c.key] ?? 0;
                  if (!confirm(n ? tr("في هذا التصنيف {0} إعلان. الأفضل إيقافه بدل حذفه. حذف على أي حال؟", n) : tr("حذف التصنيف؟"))) return;
                  update(cats.filter((x) => x.key !== c.key));
                }}
              />
            ) : null}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => {
          const name = prompt(tr("اسم التصنيف الجديد (بالعربية)"))?.trim();
          if (!name || cats.some((c) => c.key === name)) return;
          update([...cats, { key: name, name, nameHe: "", nameEn: "", icon: "📦", enabled: true, fields: [] }]);
          setOpen(name);
        }}
      >
        <Plus className="size-4" aria-hidden /> {tr("إضافة تصنيف")}
      </button>
      <div className="sticky bottom-20 z-10 flex gap-2 rounded-2xl bg-paper p-2 shadow-lg md:bottom-2">
        <button type="button" className="btn flex-1" disabled={busy || !dirty} onClick={save}>{busy ? tr("جاري الحفظ…") : tr("حفظ التغييرات")}</button>
        <button type="button" className="btn btn-ghost" onClick={() => confirm(tr("استرجاع التصنيفات والحقول الافتراضية؟ (لا يحذف الإعلانات)")) && update(defaults.map((d) => ({ ...d, fields: d.fields.map((f) => ({ ...f })) })))}>
          {tr("الافتراضي")}
        </button>
      </div>
      {msg ? <p className="stamp p-3 font-bold" role="status">{msg}</p> : null}
    </div>
  );
}

function Txt({ label, value, onChange, max = 40, dir }: { label: string; value: string; onChange: (v: string) => void; max?: number; dir?: string }) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <input className="field mt-1" value={value} maxLength={max} dir={dir} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function CategoryEditor({ cat, count, onChange, onDelete }: { cat: HarajCategory; count: number; onChange: (p: Partial<HarajCategory>) => void; onDelete: () => void }) {
  const setField = (i: number, p: Partial<SpecField>) => onChange({ fields: cat.fields.map((f, j) => (j === i ? { ...f, ...p } : f)) });
  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-black/10 pt-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Txt label={tr("الاسم (عربي)")} value={cat.name} max={30} onChange={(v) => onChange({ name: v })} />
        <Txt label={tr("الاسم (עברית)")} value={cat.nameHe} max={30} dir="rtl" onChange={(v) => onChange({ nameHe: v })} />
        <Txt label={tr("الاسم (English)")} value={cat.nameEn} max={30} dir="ltr" onChange={(v) => onChange({ nameEn: v })} />
        <Txt label={tr("الأيقونة (إيموجي)")} value={cat.icon} max={8} onChange={(v) => onChange({ icon: v })} />
      </div>
      <p className="text-xs font-semibold text-muted">{tr("المعرّف الثابت: {0} — لا يتغير حتى لو غيّرت الاسم، فتبقى الإعلانات مرتبطة.", cat.key)}</p>
      <h3 className="font-bold">{tr("حقول المواصفات (كلها اختيارية للبائع)")}</h3>
      {cat.fields.length === 0 ? <p className="text-sm font-semibold text-muted">{tr("لا حقول. أضف حقلاً إن أردت.")}</p> : null}
      {cat.fields.map((f, i) => (
        <div key={i} className="rounded-xl bg-surface p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Txt label={tr("التسمية (عربي)")} value={f.label} onChange={(v) => setField(i, { label: v })} />
            <Txt label={tr("التسمية (עברית)")} value={f.labelHe ?? ""} dir="rtl" onChange={(v) => setField(i, { labelHe: v })} />
            <Txt label={tr("التسمية (English)")} value={f.labelEn ?? ""} dir="ltr" onChange={(v) => setField(i, { labelEn: v })} />
            <Txt label={tr("المفتاح (إنجليزي)")} value={f.key} max={16} dir="ltr" onChange={(v) => setField(i, { key: v.toLowerCase().replace(/[^a-z0-9]/g, "") })} />
            <label className="block text-sm font-bold">
              {tr("النوع")}
              <select className="field mt-1" value={f.type} onChange={(e) => setField(i, { type: e.target.value as SpecType })}>
                {(Object.keys(TYPE_LABEL) as SpecType[]).map((t) => <option key={t} value={t}>{trv(TYPE_LABEL[t])}</option>)}
              </select>
            </label>
            {f.type === "number" ? (
              <>
                <Txt label={tr("الوحدة")} value={f.unit ?? ""} max={10} onChange={(v) => setField(i, { unit: v })} />
                <Txt label={tr("أقل قيمة")} value={f.min?.toString() ?? ""} dir="ltr" onChange={(v) => setField(i, { min: v === "" ? undefined : Number(v) })} />
                <Txt label={tr("أعلى قيمة")} value={f.max?.toString() ?? ""} dir="ltr" onChange={(v) => setField(i, { max: v === "" ? undefined : Number(v) })} />
              </>
            ) : null}
            {f.type === "text" ? <Txt label={tr("مثال يظهر في الحقل")} value={f.placeholder ?? ""} onChange={(v) => setField(i, { placeholder: v })} /> : null}
          </div>
          {f.type === "select" ? (
            <label className="mt-2 block text-sm font-bold">
              {tr("الاختيارات — سطر لكل اختيار: عربي | עברית | English")}
              <textarea
                className="field mt-1 min-h-24"
                defaultValue={(f.options ?? []).map((o, k) => [o, f.optionsHe?.[k], f.optionsEn?.[k]].filter((x, n) => n === 0 || x).join(" | ")).join("\n")}
                onBlur={(e) => {
                  const rows = e.target.value.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((r) => r[0]);
                  setField(i, { options: rows.map((r) => r[0]), optionsHe: rows.map((r) => r[1] ?? ""), optionsEn: rows.map((r) => r[2] ?? "") });
                }}
              />
            </label>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {f.type === "select" || f.type === "number" ? (
              <label className="flex items-center gap-1 text-sm font-bold">
                <input type="checkbox" className="size-5" checked={Boolean(f.filter)} onChange={(e) => setField(i, { filter: e.target.checked ? (f.type === "select" ? "select" : "range") : undefined })} />
                {tr("يظهر كفلتر")}
              </label>
            ) : null}
            {f.type === "number" && f.filter ? (
              <select className="field w-auto py-1 text-sm" value={f.filter} onChange={(e) => setField(i, { filter: e.target.value as "range" | "max" })}>
                <option value="range">{tr("من – إلى")}</option>
                <option value="max">{tr("حد أعلى فقط")}</option>
              </select>
            ) : null}
            <span className="flex-1" />
            <button type="button" className="btn btn-ghost px-2" aria-label={tr("أعلى")} onClick={() => onChange({ fields: move(cat.fields, i, -1) })}><ArrowUp className="size-4" /></button>
            <button type="button" className="btn btn-ghost px-2" aria-label={tr("أسفل")} onClick={() => onChange({ fields: move(cat.fields, i, 1) })}><ArrowDown className="size-4" /></button>
            <button type="button" className="btn btn-ghost px-2 text-red-700" aria-label={tr("حذف الحقل")} onClick={() => onChange({ fields: cat.fields.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></button>
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <button type="button" className="btn btn-ghost flex-1" onClick={() => onChange({ fields: [...cat.fields, { key: `f${cat.fields.length + 1}`, label: "", type: "text", max: 40 }] })}>
          <Plus className="size-4" aria-hidden /> {tr("إضافة حقل")}
        </button>
        <button type="button" className="btn btn-ghost text-red-700" onClick={onDelete}>
          <Trash2 className="size-4" aria-hidden /> {count ? tr("حذف ({0} إعلان)", count) : tr("حذف التصنيف")}
        </button>
      </div>
    </div>
  );
}
