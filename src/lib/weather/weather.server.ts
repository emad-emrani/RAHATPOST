import { RAHAT } from "@/lib/prayer/times";
import type { Weather, WeatherHour } from "./types";

/**
 * Current weather for Rahat from Open-Meteo (free, no key; CC BY 4.0 — the UI credits it).
 * Cached in memory for 20 minutes per server instance; on failure the last good reading is reused
 * for up to 3 hours, otherwise null (the cards simply hide).
 */
const TTL_MS = 20 * 60_000;
const STALE_MS = 3 * 3600_000;

const URL_ =
  "https://api.open-meteo.com/v1/forecast?" +
  new URLSearchParams({
    latitude: String(RAHAT.lat),
    longitude: String(RAHAT.lon),
    current:
      "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day,wind_speed_10m",
    hourly: "temperature_2m,weather_code,precipitation_probability",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "Asia/Jerusalem",
    forecast_days: "2",
  });

let cache: Weather | null = null;
let inflight: Promise<Weather | null> | null = null;

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

async function fetchWeather(): Promise<Weather> {
  const res = await fetch(URL_, {
    headers: { "user-agent": "rahatpost.com (+https://rahatpost.com)" },
    signal: AbortSignal.timeout(6_000),
  });
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  const j = (await res.json()) as {
    current: Record<string, number | string>;
    hourly: {
      time: string[];
      temperature_2m: number[];
      weather_code: number[];
      precipitation_probability: (number | null)[];
    };
    daily: {
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_probability_max: (number | null)[];
    };
  };
  const c = j.current;
  const temp = num(c.temperature_2m);
  const high = num(j.daily?.temperature_2m_max?.[0]);
  const low = num(j.daily?.temperature_2m_min?.[0]);
  if (temp === null || high === null || low === null) throw new Error("open-meteo: missing fields");
  const now = String(c.time ?? "");
  // Next 6 hours after the current hour (hourly times are local "YYYY-MM-DDTHH:00").
  const start = j.hourly.time.findIndex((t) => t > now);
  const hours: WeatherHour[] = [];
  for (let i = Math.max(0, start); i >= 0 && i < j.hourly.time.length && hours.length < 6; i++) {
    hours.push({
      time: j.hourly.time[i],
      temp: Math.round(j.hourly.temperature_2m[i]),
      code: j.hourly.weather_code[i],
      rain: num(j.hourly.precipitation_probability[i]),
    });
  }
  return {
    time: now,
    temp: Math.round(temp),
    feelsLike:
      num(c.apparent_temperature) === null ? null : Math.round(Number(c.apparent_temperature)),
    code: Number(c.weather_code ?? -1),
    isDay: Number(c.is_day) === 1,
    humidity: num(c.relative_humidity_2m),
    wind: num(c.wind_speed_10m) === null ? null : Math.round(Number(c.wind_speed_10m)),
    high: Math.round(high),
    low: Math.round(low),
    rainChance: num(j.daily.precipitation_probability_max?.[0]),
    hours,
    fetchedAt: Date.now(),
  };
}

export async function getRahatWeather(): Promise<Weather | null> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) return cache;
  inflight ??= fetchWeather()
    .then((w) => (cache = w))
    .catch((error) => {
      console.error("[weather] fetch failed", error);
      return cache && Date.now() - cache.fetchedAt < STALE_MS ? cache : null;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
