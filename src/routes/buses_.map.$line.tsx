import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, LocateFixed, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { busSchedule } from "@/data/bus-schedule";
import { busLines } from "@/data/buses";
import { getArrivals, getLineVehicles } from "@/lib/buses/api";
import { shapeFile, type LineShapes } from "@/lib/buses/map";
import { lineInfo, stopName } from "@/lib/buses/schedule";
import type { ArrivalsResult } from "@/lib/buses/types";
import { seo } from "@/lib/seo";

type Vehicle = { ref: string; dir: string; lat: number; lon: number; at: string };

export const Route = createFileRoute("/buses_/map/$line")({
  loader: ({ params }) => {
    const info = lineInfo(params.line);
    if (!info) throw notFound();
    const meta = busLines.find((l) => l.number === params.line);
    return { line: params.line, from: meta?.from ?? "", to: meta?.to ?? "" };
  },
  head: ({ params }) =>
    seo({
      title: `خريطة خط ${params.line} · باصات رهط · رهط بوست`,
      description: `مسار خط الباص ${params.line} في رهط ومحطاته على الخريطة، مع مواقع الباصات المباشرة.`,
      path: `/buses/map/${params.line}`,
    }),
  component: BusMapPage,
});

const REFRESH_MS = 30_000;

function BusMapPage() {
  const { line, from, to } = Route.useLoaderData();
  const info = lineInfo(line)!;
  const [dir, setDir] = useState(info.dirs[0]?.dir ?? "1");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [updated, setUpdated] = useState(0);
  const [stop, setStop] = useState<{ code: string; data: ArrivalsResult | null } | null>(null);
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const L = useRef<typeof import("leaflet") | null>(null);
  const routeLayer = useRef<LayerGroup | null>(null);
  const busLayer = useRef<LayerGroup | null>(null);
  const meLayer = useRef<LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  const d = info.dirs.find((x) => x.dir === dir) ?? info.dirs[0];

  // Map init (client only).
  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((mod) => {
      if (cancelled || !el.current || map.current) return;
      const Lf = (mod as unknown as { default?: typeof mod }).default ?? mod;
      L.current = Lf;
      const m = Lf.map(el.current, { zoomControl: false, attributionControl: true }).setView(
        [31.393, 34.756],
        13,
      );
      Lf.control.zoom({ position: "bottomleft" }).addTo(m);
      Lf.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      }).addTo(m);
      routeLayer.current = Lf.layerGroup().addTo(m);
      busLayer.current = Lf.layerGroup().addTo(m);
      meLayer.current = Lf.layerGroup().addTo(m);
      map.current = m;
      setReady(true);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Route line + stops for the selected direction.
  useEffect(() => {
    const Lf = L.current;
    if (!ready || !Lf || !routeLayer.current || !map.current || !d) return;
    let cancelled = false;
    routeLayer.current.clearLayers();
    const stopPts = d.stops
      .map(([code]) => ({ code, s: busSchedule.stops[code] }))
      .filter((x) => x.s);
    void fetch(`/data/bus-shapes/${shapeFile(line)}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<LineShapes>) : null))
      .catch(() => null)
      .then((shapes) => {
        if (cancelled || !routeLayer.current || !map.current) return;
        const path =
          shapes?.dirs[d.dir] ?? stopPts.map((x) => [x.s.lat, x.s.lon] as [number, number]);
        const poly = Lf.polyline(path, { color: "#263238", weight: 5, opacity: 0.85 }).addTo(
          routeLayer.current,
        );
        for (const [i, x] of stopPts.entries()) {
          const end = i === 0 || i === stopPts.length - 1;
          Lf.circleMarker([x.s.lat, x.s.lon], {
            radius: end ? 8 : 6,
            color: "#263238",
            weight: 2,
            fillColor: end ? "#f2c94c" : "#ffffff",
            fillOpacity: 1,
          })
            .addTo(routeLayer.current)
            .bindTooltip(stopName(x.code), { direction: "top" })
            .on("click", () => openStop(x.code));
        }
        map.current.fitBounds(poly.getBounds(), { padding: [24, 24] });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, dir, line]);

  const openStop = useCallback(async (code: string) => {
    setStop({ code, data: null });
    try {
      setStop({ code, data: await getArrivals({ data: { stop: code } }) });
    } catch {
      setStop({ code, data: { ok: false, now: Date.now(), stop: code, arrivals: [] } });
    }
  }, []);

  // Live vehicles, refreshed every 30 s.
  const refresh = useCallback(async () => {
    try {
      const res = await getLineVehicles({ data: { line } });
      setVehicles(res.vehicles);
      setStatus(res.ok ? "ok" : "error");
      setUpdated(res.now);
    } catch {
      setStatus("error");
    }
  }, [line]);
  useEffect(() => {
    void refresh();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    const Lf = L.current;
    if (!ready || !Lf || !busLayer.current) return;
    busLayer.current.clearLayers();
    for (const v of vehicles) {
      const age = Math.max(0, Math.round((Date.now() - Date.parse(v.at)) / 60_000));
      Lf.marker([v.lat, v.lon], {
        icon: Lf.divIcon({
          className: "",
          html: `<div class="bus-pin">🚌 ${line}</div>`,
          iconSize: [56, 28],
          iconAnchor: [28, 14],
        }),
        zIndexOffset: 1000,
      })
        .addTo(busLayer.current)
        .bindTooltip(age < 1 ? "موقع مباشر الآن" : `آخر موقع قبل ${age} د`, { direction: "top" });
    }
  }, [vehicles, ready, line]);

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const Lf = L.current;
        if (!Lf || !meLayer.current || !map.current) return;
        meLayer.current.clearLayers();
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        Lf.circleMarker(p, {
          radius: 9,
          color: "#ffffff",
          weight: 3,
          fillColor: "#1a73e8",
          fillOpacity: 1,
        })
          .addTo(meLayer.current)
          .bindTooltip("موقعك");
        map.current.setView(p, 15);
      },
      () => alert("تعذّر تحديد موقعك. اسمح للموقع باستخدام الموقع الجغرافي."),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString("ar-u-nu-latn", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jerusalem",
    });
  const shown = vehicles.length;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-paper">
      <header className="edge-b flex items-center gap-3 px-3 py-2">
        <Link to="/buses" className="btn btn-ghost px-3" aria-label="رجوع إلى الباصات">
          <ArrowRight className="size-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">خريطة خط {line}</h1>
          <p className="truncate text-xs font-semibold text-muted">
            {from && to ? `${from} ↔ ${to}` : "باصات رهط"}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost px-3"
          aria-label="تحديث"
          onClick={() => void refresh()}
        >
          <RefreshCw className="size-5" aria-hidden />
        </button>
      </header>
      {info.dirs.length > 1 ? (
        <div className="scroll-row px-3 py-2">
          {info.dirs.map((x) => (
            <button
              key={x.dir}
              type="button"
              className={x.dir === dir ? "chip chip-ink shrink-0" : "chip shrink-0"}
              onClick={() => setDir(x.dir)}
            >
              إلى {stopName(x.to)}
            </button>
          ))}
        </div>
      ) : null}
      <div className="relative min-h-0 flex-1">
        <div ref={el} className="absolute inset-0" dir="ltr" />
        <button
          type="button"
          onClick={locate}
          className="absolute end-3 top-3 z-[500] grid size-11 place-items-center rounded-full bg-paper shadow-[var(--shadow-lift)]"
          aria-label="موقعي"
        >
          <LocateFixed className="size-5" aria-hidden />
        </button>
        <div className="absolute inset-x-3 top-3 z-[500] me-14 rounded-xl bg-paper/95 px-3 py-2 text-sm font-bold shadow-[var(--shadow-card)]">
          {status === "loading"
            ? "جاري جلب مواقع الباصات…"
            : status === "error"
              ? "تعذّر جلب المواقع المباشرة الآن. المسار والمحطات من الجدول الرسمي."
              : shown
                ? `${shown} باص على الخط الآن · مواقع حقيقية من نظام وزارة المواصلات · ${fmt(new Date(updated).toISOString())}`
                : "لا يوجد باص يرسل موقعه على هذا الخط الآن. اضغط على محطة لرؤية أوقات الوصول."}
        </div>
      </div>
      {stop ? (
        <div className="edge-t max-h-[40vh] overflow-y-auto bg-paper p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold">محطة {stopName(stop.code)}</p>
            <button type="button" className="chip" onClick={() => setStop(null)}>
              إغلاق
            </button>
          </div>
          {!stop.data ? (
            <p className="mt-2 font-semibold text-muted">جاري جلب أوقات الوصول…</p>
          ) : !stop.data.ok ? (
            <p className="mt-2 font-semibold text-muted">تعذّر جلب أوقات الوصول الآن.</p>
          ) : stop.data.arrivals.filter((a) => a.line === line).length === 0 ? (
            <p className="mt-2 font-semibold text-muted">لا وصول متوقع لخط {line} قريباً.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1">
              {stop.data.arrivals
                .filter((a) => a.line === line)
                .map((a, i) => (
                  <li key={i} className="flex items-center justify-between font-semibold">
                    <span>
                      {fmt(a.eta)} {a.destination ? `· إلى ${a.destination}` : ""}
                    </span>
                    <span className={a.live ? "chip chip-ink" : "chip"}>
                      {a.live ? "مباشر" : "مجدول"}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      ) : (
        <p className="edge-t px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-xs font-semibold text-muted">
          المسار والمحطات: بيانات GTFS من وزارة المواصلات. المواقع وأوقات الوصول: SIRI عبر
          curlbus.app.
        </p>
      )}
    </div>
  );
}
