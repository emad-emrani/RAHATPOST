import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ListingCard, useHarajName } from "@/components/haraj";
import { Shell } from "@/components/shell";
import { tr, trv } from "@/lib/i18n/core";
import { getHarajCategories, getListings } from "@/lib/market/api";
import { catName, fieldLabel, findCat, matchesSpecs, optionLabel, type HarajCategory, type SpecFilter } from "@/lib/market/categories";
import { CONDITIONS } from "@/lib/market/types";
import { breadcrumbLd, seo } from "@/lib/seo";

type S = { q?: string; cat?: string; cond?: string; min?: number; max?: number; f?: SpecFilter };

export const Route = createFileRoute("/haraj/")({
  validateSearch: (s: Record<string, unknown>): S => ({
    q: typeof s.q === "string" && s.q ? s.q.slice(0, 60) : undefined,
    cat: typeof s.cat === "string" && s.cat ? s.cat.slice(0, 30) : undefined,
    cond: (CONDITIONS as readonly string[]).includes(String(s.cond)) ? String(s.cond) : undefined,
    min: Number(s.min) > 0 ? Number(s.min) : undefined,
    max: Number(s.max) > 0 ? Number(s.max) : undefined,
    f: cleanFilter(s.f),
  }),
  loader: async () => {
    const [res, cats] = await Promise.all([getListings(), getHarajCategories()]);
    return { ...res, cats };
  },
  head: () =>
    seo({
      title: tr("حراج رهط · سوق المستعمل | رهط بوست"),
      description: tr("بيع واشترِ أغراضاً مستعملة في رهط والنقب: سيارات، إلكترونيات، أثاث، ملابس وعقارات. تواصل مع البائع مباشرة عبر واتساب."),
      path: "/haraj",
      jsonLd: [breadcrumbLd([{ name: tr("حراج رهط"), path: "/haraj" }])],
    }),
  component: HarajPage,
});

function HarajPage() {
  const { items, ok, cats } = Route.useLoaderData();
  const s = Route.useSearch();
  const nav = Route.useNavigate();
  const name = useHarajName();
  const [q, setQ] = useState(s.q ?? "");
  const set = (patch: Partial<S>) => nav({ search: (p: S) => ({ ...p, ...patch }), replace: true });
  const list = useMemo(() => {
    const needle = (s.q ?? "").trim().toLowerCase();
    return items.filter(
      (i) =>
        (!s.cat || i.category === s.cat) &&
        (!s.cond || i.condition === s.cond) &&
        (!s.min || (i.price ?? 0) >= s.min) &&
        (!s.max || (i.priceMode === "free" ? 0 : i.price ?? 0) <= s.max) &&
        (!s.cat || matchesSpecs(findCat(cats, s.cat), i.specs, s.f)) &&
        (!needle || `${i.title} ${i.description} ${i.area}`.toLowerCase().includes(needle)),
    );
  }, [items, s]);

  return (
    <Shell wide>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{trv(name)}</h1>
          <p className="text-sm font-semibold text-muted">{tr("سوق المستعمل في رهط والنقب")}</p>
        </div>
        <Link to="/haraj/new" className="btn shrink-0">
          <Plus className="size-5" aria-hidden /> {tr("أضف إعلان")}
        </Link>
      </div>
      <form
        className="relative mb-3"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          set({ q: q.trim() || undefined });
        }}
      >
        <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-5 text-muted" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} type="search" className="field ps-10" placeholder={tr("ابحث في الحراج…")} aria-label={tr("ابحث في الحراج…")} />
      </form>
      <div className="scroll-row -mx-4 mb-2 px-4">
        <button type="button" className={!s.cat ? "chip chip-ink" : "chip bg-paper"} onClick={() => set({ cat: undefined, f: undefined })}>{tr("الكل")}</button>
        {cats.map((c) => (
          <button key={c.key} type="button" className={s.cat === c.key ? "chip chip-ink shrink-0" : "chip bg-paper shrink-0"} onClick={() => set({ cat: s.cat === c.key ? undefined : c.key, f: undefined })}>{c.icon} {catName(c)}</button>
        ))}
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <select className="field" value={s.cond ?? ""} onChange={(e) => set({ cond: e.target.value || undefined })} aria-label={tr("الحالة")}>
          <option value="">{tr("كل الحالات")}</option>
          {CONDITIONS.map((c) => <option key={c} value={c}>{trv(c)}</option>)}
        </select>
        <input className="field" inputMode="numeric" placeholder={tr("من ₪")} defaultValue={s.min ?? ""} onBlur={(e) => set({ min: Number(e.target.value) || undefined })} aria-label={tr("أقل سعر")} />
        <input className="field" inputMode="numeric" placeholder={tr("إلى ₪")} defaultValue={s.max ?? ""} onBlur={(e) => set({ max: Number(e.target.value) || undefined })} aria-label={tr("أعلى سعر")} />
      </div>
      {s.cat ? <SpecFilters key={s.cat} cat={findCat(cats, s.cat)} f={s.f ?? {}} onChange={(f) => set({ f: Object.keys(f).length ? f : undefined })} /> : null}
      {!ok ? <p className="stamp mb-3 p-3 font-semibold">{tr("تعذّر تحميل الإعلانات الآن.")}</p> : null}
      {list.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((i) => <li key={i.id}><ListingCard item={i} /></li>)}
        </ul>
      ) : (
        <div className="stamp flex flex-col items-center gap-3 p-6 text-center">
          <p className="font-bold">{items.length ? tr("لا نتائج تطابق البحث.") : tr("لا إعلانات بعد. كن أول من يعرض غرضاً للبيع!")}</p>
          <Link to="/haraj/new" className="btn">{tr("أضف إعلان")}</Link>
        </div>
      )}
      <p className="mt-4 text-center text-sm font-semibold">
        <Link to="/haraj/mine" className="underline">{tr("إعلاناتي")}</Link>
      </p>
    </Shell>
  );
}

function cleanFilter(v: unknown): SpecFilter | undefined {
  if (!v || typeof v !== "object") return undefined;
  const out: SpecFilter = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>).slice(0, 20))
    if (/^[a-z]{2,16}(_min|_max)?$/.test(k) && (typeof val === "string" || typeof val === "number") && String(val))
      out[k] = String(val).slice(0, 40);
  return Object.keys(out).length ? out : undefined;
}

/** Filters built from the category's spec config (select → dropdown, number → range / max). */
function SpecFilters({ cat, f, onChange }: { cat: HarajCategory | undefined; f: SpecFilter; onChange: (f: SpecFilter) => void }) {
  const fields = (cat?.fields ?? []).filter((x) => x.filter);
  if (!fields.length) return null;
  const put = (k: string, v: string) => {
    const next = { ...f };
    if (v) next[k] = v;
    else delete next[k];
    onChange(next);
  };
  const num = (k: string, ph: string) => (
    <input key={k} className="field" inputMode="numeric" placeholder={ph} aria-label={ph} defaultValue={f[k] ?? ""} onBlur={(e) => put(k, e.target.value.replace(/[^\d]/g, ""))} />
  );
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-paper p-2 sm:grid-cols-4" aria-label={tr("فلاتر {0}", catName(cat))}>
      {fields.flatMap((x) =>
        x.type === "select"
          ? [
              <select key={x.key} className="field" value={f[x.key] ?? ""} onChange={(e) => put(x.key, e.target.value)} aria-label={fieldLabel(x)}>
                <option value="">{tr("{0}: الكل", fieldLabel(x))}</option>
                {(x.options ?? []).map((o) => <option key={o} value={o}>{optionLabel(x, o)}</option>)}
              </select>,
            ]
          : x.filter === "max"
            ? [num(`${x.key}_max`, tr("{0} حتى", fieldLabel(x)))]
            : [num(`${x.key}_min`, tr("{0} من", fieldLabel(x))), num(`${x.key}_max`, tr("{0} إلى", fieldLabel(x)))],
      )}
    </div>
  );
}
