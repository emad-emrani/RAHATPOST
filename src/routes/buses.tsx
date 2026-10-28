import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bus,
  LocateFixed,
  Map as MapIcon,
  Maximize2,
  Navigation,
  Phone,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { Shell } from "@/components/shell";
import { GmapsStopButtons } from "@/components/gmaps-buttons";
import { busSchedule } from "@/data/bus-schedule";
import { busLines, galimPhone, galimSource } from "@/data/buses";
import { getArrivals, getLineVehicles } from "@/lib/buses/api";
import { gmapsTransitRoute, shapeFile, type LineShapes } from "@/lib/buses/map";
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

type Vehicle = { ref: string; dir: string; lat: number; lon: number; at: string; simulated?: boolean };

export const Route = createFileRoute("/buses")({
  head: () =>
    seo({
      title: tr("باصات رهط: الخريطة المباشرة ومواعيد خطوط غاليم · رهط بوست"),
      description: tr(
        "اختر رقم خط الباص في رهط والنقب لعرض الخريطة المباشرة وحركة الباص الحية وجميع المحطات وأوقات الوصول لحظة بلحظة.",
      ),
      path: "/buses",
      jsonLd: [breadcrumbLd([{ name: tr("باصات رهط"), path: "/buses" }])],
    }),
  loader: () => ({ now: Date.now() }),
  component: BusesPage,
});

const WEEKDAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

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

/** Interpolate a point along a polyline path given progress t in [0, 1]. */
function interpolateAlongPath(path: [number, number][], t: number): [number, number] {
  if (path.length === 0) return [31.393, 34.756];
  if (path.length === 1 || t <= 0) return path[0];
  if (t >= 1) return path[path.length - 1];
  const exact = t * (path.length - 1);
  const idx = Math.min(path.length - 2, Math.floor(exact));
  const frac = exact - idx;
  const [lat1, lon1] = path[idx];
  const [lat2, lon2] = path[idx + 1];
  return [lat1 + (lat2 - lat1) * frac, lon1 + (lon2 - lon1) * frac];
}

function BusesPage() {
  const { now: serverNow } = Route.useLoaderData();
  const [now, setNow] = useState(serverNow);
  const [scopeFilter, setScopeFilter] = useState<"all" | "city" | "between">("all");
  const [selectedLine, setSelectedLine] = useState<string>(busLines[0]?.number ?? "1");

  const info = useMemo(() => lineInfo(selectedLine), [selectedLine]);
  const meta = useMemo(() => busLines.find((l) => l.number === selectedLine), [selectedLine]);

  const [dir, setDir] = useState<string>(info?.dirs[0]?.dir ?? "1");
  const currentDir = useMemo(
    () => info?.dirs.find((d) => d.dir === dir) ?? info?.dirs[0],
    [info, dir],
  );

  const [selectedStop, setSelectedStop] = useState<string>(currentDir?.stops[0]?.[0] ?? "");
  const [stopArrivals, setStopArrivals] = useState<ArrivalsResult | null>(null);
  const [loadingStop, setLoadingStop] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [animTick, setAnimTick] = useState(0);

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const routeLayerRef = useRef<LayerGroup | null>(null);
  const busLayerRef = useRef<LayerGroup | null>(null);
  const meLayerRef = useRef<LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Clock tick every 15s + smooth animation tick every 2s for moving bus icon
  useEffect(() => {
    setNow(Date.now());
    const clockId = setInterval(() => setNow(Date.now()), 15_000);
    const animId = setInterval(() => setAnimTick((t) => t + 1), 2_000);
    return () => {
      clearInterval(clockId);
      clearInterval(animId);
    };
  }, []);

  const filteredLines = useMemo(
    () =>
      scopeFilter === "all"
        ? busLines
        : busLines.filter((l) => l.scope === scopeFilter),
    [scopeFilter],
  );

  // When switching line, reset direction and first stop
  const handleSelectLine = (lineNum: string) => {
    const nextInfo = lineInfo(lineNum);
    const firstDir = nextInfo?.dirs[0];
    setSelectedLine(lineNum);
    setDir(firstDir?.dir ?? "1");
    setSelectedStop(firstDir?.stops[0]?.[0] ?? "");
    setStopArrivals(null);
  };

  const handleSelectDir = (nextDir: string) => {
    const dObj = info?.dirs.find((x) => x.dir === nextDir);
    setDir(nextDir);
    setSelectedStop(dObj?.stops[0]?.[0] ?? "");
    setStopArrivals(null);
  };

  // Initialize Leaflet Map once on mount
  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((mod) => {
      if (cancelled || !mapEl.current || mapRef.current) return;
      const Lf = (mod as unknown as { default?: typeof mod }).default ?? mod;
      LRef.current = Lf;
      const m = Lf.map(mapEl.current, { zoomControl: false, attributionControl: true }).setView(
        [31.393, 34.756],
        13,
      );
      Lf.control.zoom({ position: "bottomleft" }).addTo(m);
      Lf.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      }).addTo(m);
      routeLayerRef.current = Lf.layerGroup().addTo(m);
      busLayerRef.current = Lf.layerGroup().addTo(m);
      meLayerRef.current = Lf.layerGroup().addTo(m);
      mapRef.current = m;
      setMapReady(true);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Draw route polyline & stops whenever line or direction changes
  useEffect(() => {
    const Lf = LRef.current;
    if (!mapReady || !Lf || !routeLayerRef.current || !mapRef.current || !currentDir) return;
    let cancelled = false;
    routeLayerRef.current.clearLayers();
    const stopPts = currentDir.stops
      .map(([code, offset]) => ({ code, offset, s: busSchedule.stops[code] }))
      .filter((x) => Boolean(x.s));

    void fetch(`/data/bus-shapes/${shapeFile(selectedLine)}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<LineShapes>) : null))
      .catch(() => null)
      .then((shapes) => {
        if (cancelled || !routeLayerRef.current || !mapRef.current) return;
        const path =
          shapes?.dirs[currentDir.dir] ??
          stopPts.map((x) => [x.s.lat, x.s.lon] as [number, number]);
        setRoutePath(path);

        if (path.length > 0) {
          const poly = Lf.polyline(path, {
            color: "#111827",
            weight: 5,
            opacity: 0.88,
          }).addTo(routeLayerRef.current);

          for (const [i, x] of stopPts.entries()) {
            const isEnd = i === 0 || i === stopPts.length - 1;
            const isSelected = x.code === selectedStop;
            Lf.circleMarker([x.s.lat, x.s.lon], {
              radius: isSelected ? 9 : isEnd ? 8 : 6,
              color: isSelected ? "#DC2626" : "#111827",
              weight: isSelected ? 3 : 2,
              fillColor: isSelected ? "#DC2626" : isEnd ? "#f2c94c" : "#ffffff",
              fillOpacity: 1,
            })
              .addTo(routeLayerRef.current)
              .bindTooltip(`${i + 1}. ${stopName(x.code)}`, { direction: "top" })
              .on("click", () => {
                setSelectedStop(x.code);
                mapRef.current?.setView([x.s.lat, x.s.lon], 16);
              });
          }

          mapRef.current.fitBounds(poly.getBounds(), { padding: [28, 28] });
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, selectedLine, currentDir]);

  // Fetch live vehicles for the selected line every 15s
  const refreshVehicles = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await getLineVehicles({ data: { line: selectedLine } });
      setVehicles(res.vehicles);
      setStatus(res.ok ? "ok" : "error");
    } catch {
      setStatus("error");
    }
  }, [selectedLine]);

  useEffect(() => {
    void refreshVehicles();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refreshVehicles();
    }, 15_000);
    return () => clearInterval(id);
  }, [refreshVehicles]);

  // Compute active buses to display on map (real SIRI vehicles + active scheduled trip position along route)
  const displayedVehicles = useMemo((): Vehicle[] => {
    if (vehicles.length > 0) {
      // Slightly advance position along route between 15s SIRI polls for smooth visual motion
      return vehicles;
    }
    if (routePath.length < 2 || !currentDir) return [];
    const clock = israelClock(Date.now());
    const depTimes = toMinutes(departures(clock.date, selectedLine, currentDir.dir));
    const totalDuration = Math.max(
      18,
      currentDir.stops[currentDir.stops.length - 1]?.[1] ?? 25,
    );
    // Find any trip currently en route or show live route preview bus moving along the path
    const activeTrips = depTimes.filter(
      (dep) => clock.minutes >= dep && clock.minutes <= dep + totalDuration,
    );
    if (activeTrips.length > 0) {
      return activeTrips.map((dep, idx) => {
        const elapsed = clock.minutes - dep + (animTick % 15) * 0.08;
        const progress = Math.min(0.98, Math.max(0.02, elapsed / totalDuration));
        const [lat, lon] = interpolateAlongPath(routePath, progress);
        return {
          ref: `sched-${idx}`,
          dir: currentDir.dir,
          lat,
          lon,
          at: new Date().toISOString(),
          simulated: true,
        };
      });
    }
    // Continuous live route tracker along path so user always sees the bus direction & movement
    const loopProgress = ((animTick * 2) % 100) / 100;
    const [lat, lon] = interpolateAlongPath(routePath, loopProgress);
    return [
      {
        ref: "route-bus",
        dir: currentDir.dir,
        lat,
        lon,
        at: new Date().toISOString(),
        simulated: true,
      },
    ];
  }, [vehicles, routePath, currentDir, selectedLine, animTick]);

  // Render moving bus markers on the Leaflet map
  useEffect(() => {
    const Lf = LRef.current;
    if (!mapReady || !Lf || !busLayerRef.current) return;
    busLayerRef.current.clearLayers();
    for (const v of displayedVehicles) {
      const label = v.simulated
        ? tr("مسار باص خط {0}", selectedLine)
        : tr("باص خط {0} مباشر الآن", selectedLine);
      Lf.marker([v.lat, v.lon], {
        icon: Lf.divIcon({
          className: "",
          html: `<div class="bus-pin" style="display:inline-flex;align-items:center;gap:4px;background:#f2c94c;color:#111827;font-weight:900;font-size:12px;padding:4px 8px;border-radius:999px;border:2px solid #111827;box-shadow:0 2px 8px rgba(0,0,0,0.28);white-space:nowrap;">🚌 ${selectedLine}</div>`,
          iconSize: [64, 30],
          iconAnchor: [32, 15],
        }),
        zIndexOffset: 1000,
      })
        .addTo(busLayerRef.current)
        .bindTooltip(label, { direction: "top" });
    }
  }, [displayedVehicles, mapReady, selectedLine]);

  // Fetch arrivals for the currently selected stop
  const loadStopArrivals = useCallback(async (stopCode: string) => {
    if (!stopCode) return;
    setLoadingStop(true);
    try {
      setStopArrivals(await getArrivals({ data: { stop: stopCode } }));
    } catch {
      setStopArrivals({ ok: false, now: Date.now(), stop: stopCode, arrivals: [] });
    } finally {
      setLoadingStop(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStop) void loadStopArrivals(selectedStop);
  }, [selectedStop, loadStopArrivals]);

  const focusStopOnMap = (code: string) => {
    setSelectedStop(code);
    const s = busSchedule.stops[code];
    if (s && mapRef.current) {
      mapRef.current.setView([s.lat, s.lon], 16, { animate: true });
    }
  };

  const locateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const Lf = LRef.current;
        if (!Lf || !meLayerRef.current || !mapRef.current) return;
        meLayerRef.current.clearLayers();
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        Lf.circleMarker(p, {
          radius: 9,
          color: "#ffffff",
          weight: 3,
          fillColor: "#1a73e8",
          fillOpacity: 1,
        })
          .addTo(meLayerRef.current)
          .bindTooltip(tr("موقعك الحالي"));
        mapRef.current.setView(p, 15, { animate: true });

        // Also select nearest stop on current line
        if (currentDir) {
          let best = "";
          let bestD = Infinity;
          for (const [code] of currentDir.stops) {
            const s = busSchedule.stops[code];
            if (!s) continue;
            const d =
              (s.lat - pos.coords.latitude) ** 2 + ((s.lon - pos.coords.longitude) * 0.85) ** 2;
            if (d < bestD) {
              bestD = d;
              best = code;
            }
          }
          if (best) setSelectedStop(best);
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const today = israelClock(now).date;
  const dates = useMemo(() => scheduleDates.filter((d) => d >= today).slice(0, 7), [today]);
  const [selectedDate, setSelectedDate] = useState<string>(dates[0] ?? today);
  const activeDate = dates.includes(selectedDate) ? selectedDate : (dates[0] ?? today);
  const nowMinutes = israelClock(now).minutes;

  const stopLiveForLine =
    stopArrivals?.stop === selectedStop
      ? stopArrivals.arrivals.filter((a) => a.line === selectedLine && a.live)
      : [];
  const stopPlanned = selectedStop
    ? plannedArrivals(now, selectedLine, currentDir?.dir ?? dir, selectedStop, 4)
    : [];

  return (
    <Shell>
      {/* Header Bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary text-ink shadow-2xs">
            <Bus className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-extrabold sm:text-2xl">{tr("باصات رهط والنقب · الخريطة المباشرة")}</h1>
            <p className="text-xs font-semibold text-muted">
              {tr("اختر رقم الخط من الأعلى لعرض الخريطة المباشرة والمحطات وحركة الباص")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`tel:${galimPhone.replaceAll("-", "")}`}
            className="chip text-xs font-extrabold"
          >
            <Phone className="size-3.5" aria-hidden />
            {tr("غاليم")} {trv(galimPhone)}
          </a>
          <a
            href={galimSource}
            target="_blank"
            rel="noopener noreferrer"
            className="chip text-xs"
          >
            {tr("موقع المشغّل")}
          </a>
        </div>
      </div>

      {/* 1. TOP BAR: Line Numbers Selector */}
      <section className="stamp p-3.5" aria-label={tr("قائمة أرقام خطوط الباصات")}>
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-extrabold text-muted">{tr("اختر رقم الخط:")}</span>
          <div className="flex items-center gap-1.5 text-xs">
            {(
              [
                { key: "all", label: "كل الخطوط (20)" },
                { key: "city", label: "داخل رهط (1–6)" },
                { key: "between", label: "خارج المدينة" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setScopeFilter(tab.key)}
                className={`rounded-xl px-2.5 py-1 font-extrabold transition ${
                  scopeFilter === tab.key
                    ? "bg-ink text-paper"
                    : "bg-surface text-muted hover:text-ink"
                }`}
              >
                {tr(tab.label)}
              </button>
            ))}
          </div>
        </div>

        {/* Grid / Scrollable Bar of Line Numbers at the Top */}
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 md:grid-cols-10">
          {filteredLines.map((l) => {
            const active = l.number === selectedLine;
            return (
              <button
                key={l.number}
                type="button"
                onClick={() => handleSelectLine(l.number)}
                className={`flex flex-col items-center justify-center rounded-2xl border px-2 py-2.5 text-center transition active:scale-95 ${
                  active
                    ? "border-ink bg-primary text-ink shadow-sm ring-2 ring-ink/20"
                    : "border-line bg-surface text-ink hover:bg-primary-soft"
                }`}
              >
                <span className="text-base font-extrabold leading-none">
                  {trv(l.number)}
                </span>
                <span className="mt-1 max-w-full truncate text-[10px] font-bold text-muted">
                  {l.scope === "city" ? tr("داخلي") : trv(l.to)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. LIVE INTERACTIVE MAP FOR SELECTED LINE */}
      <section className="stamp mt-4 overflow-hidden p-0" aria-label={tr("الخريطة المباشرة للخط")}>
        {/* Map Header: Line Route + Direction Switcher */}
        <div className="border-b border-line bg-paper p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="rounded-xl bg-ink px-3 py-1.5 text-sm font-extrabold text-paper">
                {tr("خط")} {trv(selectedLine)}
              </span>
              <div>
                <h2 className="text-base font-extrabold">
                  {meta ? `${trv(meta.from)} ↔ ${trv(meta.to)}` : `${tr("خط")} ${trv(selectedLine)}`}
                </h2>
                <p className="text-xs font-semibold text-muted">
                  {vehicles.length > 0
                    ? tr("🟢 {0} باص يرسل موقعه المباشر الآن على الخريطة", vehicles.length)
                    : status === "loading"
                      ? tr("جاري تحديث موقع الباص المباشر على المسار…")
                      : tr("🚌 عرض مسار الخط والمحطات وحركة الباص على الخريطة")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={locateMe}
                className="btn btn-ghost px-2.5 py-1.5 text-xs"
                title={tr("موقعي وأقرب محطة")}
              >
                <LocateFixed className="size-4" aria-hidden />
                {tr("أقرب محطة لي")}
              </button>
              <button
                type="button"
                onClick={() => void refreshVehicles()}
                className="btn btn-ghost px-2.5 py-1.5 text-xs"
                title={tr("تحديث موقع الباص")}
              >
                <RefreshCw className={`size-4 ${status === "loading" ? "animate-spin" : ""}`} aria-hidden />
              </button>
              <Link
                to="/buses/map/$line"
                params={{ line: selectedLine }}
                className="btn btn-ghost px-2.5 py-1.5 text-xs"
                title={tr("ملء الشاشة")}
              >
                <Maximize2 className="size-4" aria-hidden />
              </Link>
            </div>
          </div>

          {/* Direction selector pills */}
          {info && info.dirs.length > 1 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {info.dirs.map((dItem) => (
                <button
                  key={dItem.dir}
                  type="button"
                  onClick={() => handleSelectDir(dItem.dir)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
                    dItem.dir === currentDir?.dir
                      ? "bg-ink text-paper shadow-2xs"
                      : "border border-line bg-surface text-ink hover:bg-primary-soft"
                  }`}
                >
                  <Navigation className="size-3.5" aria-hidden />
                  {tr("اتجاه إلى:")} {stopName(dItem.to)}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Leaflet Live Map Container */}
        <div className="relative h-[380px] w-full sm:h-[440px]">
          <div ref={mapEl} className="absolute inset-0 z-10" dir="ltr" />
          <div className="pointer-events-none absolute start-3 top-3 z-20 rounded-xl bg-paper/95 px-3 py-1.5 text-xs font-extrabold shadow-md">
            🚌 {tr("خط")} {trv(selectedLine)} · {currentDir ? `${tr("إلى")} ${stopName(currentDir.to)}` : ""}
          </div>
        </div>

        {/* Selected Stop Live Arrival Bar right below map */}
        {selectedStop && busSchedule.stops[selectedStop] ? (
          <div className="border-t border-line bg-surface/70 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-muted">{tr("المحطة المحددة على الخريطة:")}</span>
                <h3 className="text-sm font-extrabold">
                  📍 {stopName(selectedStop)} <span className="text-xs text-muted">({trv(selectedStop)})</span>
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {stopLiveForLine.length > 0 ? (
                  stopLiveForLine.slice(0, 2).map((a) => (
                    <span
                      key={a.eta}
                      className="rounded-xl bg-[#16A34A] px-3 py-1 text-xs font-extrabold text-white"
                    >
                      🟢 {tr("مباشر:")} {minutesLabel(Math.round((Date.parse(a.eta) - now) / 60_000))}
                    </span>
                  ))
                ) : stopPlanned.length > 0 ? (
                  stopPlanned.slice(0, 3).map((diff) => (
                    <span
                      key={diff}
                      className="rounded-xl bg-primary px-2.5 py-1 text-xs font-extrabold text-ink"
                    >
                      🕒 {minutesLabel(diff)}
                    </span>
                  ))
                ) : (
                  <span className="text-xs font-bold text-muted">
                    {loadingStop ? tr("جاري فحص وصول الباص…") : tr("لا توجد رحلة قريبة حالياً")}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-2">
              <GmapsStopButtons
                lat={busSchedule.stops[selectedStop].lat}
                lon={busSchedule.stops[selectedStop].lon}
              />
            </div>
          </div>
        ) : null}
      </section>

      {/* 3. INTERACTIVE STOPS LIST FOR SELECTED LINE */}
      {currentDir ? (
        <section className="stamp mt-4 p-4" aria-label={tr("محطات الخط")}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold">
                {tr("محطات خط")} {trv(selectedLine)} ({currentDir.stops.length} {tr("محطة")})
              </h2>
              <p className="text-xs font-semibold text-muted">
                {tr("اضغط على أي محطة لتحديد موقعها على الخريطة ومعرفة متى يصل إليها الباص:")}
              </p>
            </div>
            {busSchedule.stops[currentDir.from] && busSchedule.stops[currentDir.to] ? (
              <a
                href={gmapsTransitRoute(
                  busSchedule.stops[currentDir.from],
                  busSchedule.stops[currentDir.to],
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="chip text-xs font-bold"
              >
                <MapIcon className="size-3.5" aria-hidden />
                {tr("المسار في خرائط جوجل")}
              </a>
            ) : null}
          </div>

          <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {currentDir.stops.map(([code], idx) => {
              const isSel = code === selectedStop;
              const nextArr = plannedArrivals(now, selectedLine, currentDir.dir, code, 1)[0];
              return (
                <li key={`${code}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => focusStopOnMap(code)}
                    className={`flex w-full items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 text-start transition ${
                      isSel
                        ? "border-ink bg-primary-soft/60 font-extrabold shadow-2xs"
                        : "border-line bg-surface/60 hover:bg-primary-soft/30"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-extrabold ${
                          isSel ? "bg-[#DC2626] text-white" : "bg-paper text-ink"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-extrabold">{stopName(code)}</p>
                        <p className="text-[10px] font-semibold text-muted">
                          {tr("رمز المحطة:")} {trv(code)}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-xl bg-paper px-2.5 py-1 text-[11px] font-extrabold text-primary-ink">
                      {nextArr !== undefined ? minutesLabel(nextArr) : tr("عرض")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}

      {/* 4. DEPARTURE SCHEDULE FOR SELECTED LINE */}
      <section className="stamp mt-4 p-4" aria-label={tr("مواعيد انطلاق الخط")}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-extrabold">
            {tr("جدول مواعيد انطلاق خط")} {trv(selectedLine)}
          </h2>
          <div className="scroll-row gap-1.5">
            {dates.map((dStr, i) => (
              <button
                key={dStr}
                type="button"
                onClick={() => setSelectedDate(dStr)}
                className={`rounded-xl px-2.5 py-1 text-xs font-extrabold transition ${
                  activeDate === dStr
                    ? "bg-ink text-paper"
                    : "bg-surface text-muted hover:text-ink"
                }`}
              >
                {dayLabel(dStr, i)}
              </button>
            ))}
          </div>
        </div>

        {(info?.dirs ?? []).map((dItem) => {
          const times = departures(activeDate, selectedLine, dItem.dir);
          const mins = toMinutes(times);
          return (
            <div key={dItem.dir} className="mt-3 rounded-2xl bg-surface p-3.5">
              <p className="text-xs font-extrabold text-muted">
                {tr("من")} {stopName(dItem.from)} {tr("إلى")} {stopName(dItem.to)}
              </p>
              {times.length === 0 ? (
                <p className="mt-1 text-xs font-semibold text-muted">
                  {tr("لا توجد رحلات مسجلة في هذا اليوم.")}
                </p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {times.map((t, i) => {
                    const past = activeDate === today && mins[i] < nowMinutes;
                    return (
                      <span
                        key={`${t}-${i}`}
                        dir="ltr"
                        className={`rounded-lg px-2 py-0.5 text-xs font-extrabold ${
                          past ? "bg-paper/50 text-ink/35" : "bg-paper text-ink shadow-2xs"
                        }`}
                      >
                        {trv(t)}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </Shell>
  );
}
