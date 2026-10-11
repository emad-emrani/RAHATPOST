export type WeatherHour = { time: string; temp: number; code: number; rain: number | null };

export type Weather = {
  /** ISO time of the reading (Open-Meteo, Asia/Jerusalem local time without offset). */
  time: string;
  temp: number;
  feelsLike: number | null;
  code: number;
  isDay: boolean;
  humidity: number | null;
  wind: number | null;
  high: number;
  low: number;
  rainChance: number | null;
  hours: WeatherHour[];
  fetchedAt: number;
};

/** WMO weather interpretation codes → Arabic. */
export function weatherLabel(code: number): string {
  if (code === 0) return "صافٍ";
  if (code === 1) return "صافٍ غالباً";
  if (code === 2) return "غائم جزئياً";
  if (code === 3) return "غائم";
  if (code === 45 || code === 48) return "ضباب";
  if (code >= 51 && code <= 57) return "رذاذ";
  if (code >= 61 && code <= 67) return code >= 65 ? "أمطار غزيرة" : "أمطار";
  if (code >= 71 && code <= 77) return "ثلج";
  if (code >= 80 && code <= 82) return "زخات مطر";
  if (code >= 85 && code <= 86) return "زخات ثلج";
  if (code >= 95) return "عاصفة رعدية";
  return "—";
}

export type WeatherKind = "clear" | "partly" | "cloudy" | "fog" | "rain" | "snow" | "storm";

export function weatherKind(code: number): WeatherKind {
  if (code <= 1) return "clear";
  if (code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "rain";
}
