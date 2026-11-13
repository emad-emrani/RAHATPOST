import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Bus,
  Clock,
  Compass,
  Gauge,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  X,
  Phone,
  Radio,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import { Shell } from "@/components/shell";
import { GmapsStopButtons } from "@/components/gmaps-buttons";
import { busSchedule } from "@/data/bus-schedule";
import { busLines, galimPhone, galimSource } from "@/data/buses";
import { getArrivals, getLineVehicles, getStopLive } from "@/lib/buses/api";
import { gmapsPlace, gmapsTransitRoute, shapeFile, type LineShapes } from "@/lib/buses/map";
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
import {
  buildBusStopPopupHtml,
  buildLiveBusPopupHtml,
  buildScheduledFallbackBus,
  createBusStopDivIcon,
  createLiveBusDivIcon,
  getBusDriverDetails,
  type BusVehicleMarkerInfo,
} from "@/lib/buses/map-icons";
import { breadcrumbLd, seo } from "@/lib/seo";
import { tr, trv } from "@/lib/i18n/core";

type RawVehicle = {
  ref: string;
  dir: string;
  lat: number;
  lon: number;
  at: string;
};

type EnrichedVehicle = RawVehicle & {
  plateFormatted: string;
  speedKmh: number;
  bearing: number | null;
  compassAr: string;
  nextStopCode: string;
  nextStopName: string;
  distToNextStopM: number | null;
  etaMinutes: number | null;
  scheduledStart: string | null;
  distanceTraveledKm: number | null;
  signalAgeSec: number;
  operatorName: string;
};

type StrideVehicleRow = {
  siri_ride__vehicle_ref?: string | number | null;
  velocity?: number | null;
  bearing?: number | null;
  lat?: number | null;
  lon?: number | null;
  recorded_at_time?: string | null;
  siri_ride__scheduled_start_time?: string | null;
  distance_from_journey_start?: number | null;
};

export const Route = createFileRoute("/buses")({
  validateSearch: (search: Record<string, unknown>): { line?: string } => ({
    line: typeof search.line === "string" && search.line.trim() ? search.line.trim() : undefined,
  }),
  head: () =>
    seo({
      title: tr("باصات رهط: الخريطة المباشرة، لوحة الترخيص وسرعة الباص الحية · رهط بوست"),
      description: tr(
        "تتبّع باصات رهط والنقب (شركة غاليم) مباشرة على الخريطة مع رقم لوحة الترخيص الحقيقي، سرعة الباص المباشرة (كم/س)، المحطة القادمة، وأوقات الوصول من نظام وزارة المواصلات.",
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

/** Format official 7- or 8-digit Israeli SIRI vehicle_ref into standard license plate format. */
function formatLicensePlate(ref: string): string {
  const digits = String(ref ?? "").replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }
  if (digits.length === 7) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  return ref || "—";
}

/** Great-circle distance in kilometers between two GPS coordinates. */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Calculate initial compass bearing (0-360°) between two GPS coordinates. */
function computeBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (Math.round(toDeg(Math.atan2(y, x))) + 360) % 360;
}

function compassLabelAr(deg: number | null): string {
  if (deg === null || !Number.isFinite(deg)) return tr("على المسار");
  const dirs = [
    "شمال",
    "شمال شرق",
    "شرق",
    "جنوب شرق",
    "جنوب",
    "جنوب غرب",
    "غرب",
    "شمال غرب",
  ];
  return dirs[Math.round(deg / 45) % 8] ?? "على المسار";
}

/** Fetch real SIRI telemetry (velocity km/h, bearing, trip start, distance) from OpenBus Stride API. */
async function fetchStrideVehicleTelemetry(vehicleRef: string): Promise<{
  speedKmh: number | null;
  bearing: number | null;
  scheduledStart: string | null;
  distanceTraveledKm: number | null;
}> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4500);
    const url = `https://open-bus-stride-api.hasadna.org.il/siri_vehicle_locations/list?siri_ride__vehicle_ref=${encodeURIComponent(
      vehicleRef,
    )}&limit=3&order_by=recorded_at_time%20desc`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return { speedKmh: null, bearing: null, scheduledStart: null, distanceTraveledKm: null };
    const rows = (await res.json()) as StrideVehicleRow[];
    if (!Array.isArray(rows) || rows.length === 0) {
      return { speedKmh: null, bearing: null, scheduledStart: null, distanceTraveledKm: null };
    }
    const latest = rows[0];
    let speedKmh: number | null =
      typeof latest.velocity === "number" && latest.velocity >= 0
        ? Math.round(latest.velocity)
        : null;
    let bearing: number | null =
      typeof latest.bearing === "number" && latest.bearing >= 0
        ? Math.round(latest.bearing)
        : null;

    // If velocity sensor reported 0 or null, compute real ground speed from the two latest GPS fixes
    if ((speedKmh === null || speedKmh === 0) && rows.length >= 2) {
      const p0 = rows[0];
      const p1 = rows[1];
      if (
        typeof p0.lat === "number" &&
        typeof p0.lon === "number" &&
        typeof p1.lat === "number" &&
        typeof p1.lon === "number" &&
        p0.recorded_at_time &&
        p1.recorded_at_time
      ) {
        const dtHours =
          Math.abs(Date.parse(p0.recorded_at_time) - Date.parse(p1.recorded_at_time)) / 3_600_000;
        const distKm = haversineKm(p1.lat, p1.lon, p0.lat, p0.lon);
        if (dtHours > 0.0005 && dtHours < 0.25 && distKm > 0.005) {
          const calcSpeed = Math.round(distKm / dtHours);
          if (calcSpeed >= 0 && calcSpeed <= 125) speedKmh = calcSpeed;
        }
        if (bearing === null && distKm > 0.005) {
          bearing = computeBearing(p1.lat, p1.lon, p0.lat, p0.lon);
        }
      }
    }

    const scheduledStart = latest.siri_ride__scheduled_start_time
      ? new Date(latest.siri_ride__scheduled_start_time).toLocaleTimeString("ar-u-nu-latn", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Jerusalem",
        })
      : null;

    const distanceTraveledKm =
      typeof latest.distance_from_journey_start === "number" && latest.distance_from_journey_start > 0
        ? Number((latest.distance_from_journey_start / 1000).toFixed(1))
        : null;

    return { speedKmh, bearing, scheduledStart, distanceTraveledKm };
  } catch {
    return { speedKmh: null, bearing: null, scheduledStart: null, distanceTraveledKm: null };
  }
}


const BUSES_PAGE_CITY_CARDS = [
  { line: "1", realLine: "1", from: "حي السلام", to: "الخزان / حطين", freq: "كل 20 د" },
  { line: "2", realLine: "2", from: "حي السلام (الدفيئات)", to: "الخضر / حي 31", freq: "كل 20 د" },
  { line: "3", realLine: "3", from: "محطة تافوح / السلام", to: "رفح / البوئي", freq: "كل 25 د" },
  { line: "4 / 4أ", realLine: "4", from: "المدينة المنورة", to: "الحديقة العامة", freq: "كل 20 د" },
  { line: "5", realLine: "5", from: "حي صلاح الدين", to: "مدرسة الهدى (دائري)", freq: "كل 30 د" },
  { line: "6", realLine: "6", from: "المدينة المنورة", to: "حي صلاح الدين", freq: "كل 30 د" },
];

const BUSES_PAGE_EMERGENCY_FULL = [
  { name: "الشرطة", sub: "طوارئ الأمن", phone: "100", icon: "🚔" },
  { name: "الإسعاف (نجمة داود)", sub: "طوارئ طبية", phone: "101", icon: "🚑" },
  { name: "الإطفاء والإنقاذ", sub: "حرائق وإنقاذ", phone: "102", icon: "🚒" },
  { name: "طوارئ بلدية رهط", sub: "الموكيد البلدي 24/7", phone: "106", icon: "🏛️" },
  { name: "طوارئ الكهرباء", sub: "أعطال الكهرباء", phone: "103", icon: "⚡" },
  { name: "الجبهة الداخلية", sub: "تعليمات الطوارئ", phone: "104", icon: "🛡️" },
  { name: "اتحاد الإنقاذ", sub: "איחוד הצלה", phone: "1221", icon: "🩺" },
  { name: "الطوارئ الموحّد", sub: "خط الطوارئ العام", phone: "112", icon: "🆘" },
  { name: "بدالة بلدية رهط", sub: "مكاتب البلدية", phone: "08-9914800", icon: "📞" },
  { name: "استعلامات باصات غاليم", sub: "شركة גלים", phone: "08-6688700", icon: "🚌" },
];

function BusesPage() {
  const { now: serverNow } = Route.useLoaderData();
  const { line: urlLine } = Route.useSearch();
  const [now, setNow] = useState(serverNow);
  const [scopeFilter, setScopeFilter] = useState<"all" | "city" | "between">("all");
  const [hubTab, setHubTab] = useState<"city" | "intercity" | "emergency">(() => {
    if (urlLine && !["1", "2", "3", "4", "5", "6"].includes(urlLine)) return "intercity";
    return "city";
  });
  const [editingDriver, setEditingDriver] = useState(false);
  const [customDriverInput, setCustomDriverInput] = useState("");
  const [driverVer, setDriverVer] = useState(0);
  const [selectedLine, setSelectedLine] = useState<string>(() => {
    if (urlLine && busLines.some((l) => l.number === urlLine)) return urlLine;
    return busLines[0]?.number ?? "1";
  });

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

  const [vehicles, setVehicles] = useState<EnrichedVehicle[]>([]);
  const [selectedVehicleRef, setSelectedVehicleRef] = useState<string>("");
  const [activeLinesMap, setActiveLinesMap] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [lastUpdatedMs, setLastUpdatedMs] = useState<number>(serverNow);

  // Store previous GPS coordinates per vehicle_ref to calculate live delta speed & bearing
  const prevGpsRef = useRef<
    Map<string, { lat: number; lon: number; atMs: number; speedKmh: number; bearing: number | null }>
  >(new Map());

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const routeLayerRef = useRef<LayerGroup | null>(null);
  const busLayerRef = useRef<LayerGroup | null>(null);
  const meLayerRef = useRef<LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isWazeFullscreen, setIsWazeFullscreen] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [nearestStopCode, setNearestStopCode] = useState<string>("");
  const [nearestStopDistM, setNearestStopDistM] = useState<number | null>(null);
  const mapCardSectionRef = useRef<HTMLElement | null>(null);

  const toggleWazeFullscreen = useCallback((nextVal?: boolean) => {
    setIsWazeFullscreen((prev) => {
      const target = typeof nextVal === "boolean" ? nextVal : !prev;
      if (typeof document !== "undefined") {
        if (target && document.documentElement.requestFullscreen) {
          void document.documentElement.requestFullscreen().catch(() => {});
        } else if (!target && document.fullscreenElement && document.exitFullscreen) {
          void document.exitFullscreen().catch(() => {});
        }
      }
      return target;
    });
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const t1 = setTimeout(() => mapRef.current?.invalidateSize(), 60);
    const t2 = setTimeout(() => mapRef.current?.invalidateSize(), 280);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isWazeFullscreen]);

  useEffect(() => {
    setNow(Date.now());
    const clockId = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(clockId);
  }, []);

  const filteredLines = useMemo(
    () =>
      scopeFilter === "all"
        ? busLines
        : busLines.filter((l) => l.scope === scopeFilter),
    [scopeFilter],
  );

  // Scan key central Rahat stops to highlight which lines have live buses right now
  const scanActiveRahatLines = useCallback(async () => {
    const hubStops = ["15461", "15455", "15482", "13112"];
    try {
      const results = await Promise.allSettled(
        hubStops.map((s) => getStopLive({ data: { stop: s } })),
      );
      const counts: Record<string, Set<string>> = {};
      for (const r of results) {
        if (r.status !== "fulfilled" || !r.value.ok) continue;
        for (const v of r.value.vehicles) {
          if (!counts[v.line]) counts[v.line] = new Set();
          counts[v.line].add(v.ref);
        }
      }
      const nextMap: Record<string, number> = {};
      for (const [ln, set] of Object.entries(counts)) {
        if (set.size > 0) nextMap[ln] = set.size;
      }
      setActiveLinesMap((prev) => ({ ...prev, ...nextMap }));
    } catch {
      /* ignore background scan errors */
    }
  }, []);

  useEffect(() => {
    void scanActiveRahatLines();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void scanActiveRahatLines();
    }, 30_000);
    return () => clearInterval(id);
  }, [scanActiveRahatLines]);

  const computeNearestStopForDir = useCallback(
    (lat: number, lon: number, dirObj: NonNullable<ReturnType<typeof lineInfo>>["dirs"][number] | undefined) => {
      if (!dirObj) return;
      let best = "";
      let bestKm = Infinity;
      for (const [code] of dirObj.stops) {
        const s = busSchedule.stops[code];
        if (!s) continue;
        const km = haversineKm(lat, lon, s.lat, s.lon);
        if (km < bestKm) {
          bestKm = km;
          best = code;
        }
      }
      if (best) {
        setNearestStopCode(best);
        setNearestStopDistM(Math.round(bestKm * 1000));
        setSelectedStop(best);
      }
    },
    [],
  );

  const handleSelectLine = (lineNum: string) => {
    const nextInfo = lineInfo(lineNum);
    const firstDir = nextInfo?.dirs[0];
    setSelectedLine(lineNum);
    setDir(firstDir?.dir ?? "1");
    setSelectedStop(firstDir?.stops[0]?.[0] ?? "");
    setSelectedVehicleRef("");
    setStopArrivals(null);
    if (userCoords && firstDir) {
      computeNearestStopForDir(userCoords.lat, userCoords.lon, firstDir);
    } else if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setUserCoords(c);
          computeNearestStopForDir(c.lat, c.lon, firstDir);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8_000 },
      );
    }
    setTimeout(() => {
      mapCardSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
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

        if (path.length > 0) {
          const poly = Lf.polyline(path, {
            color: "#111827",
            weight: 5,
            opacity: 0.88,
          }).addTo(routeLayerRef.current);

          for (const [i, x] of stopPts.entries()) {
            const isSelected = x.code === selectedStop;
            const isNear = x.code === nearestStopCode;
            const stopArrs = plannedArrivals(Date.now(), selectedLine, currentDir.dir, x.code, 3);
            const nextTimes = stopArrs.map((a) => `${a.time} (${minutesLabel(a.inMin)})`);
            Lf.marker([x.s.lat, x.s.lon], {
              icon: createBusStopDivIcon(Lf, {
                index: i,
                total: stopPts.length,
                code: x.code,
                name: stopName(x.code),
                isSelected,
                isNearest: isNear,
              }),
              zIndexOffset: isSelected ? 900 : 200,
            })
              .addTo(routeLayerRef.current)
              .bindTooltip(`🚏 ${i + 1}. ${stopName(x.code)}`, { direction: "top" })
              .bindPopup(
                buildBusStopPopupHtml({
                  index: i,
                  code: x.code,
                  name: stopName(x.code),
                  line: selectedLine,
                  nextTimes,
                  isNearest: isNear,
                }),
                { maxWidth: 280 },
              )
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

  // Enrich raw SIRI vehicles with real license plate, live speed (km/h), bearing, next stop & ETA
  const enrichVehicles = useCallback(
    async (rawList: RawVehicle[]): Promise<EnrichedVehicle[]> => {
      const nowMs = Date.now();
      const dirStops = (currentDir?.stops ?? [])
        .map(([code, offset]) => ({ code, offset, s: busSchedule.stops[code] }))
        .filter((x) => Boolean(x.s));

      const enriched = await Promise.all(
        rawList.map(async (v) => {
          const atMs = Date.parse(v.at) || nowMs;
          const prev = prevGpsRef.current.get(v.ref);

          // 1. Compute speed & bearing from consecutive GPS pings if position changed
          let deltaSpeedKmh: number | null = null;
          let deltaBearing: number | null = prev?.bearing ?? null;
          if (prev) {
            const distKm = haversineKm(prev.lat, prev.lon, v.lat, v.lon);
            const dtHours = Math.abs(atMs - prev.atMs) / 3_600_000;
            if (distKm > 0.005 && dtHours > 0.0005 && dtHours < 0.25) {
              const s = Math.round(distKm / dtHours);
              if (s >= 0 && s <= 125) deltaSpeedKmh = s;
              deltaBearing = computeBearing(prev.lat, prev.lon, v.lat, v.lon);
            } else if (distKm <= 0.005 && Math.abs(nowMs - prev.atMs) < 45_000) {
              deltaSpeedKmh = prev.speedKmh;
            }
          }

          // 2. Query OpenBus Stride SIRI API for official sensor velocity & trip metadata
          const stride = await fetchStrideVehicleTelemetry(v.ref);

          // 3. Determine closest/upcoming stop on the route & distance in meters
          let closestIdx = 0;
          let minDistKm = Infinity;
          for (let i = 0; i < dirStops.length; i++) {
            const dKm = haversineKm(v.lat, v.lon, dirStops[i].s.lat, dirStops[i].s.lon);
            if (dKm < minDistKm) {
              minDistKm = dKm;
              closestIdx = i;
            }
          }
          const nextIdx = Math.min(dirStops.length - 1, closestIdx + (minDistKm < 0.08 ? 1 : 0));
          const nextStop = dirStops[nextIdx] ?? dirStops[0];
          const distToNextKm = nextStop
            ? haversineKm(v.lat, v.lon, nextStop.s.lat, nextStop.s.lon)
            : null;
          const distToNextStopM =
            distToNextKm !== null ? Math.max(10, Math.round(distToNextKm * 1000)) : null;

          // Final real speed in km/h (prefer Stride sensor velocity, then GPS delta speed)
          const finalSpeedKmh =
            stride.speedKmh !== null && stride.speedKmh > 0
              ? stride.speedKmh
              : deltaSpeedKmh !== null
                ? deltaSpeedKmh
                : stride.speedKmh ?? 0;

          const finalBearing = stride.bearing ?? deltaBearing;

          prevGpsRef.current.set(v.ref, {
            lat: v.lat,
            lon: v.lon,
            atMs,
            speedKmh: finalSpeedKmh,
            bearing: finalBearing,
          });

          const effectiveSpeedForEta = Math.max(18, finalSpeedKmh || 28);
          const etaMinutes =
            distToNextKm !== null
              ? Math.max(0, Math.round((distToNextKm / effectiveSpeedForEta) * 60))
              : null;

          return {
            ...v,
            plateFormatted: formatLicensePlate(v.ref),
            speedKmh: finalSpeedKmh,
            bearing: finalBearing,
            compassAr: compassLabelAr(finalBearing),
            nextStopCode: nextStop?.code ?? "",
            nextStopName: nextStop ? stopName(nextStop.code) : tr("على مسار الخط"),
            distToNextStopM,
            etaMinutes,
            scheduledStart: stride.scheduledStart,
            distanceTraveledKm: stride.distanceTraveledKm,
            signalAgeSec: Math.max(1, Math.round((nowMs - atMs) / 1000)),
            operatorName: tr("شركة غاليم (Galim · مشغّل 23)"),
          };
        }),
      );

      return enriched;
    },
    [currentDir],
  );

  // Fetch live vehicles for the selected line every 10s
  const refreshVehicles = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await getLineVehicles({ data: { line: selectedLine } });
      const enriched = await enrichVehicles(res.vehicles);
      setVehicles(enriched);
      setActiveLinesMap((prev) => ({
        ...prev,
        [selectedLine]: enriched.length,
      }));
      setSelectedVehicleRef((prev) =>
        enriched.some((v) => v.ref === prev) ? prev : (enriched[0]?.ref ?? ""),
      );
      setStatus(res.ok ? "ok" : "error");
      setLastUpdatedMs(res.now || Date.now());
    } catch {
      setStatus("error");
    }
  }, [selectedLine, enrichVehicles]);

  useEffect(() => {
    void refreshVehicles();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void refreshVehicles();
    }, 10_000);
    return () => clearInterval(id);
  }, [refreshVehicles]);

  const activeVehicle = useMemo(
    () => vehicles.find((v) => v.ref === selectedVehicleRef) ?? vehicles[0] ?? null,
    [vehicles, selectedVehicleRef],
  );

  // Build map bus marker items (real SIRI vehicles, or scheduled fallback bus so the Bus Icon is ALWAYS visible)
  const mapBusMarkerItems = useMemo<BusVehicleMarkerInfo[]>(() => {
    void driverVer;
    const fromName = meta ? trv(meta.from) : currentDir ? stopName(currentDir.from) : "";
    const toName = meta ? trv(meta.to) : currentDir ? stopName(currentDir.to) : "";
    const nearName = nearestStopCode ? stopName(nearestStopCode) : selectedStop ? stopName(selectedStop) : "";

    if (vehicles.length > 0) {
      return vehicles.map((v) => {
        const drv = getBusDriverDetails(selectedLine, v.ref);
        return {
          line: selectedLine,
          ref: v.ref,
          plate: v.plateFormatted,
          driverName: drv.driverName,
          driverRole: drv.driverRole,
          fromName,
          toName,
          speedKmh: v.speedKmh,
          compassAr: v.compassAr,
          nextStopName: v.nextStopName,
          nextStopCode: v.nextStopCode,
          distToNextStopM: v.distToNextStopM,
          etaText: v.etaMinutes !== null ? minutesLabel(v.etaMinutes) : "على المسار",
          nearestStopName: nearName,
          scheduledStart: v.scheduledStart,
          nextDepartureTime: v.scheduledStart,
          isLiveSiri: true,
          isSelected: activeVehicle?.ref === v.ref,
          lat: v.lat,
          lon: v.lon,
          updatedAtText: new Date(v.at).toLocaleTimeString("ar-u-nu-latn", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZone: "Asia/Jerusalem",
          }),
        };
      });
    }

    if (!currentDir) return [];
    const planned = selectedStop
      ? plannedArrivals(now, selectedLine, currentDir.dir, selectedStop, 3)
      : [];
    const fb = buildScheduledFallbackBus({
      line: selectedLine,
      fromName,
      toName,
      stops: currentDir.stops,
      nextPlanned: planned,
      nearestStopName: nearName,
      nowMs: now,
    });
    return fb ? [fb] : [];
  }, [vehicles, activeVehicle, selectedLine, meta, currentDir, nearestStopCode, selectedStop, now, driverVer]);

  // Render clear Bus Icon markers on the Leaflet map with Popup & full Driver/Vehicle Info on click
  useEffect(() => {
    const Lf = LRef.current;
    if (!mapReady || !Lf || !busLayerRef.current) return;
    busLayerRef.current.clearLayers();
    for (const bInfo of mapBusMarkerItems) {
      const marker = Lf.marker([bInfo.lat, bInfo.lon], {
        icon: createLiveBusDivIcon(Lf, bInfo),
        zIndexOffset: bInfo.isSelected ? 2200 : 1400,
      })
        .addTo(busLayerRef.current)
        .bindPopup(buildLiveBusPopupHtml(bInfo), { maxWidth: 320 })
        .on("click", () => {
          setSelectedVehicleRef(bInfo.ref);
          setCustomDriverInput(bInfo.driverName);
          mapRef.current?.setView([bInfo.lat, bInfo.lon], 16, { animate: true });
        });
      void marker;
    }
  }, [mapBusMarkerItems, mapReady]);

  const activeDriverDetails = useMemo(() => {
    void driverVer;
    return getBusDriverDetails(selectedLine, activeVehicle?.ref);
  }, [selectedLine, activeVehicle?.ref, driverVer]);

  const handleSaveDriverOnBusesPage = () => {
    if (!customDriverInput.trim()) return;
    try {
      const raw = window.localStorage.getItem("rp_bus_drivers");
      const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      if (activeVehicle?.ref) map[activeVehicle.ref] = customDriverInput.trim();
      map[`line_${selectedLine}`] = customDriverInput.trim();
      window.localStorage.setItem("rp_bus_drivers", JSON.stringify(map));
      setDriverVer((v) => v + 1);
      setEditingDriver(false);
    } catch {
      setEditingDriver(false);
    }
  };

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

  const locateMe = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setUserCoords({ lat, lon });
        const Lf = LRef.current;
        if (Lf && meLayerRef.current && mapRef.current) {
          meLayerRef.current.clearLayers();
          const p: [number, number] = [lat, lon];
          Lf.circleMarker(p, {
            radius: 10,
            color: "#ffffff",
            weight: 3,
            fillColor: "#1a73e8",
            fillOpacity: 1,
          })
            .addTo(meLayerRef.current)
            .bindTooltip(tr("موقعك الجغرافي الحالي"), { permanent: false, direction: "top" });
          mapRef.current.setView(p, 15, { animate: true });
        }
        computeNearestStopForDir(lat, lon, currentDir);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, [currentDir, computeNearestStopForDir]);

  useEffect(() => {
    if (mapReady) {
      locateMe();
    }
  }, [mapReady, locateMe]);

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

  const otherActiveLines = Object.entries(activeLinesMap).filter(
    ([ln, count]) => count > 0 && ln !== selectedLine,
  );

  return (
    <Shell>
      {/* Header Bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary text-ink shadow-2xs">
            <Bus className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-xl font-extrabold sm:text-2xl">
              {tr("باصات رهط والنقب · التتبع المباشر وبيانات المركبة")}
            </h1>
            <p className="text-xs font-semibold text-muted">
              {tr("بيانات حقيقية ومباشرة من نظام SIRI في وزارة المواصلات: لوحة الترخيص، السرعة، والموقع الحي")}
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

      {/* 1. ALWAYS-EXPANDED GALIM BUSES CARD (مطابق تماماً لتصميم الصفحة الرئيسية 147613.jpg) */}
      <section
        className="stamp overflow-hidden border-2 border-primary/75 bg-gradient-to-b from-primary-soft/50 via-paper to-paper p-3.5 sm:p-4 shadow-sm"
        aria-label={tr("قائمة خطوط باصات غاليم في رهط والنقب")}
      >
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span
              className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-xl text-ink shadow-2xs"
              aria-hidden
            >
              <Bus className="size-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-extrabold text-ink sm:text-base">
                  {tr("خطوط باصات غاليم (גלים) — رهط والنقب")}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#16A34A]/15 px-2.5 py-0.5 text-[11px] font-extrabold text-[#15803D]">
                  <span className="size-1.5 rounded-full bg-[#16A34A] animate-ping" />
                  {tr("مباشر · اضغط على رقم الخط لفتح الخريطة الحية")}
                </span>
              </div>
              <p className="text-xs font-semibold text-muted">
                {tr("اضغط على أي رقم باص بالأسفل لإظهار الخريطة الحقيقية وأقرب محطة لموقعك والباص في نفس الوقت")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setHubTab((prev) => (prev === "intercity" ? "city" : "intercity"))
              }
              className="press inline-flex items-center gap-1.5 rounded-2xl bg-ink px-3 py-2 text-xs font-extrabold text-paper shadow-2xs transition hover:opacity-90"
            >
              <span>🗺️ {hubTab === "intercity" ? tr("خطوط داخل رهط") : tr("كل الخطوط")}</span>
            </button>
          </div>
        </div>

        {/* Always Expanded 3 Rounded-Square Category Tabs + Bus Line Cards */}
        <div className="mt-3.5 space-y-3">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[
              { id: "city" as const, icon: "🚌", title: "خطوط داخل رهط", sub: "خطوط 1–6 بالأحياء" },
              { id: "intercity" as const, icon: "🛣️", title: "بئر السبع والنقب", sub: "سوروكا والبلدات" },
              { id: "emergency" as const, icon: "🚨", title: "طوارئ رهط", sub: "اتصال سريع 24/7" },
            ].map((cat) => {
              const isCat = hubTab === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setHubTab(cat.id)}
                  className={`press flex flex-col items-center justify-center gap-1 rounded-2xl border p-2.5 text-center transition-all ${
                    isCat
                      ? cat.id === "emergency"
                        ? "border-alert bg-alert text-white shadow-md"
                        : "border-ink bg-primary text-ink shadow-md ring-2 ring-ink/15"
                      : "border-line bg-paper text-ink hover:border-primary shadow-2xs"
                  }`}
                >
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-2xl text-xl shadow-2xs ${
                      isCat ? "bg-white/25" : "bg-primary-soft"
                    }`}
                    aria-hidden
                  >
                    {cat.icon}
                  </span>
                  <span className="line-clamp-1 text-xs font-extrabold sm:text-sm">
                    {trv(cat.title)}
                  </span>
                  <span
                    className={`line-clamp-1 text-[10px] font-bold ${
                      isCat
                        ? cat.id === "emergency"
                          ? "text-white/85"
                          : "text-ink/80"
                        : "text-muted"
                    }`}
                  >
                    {trv(cat.sub)}
                  </span>
                </button>
              );
            })}
          </div>

          {hubTab === "emergency" ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {BUSES_PAGE_EMERGENCY_FULL.map((em) => (
                <a
                  key={em.phone}
                  href={`tel:${em.phone}`}
                  className="press flex items-center justify-between gap-2 rounded-2xl border border-line bg-paper p-2.5 text-ink transition hover:border-primary"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-extrabold">
                      {em.icon} {trv(em.name)}
                    </span>
                    <span className="block truncate text-[10px] font-semibold text-muted">
                      {trv(em.sub)}
                    </span>
                  </span>
                  <span
                    dir="ltr"
                    className="shrink-0 rounded-xl bg-primary-soft px-2 py-1 font-mono text-xs font-extrabold text-primary-ink"
                  >
                    {em.phone}
                  </span>
                </a>
              ))}
            </div>
          ) : hubTab === "city" ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {BUSES_PAGE_CITY_CARDS.map((b) => {
                const isSelectedLine = selectedLine === b.realLine;
                const liveCount = activeLinesMap[b.realLine] ?? 0;
                return (
                  <button
                    key={b.line}
                    type="button"
                    onClick={() => handleSelectLine(b.realLine)}
                    className={`press relative flex items-center gap-2.5 rounded-2xl border p-2.5 text-start transition-all ${
                      isSelectedLine
                        ? "border-2 border-ink bg-primary/30 text-ink shadow-md ring-2 ring-primary"
                        : "border-line bg-paper text-ink hover:border-primary shadow-2xs"
                    }`}
                  >
                    {liveCount > 0 ? (
                      <span
                        title={tr("{0} باص مباشر الآن", liveCount)}
                        className="absolute top-1.5 start-1.5 size-2.5 animate-pulse rounded-full bg-emerald-600 ring-2 ring-paper"
                      />
                    ) : null}
                    <span
                      className={`grid size-12 shrink-0 place-items-center rounded-2xl font-mono text-sm font-black shadow-2xs ${
                        isSelectedLine ? "bg-ink text-primary" : "bg-primary text-ink"
                      }`}
                    >
                      {b.line}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-extrabold">
                        {trv(b.from)} ↔ {trv(b.to)}
                      </span>
                      <span
                        className={`mt-0.5 block truncate text-[11px] font-bold ${
                          isSelectedLine ? "text-emerald-800" : "text-muted"
                        }`}
                      >
                        {isSelectedLine ? "🗺️ الخريطة الحية مفتوحة ▼" : `🕒 ${trv(b.freq)} · اضغط للخريطة`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {busLines
                .filter((l) => l.scope !== "city")
                .map((l) => {
                  const isSelectedLine = selectedLine === l.number;
                  const liveCount = activeLinesMap[l.number] ?? 0;
                  return (
                    <button
                      key={l.number}
                      type="button"
                      onClick={() => handleSelectLine(l.number)}
                      className={`press relative flex items-center gap-2.5 rounded-2xl border p-2.5 text-start transition-all ${
                        isSelectedLine
                          ? "border-2 border-ink bg-primary/30 text-ink shadow-md ring-2 ring-primary"
                          : "border-line bg-paper text-ink hover:border-primary shadow-2xs"
                      }`}
                    >
                      {liveCount > 0 ? (
                        <span
                          title={tr("{0} باص مباشر الآن", liveCount)}
                          className="absolute top-1.5 start-1.5 size-2.5 animate-pulse rounded-full bg-emerald-600 ring-2 ring-paper"
                        />
                      ) : null}
                      <span
                        className={`grid size-12 shrink-0 place-items-center rounded-2xl font-mono text-sm font-black shadow-2xs ${
                          isSelectedLine ? "bg-ink text-primary" : "bg-primary text-ink"
                        }`}
                      >
                        {l.number}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-extrabold">
                          {trv(l.from)} ↔ {trv(l.to)}
                        </span>
                        <span
                          className={`mt-0.5 block truncate text-[11px] font-bold ${
                            isSelectedLine ? "text-emerald-800" : "text-muted"
                          }`}
                        >
                          {isSelectedLine ? "🗺️ الخريطة الحية مفتوحة ▼" : "🕒 اضغط لإظهار الخريطة الحية"}
                        </span>
                      </span>
                    </button>
                  );
                })}
            </div>
          )}

          {/* Quick Emergency Strip inside Buses Card */}
          {hubTab !== "emergency" ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line/80 bg-surface/80 px-3 py-2 text-xs text-ink">
              <span className="font-extrabold">
                🚨 {tr("طوارئ رهط السريعة:")}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: "الشرطة", phone: "100" },
                  { label: "الإسعاف", phone: "101" },
                  { label: "الإطفاء", phone: "102" },
                  { label: "بلدية رهط", phone: "106" },
                  { label: "الكهرباء", phone: "103" },
                  { label: "إنقاذ", phone: "1221" },
                ].map((em) => (
                  <a
                    key={em.phone}
                    href={`tel:${em.phone}`}
                    className="press inline-flex items-center gap-1 rounded-xl border border-line bg-paper px-2 py-1 text-[11px] font-extrabold text-ink transition hover:border-primary"
                  >
                    <span>{trv(em.label)}</span>
                    <span dir="ltr" className="text-primary-ink">
                      {em.phone}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <p className="text-[10.5px] font-semibold text-muted">
            © {tr("جميع حقوق الجداول والمسارات الرسمية محفوظة لشركة غاليم (גלים) ووزارة المواصلات (bus.gov.il) وخرائط OpenStreetMap.")}
          </p>
        </div>
      </section>

      {/* 2. LIVE INTERACTIVE MAP & REAL-TIME BUS TELEMETRY CARD */}
      <section
        ref={mapCardSectionRef}
        className="stamp mt-4 overflow-hidden border-2 border-primary/80 p-0 shadow-md"
        aria-label={tr("الخريطة المباشرة للخط")}
      >
        {/* TOP NEAREST STOP & GEOGRAPHIC LOCATION BAR (في الأعلى أقرب محطة بالاسم + الوقت الحقيقي) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/40 bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] px-3.5 py-2.5 text-white">
          <button
            type="button"
            onClick={() => {
              const targetCode = nearestStopCode || selectedStop;
              if (targetCode) focusStopOnMap(targetCode);
              else locateMe();
            }}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-start transition hover:opacity-90"
            title={tr("اضغط لتكبير الخريطة على أقرب محطة وموقع الباص في نفس الوقت")}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-base font-black text-[#111827] shadow-2xs">
              📍
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-black text-emerald-300">
                  {userCoords ? tr("أقرب محطة لموقعك الجغرافي:") : tr("المحطة المختارة على المسار:")}
                </span>
                {nearestStopDistM !== null ? (
                  <span className="text-[10px] font-extrabold text-primary">
                    ({nearestStopDistM < 1000 ? `${nearestStopDistM} متر` : `${(nearestStopDistM / 1000).toFixed(1)} كم`})
                  </span>
                ) : null}
              </div>
              <p className="truncate text-xs font-black text-white sm:text-sm">
                🚏 {stopName(nearestStopCode || selectedStop || currentDir?.stops[0]?.[0] || "")}
              </p>
            </div>
          </button>

          {/* Real-Time Clock & Instant Bus Arrival Badge */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="rounded-xl border border-white/15 bg-white/10 px-2.5 py-1 text-end">
              <span className="block text-[9px] font-bold text-white/75">{tr("الوقت الحقيقي الآن")}</span>
              <span className="font-mono text-xs font-black text-primary" dir="ltr">
                {new Date(now).toLocaleTimeString("ar-u-nu-latn", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                  timeZone: "Asia/Jerusalem",
                })}
              </span>
            </div>
            <button
              type="button"
              onClick={locateMe}
              className="grid size-9 place-items-center rounded-xl bg-primary text-[#111827] shadow-xs transition hover:brightness-105"
              title={tr("تحديد موقعي الجغرافي وأقرب محطة")}
            >
              <LocateFixed className="size-4" />
            </button>
          </div>
        </div>

        {/* Map Header: Line Route + Direction Switcher + Instant Live Bus Status */}
        <div className="border-b border-line bg-paper p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary font-mono text-base font-black text-ink shadow-2xs">
                {trv(selectedLine)}
              </span>
              <div>
                <h2 className="text-sm font-extrabold sm:text-base">
                  {meta ? `${trv(meta.from)} ↔ ${trv(meta.to)}` : `${tr("خط")} ${trv(selectedLine)}`}
                </h2>
                <p className="text-xs font-bold text-emerald-700">
                  {activeVehicle
                    ? `🚌 الباص في نفس الوقت عند: ${activeVehicle.nextStopName} · السرعة ${activeVehicle.speedKmh} كم/س · يصل خلال ${activeVehicle.etaMinutes ?? 2} د`
                    : stopPlanned.length > 0
                      ? `🕒 الانطلاق/الوصول الحقيقي القادم لمحطة ${stopName(selectedStop)}: الساعة ${stopPlanned[0].time} (${minutesLabel(stopPlanned[0].inMin)})`
                      : status === "loading"
                        ? tr("جاري الاتصال بنظام وزارة المواصلات (SIRI) لجلب موقع الباص في نفس الوقت…")
                        : tr("اضغط على أي محطة على الخريطة لعرض موعد الباص في نفس الوقت")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={locateMe}
                className="btn btn-ghost rounded-xl px-2.5 py-1.5 text-xs font-extrabold"
                title={tr("موقعي وأقرب محطة")}
              >
                <LocateFixed className="size-4" aria-hidden />
                {tr("أقرب محطة لي")}
              </button>
              <button
                type="button"
                onClick={() => void refreshVehicles()}
                className="btn btn-ghost rounded-xl px-2.5 py-1.5 text-xs"
                title={tr("تحديث بيانات الباص المباشرة")}
              >
                <RefreshCw className={`size-4 ${status === "loading" ? "animate-spin" : ""}`} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => toggleWazeFullscreen(true)}
                className="btn rounded-xl bg-ink px-3 py-1.5 text-xs font-extrabold text-paper shadow-2xs"
                title={tr("ملء الشاشة الكامل مثل Waze")}
              >
                <Maximize2 className="size-4" aria-hidden />
                <span>{tr("ملء الشاشة")}</span>
              </button>
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

        {/* Large Clear Leaflet Live Map Container (Supports Waze Fullscreen) */}
        <div
          className={
            isWazeFullscreen
              ? "fixed inset-0 z-[9999] h-[100dvh] w-[100dvw] bg-[#0f172a]"
              : "relative h-[460px] w-full sm:h-[540px]"
          }
        >
          <div ref={mapEl} className="absolute inset-0 z-10" dir="ltr" />

          {!isWazeFullscreen ? (
            <>
              <div className="pointer-events-none absolute start-3 top-3 z-20 rounded-xl bg-paper/95 px-3 py-1.5 text-xs font-extrabold shadow-md">
                🚌 {tr("خط")} {trv(selectedLine)} · {currentDir ? `${tr("إلى")} ${stopName(currentDir.to)}` : ""}
              </div>
              <button
                type="button"
                onClick={() => toggleWazeFullscreen(true)}
                className="absolute end-3 top-3 z-20 flex items-center gap-1.5 rounded-xl bg-ink/90 px-3 py-1.5 text-xs font-extrabold text-paper shadow-lg backdrop-blur-xs transition hover:bg-ink"
              >
                <Maximize2 className="size-3.5" />
                <span>{tr("تكبير الخريطة (Waze)")}</span>
              </button>
            </>
          ) : (
            <>
              {/* WAZE-STYLE FLOATING TOP NAVIGATION HUD */}
              <div className="pointer-events-none absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30 flex flex-col gap-2">
                <div className="pointer-events-auto flex items-center justify-between gap-2 rounded-2xl border border-white/15 bg-[#0f172a]/95 p-2.5 text-white shadow-2xl backdrop-blur-md">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary font-mono text-base font-black text-[#111827] shadow-md">
                      {selectedLine}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-primary">
                        📍 {tr("أقرب محطة:")} {stopName(nearestStopCode || selectedStop || currentDir?.stops[0]?.[0] || "")}
                      </p>
                      <p className="truncate text-[11px] font-bold text-emerald-400">
                        {activeVehicle
                          ? `🟢 باص نشط (${activeVehicle.plateFormatted}) · المحطة القادمة: ${activeVehicle.nextStopName}`
                          : stopPlanned.length > 0
                            ? `🕒 الباص القادم الساعة ${stopPlanned[0].time} (${minutesLabel(stopPlanned[0].inMin)})`
                            : `🚌 مسار خط ${selectedLine} المباشر`}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleWazeFullscreen(false)}
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-red-600"
                    title={tr("إغلاق ملء الشاشة")}
                  >
                    <Minimize2 className="size-5" />
                  </button>
                </div>

                {/* Floating Line Icons in Waze Mode */}
                <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {busLines.map((ln) => (
                    <button
                      key={ln.number}
                      type="button"
                      onClick={() => handleSelectLine(ln.number)}
                      className={`shrink-0 rounded-xl px-3 py-1.5 font-mono text-xs font-black shadow-md transition ${
                        selectedLine === ln.number
                          ? "bg-primary text-[#0f172a] ring-2 ring-white"
                          : "bg-[#0f172a]/85 text-white/90 border border-white/15"
                      }`}
                    >
                      خط {ln.number}
                    </button>
                  ))}
                </div>
              </div>

              {/* WAZE-STYLE FLOATING RIGHT CONTROLS */}
              <div className="pointer-events-auto absolute end-3 bottom-32 z-30 flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={locateMe}
                  className="grid size-12 place-items-center rounded-2xl border border-white/20 bg-[#0f172a]/90 text-white shadow-2xl backdrop-blur-md"
                  title={tr("موقعي وأقرب محطة")}
                >
                  <LocateFixed className="size-5 text-sky-400" />
                </button>
                <button
                  type="button"
                  onClick={() => void refreshVehicles()}
                  className="grid size-12 place-items-center rounded-2xl border border-white/20 bg-[#0f172a]/90 text-white shadow-2xl backdrop-blur-md"
                  title={tr("تحديث الرادار")}
                >
                  <RefreshCw className={`size-5 text-emerald-400 ${status === "loading" ? "animate-spin" : ""}`} />
                </button>
              </div>

              {/* WAZE-STYLE FLOATING BOTTOM SPEEDOMETER & REAL-TIME CARD */}
              <div className="pointer-events-none absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 flex items-end justify-between gap-3">
                <div className="pointer-events-auto flex size-20 shrink-0 flex-col items-center justify-center rounded-2xl border-4 border-primary bg-[#0f172a]/95 text-white shadow-2xl">
                  <span className="font-mono text-xl font-black leading-none text-primary">
                    {activeVehicle ? activeVehicle.speedKmh : 0}
                  </span>
                  <span className="mt-0.5 text-[10px] font-extrabold text-white/80">كم/س</span>
                </div>

                <div className="pointer-events-auto min-w-0 flex-1 rounded-2xl border border-white/15 bg-[#0f172a]/95 p-3 text-white shadow-2xl backdrop-blur-md">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-primary">
                        🚏 {stopName(selectedStop || nearestStopCode)}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] font-bold text-white/85">
                        {activeVehicle
                          ? `الباص IL ${activeVehicle.plateFormatted} · يصل خلال ${activeVehicle.etaMinutes ?? 2} د`
                          : stopPlanned.length > 0
                            ? `موعد الوصول الحقيقي: ${stopPlanned[0].time} (${minutesLabel(stopPlanned[0].inMin)})`
                            : "اضغط على أي محطة لعرض وقت الوصول الفوري"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleWazeFullscreen(false)}
                      className="shrink-0 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-extrabold text-white"
                    >
                      تصغير
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ==================== REAL-TIME BUS TELEMETRY DASHBOARD ==================== */}
        <div className="border-t border-line bg-paper p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-xl bg-emerald-500/15 text-emerald-700">
                <Radio className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-ink">
                  {tr("بيانات الباص المباشرة والحقيقية (نظام وزارة المواصلات SIRI)")}
                </h3>
                <p className="text-[11px] font-semibold text-muted">
                  {tr("تتحدث تلقائياً كل 10 ثوانٍ من جهاز الـ GPS المثبت في الباص")}
                </p>
              </div>
            </div>

            {vehicles.length > 1 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-muted">{tr("اختر الباص:")}</span>
                {vehicles.map((v, i) => (
                  <button
                    key={v.ref}
                    type="button"
                    onClick={() => {
                      setSelectedVehicleRef(v.ref);
                      mapRef.current?.setView([v.lat, v.lon], 16, { animate: true });
                    }}
                    className={`rounded-xl px-3 py-1 text-xs font-extrabold transition ${
                      activeVehicle?.ref === v.ref
                        ? "bg-ink text-paper shadow-xs"
                        : "border border-line bg-surface text-ink hover:bg-primary-soft"
                    }`}
                  >
                    🚌 {tr("باص")} {i + 1} ({v.plateFormatted})
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {activeVehicle ? (
            <div className="rounded-3xl border border-line bg-surface/60 p-4">
              {/* Top Row: Israeli License Plate Badge + Live Speed Gauge + Movement Status */}
              {/* Driver Info Banner (اسم السائق المناوب ومعلومات الحافلة) */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/60 bg-primary-soft/40 p-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-base font-black text-ink">
                    👨‍✈️
                  </span>
                  <div>
                    <span className="text-[11px] font-extrabold text-muted">
                      {tr("اسم السائق المناوب ومعلومات الطاقم:")}
                    </span>
                    {editingDriver ? (
                      <div className="mt-1 flex items-center gap-1.5">
                        <input
                          type="text"
                          value={customDriverInput}
                          onChange={(e) => setCustomDriverInput(e.target.value)}
                          placeholder={tr("اكتب اسم السائق...")}
                          className="rounded-lg border border-line bg-paper px-2.5 py-1 text-xs font-bold text-ink"
                        />
                        <button
                          type="button"
                          onClick={handleSaveDriverOnBusesPage}
                          className="rounded-lg bg-ink px-3 py-1 text-xs font-extrabold text-primary"
                        >
                          {tr("حفظ")}
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs font-black text-ink sm:text-sm">
                        {activeDriverDetails.driverName}{" "}
                        <span className="text-[11px] font-semibold text-muted">
                          ({activeDriverDetails.driverRole})
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCustomDriverInput(activeDriverDetails.driverName);
                    setEditingDriver((v) => !v);
                  }}
                  className="rounded-xl border border-line bg-paper px-2.5 py-1 text-[11px] font-extrabold text-ink hover:border-primary"
                >
                  ✏️ {editingDriver ? tr("إلغاء") : tr("تخصيص اسم السائق")}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Official License Plate */}
                <div className="flex flex-col justify-between rounded-2xl border border-line bg-paper p-3.5 shadow-2xs">
                  <span className="text-[11px] font-extrabold text-muted">
                    {tr("رقم لوحة الترخيص الحقيقي")}
                  </span>
                  <div className="mt-2 flex items-center justify-center">
                    <div
                      dir="ltr"
                      className="inline-flex w-full max-w-[210px] items-center justify-between overflow-hidden rounded-xl border-2 border-[#111827] bg-[#facc15] shadow-xs"
                    >
                      <span className="flex h-9 flex-col items-center justify-center bg-[#1d4ed8] px-2 text-[9px] font-black leading-none text-white">
                        <span>🇮🇱</span>
                        <span>IL</span>
                      </span>
                      <span className="flex-1 px-2 text-center font-mono text-base font-black tracking-wider text-[#111827]">
                        {activeVehicle.plateFormatted}
                      </span>
                    </div>
                  </div>
                  <span className="mt-1.5 text-[10px] font-bold text-muted">
                    {tr("معرّف المركبة الرسمي:")} <span dir="ltr">{activeVehicle.ref}</span>
                  </span>
                </div>

                {/* 2. Live Bus Speed (km/h) */}
                <div className="flex flex-col justify-between rounded-2xl border border-line bg-paper p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-muted">
                      {tr("سرعة الباص المباشرة")}
                    </span>
                    <Gauge className="size-4 text-primary-ink" />
                  </div>
                  <div className="my-1.5 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-ink" dir="ltr">
                      {activeVehicle.speedKmh}
                    </span>
                    <span className="text-xs font-extrabold text-muted">{tr("كم/ساعة")}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`size-2 rounded-full ${
                        activeVehicle.speedKmh > 3 ? "bg-emerald-600" : "bg-amber-500"
                      }`}
                    />
                    <span className="text-[11px] font-extrabold text-ink">
                      {activeVehicle.speedKmh > 3
                        ? tr("يتحرك الآن على المسار")
                        : tr("متوقف في محطة / إشارة")}
                    </span>
                  </div>
                </div>

                {/* 3. Next Stop & Distance / ETA */}
                <div className="flex flex-col justify-between rounded-2xl border border-line bg-paper p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-muted">
                      {tr("المحطة القادمة للباص")}
                    </span>
                    <MapPin className="size-4 text-[#DC2626]" />
                  </div>
                  <p className="my-1.5 truncate text-sm font-extrabold text-ink">
                    {activeVehicle.nextStopName}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] font-extrabold">
                    {activeVehicle.distToNextStopM !== null ? (
                      <span className="text-muted">
                        {activeVehicle.distToNextStopM >= 1000
                          ? `${(activeVehicle.distToNextStopM / 1000).toFixed(1)} ${tr("كم")}`
                          : `${activeVehicle.distToNextStopM} ${tr("متر")}`}
                      </span>
                    ) : null}
                    {activeVehicle.etaMinutes !== null ? (
                      <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-emerald-800">
                        {minutesLabel(activeVehicle.etaMinutes)}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* 4. Trip Metadata & Signal Freshness */}
                <div className="flex flex-col justify-between rounded-2xl border border-line bg-paper p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-muted">
                      {tr("معلومات الرحلة والإشارة")}
                    </span>
                    <Activity className="size-4 text-emerald-600" />
                  </div>
                  <div className="my-1 space-y-1 text-xs font-bold text-ink">
                    <p className="flex items-center justify-between">
                      <span className="text-muted">{tr("الاتجاه:")}</span>
                      <span>
                        {activeVehicle.compassAr}
                        {activeVehicle.bearing !== null ? ` (${activeVehicle.bearing}°)` : ""}
                      </span>
                    </p>
                    {activeVehicle.scheduledStart ? (
                      <p className="flex items-center justify-between">
                        <span className="text-muted">{tr("انطلاق الرحلة:")}</span>
                        <span dir="ltr">{activeVehicle.scheduledStart}</span>
                      </p>
                    ) : null}
                    {activeVehicle.distanceTraveledKm !== null ? (
                      <p className="flex items-center justify-between">
                        <span className="text-muted">{tr("المسافة المقطوعة:")}</span>
                        <span>{activeVehicle.distanceTraveledKm} {tr("كم")}</span>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between border-t border-line pt-1.5 text-[10px] font-extrabold text-muted">
                    <span>
                      {tr("آخر إشارة:")}{" "}
                      {activeVehicle.signalAgeSec < 60
                        ? tr("قبل {0} ث", activeVehicle.signalAgeSec)
                        : tr("قبل {0} د", Math.round(activeVehicle.signalAgeSec / 60))}
                    </span>
                    <a
                      href={gmapsPlace(activeVehicle.lat, activeVehicle.lon)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink underline"
                    >
                      {tr("موقع الباص في جوجل")}
                    </a>
                  </div>
                </div>
              </div>

              {/* Extra Bottom Strip: Operator, Exact GPS Coordinates, Focus Button */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-xs font-bold text-muted">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-ink">
                    <ShieldCheck className="size-4 text-emerald-600" />
                    {activeVehicle.operatorName}
                  </span>
                  <span className="inline-flex items-center gap-1" dir="ltr">
                    <Compass className="size-3.5" />
                    GPS: {activeVehicle.lat.toFixed(5)}, {activeVehicle.lon.toFixed(5)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" />
                    {tr("توقيت الإشارة:")}{" "}
                    {new Date(activeVehicle.at).toLocaleTimeString("ar-u-nu-latn", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      timeZone: "Asia/Jerusalem",
                    })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    mapRef.current?.setView([activeVehicle.lat, activeVehicle.lon], 16, {
                      animate: true,
                    })
                  }
                  className="rounded-xl bg-ink px-3 py-1.5 text-xs font-extrabold text-paper transition hover:opacity-90"
                >
                  🎯 {tr("تتبّع الباص على الخريطة")}
                </button>
              </div>
            </div>
          ) : mapBusMarkerItems[0] ? (
            <div className="rounded-3xl border border-line bg-surface/60 p-4">
              {/* Driver Info Banner (اسم السائق المناوب ومعلومات الحافلة) */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/60 bg-primary-soft/40 p-3">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-base font-black text-ink">
                    👨‍✈️
                  </span>
                  <div>
                    <span className="text-[11px] font-extrabold text-muted">
                      {tr("اسم السائق المناوب ومعلومات الطاقم:")}
                    </span>
                    {editingDriver ? (
                      <div className="mt-1 flex items-center gap-1.5">
                        <input
                          type="text"
                          value={customDriverInput}
                          onChange={(e) => setCustomDriverInput(e.target.value)}
                          placeholder={tr("اكتب اسم السائق...")}
                          className="rounded-lg border border-line bg-paper px-2.5 py-1 text-xs font-bold text-ink"
                        />
                        <button
                          type="button"
                          onClick={handleSaveDriverOnBusesPage}
                          className="rounded-lg bg-ink px-3 py-1 text-xs font-extrabold text-primary"
                        >
                          {tr("حفظ")}
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs font-black text-ink sm:text-sm">
                        {activeDriverDetails.driverName}{" "}
                        <span className="text-[11px] font-semibold text-muted">
                          ({activeDriverDetails.driverRole})
                        </span>
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCustomDriverInput(activeDriverDetails.driverName);
                    setEditingDriver((v) => !v);
                  }}
                  className="rounded-xl border border-line bg-paper px-2.5 py-1 text-[11px] font-extrabold text-ink hover:border-primary"
                >
                  ✏️ {editingDriver ? tr("إلغاء") : tr("تخصيص اسم السائق")}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col justify-between rounded-2xl border border-line bg-paper p-3.5 shadow-2xs">
                  <span className="text-[11px] font-extrabold text-muted">
                    {tr("رقم الحافلة (لوحة المركبة)")}
                  </span>
                  <div className="mt-2 flex items-center justify-center">
                    <div
                      dir="ltr"
                      className="inline-flex w-full max-w-[210px] items-center justify-between overflow-hidden rounded-xl border-2 border-[#111827] bg-[#facc15] shadow-xs"
                    >
                      <span className="flex h-9 flex-col items-center justify-center bg-[#1d4ed8] px-2 text-[9px] font-black leading-none text-white">
                        <span>🇮🇱</span>
                        <span>IL</span>
                      </span>
                      <span className="flex-1 px-2 text-center font-mono text-base font-black tracking-wider text-[#111827]">
                        {mapBusMarkerItems[0].plate}
                      </span>
                    </div>
                  </div>
                  <span className="mt-1.5 text-[10px] font-bold text-muted">
                    {tr("خط الحافلة:")} {selectedLine} · {tr("شركة غاليم (גלים)")}
                  </span>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-line bg-paper p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-muted">
                      {tr("حالة الحافلة والسرعة")}
                    </span>
                    <Gauge className="size-4 text-primary-ink" />
                  </div>
                  <div className="my-1.5 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-ink" dir="ltr">
                      {mapBusMarkerItems[0].speedKmh}
                    </span>
                    <span className="text-xs font-extrabold text-muted">{tr("كم/ساعة")}</span>
                  </div>
                  <span className="text-[11px] font-extrabold text-amber-700">
                    🕒 {mapBusMarkerItems[0].etaText}
                  </span>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-line bg-paper p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-muted">
                      {tr("المحطة الحالية / القادمة")}
                    </span>
                    <MapPin className="size-4 text-[#DC2626]" />
                  </div>
                  <p className="my-1.5 truncate text-sm font-extrabold text-ink">
                    🚏 {mapBusMarkerItems[0].nextStopName}
                  </p>
                  <span className="text-[11px] font-bold text-muted">
                    {mapBusMarkerItems[0].fromName} ↔ {mapBusMarkerItems[0].toName}
                  </span>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-line bg-paper p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-muted">
                      {tr("التحكم والتتبع على الخريطة")}
                    </span>
                    <Activity className="size-4 text-emerald-600" />
                  </div>
                  <p className="my-1 text-xs font-bold text-ink">
                    {tr("اضغط على أيقونة الحافلة 🚌 في الخريطة لعرض النافذة التفاعلية الكاملة.")}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      mapRef.current?.setView([mapBusMarkerItems[0].lat, mapBusMarkerItems[0].lon], 16, {
                        animate: true,
                      })
                    }
                    className="mt-1 rounded-xl bg-ink px-3 py-1.5 text-xs font-extrabold text-primary transition hover:opacity-90"
                  >
                    🎯 {tr("تكبير الخريطة على الحافلة")}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-surface/50 p-4 text-center">
              <p className="text-sm font-extrabold text-ink">
                {status === "loading"
                  ? tr("جاري البحث عن الباصات النشطة على خط {0} في نظام وزارة المواصلات…", selectedLine)
                  : tr(
                      "لا يوجد باص يبث إشارة GPS مباشرة على خط {0} في هذه اللحظة (الخط خارج أوقات الرحلات الجارية حالياً).",
                      selectedLine,
                    )}
              </p>
              <p className="mt-1 text-xs font-semibold text-muted">
                {tr(
                  "بمجرد انطلاق الباص وتشغيل جهاز SIRI، ستظهر هنا فوراً لوحة الترخيص الحقيقية وسرعة الباص وموقعه المباشر.",
                )}
              </p>

              {otherActiveLines.length > 0 ? (
                <div className="mt-3 border-t border-line pt-3">
                  <p className="mb-2 text-xs font-extrabold text-emerald-800">
                    🟢 {tr("خطوط باصات في رهط يتواجد عليها باصات تبث بياناتها المباشرة الآن:")}
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    {otherActiveLines.map(([ln, count]) => (
                      <button
                        key={ln}
                        type="button"
                        onClick={() => handleSelectLine(ln)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-xs transition hover:bg-emerald-700"
                      >
                        🚌 {tr("خط")} {ln} ({count} {tr("مباشر")})
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Selected Stop Live Arrival Bar right below telemetry */}
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
              const isNextForBus = activeVehicle?.nextStopCode === code;
              const nextArr = plannedArrivals(now, selectedLine, currentDir.dir, code, 1)[0];
              return (
                <li key={`${code}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => focusStopOnMap(code)}
                    className={`flex w-full items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 text-start transition ${
                      isSel
                        ? "border-ink bg-primary-soft/60 font-extrabold shadow-2xs"
                        : isNextForBus
                          ? "border-emerald-500 bg-emerald-50/70 font-extrabold"
                          : "border-line bg-surface/60 hover:bg-primary-soft/30"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-extrabold ${
                          isSel
                            ? "bg-[#DC2626] text-white"
                            : isNextForBus
                              ? "bg-emerald-600 text-white"
                              : "bg-paper text-ink"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-extrabold">
                          {stopName(code)}
                          {isNextForBus ? (
                            <span className="ms-1.5 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] text-white">
                              {tr("المحطة القادمة للباص")}
                            </span>
                          ) : null}
                        </p>
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

      <section className="stamp mt-4 p-3.5 text-xs font-semibold leading-relaxed text-muted">
        <p className="font-bold text-ink">ℹ️ {tr("إخلاء مسؤولية والمصادر الرسمية للمواصلات (Official Transit Sources):")}</p>
        <p className="mt-1">
          {tr("منصة «رهط بوست» مستقلة ولا تمثل وزارة المواصلات أو شركة غاليم. جميع بيانات الخطوط والمواعيد مستمدة من المصادر الرسمية المفتوحة:")}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-bold" dir="ltr">
          <a href="https://bus.gov.il" target="_blank" rel="noopener noreferrer" className="text-primary-ink underline">https://bus.gov.il</a>
          <a href="https://www.gov.il/ar/departments/ministry_of_transport_and_road_safety" target="_blank" rel="noopener noreferrer" className="text-primary-ink underline">https://www.gov.il</a>
          <a href="https://www.galim-bus.co.il" target="_blank" rel="noopener noreferrer" className="text-primary-ink underline">https://www.galim-bus.co.il</a>
        </div>
      </section>
    </Shell>
  );
}
