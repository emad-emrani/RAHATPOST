import { busSchedule } from "@/data/bus-schedule";

const TZ = "Asia/Jerusalem";

/** Israel-local date (YYYY-MM-DD) and minutes since midnight for a timestamp. */
export function israelClock(ms: number): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** "HH:MM" list (sorted, may wrap past midnight) → minutes, keeping order past 24:00. */
export function toMinutes(times: string[]): number[] {
  let prev = -1;
  return times.map((t) => {
    const [h, m] = t.split(":").map(Number);
    let v = h * 60 + m;
    while (v < prev - 360) v += 1440;
    prev = v;
    return v;
  });
}

export function departures(date: string, line: string, dir: string): string[] {
  const idx = busSchedule.days[date]?.[line]?.[dir];
  return idx === undefined ? [] : busSchedule.patterns[idx];
}

export function stopName(code: string): string {
  const s = busSchedule.stops[code];
  return s ? s.ar || s.he : code;
}

export function lineInfo(number: string) {
  return busSchedule.lines.find((l) => l.number === number);
}

/** Planned arrivals at a stop for a line/direction from now on (approximate: first-stop time + typical offset). */
export function plannedArrivals(nowMs: number, line: string, dir: string, stop: string, limit = 5): number[] {
  const { date, minutes } = israelClock(nowMs);
  const info = lineInfo(line)?.dirs.find((d) => d.dir === dir);
  const offset = info?.stops.find(([code]) => code === stop)?.[1];
  if (offset === undefined) return [];
  return toMinutes(departures(date, line, dir))
    .map((m) => m + offset - minutes)
    .filter((diff) => diff >= 0)
    .slice(0, limit);
}

export const scheduleDates = Object.keys(busSchedule.days).sort();
