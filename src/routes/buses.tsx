import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, LocateFixed, Map as MapIcon, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Shell } from "@/components/shell";
import { busSchedule } from "@/data/bus-schedule";
import { busLines as baseLines, galimPhone, galimSource, type BusLine } from "@/data/buses";
import { BusAdsSlider, BusBoard } from "@/components/bus-board";
import { useSiteSettings } from "@/lib/site-settings/context";
import { applyOverrides, getBusOverrides, type BusOverride } from "@/lib/buses/overrides";
import { getArrivals } from "@/lib/buses/api";
import {
  departures,
  israelClock,
  lineInfo,
  plannedArrivals,
  scheduleDates,
  stopName,
  toMinutes,
} from "@/lib/buses/schedule";
import type { ArrivalsResult } from "@/lib/buses/types";
import { breadcrumbLd, seo } from "@/lib/seo";
import { tr, trv } from "@/lib/i18n/core";

export const Route = createFileRoute("/buses")({
  head: () =>
    seo({
      title: tr("باصات رهط: مواعيد خطوط غاليم ووصول الباص المباشر · رهط بوست"),
      description:
        tr("مواعيد باصات رهط لحظة بلحظة: خطوط شركة غاليم داخل رهط وإلى تل السبع وكسيفة وعرعرة النقب، وصول الباص إلى المحطة مباشرة وجدول رحلات اليوم."),
      path: "/buses",
      jsonLd: [breadcrumbLd([{ name: tr("باصات رهط"), path: "/buses" }])],
    }),
  // Server time as the first render's clock, so SSR and hydration agree.
  loader: async () => ({ now: Date.now(), overrides: await getBusOverrides().catch(() => [] as BusOverride[]) }),
  component: BusesPage,
});

const WEEKDAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const UPDATED = new Intl.DateTimeFormat("ar-u-nu-latn", {
  timeZone: "Asia/Jerusalem",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
}).format(new Date(busSchedule.generatedAt));

function dayLabel(date: string, index: number) {
  if (index === 0) return tr("اليوم");
  if (index === 1) return tr("غداً");
  const d = new Date(`${date}T12:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}

function minutesLabel(diff: number) {
  if (diff <= 0) return tr("يصل الآن");
  if (diff === 1) return tr("بعد دقيقة");
  if (diff === 2) return tr("بعد دقيقتين");
  if (diff <= 10) return tr("بعد {0} دقائق", diff);
  if (diff < 60) return tr("بعد {0} دقيقة", diff);
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return tr("بعد {0}{1}", h === 1 ? "ساعة" : h === 2 ? "ساعتين" : `${h} ساعات`, m ? ` و${m} د` : "");
}

function BusesPage() {
  const { now: serverNow, overrides } = Route.useLoaderData();
  const busLines = useMemo(() => applyOverrides(baseLines, overrides), [overrides]);
  const notice = overrides.find((o) => o.number === "*")?.note;
  const siteSt = useSiteSettings();
  const busAds = siteSt.busAds;
  const busRavkavButton = siteSt.ravkavUi?.button !== false;
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const today = israelClock(now).date;
  const dates = useMemo(() => scheduleDates.filter((d) => d >= today).slice(0, 7), [today]);

  return (
    <Shell>
      <h1 className="text-2xl font-bold">{tr("باصات غاليم")}</h1>
      {notice ? <p className="stamp mt-3 border-[#FDB700] bg-[#FFF6DB] p-3 font-bold">📢 {trv(notice)}</p> : null}
      <BusBoard
        now={now}
        lines={busLines}
        slot={busAds?.enabled ? <BusAdsSlider items={busAds.items} /> : null}
      />
      <p className="mt-1 font-semibold text-muted">
        {tr("خطوط مدينة رهط والخطوط الخارجة منها. المواعيد تتحدّث تلقائياً كل يوم من بيانات وزارة المواصلات، آخر تحديث")} {trv(UPDATED)}.
      </p>
      {busRavkavButton ? (
      <Link to="/buses/ravkav" className="mt-4 flex items-center gap-3 rounded-2xl bg-[#16A34A] px-4 py-3 font-bold text-white shadow-sm hover:bg-[#15803D]">
        <span className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-2 py-1 text-sm font-black text-[#15803D]" dir="rtl" lang="he">
          <CreditCard className="size-4" aria-hidden />
          רב-קו
        </span>
        <span className="min-w-0 flex-1">
          {tr("رب-كاف: الشحن والخدمات")}
          <span className="block text-xs font-semibold text-white/85">{tr("نقاط الشحن، الشحن أونلاين، ملفات التخفيض")}</span>
        </span>
      </Link>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <a className="btn" href={`tel:${galimPhone.replaceAll("-", "")}`}>
          {tr("غاليم")} {trv(galimPhone)}
        </a>
        <a className="btn btn-ghost" href={galimSource} target="_blank" rel="noopener noreferrer">
          {tr("موقع المشغّل")}
        </a>
      </div>



      <LiveArrivals now={now} lines={busLines} />

      <Timetable now={now} dates={dates} today={today} busLines={busLines} />
    </Shell>
  );
}

/* ------------------------------------------------------------------ live */

const STORAGE_KEY = "rp-bus-stop";

function LiveArrivals({ now, lines }: { now: number; lines: BusLine[] }) {
  const [line, setLine] = useState(busSchedule.lines[0]?.number ?? "1");
  const info = lineInfo(line);
  const [dir, setDir] = useState(info?.dirs[0]?.dir ?? "1");
  const dirInfo = info?.dirs.find((d) => d.dir === dir) ?? info?.dirs[0];
  const [stop, setStop] = useState(dirInfo?.stops[0]?.[0] ?? "");
  const [result, setResult] = useState<ArrivalsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState("");

  // Restore the last choice.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as {
        line: string;
        dir: string;
        stop: string;
      } | null;
      const d = saved && lineInfo(saved.line)?.dirs.find((x) => x.dir === saved.dir);
      if (saved && d && d.stops.some(([c]) => c === saved.stop)) {
        setLine(saved.line);
        setDir(saved.dir);
        setStop(saved.stop);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ line, dir, stop }));
    } catch {
      // ignore
    }
  }, [line, dir, stop]);

  const chooseLine = (value: string) => {
    const next = lineInfo(value);
    const d = next?.dirs[0];
    setLine(value);
    setDir(d?.dir ?? "1");
    setStop(d?.stops[0]?.[0] ?? "");
    setResult(null);
  };

  const chooseDir = (value: string) => {
    const d = info?.dirs.find((x) => x.dir === value);
    setDir(value);
    setStop(d?.stops[0]?.[0] ?? "");
    setResult(null);
  };

  const load = useCallback(async () => {
    if (!stop) return;
    setLoading(true);
    try {
      setResult(await getArrivals({ data: { stop } }));
    } catch {
      setResult({ ok: false, now: Date.now(), stop, arrivals: [] });
    } finally {
      setLoading(false);
    }
  }, [stop]);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 30_000);
    return () => clearInterval(id);
  }, [load]);

  const nearest = () => {
    setGeoError("");
    if (!navigator.geolocation || !dirInfo) {
      setGeoError(tr("الموقع غير متاح في هذا المتصفح."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        let best = "";
        let bestD = Infinity;
        for (const [code] of dirInfo.stops) {
          const s = busSchedule.stops[code];
          if (!s) continue;
          const d =
            (s.lat - pos.coords.latitude) ** 2 + ((s.lon - pos.coords.longitude) * 0.85) ** 2;
          if (d < bestD) {
            bestD = d;
            best = code;
          }
        }
        if (best) setStop(best);
      },
      () => setGeoError(tr("لم نتمكن من تحديد موقعك.")),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const fresh = result && result.stop === stop ? result : null;
  const isSelected = (a: { line: string; operator: string }) =>
    a.line === line && a.operator === busSchedule.agency;
  const liveForLine = fresh?.arrivals.filter((a) => isSelected(a) && a.live) ?? [];
  const otherLive = fresh?.arrivals.filter((a) => !isSelected(a) && a.live) ?? [];
  const planned = plannedArrivals(now, line, dirInfo?.dir ?? dir, stop);
  // Planned times already covered by a live bus are dropped (a live bus within ±3 min of the plan).
  const liveMinutes = liveForLine.map((a) => Math.round((Date.parse(a.eta) - now) / 60_000));
  const plannedOnly = planned.filter((p) => !liveMinutes.some((m) => Math.abs(m - p) <= 3));

  return (
    <section className="stamp mt-6 p-4">
      <h2 className="text-xl font-bold">{tr("متى يصل الباص؟")}</h2>
      <p className="text-sm font-semibold text-muted">{tr("اختر الخط والاتجاه والمحطة.")}</p>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-bold">{tr("الخط")}</span>
          <select className="field mt-1" value={line} onChange={(e) => chooseLine(e.target.value)}>
            {busSchedule.lines.filter((l) => lines.some((x) => x.number === l.number)).map((l) => (
              <option key={l.number} value={l.number}>
                {tr("خط")} {trv(l.number)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-bold">{tr("المحطة")}</span>
          <select className="field mt-1" value={stop} onChange={(e) => setStop(e.target.value)}>
            {dirInfo?.stops.map(([code]) => (
              <option key={code} value={code}>
                {stopName(code)} · {trv(code)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {info && info.dirs.length > 1 ? (
        <div className="scroll-row mt-3">
          {info.dirs.map((d) => (
            <button
              key={d.dir}
              type="button"
              className={
                d.dir === dirInfo?.dir ? "chip chip-ink shrink-0" : "chip shrink-0 bg-paper"
              }
              onClick={() => chooseDir(d.dir)}
            >
              {tr("إلى")} {stopName(d.to)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-ghost px-3" onClick={nearest}>
          <LocateFixed className="size-4" aria-hidden />
          {tr("أقرب محطة لي")}
        </button>
        {stop ? (
          <Link to="/buses/stop/$stop" params={{ stop }} className="btn px-3">
            <MapIcon className="size-4" aria-hidden />
            {tr("الخريطة المباشرة")}
          </Link>
        ) : null}
        <button
          type="button"
          className="btn btn-ghost px-3"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} aria-hidden />
          {tr("تحديث")}
        </button>
      </div>
      {geoError ? <p className="mt-2 text-sm font-semibold">{trv(geoError)}</p> : null}

      <ul className="mt-4 flex flex-col gap-2">
        {liveForLine.map((a) => (
          <ArrivalRow
            key={`l-${a.eta}`}
            line={a.line}
            dest={a.destination}
            when={minutesLabel(Math.round((Date.parse(a.eta) - now) / 60_000))}
            live
          />
        ))}
        {plannedOnly.map((diff) => (
          <ArrivalRow
            key={`p-${diff}`}
            line={line}
            dest={dirInfo ? stopName(dirInfo.to) : ""}
            when={minutesLabel(diff)}
            live={false}
          />
        ))}
      </ul>
      {liveForLine.length === 0 && plannedOnly.length === 0 ? (
        <p className="mt-2 font-semibold">{tr("لا رحلات أخرى لهذا الخط من هذه المحطة اليوم.")}</p>
      ) : null}

      {otherLive.length > 0 ? (
        <>
          <p className="mt-4 text-sm font-bold text-muted">{tr("خطوط أخرى تصل هذه المحطة الآن")}</p>
          <ul className="mt-2 flex flex-col gap-2">
            {otherLive.slice(0, 4).map((a) => (
              <ArrivalRow
                key={`o-${a.line}-${a.eta}`}
                line={a.line}
                dest={a.destination}
                when={minutesLabel(Math.round((Date.parse(a.eta) - now) / 60_000))}
                live
              />
            ))}
          </ul>
        </>
      ) : null}

      <p className="mt-4 text-sm font-semibold text-muted">
        {fresh === null
          ? tr("جاري جلب البيانات المباشرة…")
          : fresh.ok
            ? liveForLine.length + otherLive.length > 0
              ? tr("«مباشر» يعني أن الباص يرسل موقعه الآن (بيانات وزارة المواصلات عبر curlbus، تتأخر حتى دقيقة تقريباً). «حسب الجدول» وقت مخطط وتقريبي.")
              : tr("لا يوجد باص يرسل موقعه الآن لهذه المحطة، فالأوقات المعروضة حسب الجدول وتقريبية.")
            : tr("تعذّر جلب البيانات المباشرة الآن، فالأوقات المعروضة حسب الجدول وتقريبية.")}
      </p>
    </section>
  );
}

function ArrivalRow({
  line,
  dest,
  when,
  live,
}: {
  line: string;
  dest: string;
  when: string;
  live: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper px-3 py-2">
      <span className="min-w-0">
        <span className="chip chip-ink">{tr("خط")} {trv(line)}</span>
        {dest ? <span className="ms-2 font-bold">{tr("إلى")} {trv(dest)}</span> : null}
      </span>
      <span className="shrink-0 text-end">
        <span className="block font-bold">{trv(when)}</span>
        <span className={live ? "chip chip-ok" : "chip"}>{live ? tr("مباشر") : tr("حسب الجدول")}</span>
      </span>
    </li>
  );
}

/* ------------------------------------------------------------- timetable */

function Timetable({ now, dates, today, busLines }: { now: number; dates: string[]; today: string; busLines: BusLine[] }) {
  const [date, setDate] = useState<string>(dates[0] ?? today);
  const [scope, setScope] = useState<"city" | "between">("city");
  const list = useMemo(() => busLines.filter((line) => line.scope === scope), [scope, busLines]);
  const nowMinutes = israelClock(now).minutes;
  const selected = dates.includes(date) ? date : dates[0];

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold">{tr("جدول المواعيد")}</h2>
      <p className="text-sm font-semibold text-muted">{tr("أوقات الانطلاق من أول محطة في كل اتجاه.")}</p>
      <div className="scroll-row mt-3">
        <button
          type="button"
          className={scope === "city" ? "chip chip-ink shrink-0" : "chip shrink-0 bg-paper"}
          onClick={() => setScope("city")}
        >
          {tr("داخل رهط")}
        </button>
        <button
          type="button"
          className={scope === "between" ? "chip chip-ink shrink-0" : "chip shrink-0 bg-paper"}
          onClick={() => setScope("between")}
        >
          {tr("خارج المدينة")}
        </button>
      </div>
      <div className="scroll-row mt-2">
        {dates.map((d, i) => (
          <button
            key={d}
            type="button"
            className={selected === d ? "chip chip-deep shrink-0" : "chip shrink-0 bg-paper"}
            onClick={() => setDate(d)}
          >
            {dayLabel(d, i)}
          </button>
        ))}
      </div>

      {!selected ? (
        <p className="stamp mt-4 p-4 font-semibold">
          {tr("لا تتوفر مواعيد محدّثة حالياً. اتصل بغاليم للتأكد.")}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {list.map((line) => {
            const info = lineInfo(line.number);
            const dirs = (info?.dirs ?? [])
              .map((d) => ({ ...d, times: departures(selected, line.number, d.dir) }))
              .filter((d) => d.times.length > 0);
            return (
              <li key={line.number} className="stamp p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="chip chip-ink">{tr("خط")} {trv(line.number)}</span>
                  {info ? (
                    <Link
                      to="/buses/map/$line"
                      params={{ line: line.number }}
                      className="btn btn-ghost px-3 py-1.5 text-sm"
                    >
                      <MapIcon className="size-4" aria-hidden />
                      {tr("الخريطة")}
                    </Link>
                  ) : null}
                </div>
                {line.note ? <p className="mt-2 font-semibold">{trv(line.note)}</p> : null}
                <h3 className="mt-2 text-xl font-bold">
                  {trv(line.from)} ↔ {trv(line.to)}
                </h3>
                {dirs.length === 0 ? (
                  <p className="mt-2 font-semibold">{tr("لا رحلات في هذا اليوم حسب الجدول.")}</p>
                ) : (
                  dirs.map((d) => {
                    const mins = toMinutes(d.times);
                    return (
                      <div key={d.dir} className="mt-3">
                        <p className="text-sm font-bold text-muted">
                          {tr("من")} {stopName(d.from)} {tr("إلى")} {stopName(d.to)}
                        </p>
                        <p className="font-bold leading-7">
                          {d.times.map((t, i) => {
                            const past = selected === today && mins[i] < nowMinutes;
                            return (
                              <span key={`${t}-${i}`} className={past ? "text-ink/40" : undefined}>
                                {i > 0 ? " · " : ""}
                                {trv(t)}
                              </span>
                            );
                          })}
                        </p>
                      </div>
                    );
                  })
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-sm font-semibold text-muted">
        {tr("مصدر المواعيد: بيانات GTFS المفتوحة من وزارة المواصلات، وتُحدَّث يومياً. قد تتغير المواعيد في الأعياد والطوارئ.")}
      </p>
    </section>
  );
}
