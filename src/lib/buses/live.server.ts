import type { Arrival, ArrivalsResult } from "./types";

/**
 * Real-time arrivals per stop from curlbus.app's public JSON API, which relays the
 * Ministry of Transport SIRI-SM feed. Cached ~30 s per stop to stay light on it.
 */
const TTL_MS = 30_000;
const TIMEOUT_MS = 6_000;
const LIVE_WINDOW_MS = 3 * 60_000;
const cache = new Map<string, { at: number; result: ArrivalsResult }>();

type CurlbusVisit = {
  line_name?: string;
  operator_id?: string;
  eta?: string;
  timestamp?: string;
  location?: unknown;
  static_info?: { route?: { destination?: { name?: { AR?: string; HE?: string } } } };
};

function parseTime(value: string | undefined): number {
  if (!value) return NaN;
  // "2026-10-11 05:30:00+03:00" → ISO
  return Date.parse(value.replace(" ", "T"));
}

export async function loadArrivals(stop: string): Promise<ArrivalsResult> {
  const now = Date.now();
  const hit = cache.get(stop);
  if (hit && now - hit.at < TTL_MS) return { ...hit.result, now };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://curlbus.app/${stop}`, {
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": "rahatpost.com (bus arrivals)" },
    });
    if (!res.ok) throw new Error(`curlbus ${res.status}`);
    const body = (await res.json()) as { visits?: Record<string, CurlbusVisit[]> };
    const visits = body.visits?.[stop] ?? [];
    const arrivals: Arrival[] = visits
      .map((v) => {
        const eta = parseTime(v.eta);
        const recorded = parseTime(v.timestamp);
        const name = v.static_info?.route?.destination?.name;
        return {
          line: String(v.line_name ?? ""),
          operator: String(v.operator_id ?? ""),
          destination: name?.AR || name?.HE || "",
          eta: Number.isNaN(eta) ? "" : new Date(eta).toISOString(),
          // SIRI also returns planned trips whose bus hasn't started; only count it as live
          // when the vehicle is sending its position (or reported within the last 3 minutes).
          live: Boolean(v.location) || (!Number.isNaN(recorded) && now - recorded < LIVE_WINDOW_MS),
        };
      })
      .filter((a) => a.line && a.eta && Date.parse(a.eta) > now - 60_000)
      .sort((a, b) => Date.parse(a.eta) - Date.parse(b.eta))
      .slice(0, 12);
    const result: ArrivalsResult = { ok: true, now, stop, arrivals };
    cache.set(stop, { at: now, result });
    if (cache.size > 500) cache.delete(cache.keys().next().value as string);
    return result;
  } catch {
    return { ok: false, now, stop, arrivals: [] };
  } finally {
    clearTimeout(timer);
  }
}

/* ---------------------------------------------------------------- live vehicle positions */

export type Vehicle = {
  ref: string;
  line: string;
  dir: string;
  lat: number;
  lon: number;
  /** When the bus last reported this position (ISO). */
  at: string;
};

const visitsCache = new Map<string, { at: number; visits: CurlbusVisitFull[] }>();
type CurlbusVisitFull = CurlbusVisit & {
  vehicle_ref?: string;
  direction_id?: string;
  location?: { lat?: string; lon?: string } | null;
};

async function stopVisits(stop: string): Promise<CurlbusVisitFull[]> {
  const hit = visitsCache.get(stop);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.visits;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`https://curlbus.app/${stop}`, {
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": "rahatpost.com (bus map)" },
    });
    if (!res.ok) throw new Error(`curlbus ${res.status}`);
    const body = (await res.json()) as { visits?: Record<string, CurlbusVisitFull[]> };
    const visits = body.visits?.[stop] ?? [];
    visitsCache.set(stop, { at: Date.now(), visits });
    if (visitsCache.size > 500) visitsCache.delete(visitsCache.keys().next().value as string);
    return visits;
  } finally {
    clearTimeout(timer);
  }
}

/** A position older than this is not shown (the bus stopped reporting). */
const POSITION_MAX_AGE_MS = 5 * 60_000;

/**
 * Real positions of the buses of one line: SIRI (via curlbus) reports each approaching
 * vehicle's last GPS location at the stops it is heading to. We ask a handful of stops spread
 * along the route and keep the newest position per vehicle.
 */
export async function loadVehicles(
  line: string,
  stops: string[],
): Promise<{ ok: boolean; vehicles: Vehicle[] }> {
  const results = await Promise.allSettled(stops.map((s) => stopVisits(s)));
  const ok = results.some((r) => r.status === "fulfilled");
  const now = Date.now();
  const best = new Map<string, Vehicle>();
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const v of r.value) {
      if (String(v.line_name) !== line || v.operator_id !== "23" || !v.location || !v.vehicle_ref)
        continue;
      const lat = Number(v.location.lat);
      const lon = Number(v.location.lon);
      const at = parseTime(v.timestamp);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || Number.isNaN(at)) continue;
      if (now - at > POSITION_MAX_AGE_MS) continue;
      const prev = best.get(v.vehicle_ref);
      if (!prev || Date.parse(prev.at) < at)
        best.set(v.vehicle_ref, {
          ref: v.vehicle_ref,
          line,
          dir: String(v.direction_id ?? ""),
          lat,
          lon,
          at: new Date(at).toISOString(),
        });
    }
  }
  return { ok, vehicles: [...best.values()] };
}

export type StopLive = {
  ok: boolean;
  now: number;
  stop: string;
  arrivals: (Arrival & { vehicle?: string })[];
  /** Real reported positions (≤ 5 min old) of buses heading to this stop. */
  vehicles: (Vehicle & { eta: string; operator: string })[];
};

/** Arrivals at one stop plus the live positions of the incoming buses (same SIRI data). */
export async function loadStopLive(stop: string): Promise<StopLive> {
  const now = Date.now();
  try {
    const visits = await stopVisits(stop);
    const arrivals: StopLive["arrivals"] = [];
    const vehicles: StopLive["vehicles"] = [];
    for (const v of visits) {
      const eta = parseTime(v.eta);
      if (Number.isNaN(eta) || eta < now - 60_000) continue;
      const recorded = parseTime(v.timestamp);
      const name = v.static_info?.route?.destination?.name;
      const lat = Number(v.location?.lat);
      const lon = Number(v.location?.lon);
      const fresh = !Number.isNaN(recorded) && now - recorded <= POSITION_MAX_AGE_MS;
      const hasPos = Boolean(v.location) && Number.isFinite(lat) && Number.isFinite(lon) && fresh;
      arrivals.push({
        line: String(v.line_name ?? ""),
        operator: String(v.operator_id ?? ""),
        destination: name?.AR || name?.HE || "",
        eta: new Date(eta).toISOString(),
        live: hasPos || (!Number.isNaN(recorded) && now - recorded < LIVE_WINDOW_MS),
        ...(hasPos && v.vehicle_ref ? { vehicle: v.vehicle_ref } : {}),
      });
      if (hasPos && v.vehicle_ref)
        vehicles.push({
          ref: v.vehicle_ref,
          line: String(v.line_name ?? ""),
          dir: String(v.direction_id ?? ""),
          lat,
          lon,
          at: new Date(recorded).toISOString(),
          eta: new Date(eta).toISOString(),
          operator: String(v.operator_id ?? ""),
        });
    }
    arrivals.sort((a, b) => Date.parse(a.eta) - Date.parse(b.eta));
    return { ok: true, now, stop, arrivals: arrivals.slice(0, 15), vehicles };
  } catch {
    return { ok: false, now, stop, arrivals: [], vehicles: [] };
  }
}
