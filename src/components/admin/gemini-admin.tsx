import { useCallback, useEffect, useState } from "react";
import {
  adminClearLangCache,
  adminGetGemini,
  adminSaveGemini,
  adminTestGemini,
  type GeminiPublic,
  type GeminiUsage,
} from "@/lib/i18n/api";
import { getI18nState, tr, trv } from "@/lib/i18n/core";

const USES = [
  ["israel", "ترجمة أخبار إسرائيل (عبري ← عربي)"],
  ["site", "ترجمة لغات الموقع (الواجهة والمحتوى)"],
  ["auto", "ترجمة الأخبار التلقائية"],
] as const;

const PNAME = { gemini: "Gemini", grok: "Grok (xAI)", mymemory: "MyMemory" } as const;

export function GeminiAdmin() {
  const [s, setS] = useState<GeminiPublic | null>(null);
  const [usage, setUsage] = useState<GeminiUsage | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [cache, setCache] = useState<{ lang: string; n: number }[]>([]);
  const [key, setKey] = useState("");
  const [grokKey, setGrokKey] = useState("");
  const [grokModels, setGrokModels] = useState<string[]>([]);
  const [testProv, setTestProv] = useState<"" | "gemini" | "grok" | "mymemory">("");
  const [msg, setMsg] = useState("");
  const [testText, setTestText] = useState("مرحباً بكم في رهط بوست، أخبار رهط والنقب.");
  const [testLang, setTestLang] = useState("en");
  const [testOut, setTestOut] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await adminGetGemini();
    if (!r.authed || !r.settings) return setMsg(tr("هذا القسم للمالك والمشرفين فقط."));
    setS(r.settings);
    setUsage(r.usage ?? null);
    setModels(r.models ?? []);
    setGrokModels(r.grokModels ?? []);
    setCache(r.cache ?? []);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (!s) return <p className="stamp p-4 font-semibold">{msg || tr("جاري التحميل…")}</p>;
  const save = async (extra: { apiKey?: string; clearKey?: boolean; grokKey?: string; clearGrokKey?: boolean } = {}) => {
    setBusy(true);
    const r = await adminSaveGemini({ data: { ...s, ...extra } });
    setBusy(false);
    setKey("");
    setGrokKey("");
    setMsg(r.ok ? tr("تم الحفظ.") : trv(r.message ?? tr("تعذّر الحفظ.")));
    if (r.ok) await load();
  };
  const test = async () => {
    setTestOut(tr("جاري الاختبار…"));
    const r = await adminTestGemini({ data: { text: testText, lang: testLang, provider: testProv } });
    setTestOut(r.ok ? `${r.text}\n\n(${r.provider} · ${r.ms} ms)` : trv(r.message ?? tr("فشل الطلب.")));
    await load();
  };
  const mv = (i: number, d: number) => {
    const o = [...s.order];
    [o[i], o[i + d]] = [o[i + d], o[i]];
    setS({ ...s, order: o });
  };
  const langs = getI18nState().langs;
  const modelList = models.includes(s.model) ? models : [s.model, ...models];
  const totals = (usage?.today ?? []).reduce((a, u) => ({ calls: a.calls + u.calls, cached: a.cached + u.cached, errors: a.errors + u.errors }), { calls: 0, cached: 0, errors: 0 });

  return (
    <div className="flex flex-col gap-4">
      <section className="stamp flex flex-col gap-3 p-4">
        <h2 className="text-lg font-bold">{tr("الذكاء الاصطناعي والترجمة")}</h2>
        <label className="flex items-center gap-2 font-bold">
          <input type="checkbox" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} />
          {tr("تفعيل الترجمة بالذكاء الاصطناعي")}
        </label>
        <div className="flex flex-col gap-1 ps-6">
          {USES.map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" disabled={!s.enabled} checked={s.uses[k]} onChange={(e) => setS({ ...s, uses: { ...s.uses, [k]: e.target.checked } })} />
              {trv(label)}
            </label>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-sm font-bold">
          {tr("النموذج")}
          <select className="field" value={s.model} dir="ltr" onChange={(e) => setS({ ...s, model: e.target.value })}>
            {modelList.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {!models.length ? <span className="text-xs font-semibold text-muted">{tr("تعذّر جلب قائمة النماذج (تحقق من المفتاح).")}</span> : null}
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          {tr("درجة الإبداع (Temperature): {0}", s.temperature)}
          <input type="range" min={0} max={1} step={0.05} value={s.temperature} onChange={(e) => setS({ ...s, temperature: Number(e.target.value) })} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-bold">
          {tr("أسلوب الترجمة (تعليمات للنموذج)")}
          <textarea className="field min-h-24" dir="auto" value={s.stylePrompt} onChange={(e) => setS({ ...s, stylePrompt: e.target.value })} />
        </label>
        <div className="flex flex-col gap-1 text-sm font-bold">
          {tr("مفتاح API (اختياري)")}
          <p className="text-xs font-semibold text-muted">
            {s.hasOwnKey ? tr("يوجد مفتاح محفوظ ومشفّر.") : s.hasEnvKey ? tr("يُستخدم المفتاح من إعدادات الخادم (GEMINI_API_KEY).") : tr("لا يوجد مفتاح.")}
          </p>
          <div className="flex gap-2">
            <input className="field flex-1" type="password" autoComplete="off" dir="ltr" placeholder="AIza…" value={key} onChange={(e) => setKey(e.target.value)} />
            {s.hasOwnKey ? (
              <button type="button" className="btn btn-ghost px-3" onClick={() => save({ clearKey: true })}>{tr("حذف المفتاح")}</button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 text-sm font-bold">
          {tr("ترتيب مزودي الترجمة (عند الفشل يُستخدم التالي)")}
          {s.order.map((p, i) => (
            <div key={p} className="flex items-center gap-2 rounded-xl bg-surface p-2">
              <input type="checkbox" checked={s.providers[p]} onChange={(e) => setS({ ...s, providers: { ...s.providers, [p]: e.target.checked } })} />
              <span className="flex-1" dir="ltr">{i + 1}. {PNAME[p]}</span>
              <button type="button" className="btn btn-ghost px-2" disabled={i === 0} onClick={() => mv(i, -1)}>↑</button>
              <button type="button" className="btn btn-ghost px-2" disabled={i === s.order.length - 1} onClick={() => mv(i, 1)}>↓</button>
            </div>
          ))}
        </div>
        <label className="flex flex-col gap-1 text-sm font-bold">
          {tr("نموذج Grok")}
          <select className="field" value={s.grokModel} dir="ltr" onChange={(e) => setS({ ...s, grokModel: e.target.value })}>
            {(grokModels.includes(s.grokModel) ? grokModels : [s.grokModel, ...grokModels]).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1 text-sm font-bold">
          {tr("مفتاح xAI (اختياري)")}
          <p className="text-xs font-semibold text-muted">
            {s.hasGrokOwnKey ? tr("يوجد مفتاح محفوظ ومشفّر.") : s.hasGrokEnvKey ? tr("يُستخدم المفتاح من إعدادات الخادم (XAI_API_KEY).") : tr("لا يوجد مفتاح.")}
          </p>
          <div className="flex gap-2">
            <input className="field flex-1" type="password" autoComplete="off" dir="ltr" placeholder="xai-…" value={grokKey} onChange={(e) => setGrokKey(e.target.value)} />
            {s.hasGrokOwnKey ? (
              <button type="button" className="btn btn-ghost px-3" onClick={() => save({ clearGrokKey: true })}>{tr("حذف المفتاح")}</button>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn" disabled={busy} onClick={() => save({ ...(key.trim() ? { apiKey: key } : {}), ...(grokKey.trim() ? { grokKey } : {}) })}>{tr("حفظ")}</button>
          {msg ? <p className="text-sm font-semibold" role="status">{trv(msg)}</p> : null}
        </div>
      </section>

      <section className="stamp flex flex-col gap-3 p-4">
        <h2 className="text-lg font-bold">{tr("صور الذكاء الاصطناعي للأخبار بلا صور")}</h2>
        <p className="text-sm font-semibold text-muted">
          {tr("الافتراضي: صورة بهوية رهط بوست (العنوان والشعار). عند التفعيل تُولَّد رسمة توضيحية عامة (بلا نصوص ولا وجوه حقيقية) في الخلفية، وعند أي خطأ تبقى الصورة الافتراضية.")}
        </p>
        <label className="flex items-center gap-2 font-bold">
          <input type="checkbox" checked={s.aiImages.enabled} onChange={(e) => setS({ ...s, aiImages: { ...s.aiImages, enabled: e.target.checked } })} />
          {tr("تفعيل صور الذكاء الاصطناعي")}
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-bold">
            {tr("المزوّد")}
            <select className="field" dir="ltr" value={s.aiImages.provider} onChange={(e) => setS({ ...s, aiImages: { ...s.aiImages, provider: e.target.value as "gemini" | "grok" } })}>
              <option value="gemini">Gemini (image)</option>
              <option value="grok">Grok (xAI image)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-bold">
            {tr("الحد اليومي للصور")}
            <input className="field" type="number" min={0} max={500} value={s.aiImages.dailyCap} onChange={(e) => setS({ ...s, aiImages: { ...s.aiImages, dailyCap: Number(e.target.value) } })} />
          </label>
        </div>
        <button type="button" className="btn self-start" disabled={busy} onClick={() => save()}>{tr("حفظ")}</button>
      </section>

      <section className="stamp flex flex-col gap-3 p-4">
        <h2 className="text-lg font-bold">{tr("تجربة")}</h2>
        <textarea className="field min-h-20" dir="auto" value={testText} onChange={(e) => setTestText(e.target.value)} />
        <div className="flex gap-2">
          <select className="field w-auto" value={testLang} onChange={(e) => setTestLang(e.target.value)}>
            {[...langs.map((l) => [l.code, l.name]), ...(langs.some((l) => l.code === "fr") ? [] : [["fr", "Français"]])].map(([c, n]) => (
              <option key={c} value={c}>{n}</option>
            ))}
          </select>
          <select className="field w-auto" dir="ltr" value={testProv} onChange={(e) => setTestProv(e.target.value as typeof testProv)}>
            <option value="">{tr("السلسلة")}</option>
            {s.order.map((p) => <option key={p} value={p}>{PNAME[p]}</option>)}
          </select>
          <button type="button" className="btn" onClick={test}>{tr("ترجم")}</button>
        </div>
        {testOut ? <pre className="whitespace-pre-wrap rounded-xl bg-surface p-3 text-sm" dir="auto">{testOut}</pre> : null}
      </section>

      <section className="stamp flex flex-col gap-3 p-4">
        <h2 className="text-lg font-bold">{tr("الاستخدام اليوم")}</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-surface p-3"><p className="text-2xl font-bold">{totals.calls}</p><p className="text-xs font-semibold text-muted">{tr("طلبات")}</p></div>
          <div className="rounded-xl bg-surface p-3"><p className="text-2xl font-bold">{totals.cached}</p><p className="text-xs font-semibold text-muted">{tr("من الذاكرة")}</p></div>
          <div className="rounded-xl bg-surface p-3"><p className="text-2xl font-bold">{totals.errors}</p><p className="text-xs font-semibold text-muted">{tr("أخطاء")}</p></div>
        </div>
        {usage?.today.length ? (
          <ul className="text-sm font-semibold">
            {usage.today.map((u) => (
              <li key={u.kind}>{u.kind}: {u.calls} / {u.cached} / {u.errors}</li>
            ))}
          </ul>
        ) : null}
        <h3 className="font-bold">{tr("آخر الأخطاء")}</h3>
        {usage?.errors.length ? (
          <ul className="flex flex-col gap-1 text-xs" dir="ltr">
            {usage.errors.map((e, i) => (
              <li key={i} className="rounded-lg bg-surface p-2"><b>{e.at.slice(0, 19)} · {e.kind}</b> {e.message}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm font-semibold text-muted">{tr("لا توجد أخطاء.")}</p>
        )}
      </section>

      <section className="stamp flex flex-col gap-3 p-4">
        <h2 className="text-lg font-bold">{tr("ذاكرة الترجمة")}</h2>
        {langs.filter((l) => l.code !== "ar").map((l) => (
          <div key={l.code} className="flex items-center gap-2 text-sm font-semibold">
            <span className="flex-1">{l.name} · {tr("{0} نص محفوظ", cache.find((c) => c.lang === l.code)?.n ?? 0)}</span>
            <button
              type="button"
              className="btn btn-ghost px-3"
              onClick={async () => {
                if (!confirm(tr("حذف الترجمات الآلية المحفوظة لهذه اللغة؟ (التعديلات اليدوية تبقى)"))) return;
                const r = await adminClearLangCache({ data: l.code });
                setMsg(tr("حُذف {0} ترجمة محفوظة.", r.n));
                await load();
              }}
            >
              {tr("مسح")}
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
