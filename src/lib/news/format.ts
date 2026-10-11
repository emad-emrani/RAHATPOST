import { useEffect, useState } from "react";

function plural(n: number, one: string, two: string, few: string, many: string) {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

/** Arabic relative time, e.g. «منذ 5 دقائق», «منذ ساعتين», «منذ يومين». */
export function relativeTimeAr(iso: string, now: number): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "الآن";
  if (min < 60) return `منذ ${plural(min, "دقيقة", "دقيقتين", "دقائق", "دقيقة")}`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `منذ ${plural(hours, "ساعة", "ساعتين", "ساعات", "ساعة")}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${plural(days, "يوم", "يومين", "أيام", "يوماً")}`;
  return new Date(t).toLocaleDateString("ar-u-nu-latn", { timeZone: "Asia/Jerusalem" });
}

/**
 * Starts from the server's reference time (so SSR and hydration match), then
 * switches to the live clock after mount and ticks every minute.
 */
export function useNow(serverNow: number): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
