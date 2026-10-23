import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  adminListAutoNews,
  adminRefreshSectionNow,
  adminSaveAutoNews,
  adminSetNewsSource,
  type AutoItem,
  type AutoSource,
} from "@/lib/news/auto-admin";
import { newsCategories } from "@/lib/news/types";
import { tr, trv } from "@/lib/i18n/core";

const KIND = { news: "أخبار محلية", israel: "أخبار إسرائيل" } as const;
const CATEGORIES = [...newsCategories, "إسرائيل"];

/** «الأخبار التلقائية» (owner + مشرف): hide / pin / عاجل / category / title per item, sources on/off, and instant RSS refresh. */
export function AutoNewsAdmin() {
  const [items, setItems] = useState<AutoItem[] | null>(null);
  const [sources, setSources] = useState<AutoSource[]>([]);
  const [msg, setMsg] = useState("");
  const [kind, setKind] = useState<"" | "news" | "israel">("");
  const [cat, setCat] = useState("");
  const [src, setSrc] = useState("");
  const [state, setState] = useState<"" | "hidden" | "pinned" | "edited">("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState("");
  const [editing, setEditing] = useState<{ slug: string; title: string } | null>(null);

  const refresh = useCallback(async () => {
    const res = await adminListAutoNews();
    setItems(res.items);
    setSources(res.sources);
    setMsg(
      !res.authed ? tr("انتهت الجلسة. سجّل الدخول من جديد.") : res.ok ? "" : tr("تعذّر تحميل الأخبار."),
    );
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const forceRefreshAll = async () => {
    setBusy("force-all");
    setMsg(tr("جاري جلب أحدث الأخبار من جميع مصادر RSS…"));
    const r = await adminRefreshSectionNow({ data: { section: "all" } });
    if (r.ok) {
      await refresh();
      setMsg(
        r.failedSources.length
          ? tr("✓ تم تحديث جميع المصادر في {0} مللي ثانية ({1} خبر) · تعذّر: {2}", r.ms, r.count, r.failedSources.join("، "))
          : tr("✓ تم تحديث وجلب {0} خبر من جميع المصادر في {1} مللي ثانية", r.count, r.ms),
      );
    } else {
      setMsg(trv(r.message ?? tr("تعذّر تحديث المصادر.")));
    }
    setBusy("");
  };

  const effCat = (i: AutoItem) => i.ov?.category ?? i.category;
  const list = useMemo(() => {
    const needle = q.trim();
    return (items ?? []).filter(
      (i) =>
        (!kind || i.kind === kind) &&
        (!cat || effCat(i) === cat) &&
        (!src || i.source === src) &&
        (!state ||
          (state === "hidden" && i.ov?.hidden) ||
          (state === "pinned" && i.ov?.pinned) ||
          (state === "edited" && i.ov)) &&
        (!needle || `${i.ov?.title ?? ""} ${i.title} ${i.titleHe ?? ""}`.includes(needle)),
    );
  }, [items, kind, cat, src, state, q]);

  const save = async (i: AutoItem, patch: Partial<NonNullable<AutoItem["ov"]>>) => {
    setBusy(i.slug);
    const base = i.ov ?? {
      hidden: false,
      pinned: false,
      breaking: null,
      category: null,
      title: null,
    };
    const next = { ...base, ...patch };
    const res = await adminSaveAutoNews({ data: { slug: i.slug, kind: i.kind, ...next } });
    if (!res.ok) setMsg(res.message || tr("تعذّر الحفظ."));
    else setItems((all) => (all ?? []).map((x) => (x.slug === i.slug ? { ...x, ov: next } : x)));
    setBusy("");
  };

  const toggleSource = async (s: AutoSource) => {
    setBusy(`src:${s.kind}:${s.name}`);
    const res = await adminSetNewsSource({
      data: { kind: s.kind, name: s.name, enabled: !s.enabled },
    });
    if (res.ok) setSources((all) => all.map((x) => (x === s ? { ...x, enabled: !s.enabled } : x)));
    else setMsg(tr("تعذّر تغيير المصدر."));
    setBusy("");
  };

  const sourceNames = [...new Set((items ?? []).map((i) => i.source))];

  return (
    <>
      <div className="rounded-3xl bg-paper mb-4 p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold">{tr("المصادر التلقائية والجلب الفوري")}</h2>
            <p className="text-sm font-semibold text-muted">
              {tr("إيقاف مصدر يخفي كل أخباره من الموقع. يمكنك الضغط على «تحديث جميع المصادر الآن» لجلب أحدث الأخبار فوراً.")}
            </p>
          </div>
          <button
            type="button"
            disabled={busy === "force-all"}
            onClick={forceRefreshAll}
            className="btn flex items-center gap-2 px-4 py-2 text-sm"
          >
            <RefreshCw className={`size-4 ${busy === "force-all" ? "animate-spin" : ""}`} aria-hidden />
            {busy === "force-all" ? tr("جاري الجلب…") : tr("تحديث جميع المصادر الآن")}
          </button>
        </div>
        {(["news", "israel"] as const).map((k) => (
          <div key={k} className="mt-3">
            <p className="font-bold">{trv(KIND[k])}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {sources
                .filter((s) => s.kind === k)
                .map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    className={s.enabled ? "chip chip-ink" : "chip line-through opacity-60"}
                    disabled={busy === `src:${s.kind}:${s.name}`}
                    onClick={() => toggleSource(s)}
                  >
                    {s.enabled ? "✓ " : "✕ "}
                    {trv(s.name)}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-paper mb-4 grid grid-cols-2 gap-2 p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <input
          className="field col-span-2"
          placeholder={tr("ابحث في العناوين")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="field"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
        >
          <option value="">{tr("كل الأقسام")}</option>
          <option value="news">{trv(KIND.news)}</option>
          <option value="israel">{trv(KIND.israel)}</option>
        </select>
        <select className="field" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">{tr("كل التصنيفات")}</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{trv(c)}</option>
          ))}
        </select>
        <select className="field" value={src} onChange={(e) => setSrc(e.target.value)}>
          <option value="">{tr("كل المصادر")}</option>
          {sourceNames.map((s) => (
            <option key={s}>{trv(s)}</option>
          ))}
        </select>
        <select
          className="field"
          value={state}
          onChange={(e) => setState(e.target.value as typeof state)}
        >
          <option value="">{tr("كل الحالات")}</option>
          <option value="hidden">{tr("المخفية")}</option>
          <option value="pinned">{tr("المثبتة")}</option>
          <option value="edited">{tr("المعدّلة")}</option>
        </select>
      </div>

      {msg ? <p className="rounded-3xl bg-paper mb-3 p-3.5 font-bold shadow-[0_1px_3px_rgba(16,24,40,0.06)]">{trv(msg)}</p> : null}
      {!items ? (
        <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>
      ) : (
        <>
          <p className="mb-2 font-bold">
            {trv(list.length)} {tr("من")} {trv(items.length)} {tr("خبر")}
          </p>
          <ul className="flex flex-col gap-3">
            {list.slice(0, 150).map((i) => {
              const ov = i.ov;
              const breaking = ov?.breaking ?? i.breaking;
              const href = i.kind === "news" ? `/news/${i.slug}` : `/israel-news/${i.slug}`;
              return (
                <li key={i.slug} className={`rounded-3xl bg-paper p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)] ${ov?.hidden ? "opacity-60" : ""}`}>
                  <div className="flex flex-wrap gap-2">
                    <span className="chip">{trv(KIND[i.kind])}</span>
                    <span className="chip">{trv(i.source)}</span>
                    {ov?.hidden ? <span className="chip chip-ink">{tr("مخفي")}</span> : null}
                    {ov?.pinned ? <span className="chip chip-ink">{tr("📌 مثبّت")}</span> : null}
                    {breaking ? <span className="chip chip-alert">{tr("عاجل")}</span> : null}
                  </div>
                  {editing?.slug === i.slug ? (
                    <form
                      className="mt-2 flex flex-col gap-2"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await save(i, { title: editing.title.trim() || null });
                        setEditing(null);
                      }}
                    >
                      <textarea
                        className="field min-h-20"
                        value={editing.title}
                        maxLength={300}
                        onChange={(e) => setEditing({ slug: i.slug, title: e.target.value })}
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <button type="submit" className="btn">
                          {tr("حفظ")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={async () => {
                            await save(i, { title: null });
                            setEditing(null);
                          }}
                        >
                          {tr("الأصلي")}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setEditing(null)}
                        >
                          {tr("إلغاء")}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 block text-lg font-bold underline"
                    >
                      {ov?.title ?? i.title}
                    </a>
                  )}
                  {ov?.title ? (
                    <p className="text-sm font-semibold text-muted">{tr("الأصلي:")} {trv(i.title)}</p>
                  ) : null}
                  {i.titleHe && i.titleHe !== i.title ? (
                    <p className="text-sm font-semibold text-muted" dir="rtl" lang="he">
                      {trv(i.titleHe)}
                    </p>
                  ) : null}
                  <p className="text-sm font-semibold text-muted">
                    {new Date(i.publishedAt).toLocaleString("ar-u-nu-latn", {
                      timeZone: "Asia/Jerusalem",
                    })}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <select
                      className="field col-span-2 sm:col-span-1"
                      value={effCat(i)}
                      disabled={busy === i.slug}
                      onChange={(e) =>
                        save(i, { category: e.target.value === i.category ? null : e.target.value })
                      }
                      aria-label={tr("التصنيف")}
                    >
                      {[...new Set([i.category, ...CATEGORIES])].map((c) => (
                        <option key={c}>{trv(c)}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={busy === i.slug}
                      onClick={() => save(i, { hidden: !ov?.hidden })}
                    >
                      {ov?.hidden ? tr("إظهار") : tr("إخفاء")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={busy === i.slug}
                      onClick={() => save(i, { pinned: !ov?.pinned })}
                    >
                      {ov?.pinned ? tr("إلغاء التثبيت") : tr("تثبيت")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={busy === i.slug}
                      onClick={() =>
                        save(i, { breaking: breaking === i.breaking ? !i.breaking : null })
                      }
                    >
                      {breaking ? tr("إلغاء العاجل") : tr("عاجل")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setEditing({ slug: i.slug, title: ov?.title ?? i.title })}
                    >
                      {tr("تعديل العنوان")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
