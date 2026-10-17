import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from "adhan";
import { tr } from "@/lib/i18n/core";

/**
 * Prayer times for Rahat, computed locally (adhan, no external API).
 * Method: Egyptian General Authority of Survey (Fajr 19.5°, Isha 17.5°), the method commonly used
 * in Palestine and the Negev; Asr by the Shafi'i (standard) shadow ratio.
 */
export const RAHAT = { lat: 31.3925, lon: 34.7544 };
export const PRAYER_TZ = "Asia/Jerusalem";
export const PRAYER_METHOD_LABEL = "طريقة الهيئة المصرية العامة للمساحة · العصر على المذهب الشافعي";

export type PrayerKey = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";

export const PRAYER_NAMES: Record<PrayerKey, string> = {
  fajr: "الفجر",
  sunrise: "الشروق",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء",
};

const ORDER: PrayerKey[] = ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"];

function params() {
  const p = CalculationMethod.Egyptian();
  p.madhab = Madhab.Shafi;
  return p;
}

/** The calendar date (Y, M, D) in Israel for an instant — adhan wants the local civil date. */
function localDate(at: number): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PRAYER_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(at));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  // Noon UTC on that civil date keeps adhan's date math on the right day in any host timezone.
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day"), 12));
}

export type PrayerSlot = { key: PrayerKey; name: string; at: number };

export function prayerDay(at: number): PrayerSlot[] {
  const t = new PrayerTimes(new Coordinates(RAHAT.lat, RAHAT.lon), localDate(at), params());
  return ORDER.map((key) => ({ key, name: PRAYER_NAMES[key], at: t[key].getTime() }));
}

/** Next of the five prayers (sunrise excluded) after `now`, rolling into tomorrow's Fajr. */
export function nextPrayer(now: number): PrayerSlot {
  const today = prayerDay(now).filter((s) => s.key !== "sunrise");
  const upcoming = today.find((s) => s.at > now);
  if (upcoming) return upcoming;
  return prayerDay(now + 24 * 3600_000)[0];
}

export function formatPrayerTime(at: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: PRAYER_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(at));
}

/** "بعد ٢ س ١٥ د" style countdown (Latin digits like the rest of the site). */
export function countdownAr(ms: number): string {
  const totalMin = Math.max(0, Math.ceil(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return m <= 1 ? tr("بعد أقل من دقيقة") : tr("بعد {0} دقيقة", m);
  return m === 0 ? tr("بعد {0} ساعة", h) : tr("بعد {0} س {1} د", h, m);
}
