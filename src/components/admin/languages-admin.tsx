import { ArrowDown, ArrowUp, Plus, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  adminClearLangCache,
  adminGetLanguages,
  adminListUi,
  adminSaveLanguages,
  adminSaveUi,
  adminTranslateMissingUi,
  type UiRow,
} from "@/lib/i18n/api";
import { LANG_CODE_RE, tr, trv, type LangDef } from "@/lib/i18n/core";

export function LanguagesAdmin() {
  const [langs, setLangs] = useState<LangDef[] | null>(null);
  const [stats, setStats] = useState<Record<string, { total: number; have: number }>>({});
  const [msg, setMsg] = useState("");
  const [dirty, setDirty] = useState(false);
  const [edit, setEdit] = useState<string>("");
  const [busy, setBusy] = useState("");
  const [nl, setNl] = useState({ code: "", name: "", dir: "ltr" as "ltr" | "rtl", flag: "", mode: "ai" as "ai" | "manual" });

  const load = useCallback(async () => {
    const r = await adminGetLanguages();
    if (!r.authed) return setMsg(tr("هذا القسم للمالك والمشرفين فقط."));
    setLangs(r.langs);
    setStats(r.stats);
    setDirty(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (!langs) return <p className="stamp p-4 font-semibold">{msg || tr("جاري التحميل…")}</p>;

  const update = (code: string, patch: Partial<LangDef>) => {
    setLangs(langs.map((l) => (l.code === code ? { ...l, ...patch } : patch.isDefault ? { ...l, isDefault: false } : l)));
    setDirty(true);
  };
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= langs.length) return;
    const out = [...langs];
    [out[i], out[j]] = [out[j], out[i]];
    setLangs(out);
    setDirty(true);
  };
  const save = async () => {
    setBusy("save");
    const r = await adminSaveLanguages({ data: langs });
    setBusy("");
    setMsg(r.ok ? tr("تم الحفظ ✓ تظهر التغييرات في الموقع خلال دقيقة تقريباً.") : trv(r.message ?? tr("تعذّر الحفظ.")));
    if (r.ok) await load();
  };
  const add = () => {
    const code = nl.code.trim().toLowerCase();
    if (!LANG_CODE_RE.test(code)) return setMsg(tr("رمز اللغة غير صحيح (مثل: fr أو ru أو tr)."));
    if (langs.some((l) => l.code === code)) return setMsg(tr("هذه اللغة موجودة."));
    setLangs([...langs, { code, name: nl.name.trim() || code, dir: nl.dir, flag: nl.flag.trim(), enabled: true, isDefault: false, mode: nl.mode, sort: langs.length }]);
    setNl({ code: "", name: "", dir: "ltr", flag: "", mode: "ai" });
    setDirty(true);
    setMsg(tr("أُضيفت اللغة. اضغط «حفظ» ثم «ترجمة الناقص بالذكاء الاصطناعي»."));
  };
  const translateAll = async (code: string) => {
    setBusy(code);
    let total = 0;
    for (let i = 0; i < 40; i++) {
      const r = await adminTranslateMissingUi({ data: code });
      if (!r.ok) {
        setMsg(trv(r.message ?? tr("تعذّر تنفيذ العملية.")));
        break;
      }
      total += r.done;
      setMsg(tr("تُرجم {0} نصاً، المتبقي {1}…", total, r.remaining));
      if (r.remaining === 0 || r.done === 0) break;
    }
    setBusy("");
    await load();
  };
  const clear = async (code: string) => {
    if (!confirm(tr("حذف الترجمات الآلية المحفوظة لهذه اللغة؟ (التعديلات اليدوية تبقى)"))) return;
    const r = await adminClearLangCache({ data: code });
    setMsg(r.ok ? tr("حُذف {0} ترجمة محفوظة.", r.n) : tr("تعذّر تنفيذ العملية."));
    await load();
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="stamp flex flex-col gap-3 p-4">
        <h2 className="text-lg font-bold">{tr("لغات الموقع")}</h2>
        <p className="text-sm font-semibold text-muted">
          {tr("تظهر اللغات المفعّلة فقط في زر اللغة أعلى الموقع. العربية هي اللغة الأساسية للمحتوى.")}
        </p>
        <div className="flex flex-col gap-2">
          {langs.map((l, i) => {
            const st = stats[l.code];
            return (
              <div key={l.code} className="rounded-2xl border border-line p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl" aria-hidden>{l.flag || "🌐"}</span>
                  <input className="field w-36" value={l.name} aria-label={tr("الاسم")} onChange={(e) => update(l.code, { name: e.target.value })} />
                  <code className="chip">{l.code}</code>
                  <select className="field w-24" value={l.dir} aria-label={tr("الاتجاه")} onChange={(e) => update(l.code, { dir: e.target.value as "rtl" | "ltr" })}>
                    <option value="rtl">RTL</option>
                    <option value="ltr">LTR</option>
                  </select>
                  <input className="field w-16" value={l.flag} placeholder="🏳️" aria-label={tr("العلم")} onChange={(e) => update(l.code, { flag: e.target.value })} />
                  <div className="ms-auto flex gap-1">
                    <button type="button" className="btn btn-ghost px-2" aria-label={tr("أعلى")} onClick={() => move(i, -1)}><ArrowUp className="size-4" /></button>
                    <button type="button" className="btn btn-ghost px-2" aria-label={tr("أسفل")} onClick={() => move(i, 1)}><ArrowDown className="size-4" /></button>
                    {l.code !== "ar" ? (
                      <button type="button" className="btn btn-ghost px-2" aria-label={tr("حذف")} onClick={() => { setLangs(langs.filter((x) => x.code !== l.code)); setDirty(true); }}>
                        <Trash2 className="size-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-semibold">
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={l.enabled} disabled={l.code === "ar"} onChange={(e) => update(l.code, { enabled: e.target.checked })} />
                    {tr("مفعّلة")}
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" name="deflang" checked={l.isDefault} onChange={() => update(l.code, { isDefault: true })} />
                    {tr("الافتراضية")}
                  </label>
                  {l.code !== "ar" ? (
                    <>
                      <select className="field w-auto" value={l.mode} aria-label={tr("طريقة الترجمة")} onChange={(e) => update(l.code, { mode: e.target.value as "ai" | "manual" })}>
                        <option value="ai">{tr("ذكاء اصطناعي (Gemini)")}</option>
                        <option value="manual">{tr("يدوي")}</option>
                      </select>
                      {st ? <span className="chip">{tr("مترجم {0} من {1}", st.have, st.total)}</span> : null}
                      <button type="button" className="btn btn-ghost px-3" disabled={!!busy} onClick={() => translateAll(l.code)}>
                        <Sparkles className="size-4" /> {busy === l.code ? tr("جاري الترجمة…") : tr("ترجمة الناقص بالذكاء الاصطناعي")}
                      </button>
                      <button type="button" className="btn btn-ghost px-3" onClick={() => setEdit(edit === l.code ? "" : l.code)}>
                        {tr("تعديل النصوص")}
                      </button>
                      <button type="button" className="btn btn-ghost px-3" onClick={() => clear(l.code)}>
                        {tr("مسح ذاكرة الترجمة")}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn" disabled={!dirty || busy === "save"} onClick={save}>
            {tr("حفظ")}
          </button>
          {msg ? <p className="text-sm font-semibold" role="status">{trv(msg)}</p> : null}
        </div>
      </section>

      <section className="stamp flex flex-col gap-3 p-4">
        <h2 className="text-lg font-bold">{tr("إضافة لغة")}</h2>
        <div className="flex flex-wrap gap-2">
          <input className="field w-28" placeholder={tr("الرمز (fr)")} value={nl.code} dir="ltr" onChange={(e) => setNl({ ...nl, code: e.target.value })} />
          <input className="field w-40" placeholder={tr("الاسم بلغته (Français)")} value={nl.name} onChange={(e) => setNl({ ...nl, name: e.target.value })} />
          <select className="field w-24" value={nl.dir} aria-label={tr("الاتجاه")} onChange={(e) => setNl({ ...nl, dir: e.target.value as "rtl" | "ltr" })}>
            <option value="ltr">LTR</option>
            <option value="rtl">RTL</option>
          </select>
          <input className="field w-16" placeholder="🇫🇷" value={nl.flag} aria-label={tr("العلم")} onChange={(e) => setNl({ ...nl, flag: e.target.value })} />
          <select className="field w-auto" value={nl.mode} aria-label={tr("طريقة الترجمة")} onChange={(e) => setNl({ ...nl, mode: e.target.value as "ai" | "manual" })}>
            <option value="ai">{tr("ذكاء اصطناعي (Gemini)")}</option>
            <option value="manual">{tr("يدوي")}</option>
          </select>
          <button type="button" className="btn" onClick={add}>
            <Plus className="size-4" /> {tr("إضافة")}
          </button>
        </div>
      </section>

      {edit ? <UiEditor lang={edit} name={langs.find((l) => l.code === edit)?.name ?? edit} /> : null}
    </div>
  );
}

function UiEditor({ lang, name }: { lang: string; name: string }) {
  const [rows, setRows] = useState<UiRow[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [missing, setMissing] = useState(false);
  const [page, setPage] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState("");
  const load = useCallback(async () => {
    const r = await adminListUi({ data: { lang, q, missing, page } });
    setRows(r.rows);
    setTotal(r.total);
    setDrafts({});
  }, [lang, q, missing, page]);
  useEffect(() => {
    void load();
  }, [load]);
  const saveRow = async (key: string) => {
    const text = drafts[key] ?? "";
    const r = await adminSaveUi({ data: { lang, key, text } });
    if (r.ok) {
      setSaved(key);
      setDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
      setRows(rows.map((x) => (x.key === key ? { ...x, text: text || x.builtin, source: text ? "manual" : x.builtin ? "builtin" : "" } : x)));
    }
  };
  return (
    <section className="stamp flex flex-col gap-3 p-4">
      <h2 className="text-lg font-bold">{tr("نصوص الواجهة: {0}", name)}</h2>
      <div className="flex flex-wrap items-center gap-2">
        <input className="field flex-1" placeholder={tr("بحث…")} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        <label className="flex items-center gap-1 text-sm font-semibold">
          <input type="checkbox" checked={missing} onChange={(e) => { setMissing(e.target.checked); setPage(0); }} />
          {tr("الناقص فقط")}
        </label>
        <span className="chip">{total}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-start text-muted">
              <th className="p-2 text-start">{tr("العربية")}</th>
              <th className="p-2 text-start">{tr("الترجمة")}</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-line align-top">
                <td className="p-2 font-semibold" dir="rtl" lang="ar">{r.key}</td>
                <td className="p-2">
                  <textarea
                    className="field min-h-10 w-full"
                    dir="auto"
                    value={drafts[r.key] ?? r.text}
                    onChange={(e) => setDrafts({ ...drafts, [r.key]: e.target.value })}
                  />
                  <span className="text-xs text-muted">{r.source === "manual" ? tr("يدوي") : r.source === "ai" ? tr("ذكاء اصطناعي") : r.source === "builtin" ? tr("مدمج") : tr("ناقص")}</span>
                </td>
                <td className="p-2">
                  <button type="button" className="btn btn-ghost px-3" disabled={drafts[r.key] === undefined} onClick={() => saveRow(r.key)}>
                    {saved === r.key && drafts[r.key] === undefined ? "✓" : tr("حفظ")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className="btn btn-ghost px-3" disabled={page === 0} onClick={() => setPage(page - 1)}>{tr("السابق")}</button>
        <span className="text-sm font-semibold">{page + 1} / {Math.max(1, Math.ceil(total / 50))}</span>
        <button type="button" className="btn btn-ghost px-3" disabled={(page + 1) * 50 >= total} onClick={() => setPage(page + 1)}>{tr("التالي")}</button>
      </div>
    </section>
  );
}
