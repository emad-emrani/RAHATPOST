import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, LocateFixed, Map as MapIcon, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LayerGroup } from "leaflet";
import { useLeafletMap } from "@/components/leaflet-map";
import { busSchedule } from "@/data/bus-schedule";
import { getStopLive } from "@/lib/buses/api";
import { shapeFile, type LineShapes } from "@/lib/buses/map";
import { stopName } from "@/lib/buses/schedule";
import { GmapsStopButtons } from "@/components/gmaps-buttons";
import { useNavigate } from "@tanstack/react-router";
import { seo } from "@/lib/seo";
import { tr, trv } from "@/lib/i18n/core";

type StopLive = Awaited<ReturnType<typeof getStopLive>>;

const LINE_COLORS = ["#263238", "#1d6fb8", "#0e8f47", "#9d174d", "#7c3aed", "#b45309"];
const REFRESH_MS = 30_000;

export const Route = createFileRoute("/buses_/stop/$stop")({
  loader: ({ params }) => {
    const s = busSchedule.stops[params.stop];
    if (!s) throw notFound();
    // Galim lines (and direction) of the schedule that serve this stop.
    const lines = busSchedule.lines.flatMap((l) =>
      l.dirs
        .filter((d) => d.stops.some(([c]) => c === params.stop))
        .map((d) => ({ line: l.number, dir: d.dir })),
    );
    return { code: params.stop, name: s.ar || s.he, lat: s.lat, lon: s.lon, lines };
  },
  head: ({ loaderData }) =>
    seo({
      title: tr("محطة {0} على الخريطة · باصات رهط", loaderData?.name ?? ""),
      description: tr("الباصات القادمة إلى محطة {0} في رهط ومواقعها المباشرة على الخريطة.", loaderData?.name ?? ""),
      path: `/buses/stop/${loaderData?.code ?? ""}`,
      robots: "noindex",
    }),
  component: StopMapKeyed,
});

/** Remount per stop so the map recenters when moving between stops. */
function StopMapKeyed() {
  return <StopMapPage key={Route.useLoaderData().code} />;
}

function StopMapPage() {
  const { code, name, lat, lon, lines } = Route.useLoaderData();
  const el = useRef<HTMLDivElement>(null);
  const { L, map } = useLeafletMap(el, [lat, lon], 15);
  const navigate = useNavigate();
  const routes = useRef<LayerGroup | null>(null);
  const buses = useRef<LayerGroup | null>(null);
  const me = useRef<LayerGroup | null>(null);
  const [data, setData] = useState<StopLive | null>(null);
  const [error, setError] = useState(false);
  const color = (line: string) =>
    LINE_COLORS[
      Math.max(
        0,
        lines.findIndex((l) => l.line === line),
      ) % LINE_COLORS.length
    ];

  // Stop marker + routes of the lines serving it.
  useEffect(() => {
    if (!L || !map) return;
    routes.current = L.layerGroup().addTo(map);
    buses.current = L.layerGroup().addTo(map);
    me.current = L.layerGroup().addTo(map);
    L.circleMarker([lat, lon], {
      radius: 11,
      color: "#263238",
      weight: 3,
      fillColor: "#f2c94c",
      fillOpacity: 1,
    })
      .addTo(map)
      .bindTooltip(tr("محطة {0}", name), { permanent: true, direction: "top", offset: [0, -10] });
    // All stations of the lines serving this stop (tap → that stop's live map).
    const seen = new Set<string>([code]);
    for (const { line, dir } of lines) {
      const d = busSchedule.lines.find((l) => l.number === line)?.dirs.find((x) => x.dir === dir);
      for (const [c] of d?.stops ?? []) {
        const st = busSchedule.stops[c];
        if (!st || seen.has(c)) continue;
        seen.add(c);
        L.circleMarker([st.lat, st.lon], {
          radius: 5,
          color: "#263238",
          weight: 2,
          fillColor: "#fff",
          fillOpacity: 1,
        })
          .addTo(routes.current!)
          .bindTooltip(stopName(c), { direction: "top" })
          .on("click", () => void navigate({ to: "/buses/stop/$stop", params: { stop: c } }));
      }
    }
    for (const { line, dir } of lines) {
      void fetch(`/data/bus-shapes/${shapeFile(line)}.json`)
        .then((r) => (r.ok ? (r.json() as Promise<LineShapes>) : null))
        .catch(() => null)
        .then((shape) => {
          const path = shape?.dirs[dir];
          if (path && routes.current)
            L.polyline(path, { color: color(line), weight: 4, opacity: 0.7 })
              .addTo(routes.current)
              .bindTooltip(tr("خط {0}", line), { sticky: true });
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [L, map]);

  const refresh = useCallback(async () => {
    try {
      const res = await getStopLive({ data: { stop: code } });
      setData(res);
      setError(!res.ok);
    } catch {
      setError(true);
    }
  }, [code]);
  useEffect(() => {
    void refresh();
    const id = setInterval(
      () => document.visibilityState === "visible" && void refresh(),
      REFRESH_MS,
    );
    return () => clearInterval(id);
  }, [refresh]);

  // Incoming buses (real positions only), and fit the view to stop + buses.
  useEffect(() => {
    if (!L || !map || !buses.current || !data) return;
    buses.current.clearLayers();
    const pts: [number, number][] = [[lat, lon]];
    for (const v of data.vehicles) {
      const mins = Math.max(0, Math.round((Date.parse(v.eta) - Date.now()) / 60_000));
      L.marker([v.lat, v.lon], {
        icon: L.divIcon({
          className: "",
          html: `<div class="bus-pin">🚌 ${v.line}</div>`,
          iconSize: [56, 28],
          iconAnchor: [28, 14],
        }),
        zIndexOffset: 1000,
      })
        .addTo(buses.current)
        .bindTooltip(tr("خط {0} · يصل خلال {1} د", v.line, mins), { direction: "top" });
      pts.push([v.lat, v.lon]);
    }
    if (pts.length > 1) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 });
  }, [L, map, data, lat, lon]);

  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        if (!L || !map || !me.current) return;
        me.current.clearLayers();
        const p: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        L.circleMarker(p, {
          radius: 9,
          color: "#fff",
          weight: 3,
          fillColor: "#1a73e8",
          fillOpacity: 1,
        })
          .addTo(me.current)
          .bindTooltip(tr("موقعك"));
        map.fitBounds(L.latLngBounds([p, [lat, lon]]), { padding: [40, 40], maxZoom: 17 });
      },
      () => alert(tr("تعذّر تحديد موقعك.")),
      { enableHighAccuracy: true, timeout: 10_000 },
    );

  const served = new Set(lines.map((l) => l.line));
  const mins = (iso: string) =>
    Math.max(0, Math.round((Date.parse(iso) - (data?.now ?? Date.now())) / 60_000));

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-paper">
      <header className="edge-b flex items-center gap-3 px-3 py-2">
        <Link to="/buses" className="btn btn-ghost px-3" aria-label={tr("رجوع إلى الباصات")}>
          <ArrowRight className="size-5" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">{tr("محطة")} {trv(name)}</h1>
          <p className="truncate text-xs font-semibold text-muted">
            {tr("رقم المحطة")} {trv(code)}
            {lines.length ? tr(" · الخطوط: {0}", [...served].join("، ")) : ""}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost px-3"
          aria-label={tr("تحديث")}
          onClick={() => void refresh()}
        >
          <RefreshCw className="size-5" aria-hidden />
        </button>
      </header>
      <div className="relative min-h-0 flex-1">
        <div ref={el} className="absolute inset-0" dir="ltr" />
        <button
          type="button"
          onClick={locate}
          className="absolute end-3 top-3 z-[500] grid size-11 place-items-center rounded-full bg-paper shadow-[var(--shadow-lift)]"
          aria-label={tr("موقعي")}
        >
          <LocateFixed className="size-5" aria-hidden />
        </button>
        <div className="absolute inset-x-3 top-3 z-[500] me-14 rounded-xl bg-paper/95 px-3 py-2 text-sm font-bold shadow-[var(--shadow-card)]">
          {!data && !error
            ? tr("جاري جلب الباصات القادمة…")
            : error
              ? tr("تعذّر جلب البيانات المباشرة الآن.")
              : data!.vehicles.length
                ? tr("{0} باص قادم يرسل موقعه الآن · مواقع حقيقية من وزارة المواصلات", data!.vehicles.length)
                : tr("لا يوجد باص قادم يرسل موقعه الآن — الأوقات أدناه من النظام المباشر أو الجدول.")}
        </div>
      </div>
      <div className="edge-t max-h-[42vh] overflow-y-auto bg-paper p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <GmapsStopButtons lat={lat} lon={lon} />
        <p className="mb-2 mt-3 font-bold">{tr("الباصات القادمة")}</p>
        {data && data.arrivals.length === 0 ? (
          <p className="font-semibold text-muted">{tr("لا وصول متوقع قريباً لهذه المحطة.")}</p>
        ) : null}
        <ul className="flex flex-col gap-2">
          {(data?.arrivals ?? []).map((a, i) => (
            <li
              key={`${a.line}-${a.eta}-${i}`}
              className="flex items-center gap-2 rounded-xl border border-line px-3 py-2"
            >
              <span
                className="chip chip-ink shrink-0"
                style={{ boxShadow: `inset 0 -3px 0 ${color(a.line)}` }}
              >
                {tr("خط")} {trv(a.line)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">
                {a.destination ? tr("إلى {0}", a.destination) : ""}
              </span>
              <span className="shrink-0 text-end">
                <span className="block font-bold">
                  {mins(a.eta) < 1 ? tr("الآن") : tr("{0} د", mins(a.eta))}
                </span>
                <span className={a.live ? "chip chip-ok" : "chip"}>
                  {a.vehicle ? tr("على الخريطة") : a.live ? tr("مباشر") : tr("مجدول")}
                </span>
              </span>
              {served.has(a.line) && a.operator === busSchedule.agency ? (
                <Link
                  to="/buses/map/$line"
                  params={{ line: a.line }}
                  search={{ stop: code }}
                  className="grid size-9 shrink-0 place-items-center rounded-lg border border-line"
                  aria-label={tr("خريطة خط {0}", a.line)}
                >
                  <MapIcon className="size-4" aria-hidden />
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs font-semibold text-muted">
          {tr("المسارات: GTFS وزارة المواصلات. المواقع والأوقات المباشرة: SIRI عبر curlbus.app (آخر 5 دقائق فقط).")}
        </p>
      </div>
    </div>
  );
}
