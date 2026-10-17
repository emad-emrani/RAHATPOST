import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminListAutoNews,
  adminSaveAutoNews,
  adminSetNewsSource,
  type AutoItem,
  type AutoSource,
} from "@/lib/news/auto-admin";
import { newsCategories } from "@/lib/news/types";

const KIND = { news: "أخبار محلية", israel: "أخبار إسرائيل" } as const;
const CATEGORIES = [...newsCategories, "إسرائيل"];

/** «الأخبار التلقائية» (owner + مشرف): hide / pin / عاجل / category / title per item, sources on/off. */
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
      !res.authed ? "انتهت الجلسة. سجّل الدخول من جديد." : res.ok ? "" : "تعذّر تحميل الأخبار.",
    );
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

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
    if (!res.ok) setMsg(res.message || "تعذّر الحفظ.");
    else setItems((all) => (all ?? []).map((x) => (x.slug === i.slug ? { ...x, ov: next } : x)));
    setBusy("");
  };

  const toggleSource = async (s: AutoSource) => {
    setBusy(`src:${s.kind}:${s.name}`);
    const res = await adminSetNewsSource({
      data: { kind: s.kind, name: s.name, enabled: !s.enabled },
    });
    if (res.ok) setSources((all) => all.map((x) => (x === s ? { ...x, enabled: !s.enabled } : x)));
    else setMsg("تعذّر تغيير المصدر.");
    setBusy("");
  };

  const sourceNames = [...new Set((items ?? []).map((i) => i.source))];

  return (
    <>
      <div className="stamp mb-4 p-4">
        <h2 className="text-lg font-bold">المصادر</h2>
        <p className="text-sm font-semibold text-muted">
          إيقاف مصدر يخفي كل أخباره من الموقع. التغييرات تظهر خلال دقيقة تقريباً.
        </p>
        {(["news", "israel"] as const).map((k) => (
          <div key={k} className="mt-3">
            <p className="font-bold">{KIND[k]}</p>
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
                    {s.name}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="stamp mb-4 grid grid-cols-2 gap-2 p-4">
        <input
          className="field col-span-2"
          placeholder="ابحث في العناوين"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="field"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
        >
          <option value="">كل الأقسام</option>
          <option value="news">{KIND.news}</option>
          <option value="israel">{KIND.israel}</option>
        </select>
        <select className="field" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">كل التصنيفات</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className="field" value={src} onChange={(e) => setSrc(e.target.value)}>
          <option value="">كل المصادر</option>
          {sourceNames.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          className="field"
          value={state}
          onChange={(e) => setState(e.target.value as typeof state)}
        >
          <option value="">كل الحالات</option>
          <option value="hidden">المخفية</option>
          <option value="pinned">المثبتة</option>
          <option value="edited">المعدّلة</option>
        </select>
      </div>

      {msg ? <p className="stamp mb-3 p-3 font-bold">{msg}</p> : null}
      {!items ? (
        <p className="stamp p-4 font-semibold">جاري التحميل…</p>
      ) : (
        <>
          <p className="mb-2 font-bold">
            {list.length} من {items.length} خبر
          </p>
          <ul className="flex flex-col gap-3">
            {list.slice(0, 150).map((i) => {
              const ov = i.ov;
              const breaking = ov?.breaking ?? i.breaking;
              const href = i.kind === "news" ? `/news/${i.slug}` : `/israel-news/${i.slug}`;
              return (
                <li key={i.slug} className={`stamp p-4 ${ov?.hidden ? "opacity-60" : ""}`}>
                  <div className="flex flex-wrap gap-2">
                    <span className="chip">{KIND[i.kind]}</span>
                    <span className="chip">{i.source}</span>
                    {ov?.hidden ? <span className="chip chip-ink">مخفي</span> : null}
                    {ov?.pinned ? <span className="chip chip-ink">📌 مثبّت</span> : null}
                    {breaking ? <span className="chip chip-alert">عاجل</span> : null}
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
                          حفظ
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={async () => {
                            await save(i, { title: null });
                            setEditing(null);
                          }}
                        >
                          الأصلي
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setEditing(null)}
                        >
                          إلغاء
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
                    <p className="text-sm font-semibold text-muted">الأصلي: {i.title}</p>
                  ) : null}
                  {i.titleHe && i.titleHe !== i.title ? (
                    <p className="text-sm font-semibold text-muted" dir="rtl" lang="he">
                      {i.titleHe}
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
                      aria-label="التصنيف"
                    >
                      {[...new Set([i.category, ...CATEGORIES])].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={busy === i.slug}
                      onClick={() => save(i, { hidden: !ov?.hidden })}
                    >
                      {ov?.hidden ? "إظهار" : "إخفاء"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={busy === i.slug}
                      onClick={() => save(i, { pinned: !ov?.pinned })}
                    >
                      {ov?.pinned ? "إلغاء التثبيت" : "تثبيت"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={busy === i.slug}
                      onClick={() =>
                        save(i, { breaking: breaking === i.breaking ? !i.breaking : null })
                      }
                    >
                      {breaking ? "إلغاء العاجل" : "عاجل"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setEditing({ slug: i.slug, title: ov?.title ?? i.title })}
                    >
                      تعديل العنوان
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
