import { Component, useEffect, useState, type ReactNode } from "react";
import { Check, ExternalLink, FolderPlus, LayoutGrid, PenSquare, Rss, Search, Settings, X, type LucideIcon } from "lucide-react";
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

function Line({ days, a, b, la, lb }: { days: string[]; a: number[]; b: number[]; la: string; lb: string }) {
  const max = Math.max(1, ...a, ...b);
  const W = 300, H = 110;
  const pts = (v: number[]) => v.map((x, i) => `${(i / Math.max(1, v.length - 1)) * W},${H - (x / max) * (H - 10) - 5}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full" preserveAspectRatio="none" aria-hidden>
        <polyline points={pts(a)} fill="none" stroke="#FDB700" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={pts(b)} fill="none" stroke="#263238" strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" />
      </svg>
      <div className="flex" dir="ltr">
        {days.map((d) => (
          <span key={d} className="flex-1 text-center text-[10px] font-semibold text-muted">{dayLabel(d)}</span>
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-xs font-semibold">
        <span className="flex items-center gap-1"><i className="inline-block h-1 w-4 rounded bg-brand" />{la} ({a.reduce((x, y) => x + y, 0)})</span>
        <span className="flex items-center gap-1"><i className="inline-block h-1 w-4 rounded bg-ink" />{lb} ({b.reduce((x, y) => x + y, 0)})</span>
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
              onClick={() => go("haraj-cats")}
              className="flex items-center gap-2.5 rounded-2xl bg-surface p-3 text-start text-sm font-bold text-ink transition hover:bg-primary-soft"
            >
              <icons.haraj className="size-5 shrink-0 text-primary-ink" aria-hidden />
              <span>{tr("أقسام الحراج")}</span>
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
          {d.members7.length ? (
            <Line days={d.days} a={d.listings7} b={d.members7} la={tr("إعلانات جديدة")} lb={tr("أعضاء جدد")} />
          ) : (
            <Bars days={d.days} values={d.listings7} />
          )}
        </Card></CardBoundary>
      ) : null}
      {d.visits ? (
        <CardBoundary><Card title={tr("مشاهدات الصفحات (Google Analytics)")} action={<span className="text-xs font-semibold text-muted">{tr("{0} زائر خلال 7 أيام", d.visits.users7.toLocaleString("en"))}</span>}>
          <Bars days={d.days} values={d.visits.views7} />
        </Card></CardBoundary>
      ) : null}
      {d.topCategories.length ? (
        <CardBoundary><Card title={tr("أكثر أقسام الحراج نشاطاً")}>
          <ul className="flex flex-col gap-2.5">
            {d.topCategories.map((c) => (
              <li key={c.key}>
                <div className="mb-1 flex justify-between text-sm font-bold"><span>{catName(c.key)}</span><span className="tabular-nums text-muted">{c.n}</span></div>
                <div className="h-2 rounded-full bg-surface"><div className="h-2 rounded-full bg-brand" style={{ width: `${(c.n / topMax) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </Card></CardBoundary>
      ) : null}
    </div>
  );
}

const TYPE_LABEL: Record<ReviewItem["type"], string> = { haraj: "حراج", news: "خبر قارئ", comment: "تعليق" };

function Avatar({ name, image }: { name: string; image: string | null }) {
  return image ? (
    <img src={image} alt="" className="size-10 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
  ) : (
    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft font-bold text-primary-ink">{(name || "?").slice(0, 1)}</span>
  );
}

export function ReviewQueue({ onCount }: { onCount?: (n: number) => void }) {
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [filter, setFilter] = useState<"all" | ReviewItem["type"]>("all");
  const [busy, setBusy] = useState("");
  const load = () => adminReviewQueue().then((r) => { setItems(r.items); onCount?.(r.items.length); });
  useEffect(() => { void load(); }, []);
  if (!items) return <Skeleton rows={3} />;
  const decide = async (it: ReviewItem, ok: boolean) => {
    setBusy(it.type + it.id);
    try {
      if (it.type === "haraj") await adminDecideListing({ data: { id: it.id, action: ok ? "approved" : "rejected" } });
      else if (it.type === "news") await adminDecideNews({ data: { id: it.id, action: ok ? "approved" : "rejected" } });
      else await adminCommentAction({ data: { id: it.id, action: ok ? "restore" : "hide" } });
      setItems((x) => (x ?? []).filter((y) => !(y.type === it.type && y.id === it.id)));
      onCount?.(items.length - 1);
    } finally {
      setBusy("");
    }
  };
  const types = Array.from(new Set(items.map((i) => i.type)));
  const list = items.filter((i) => filter === "all" || i.type === filter);
  return (
    <div className="flex flex-col gap-3">
      <div className="scroll-row">
        {(["all", ...types] as const).map((t) => (
          <button key={t} type="button" className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold ${filter === t ? "bg-ink text-paper" : "bg-paper"}`} onClick={() => setFilter(t)}>
            {t === "all" ? tr("الكل") : tr(TYPE_LABEL[t])} ({t === "all" ? items.length : items.filter((i) => i.type === t).length})
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <Card><p className="py-6 text-center font-bold text-muted">{tr("لا شيء بانتظار المراجعة 🎉")}</p></Card>
      ) : (
        list.map((it) => (
          <Card key={it.type + it.id}>
            <div className="flex items-start gap-3">
              <Avatar name={it.author} image={it.authorImage} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{it.author}</p>
                <p className="text-xs font-semibold text-muted">
                  <span className="rounded-full bg-primary-soft px-2 py-0.5 text-primary-ink">{tr(TYPE_LABEL[it.type])}</span>{" "}
                  {new Date(it.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Jerusalem", dateStyle: "short", timeStyle: "short" })}
                </p>
              </div>
              <a href={it.link} target="_blank" rel="noreferrer" className="grid size-9 place-items-center rounded-full bg-surface" aria-label={tr("فتح")}>
                <ExternalLink className="size-4" aria-hidden />
              </a>
            </div>
            {it.photo ? <img src={mediaUrl(it.photo)} alt="" className="mt-3 aspect-[16/9] w-full rounded-2xl object-cover" /> : null}
            {it.title ? <p className="mt-3 font-bold">{trv(it.title)}</p> : null}
            <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm">{trv(it.body)}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" disabled={Boolean(busy)} className="flex items-center justify-center gap-1 rounded-full bg-brand py-2.5 font-bold text-ink disabled:opacity-50" onClick={() => decide(it, true)}>
                <Check className="size-4" aria-hidden />{tr("موافقة")}
              </button>
              <button type="button" disabled={Boolean(busy)} className="flex items-center justify-center gap-1 rounded-full bg-surface py-2.5 font-bold disabled:opacity-50" onClick={() => decide(it, false)}>
                <X className="size-4" aria-hidden />{it.type === "comment" ? tr("إخفاء") : tr("رفض")}
              </button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

/** Global admin search: sections by name + listings / reader news / members in the DB. */
export function AdminSearch({ sections, go }: { sections: { key: string; label: string }[]; go: (key: string) => void }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) return setHits([]);
    const t = setTimeout(() => adminSearch({ data: { q } }).then(setHits).catch(() => setHits([])), 250);
    return () => clearTimeout(t);
  }, [q]);
  const ql = q.trim().toLowerCase();
  const secHits = ql ? sections.filter((s) => s.label.toLowerCase().includes(ql) || trv(s.label).toLowerCase().includes(ql)).slice(0, 6) : [];
  const pick = (k: string) => { setQ(""); go(k); };
  return (
    <div className="relative">
      <label className="flex items-center gap-2 rounded-full bg-paper px-4 py-2.5 shadow-[0_1px_3px_rgba(16,24,40,0.06)]">
        <Search className="size-4 text-muted" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("ابحث في الإدارة: قسم، إعلان، خبر، عضو…")} aria-label={tr("بحث في الإدارة")} className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none" />
      </label>
      {ql && (secHits.length || hits.length) ? (
        <ul className="absolute inset-x-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-3xl bg-paper p-2 shadow-xl">
          {secHits.map((s) => (
            <li key={s.key}><button type="button" className="w-full rounded-2xl px-3 py-2 text-start font-bold hover:bg-surface" onClick={() => pick(s.key)}>{trv(s.label)} <span className="text-xs text-muted">· {tr("قسم")}</span></button></li>
          ))}
          {hits.map((h) => (
            <li key={h.type + h.id}><button type="button" className="w-full rounded-2xl px-3 py-2 text-start hover:bg-surface" onClick={() => pick(h.section)}>
              <span className="block truncate font-bold">{h.title}</span>
              <span className="block truncate text-xs font-semibold text-muted" dir="auto">{h.type === "haraj" ? tr("حراج") : h.type === "news" ? tr("خبر قارئ") : tr("عضو")} · {h.meta}</span>
            </button></li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
