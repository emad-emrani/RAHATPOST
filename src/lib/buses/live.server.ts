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
