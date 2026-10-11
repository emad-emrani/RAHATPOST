import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Moon,
  Sun,
  Umbrella,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  countdownAr,
  formatPrayerTime,
  nextPrayer,
  prayerDay,
  PRAYER_METHOD_LABEL,
} from "@/lib/prayer/times";
import { weatherKind, weatherLabel, type Weather } from "@/lib/weather/types";

/** Ticks every 30 s after hydration; the first render uses the server's time (no mismatch). */
function useTick(serverNow: number): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const ICONS: Record<ReturnType<typeof weatherKind>, [LucideIcon, LucideIcon]> = {
  clear: [Sun, Moon],
  partly: [CloudSun, CloudMoon],
  cloudy: [Cloud, Cloud],
  fog: [CloudFog, CloudFog],
  rain: [CloudRain, CloudRain],
  snow: [CloudSnow, CloudSnow],
  storm: [CloudLightning, CloudLightning],
};

function WeatherIcon({
  code,
  isDay,
  className,
}: {
  code: number;
  isDay: boolean;
  className?: string;
}) {
  const [day, night] = ICONS[weatherKind(code)];
  const Icon = isDay ? day : night;
  return <Icon className={className} aria-hidden />;
}

export function OpenMeteoCredit() {
  return (
    <p className="mt-2 text-xs font-semibold text-muted">
      بيانات الطقس:{" "}
      <a
        href="https://open-meteo.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-1 underline-offset-2"
        dir="ltr"
      >
        Open-Meteo.com
      </a>{" "}
      <bdi dir="ltr">(CC BY 4.0)</bdi>
    </p>
  );
}

/* ------------------------------------------------------------- /today cards */

export function PrayerCard({ serverNow }: { serverNow: number }) {
  const now = useTick(serverNow);
  const slots = prayerDay(now);
  const next = nextPrayer(now);
  return (
    <section className="stamp p-4" aria-labelledby="prayer-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="prayer-title" className="text-xl font-bold">
            أوقات الصلاة في رهط
          </h2>
          <p className="text-sm font-semibold text-muted">
            {new Intl.DateTimeFormat("ar-u-nu-latn", {
              timeZone: "Asia/Jerusalem",
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date(now))}
          </p>
        </div>
        <p className="chip chip-ink shrink-0">
          {next.name} {countdownAr(next.at - now)}
        </p>
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-2">
        {slots.map((s) => {
          const active = s.key === next.key && s.at === next.at;
          return (
            <li
              key={s.key}
              className={
                active
                  ? "rounded-xl bg-primary px-2 py-2 text-center"
                  : "rounded-xl bg-surface px-2 py-2 text-center"
              }
              aria-current={active ? "true" : undefined}
            >
              <span className="block text-sm font-bold">{s.name}</span>
              <span className="block text-xl font-bold leading-tight" dir="ltr">
                {formatPrayerTime(s.at)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs font-semibold text-muted">
        محسوبة لموقع رهط · {PRAYER_METHOD_LABEL}. قد تختلف دقيقة أو دقيقتين عن تقويم مسجدك.
      </p>
    </section>
  );
}

const hourLabel = (t: string) => t.slice(11, 16);

export function WeatherCard({ weather }: { weather: Weather | null }) {
  if (!weather) return null;
  return (
    <section className="stamp p-4" aria-labelledby="weather-title">
      <h2 id="weather-title" className="text-xl font-bold">
        الطقس في رهط
      </h2>
      <div className="mt-2 flex items-center gap-4">
        <span className="icon-badge size-16 rounded-2xl">
          <WeatherIcon code={weather.code} isDay={weather.isDay} className="size-9" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-4xl font-bold leading-none" dir="ltr">
            {weather.temp}°
          </p>
          <p className="mt-1 font-bold">{weatherLabel(weather.code)}</p>
        </div>
        <div className="shrink-0 text-sm font-bold">
          <p>
            العظمى <bdi dir="ltr">{weather.high}°</bdi>
          </p>
          <p>
            الصغرى <bdi dir="ltr">{weather.low}°</bdi>
          </p>
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
        {weather.rainChance !== null ? (
          <li className="chip">
            <Umbrella className="size-4" aria-hidden />
            احتمال المطر اليوم <bdi dir="ltr">{weather.rainChance}%</bdi>
          </li>
        ) : null}
        {weather.feelsLike !== null ? (
          <li className="chip">
            الإحساس <bdi dir="ltr">{weather.feelsLike}°</bdi>
          </li>
        ) : null}
        {weather.humidity !== null ? (
          <li className="chip">
            <Droplets className="size-4" aria-hidden />
            الرطوبة <bdi dir="ltr">{weather.humidity}%</bdi>
          </li>
        ) : null}
        {weather.wind !== null ? (
          <li className="chip">
            الرياح <bdi dir="ltr">{weather.wind}</bdi> كم/س
          </li>
        ) : null}
      </ul>
      {weather.hours.length > 0 ? (
        <ul className="scroll-row -mx-4 mt-3 px-4" aria-label="الساعات القادمة">
          {weather.hours.map((h) => {
            const hour = Number(h.time.slice(11, 13));
            return (
              <li
                key={h.time}
                className="flex w-16 shrink-0 flex-col items-center rounded-xl bg-surface px-1 py-2"
              >
                <span className="text-xs font-bold" dir="ltr">
                  {hourLabel(h.time)}
                </span>
                <WeatherIcon code={h.code} isDay={hour >= 6 && hour < 18} className="my-1 size-5" />
                <span className="font-bold" dir="ltr">
                  {h.temp}°
                </span>
                {h.rain !== null && h.rain > 0 ? (
                  <span className="text-xs font-semibold text-muted" dir="ltr">
                    {h.rain}%
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      <OpenMeteoCredit />
    </section>
  );
}

/* ---------------------------------------------------------------- home chips */

/** Compact weather + next-prayer chips under the home search bar. */
export function HomeTodayChips({
  weather,
  serverNow,
}: {
  weather: Weather | null;
  serverNow: number;
}) {
  const now = useTick(serverNow);
  const next = nextPrayer(now);
  return (
    <div className="flex flex-wrap gap-2">
      {weather ? (
        <Link
          to="/today"
          className="today-chip"
          aria-label={`الطقس في رهط: ${weather.temp} درجة، ${weatherLabel(weather.code)}`}
        >
          <WeatherIcon code={weather.code} isDay={weather.isDay} className="size-5" />
          <bdi dir="ltr">{weather.temp}°</bdi>
          <span className="text-muted">{weatherLabel(weather.code)}</span>
        </Link>
      ) : null}
      <Link to="/today" className="today-chip">
        <Moon className="size-5" aria-hidden />
        <span>
          {next.name} <bdi dir="ltr">{formatPrayerTime(next.at)}</bdi>
        </span>
        <span className="text-muted">{countdownAr(next.at - now)}</span>
      </Link>
    </div>
  );
}
