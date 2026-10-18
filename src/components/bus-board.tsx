import { Link } from "@tanstack/react-router";
import { Clock, Map as MapIcon, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { mediaUrl } from "@/lib/media/types";
import { busSchedule } from "@/data/bus-schedule";
import type { BusLine } from "@/data/buses";
import { departures, israelClock, lineInfo, plannedArrivals, stopName, toMinutes } from "@/lib/buses/schedule";
import { tr, trv } from "@/lib/i18n/core";

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u0652]/g, "")
    .trim();

export function countdown(diff: number) {
  if (diff <= 0) return tr("الآن");
  if (diff < 60) return tr("{0} د", diff);
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m ? tr("{0} س {1} د", h, m) : tr("{0} س", h);
}

const clock = (mins: number) => {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** Next departures for one direction, from the first stop or from a given stop (GTFS times only). */
function nextFor(now: number, line: string, dir: string, stop?: string, n = 3): number[] {
  if (stop) return plannedArrivals(now, line, dir, stop, n);
  const { date, minutes } = israelClock(now);
  return toMinutes(departures(date, line, dir))
    .map((m) => m - minutes)
    .filter((d) => d >= 0)
    .slice(0, n);
}

/** «الباص القادم»: search by line, destination or stop + live countdown per line. */
export function BusBoard({ now, lines, slot }: { now: number; lines: BusLine[]; slot?: React.ReactNode }) {
  const [q, setQ] = useState("");
  const nq = norm(q);
  const nowMin = israelClock(now).minutes;

  const results = useMemo(() => {
    return lines
      .map((l) => {
        const info = lineInfo(l.number);
        if (!info) return null;
        if (!nq) return { l, info, stop: undefined as string | undefined };
        if (norm(l.number) === nq || norm(l.number).startsWith(nq)) return { l, info, stop: undefined };
        if (norm(`${l.from} ${l.to} ${l.note}`).includes(nq)) return { l, info, stop: undefined };
        for (const d of info.dirs)
          for (const [code] of d.stops) {
            const s = busSchedule.stops[code];
            if (code === q.trim() || (s && (norm(s.ar).includes(nq) || norm(s.he).includes(nq))))
              return { l, info, stop: code };
          }
        return null;
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [lines, nq, q]);

  return (
    <section className="mt-3">
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          inputMode="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tr("ابحث برقم الخط (مثلاً 3) أو الوجهة أو المحطة…")}
          aria-label={tr("بحث في الباصات")}
          className="field w-full rounded-2xl border-[#FDB700] bg-[#FFF6DB] py-3 ps-11 pe-10 text-base font-bold"
        />
        {q ? (
          <button type="button" onClick={() => setQ("")} className="absolute end-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full hover:bg-black/5" aria-label={tr("مسح")}>
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {!q ? (
        <div className="scroll-row mt-2" aria-label={tr("رقم الخط")}>
          {lines.map((l) => (
            <button key={l.number} type="button" onClick={() => setQ(l.number)} className="grid min-w-10 shrink-0 place-items-center rounded-xl border border-[#FDB700] bg-paper px-2 py-1.5 font-black">
              {trv(l.number)}
            </button>
          ))}
        </div>
      ) : null}
      {slot}
      <h2 className="mt-5 flex items-center gap-2 text-xl font-bold">
        <Clock className="size-5" aria-hidden />
        {tr("الباص القادم")}
        <span className="text-sm font-semibold text-muted">· {trv(clock(nowMin))} {tr("بتوقيت رهط")}</span>
      </h2>

      {results.length === 0 ? (
        <p className="stamp mt-3 p-4 font-semibold">{tr("لا نتائج. جرّب رقم خط مثل 3 أو اسم حي أو محطة.")}</p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {results.map(({ l, info, stop }) => (
            <li key={l.number} className="stamp p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="inline-grid min-w-11 place-items-center rounded-xl bg-[#FDB700] px-2 py-1 text-lg font-black text-ink">{trv(l.number)}</span>
                  <p className="mt-1 font-bold leading-snug">{trv(l.from)} ↔ {trv(l.to)}</p>
                  {stop ? <p className="text-sm font-semibold text-muted">{tr("من محطة")} {stopName(stop)}</p> : null}
                  {l.note ? <p className="mt-1 rounded-lg bg-[#FFF6DB] px-2 py-1 text-sm font-semibold">{trv(l.note)}</p> : null}
                </div>
                <Link to="/buses/map/$line" params={{ line: l.number }} search={stop ? { stop } : {}} className="btn btn-ghost shrink-0 px-2 py-1 text-sm" aria-label={tr("الخريطة")}>
                  <MapIcon className="size-4" aria-hidden />
                </Link>
              </div>
              <ul className="mt-2 flex flex-col gap-1.5">
                {info.dirs
                  .filter((d) => !stop || d.stops.some(([c]) => c === stop))
                  .map((d) => {
                    const next = nextFor(now, l.number, d.dir, stop);
                    return (
                      <li key={d.dir} className="flex items-center justify-between gap-2 rounded-xl bg-paper px-2 py-1.5">
                        <span className="min-w-0 truncate text-sm font-bold">{tr("إلى")} {stopName(d.to)}</span>
                        {next.length ? (
                          <span className="shrink-0 text-end">
                            <span className={`block font-black ${next[0] <= 5 ? "text-[#B45309]" : ""}`}>{countdown(next[0])}</span>
                            <span className="text-xs font-semibold text-muted">
                              {next.map((x) => clock(nowMin + x)).join(" · ")}
                            </span>
                          </span>
                        ) : (
                          <span className="shrink-0 text-xs font-semibold text-muted">{tr("لا رحلات أخرى اليوم")}</span>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs font-semibold text-muted">{tr("الأوقات حسب جدول وزارة المواصلات (تقديرية عند المحطات الوسطى). للوصول المباشر اختر محطتك أدناه.")}</p>
    </section>
  );
}

/** Lightweight auto-rotating ad slider (CSS scroll-snap, swipeable). Managed in admin → التسويق → «إعلانات الباصات». */
export function BusAdsSlider({ items }: { items: { id: string; title: string; link: string; imageKey: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => {
      const el = ref.current;
      if (!el || document.hidden) return;
      const next = (Math.round(Math.abs(el.scrollLeft) / el.clientWidth) + 1) % items.length;
      el.scrollTo({ left: (document.dir === "rtl" || el.closest("[dir=rtl]") ? -1 : 1) * next * el.clientWidth, behavior: "smooth" });
    }, 5000);
    return () => clearInterval(id);
  }, [items.length]);
  if (!items.length) return null;
  return (
    <div className="mt-4">
      <div
        ref={ref}
        onScroll={(e) => setI(Math.round(Math.abs(e.currentTarget.scrollLeft) / e.currentTarget.clientWidth))}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl [scrollbar-width:none]"
      >
        {items.map((a, n) => {
          const img = (
            <img src={mediaUrl(a.imageKey)} alt={a.title || tr("إعلان")} loading={n === 0 ? "eager" : "lazy"} decoding="async" className="aspect-[16/6] w-full object-cover" />
          );
          return (
            <div key={a.id} className="w-full shrink-0 snap-center">
              {a.link ? (
                <a href={a.link} target={a.link.startsWith("/") ? undefined : "_blank"} rel="noopener sponsored">{img}</a>
              ) : img}
            </div>
          );
        })}
      </div>
      {items.length > 1 ? (
        <div className="mt-1.5 flex justify-center gap-1.5" aria-hidden>
          {items.map((a, n) => (
            <span key={a.id} className={`h-1.5 rounded-full transition-all ${n === i ? "w-5 bg-[#FDB700]" : "w-1.5 bg-ink/20"}`} />
          ))}
        </div>
      ) : null}
      <p className="mt-0.5 text-center text-[10px] font-semibold text-muted">{tr("إعلان")}</p>
    </div>
  );
}
