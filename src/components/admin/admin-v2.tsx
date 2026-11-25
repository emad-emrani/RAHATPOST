import { Component, useEffect, useState, type ReactNode } from "react";
import { Check, ExternalLink, FolderPlus, LayoutGrid, PenSquare, Rss, Search, Settings, Trophy, X, type LucideIcon } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { tr, trv, getLang } from "@/lib/i18n/core";
import { adminDashboard, adminReviewQueue, adminSearch, type Dashboard, type ReviewItem, type SearchHit } from "@/lib/admin/dashboard";
import { adminDecideListing, getAllHarajCategories } from "@/lib/market/api";
import { adminDecideNews } from "@/lib/reader-news/api";
import { adminCommentAction } from "@/lib/comments/api";
import { mediaUrl } from "@/lib/media/types";
import type { HarajCategory } from "@/lib/market/categories";

/** One failing card/tab shows a small notice instead of breaking the whole admin page. */
export class CardBoundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[admin] card failed", error);
  }
  render() {
    return this.state.err ? (
      <div className="rounded-3xl bg-paper p-4 text-sm font-bold text-muted shadow-[0_1px_3px_rgba(16,24,40,0.06)]" role="alert">
        {tr("تعذّر عرض هذا الجزء.")}{" "}
        <button type="button" className="underline" onClick={() => this.setState({ err: false })}>{tr("إعادة المحاولة")}</button>
      </div>
    ) : (
      this.props.children
    );
  }
}

/** Fixed-height grey placeholders while data loads (no layout shift). */
export function Skeleton({ rows = 3, tiles = 0 }: { rows?: number; tiles?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label={tr("جاري التحميل…")}>
      {tiles ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: tiles }, (_, i) => <div key={i} className="h-[104px] animate-pulse rounded-3xl bg-paper" />)}
        </div>
      ) : null}
      {Array.from({ length: rows }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-3xl bg-paper" />)}
    </div>
  );
}

/** White rounded card on the grey admin canvas (reference: analytics mobile app). */
export function Card({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-3xl bg-paper p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)] ${className}`}>
      {title || action ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title ? <h2 className="text-base font-bold">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function Tile({ icon: Icon, label, value, onClick, hot }: { icon: LucideIcon; label: string; value: number; onClick?: () => void; hot?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-start gap-2 rounded-3xl bg-paper p-4 text-start shadow-[0_1px_3px_rgba(16,24,40,0.06)] transition hover:shadow-md active:scale-[0.98]">
      <span className="flex items-center gap-2 text-xs font-semibold text-muted">
        <span className={`grid size-7 place-items-center rounded-xl ${hot && value > 0 ? "bg-brand text-ink" : "bg-primary-soft text-primary-ink"}`}>
          <Icon className="size-4" aria-hidden />
        </span>
        {label}
      </span>
      <span className="text-2xl font-extrabold tabular-nums">{value.toLocaleString("en")}</span>
    </button>
  );
}

const dayLabel = (d: string) => new Date(d + "T12:00:00Z").toLocaleDateString(getLang() === "en" ? "en" : getLang() === "he" ? "he" : "ar-u-nu-latn", { weekday: "short" });

function Bars({ days, values, highlightLast = true }: { days: string[]; values: number[]; highlightLast?: boolean }) {
  const max = Math.max(1, ...values);
  return (
    <div>
      <div className="flex h-32 items-end gap-2" dir="ltr">
        {values.map((v, i) => (
          <div key={days[i]} className="flex flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] font-bold tabular-nums text-muted">{v}</span>
            <div className={`w-full rounded-lg ${highlightLast && i === values.length - 1 ? "bg-brand" : "bg-primary-soft"}`} style={{ height: `${Math.max(4, (v / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-2" dir="ltr">
        {days.map((d) => (
          <span key={d} className="flex-1 text-center text-[10px] font-semibold text-muted">{dayLabel(d)}</span>
        ))}
      </div>
    </div>
  );
}

function Trend({ days, a, b, la, lb }: { days: string[]; a: number[]; b: number[]; la: string; lb: string }) {
  const rows = days.map((day, i) => ({ day: dayLabel(day), a: a[i] ?? 0, b: b[i] ?? 0 }));
  return (
    <div>
      <div className="h-44 w-full" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-line)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} width={28} tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} />
            <Tooltip />
            <Area type="monotone" dataKey="a" name={la} stroke="var(--color-brand)" fill="var(--color-primary-soft)" strokeWidth={2} />
            <Area type="monotone" dataKey="b" name={lb} stroke="var(--color-ink)" fill="transparent" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex gap-4 text-xs font-semibold">
        <span className="flex items-center gap-1"><i className="inline-block h-1 w-4 rounded bg-brand" />{la}</span>
        <span className="flex items-center gap-1"><i className="inline-block h-1 w-4 rounded bg-ink" />{lb}</span>
      </div>
    </div>
  );
}

export function DashboardHome({ icons, go }: { icons: Record<string, LucideIcon>; go: (section: string) => void }) {
  const [d, setD] = useState<Dashboard | null>(null);
  const [failed, setFailed] = useState(false);
  const [cats, setCats] = useState<HarajCategory[]>([]);
  useEffect(() => {
    adminDashboard().then(setD).catch(() => setFailed(true));
    getAllHarajCategories().then(setCats).catch(() => {});
  }, []);
  if (failed) return <Card><p className="font-bold text-muted">{tr("تعذّر تحميل الإحصائيات.")}</p></Card>;
  if (!d) return <Skeleton tiles={4} rows={2} />;
  const lang = getLang();
  const catName = (k: string) => {
    const c = cats.find((x) => x.key === k);
    return c ? (lang === "en" ? c.nameEn : lang === "he" ? c.nameHe : c.name) || c.name : k;
  };
  const tiles: [string, string, number | null, string][] = [
    ["haraj", "إعلانات بانتظار المراجعة", d.pending.haraj, "review"],
    ["comments", "تعليقات بانتظار الموافقة", d.pending.comments, "review"],
    ["news", "أخبار القراء الجديدة", d.pending.news, "review"],
    ["reports", "بلاغات مفتوحة", d.pending.reports, "reports"],
  ];
  const topMax = Math.max(1, ...d.topCategories.map((c) => c.n));
  const todayRows: [string, number | null][] = [
    ["إعلانات", d.today.listings],
    ["تعليقات", d.today.comments],
    ["أخبار قراء", d.today.news],
    ["أعضاء جدد", d.today.members],
  ];
  return (
    <div className="flex flex-col gap-4">
      {/* Quick Control Center */}
      <CardBoundary>
        <Card title={tr("إجراءات سريعة وتنظيم الموقع")}>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => go("publish")}
              className="flex items-center gap-2.5 rounded-2xl bg-[#16A34A] p-3 text-start text-sm font-bold text-white shadow-xs transition hover:bg-[#15803D]"
            >
              <PenSquare className="size-5 shrink-0" aria-hidden />
              <span>{tr("نشر خبر جديد")}</span>
            </button>
            <button
              type="button"
              onClick={() => go("matches")}
              className="flex items-center gap-2.5 rounded-2xl bg-ink p-3 text-start text-sm font-bold text-paper shadow-xs transition hover:opacity-90"
            >
              <Trophy className="size-5 shrink-0" aria-hidden />
              <span>{tr("نتائج المباريات والليغا")}</span>
            </button>
            <button
              type="button"
              onClick={() => go("sec-news")}
              className="flex items-center gap-2.5 rounded-2xl bg-brand p-3 text-start text-sm font-bold text-ink shadow-xs transition hover:opacity-90"
            >
              <FolderPlus className="size-5 shrink-0" aria-hidden />
              <span>{tr("إضافة قسم جديد")}</span>
            </button>
            <button
              type="button"
              onClick={() => go("set-home")}
              className="flex items-center gap-2.5 rounded-2xl bg-surface p-3 text-start text-sm font-bold text-ink transition hover:bg-primary-soft"
            >
              <LayoutGrid className="size-5 shrink-0 text-primary-ink" aria-hidden />
              <span>{tr("ترتيب الصفحة الرئيسية")}</span>
            </button>
            <button
              type="button"
              onClick={() => go("auto")}
              className="flex items-center gap-2.5 rounded-2xl bg-surface p-3 text-start text-sm font-bold text-ink transition hover:bg-primary-soft"
            >
              <Rss className="size-5 shrink-0 text-primary-ink" aria-hidden />
              <span>{tr("الأخبار التلقائية")}</span>
            </button>
            <button
              type="button"
              onClick={() => go("set-menus")}
              className="flex items-center gap-2.5 rounded-2xl bg-surface p-3 text-start text-sm font-bold text-ink transition hover:bg-primary-soft"
            >
              <Settings className="size-5 shrink-0 text-primary-ink" aria-hidden />
              <span>{tr("القوائم والأيقونات")}</span>
            </button>
          </div>
        </Card>
      </CardBoundary>

      <CardBoundary><Card title={tr("نشاط اليوم")}>
        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
          {todayRows.filter((r) => r[1] !== null).map(([l, v]) => (
            <div key={l} className="rounded-2xl bg-surface px-2 py-2.5">
              <p className="text-xl font-extrabold tabular-nums">{v}</p>
              <p className="text-[11px] font-semibold text-muted">{tr(l)}</p>
            </div>
          ))}
        </div>
      </Card></CardBoundary>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.filter((t) => t[2] !== null).map(([k, label, v, to]) => (
          <Tile key={k} icon={icons[k]} label={tr(label)} value={v ?? 0} hot onClick={() => go(to)} />
        ))}
        {d.membersTotal !== null ? <Tile icon={icons.members} label={tr("كل الأعضاء")} value={d.membersTotal} onClick={() => go("members-list")} /> : null}
        {d.liveListings !== null ? <Tile icon={icons.haraj} label={tr("إعلانات منشورة الآن")} value={d.liveListings} onClick={() => go("ads")} /> : null}
        {d.sold30 !== null ? <Tile icon={icons.sold} label={tr("بيع خلال 30 يوماً")} value={d.sold30} onClick={() => go("ads")} /> : null}
        {d.visits ? <Tile icon={icons.stats} label={tr("مشاهدات اليوم")} value={d.visits.today} onClick={() => go("stats")} /> : null}
      </div>
      {d.days.length && (d.listings7.length || d.members7.length) ? (
        <CardBoundary><Card title={tr("آخر 7 أيام")}>
          <Trend days={d.days} a={d.listings7} b={d.members7} la={tr("إعلانات جديدة")} lb={tr("أعضاء جدد")} />
        </Card></CardBoundary>
      ) : null}
      {d.visits ? (
        <CardBoundary><Card title={tr("مشاهدات الصفحات (Google Analytics)")} action={<span className="text-xs font-semibold text-muted">{tr("{0} زائر خلال 7 أيام", d.visits.users7.toLocaleString("en"))}</span>}>
          <Bars days={d.days} values={d.visits.views7} />
        </Card></CardBoundary>
      ) : null}
      {d.topCategories.length ? (
        <CardBoundary><Card title={tr("أكثر تصنيفات الحراج نشاطاً")}>
          <ul className="flex flex-col gap-2">
            {d.topCategories.map((c) => (
              <li key={c.key} className="flex items-center gap-3 text-sm">
                <span className="w-28 truncate font-semibold">{catName(c.key)}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-primary-soft">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(c.n / topMax) * 100}%` }} />
                </div>
                <span className="w-8 text-end font-bold tabular-nums">{c.n}</span>
              </li>
            ))}
          </ul>
        </Card></CardBoundary>
      ) : null}
    </div>
  );
}

const KIND_BADGE: Record<ReviewItem["type"], { label: string; cls: string }> = {
  haraj: { label: "حراج", cls: "bg-[#FEF3C7] text-[#92400E]" },
  news: { label: "خبر قارئ", cls: "bg-[#DBEAFE] text-[#1E40AF]" },
  comment: { label: "تعليق", cls: "bg-[#E0E7FF] text-[#3730A3]" },
};

export function ReviewQueue({ onCount }: { onCount?: (n: number) => void }) {
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [filter, setFilter] = useState<"all" | ReviewItem["type"]>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [pending, setPending] = useState<ReviewItem | null>(null);
  const [busy, setBusy] = useState<string>("");

  const load = () => {
    adminReviewQueue().then((r) => {
      const list = Array.isArray(r?.items) ? r.items : [];
      setItems(list);
      onCount?.(list.length);
    }).catch(() => setItems([]));
  };
  useEffect(load, []);

  if (!items) return <Skeleton rows={3} />;
  const needle = q.trim();
  const shown = items.filter((i) => (filter === "all" || i.type === filter) && (!needle || `${i.title} ${i.body} ${i.author}`.includes(needle)));
  const pageSize = 8;
  const pages = Math.max(1, Math.ceil(shown.length / pageSize));
  const pageSafe = Math.min(page, pages - 1);
  const slice = shown.slice(pageSafe * pageSize, pageSafe * pageSize + pageSize);

  const act = async (it: ReviewItem, ok: boolean) => {
    const key = `${it.type}:${it.id}`;
    setBusy(key);
    try {
      if (it.type === "haraj") await adminDecideListing({ data: { id: it.id, action: ok ? "approved" : "rejected" } });
      else if (it.type === "news") await adminDecideNews({ data: { id: it.id, action: ok ? "approved" : "rejected" } });
      else await adminCommentAction({ data: { id: it.id, action: ok ? "restore" : "delete" } });
      const next = items.filter((x) => !(x.type === it.type && x.id === it.id));
      setItems(next);
      onCount?.(next.length);
      toast.success(tr(ok ? "تمت الموافقة" : it.type === "comment" ? "حُذف التعليق" : "تم الرفض"));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <input type="search" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder={tr("ابحث في طابور المراجعة…")} className="field" />
      <div className="scroll-row gap-2">
        {([
          ["all", `الكل (${items.length})`],
          ["haraj", `الحراج (${items.filter((i) => i.type === "haraj").length})`],
          ["news", `أخبار القراء (${items.filter((i) => i.type === "news").length})`],
          ["comment", `التعليقات (${items.filter((i) => i.type === "comment").length})`],
        ] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => { setFilter(k); setPage(0); }} className={filter === k ? "chip chip-ink shrink-0" : "chip shrink-0 bg-paper"}>
            {trv(l)}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <Card><p className="py-6 text-center font-bold text-muted">{tr("لا عناصر بانتظار المراجعة 🎉")}</p></Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {slice.map((it) => {
            const key = `${it.type}:${it.id}`;
            const b = KIND_BADGE[it.type];
            return (
              <li key={key} className="rounded-3xl bg-paper p-4 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
                <div className="flex items-start gap-3">
                  {it.photo ? <img src={mediaUrl(it.photo)} alt="" className="size-16 shrink-0 rounded-2xl object-cover" loading="lazy" /> : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${b.cls}`}>{tr(b.label)}</span>
                      <span className="text-xs font-semibold text-muted">{it.author}</span>
                    </div>
                    {it.title ? <p className="mt-1 font-bold">{it.title}</p> : null}
                    <p className="mt-1 line-clamp-3 text-sm font-semibold text-muted">{it.body}</p>
                    {it.link ? (
                      <a href={it.link} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary-ink">
                        {tr("فتح الصفحة")} <ExternalLink className="size-3" />
                      </a>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" disabled={busy === key} onClick={() => act(it, true)} className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#16A34A] py-2.5 text-sm font-bold text-white disabled:opacity-50">
                    <Check className="size-4" /> {tr("موافقة")}
                  </button>
                  <button type="button" disabled={busy === key} onClick={() => setPending(it)} className="flex items-center justify-center gap-1.5 rounded-2xl bg-[#DC2626] py-2.5 text-sm font-bold text-white disabled:opacity-50">
                    <X className="size-4" /> {tr(it.type === "comment" ? "حذف" : "رفض")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {pages > 1 ? (
        <div className="flex items-center justify-between gap-2 text-sm font-bold">
          <button type="button" className="btn btn-ghost" disabled={pageSafe === 0} onClick={() => setPage(pageSafe - 1)}>{tr("السابق")}</button>
          <span className="text-muted">{pageSafe + 1} / {pages}</span>
          <button type="button" className="btn btn-ghost" disabled={pageSafe >= pages - 1} onClick={() => setPage(pageSafe + 1)}>{tr("التالي")}</button>
        </div>
      ) : null}
      {pending ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-paper p-4">
            <p className="font-extrabold">{tr(pending.type === "comment" ? "حذف هذا التعليق؟" : "رفض هذا العنصر؟")}</p>
            <p className="mt-1 line-clamp-3 text-sm font-semibold text-muted">{pending.title || pending.body}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setPending(null)}>{tr("تراجع")}</button>
              <button type="button" className="btn" onClick={() => { const it = pending; setPending(null); void act(it, false); }}>{tr("تأكيد")}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Instant search across sections + live content (listings, news, members). */
export function AdminSearch({ sections, go }: { sections: { key: string; label: string }[]; go: (k: string) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  useEffect(() => {
    const t = q.trim();
    if (t.length < 2) {
      setHits([]);
      return;
    }
    const id = setTimeout(() => {
      adminSearch({ data: { q: t } }).then(setHits).catch(() => {});
    }, 200);
    return () => clearTimeout(id);
  }, [q]);
  const secHits = q.trim()
    ? sections.filter((s) => trv(s.label).includes(q.trim()) || s.label.includes(q.trim())).slice(0, 5)
    : [];
  const open = q.trim().length > 0 && (secHits.length > 0 || hits.length > 0);
  return (
    <div className="relative">
      <label className="flex items-center gap-2 rounded-2xl bg-paper px-3.5 py-2.5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <Search className="size-4 text-muted" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tr("ابحث في لوحة التحكم أو المحتوى…")}
          className="w-full bg-transparent text-sm font-semibold outline-none"
        />
      </label>
      {open ? (
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-2xl bg-paper p-2 shadow-xl">
          {secHits.map((s) => (
            <button key={s.key} type="button" onClick={() => { go(s.key); setQ(""); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-start text-sm font-bold hover:bg-primary-soft">
              <span>{trv(s.label)}</span>
              <span className="text-xs text-muted">{tr("قسم")}</span>
            </button>
          ))}
          {hits.map((h) => (
            <button key={`${h.type}:${h.id}`} type="button" onClick={() => { go(h.section === "members" ? "members-list" : h.section); setQ(""); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-start text-sm hover:bg-primary-soft">
              <span className="truncate font-semibold">{h.title}</span>
              <span className="ms-2 shrink-0 text-xs text-muted">{h.meta}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
