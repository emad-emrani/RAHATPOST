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
  Sparkles,
  Sun,
  Umbrella,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  countdownAr,
  formatPrayerTime,
  nextPrayer,
  prayerDay,
  PRAYER_METHOD_LABEL,
} from "@/lib/prayer/times";
import { weatherKind, weatherLabel, type Weather } from "@/lib/weather/types";
import { useSiteSettings } from "@/lib/site-settings/context";
import { tr, trv } from "@/lib/i18n/core";

export type WeatherPrayerVisualStyle =
  | "scene-animated"
  | "mosque-gold"
  | "glass-modern"
  | "night-radar"
  | "compact-unified"
  | "split-cards";

export type WeatherFxOverride = "auto" | "rain" | "storm" | "clear" | "night";

export interface WeatherPrayerStyleConfig {
  style: WeatherPrayerVisualStyle;
  fx: WeatherFxOverride;
  rainIntensity: "light" | "medium" | "heavy";
  showSimToggle: boolean;
}

export function parseWeatherPrayerStyleConfig(
  quickLinks: { id: string; title?: string; subtitle?: string; url?: string }[] | undefined,
): WeatherPrayerStyleConfig {
  const item = (quickLinks ?? []).find((q) => q.id === "weatherstylecfg");
  let style: WeatherPrayerVisualStyle = "scene-animated";
  let fx: WeatherFxOverride = "auto";
  let rainIntensity: "light" | "medium" | "heavy" = "medium";
  let showSimToggle = true;

  if (item) {
    const raw = `${item.title ?? ""}|${item.subtitle ?? ""}`;
    for (const part of raw.split("|")) {
      const p = part.trim();
      if (p.startsWith("style:")) {
        const v = p.slice(6) as WeatherPrayerVisualStyle;
        if (
          v === "scene-animated" ||
          v === "mosque-gold" ||
          v === "glass-modern" ||
          v === "night-radar" ||
          v === "compact-unified" ||
          v === "split-cards"
        ) {
          style = v;
        }
      } else if (p.startsWith("fx:")) {
        const v = p.slice(3) as WeatherFxOverride;
        if (v === "auto" || v === "rain" || v === "storm" || v === "clear" || v === "night") {
          fx = v;
        }
      } else if (p.startsWith("int:")) {
        const v = p.slice(4);
        if (v === "light" || v === "medium" || v === "heavy") rainIntensity = v;
      } else if (p.startsWith("sim:")) {
        showSimToggle = p.slice(4) !== "0";
      }
    }
  }
  return { style, fx, rainIntensity, showSimToggle };
}

/** Ticks every 15 s after hydration; the first render uses the server's time (no mismatch). */
function useTick(serverNow: number): number {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 15_000);
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

export function OpenMeteoCredit({ lightText = false }: { lightText?: boolean }) {
  return (
    <p className={`mt-2 text-xs font-semibold ${lightText ? "text-white/75" : "text-muted"}`}>
      {tr("بيانات الطقس:")}{" "}
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

const RAIN_DROPS = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${(i * 3.7 + (i % 3) * 1.9) % 98}%`,
  delay: `${((i * 0.17) % 1.8).toFixed(2)}s`,
  duration: `${(0.65 + ((i * 0.11) % 0.55)).toFixed(2)}s`,
  height: `${14 + (i % 4) * 5}px`,
  opacity: 0.35 + (i % 5) * 0.12,
}));

function WeatherAtmosphereOverlay({
  activeFx,
  intensity,
}: {
  activeFx: "rain" | "storm" | "clear" | "night" | "cloudy";
  intensity: "light" | "medium" | "heavy";
}) {
  const dropCount = intensity === "heavy" ? 28 : intensity === "light" ? 14 : 22;
  const drops = RAIN_DROPS.slice(0, dropCount);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <style>{`
        @keyframes rpRainFall {
          0% { transform: translateY(-28px) translateX(0px) rotate(14deg); opacity: 0; }
          20% { opacity: 0.85; }
          85% { opacity: 0.85; }
          100% { transform: translateY(290px) translateX(-26px) rotate(14deg); opacity: 0; }
        }
        @keyframes rpSplashRing {
          0% { transform: scale(0.2); opacity: 0.75; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        @keyframes rpCloudFloatSlow {
          0%, 100% { transform: translateX(0px) translateY(0px); }
          50% { transform: translateX(-16px) translateY(3px); }
        }
        @keyframes rpLightningFlash {
          0%, 92%, 96%, 100% { opacity: 0; }
          94% { opacity: 0.28; }
          98% { opacity: 0.14; }
        }
        @keyframes rpSunPulseGlow {
          0%, 100% { transform: scale(1); opacity: 0.45; }
          50% { transform: scale(1.18); opacity: 0.72; }
        }
        @keyframes rpStarBlink {
          0%, 100% { opacity: 0.25; transform: scale(0.85); }
          50% { opacity: 0.95; transform: scale(1.15); }
        }
      `}</style>

      {(activeFx === "rain" || activeFx === "storm") && (
        <>
          {/* Moving Rain Clouds at Top */}
          <div
            className="absolute -top-6 right-4 h-20 w-44 rounded-full bg-sky-200/15 blur-xl"
            style={{ animation: "rpCloudFloatSlow 7s infinite ease-in-out" }}
          />
          <div
            className="absolute -top-4 left-8 h-16 w-36 rounded-full bg-blue-300/15 blur-xl"
            style={{ animation: "rpCloudFloatSlow 9s infinite ease-in-out reverse" }}
          />

          {/* Lightning Flash when Stormy */}
          {activeFx === "storm" && (
            <div
              className="absolute inset-0 bg-amber-100"
              style={{ animation: "rpLightningFlash 6.5s infinite" }}
            />
          )}

          {/* Falling Raindrops */}
          {drops.map((d) => (
            <span
              key={d.id}
              className="absolute top-0 w-[1.8px] rounded-full bg-gradient-to-b from-transparent via-sky-300/80 to-white/95"
              style={{
                left: d.left,
                height: d.height,
                opacity: d.opacity,
                animation: `rpRainFall ${d.duration} ${d.delay} infinite linear`,
              }}
            />
          ))}

          {/* Raindrop Ripples along Bottom Edge */}
          <div className="absolute inset-x-4 bottom-1.5 flex justify-around">
            {[0, 1, 2, 3, 4, 5].map((r) => (
              <span
                key={r}
                className="h-1.5 w-5 rounded-full border border-sky-200/45"
                style={{
                  animation: `rpSplashRing 1.4s ${(r * 0.23).toFixed(2)}s infinite ease-out`,
                }}
              />
            ))}
          </div>
        </>
      )}

      {activeFx === "clear" && (
        <div
          className="absolute -top-12 -left-12 size-44 rounded-full bg-amber-300/25 blur-2xl"
          style={{ animation: "rpSunPulseGlow 5s infinite ease-in-out" }}
        />
      )}

      {activeFx === "night" && (
        <>
          {[
            { top: "14%", left: "12%", d: "0s" },
            { top: "22%", left: "34%", d: "0.7s" },
            { top: "16%", left: "68%", d: "1.3s" },
            { top: "30%", left: "84%", d: "0.4s" },
            { top: "10%", left: "50%", d: "1.1s" },
          ].map((st, idx) => (
            <span
              key={idx}
              className="absolute size-1.5 rounded-full bg-amber-200"
              style={{
                top: st.top,
                left: st.left,
                animation: `rpStarBlink 2.6s ${st.d} infinite ease-in-out`,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
}

const hourLabel = (t: string) => t.slice(11, 16);

/* ------------------------------------------------------------- /today cards */

export function WeatherCard({ weather }: { weather: Weather | null }) {
  const st = useSiteSettings();
  const cfg = useMemo(() => parseWeatherPrayerStyleConfig(st.quickLinks), [st.quickLinks]);
  const [simRain, setSimRain] = useState<boolean>(false);

  if (!weather) return null;

  const naturalKind = weatherKind(weather.code);
  const naturalRain =
    naturalKind === "rain" || naturalKind === "storm" || (weather.rainChance ?? 0) >= 35;

  const activeFx: "rain" | "storm" | "clear" | "night" | "cloudy" = simRain
    ? "rain"
    : cfg.fx === "rain"
      ? "rain"
      : cfg.fx === "storm"
        ? "storm"
        : cfg.fx === "clear"
          ? "clear"
          : cfg.fx === "night"
            ? "night"
            : naturalKind === "storm"
              ? "storm"
              : naturalRain
                ? "rain"
                : !weather.isDay
                  ? "night"
                  : naturalKind === "clear"
                    ? "clear"
                    : "cloudy";

  const isRainMode = activeFx === "rain" || activeFx === "storm";
  const isDarkCard =
    cfg.style === "night-radar" ||
    (cfg.style === "scene-animated" && (isRainMode || activeFx === "night")) ||
    (cfg.style === "glass-modern" && isRainMode);

  const cardSurfaceClass =
    cfg.style === "night-radar"
      ? "relative overflow-hidden rounded-3xl border border-sky-400/30 bg-gradient-to-br from-[#09152b] via-[#0f2547] to-[#173663] p-5 text-white shadow-xl"
      : cfg.style === "mosque-gold"
        ? "relative overflow-hidden rounded-3xl border-2 border-[#d9a92a] bg-gradient-to-br from-[#fffbeb] via-[#fef3c7] to-[#fde68a]/60 p-5 text-[#111827] shadow-lg"
        : cfg.style === "glass-modern"
          ? isRainMode
            ? "relative overflow-hidden rounded-3xl border border-sky-300/35 bg-gradient-to-br from-[#0f2942]/95 via-[#163b5c]/90 to-[#1e4976]/95 p-5 text-white shadow-xl backdrop-blur-xl"
            : "relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-sky-50/90 via-white to-amber-50/60 p-5 text-ink shadow-lg backdrop-blur-xl"
          : cfg.style === "scene-animated"
            ? isRainMode
              ? "relative overflow-hidden rounded-3xl border border-sky-400/35 bg-gradient-to-br from-[#0c223d] via-[#133357] to-[#1c4673] p-5 text-white shadow-xl"
              : activeFx === "night"
                ? "relative overflow-hidden rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#1e293b] p-5 text-white shadow-xl"
                : "relative overflow-hidden rounded-3xl border border-sky-200/80 bg-gradient-to-br from-[#e0f2fe] via-[#f0f9ff] to-[#fef9c3]/65 p-5 text-[#0f172a] shadow-lg"
            : "stamp relative overflow-hidden p-4";

  return (
    <section className={cardSurfaceClass} aria-labelledby="weather-title">
      <WeatherAtmosphereOverlay activeFx={activeFx} intensity={cfg.rainIntensity} />

      <div className="relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 id="weather-title" className="text-xl font-extrabold">
              {tr("الطقس في رهط")}
            </h2>
            {isRainMode ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-400/25 px-2.5 py-0.5 text-xs font-extrabold text-sky-100 ring-1 ring-sky-300/40">
                🌧️ {tr("أجواء ماطرة متحركة")}
              </span>
            ) : null}
          </div>

          {cfg.showSimToggle ? (
            <button
              type="button"
              onClick={() => setSimRain((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold transition ${
                simRain
                  ? "bg-sky-400 text-[#09152b] shadow-sm"
                  : isDarkCard
                    ? "bg-white/15 text-white hover:bg-white/25"
                    : "bg-paper/85 text-ink ring-1 ring-line hover:bg-paper"
              }`}
              title={tr("معاينة أنيميشن المطر الحي في رهط")}
            >
              <CloudRain className="size-3.5" aria-hidden />
              {simRain ? tr("إيقاف معاينة المطر") : tr("🌧️ معاينة أنيميشن المطر")}
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-4">
          <span
            className={`grid size-16 shrink-0 place-items-center rounded-2xl shadow-sm ${
              isDarkCard
                ? "bg-white/15 text-amber-300 ring-1 ring-white/20"
                : "bg-primary-soft text-primary-ink ring-1 ring-primary-deep/30"
            }`}
          >
            {isRainMode ? (
              <CloudRain className="size-9 animate-bounce text-sky-300" aria-hidden />
            ) : (
              <WeatherIcon code={weather.code} isDay={weather.isDay} className="size-9" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-4xl font-extrabold leading-none tracking-tight" dir="ltr">
              {trv(weather.temp)}°
            </p>
            <p className={`mt-1 text-sm font-extrabold ${isDarkCard ? "text-sky-100" : ""}`}>
              {simRain ? tr("زخات مطر وأجواء شتوية في رهط") : weatherLabel(weather.code)}
            </p>
          </div>

          <div
            className={`shrink-0 rounded-2xl px-3 py-2 text-sm font-extrabold ${
              isDarkCard ? "bg-white/10 text-white" : "bg-paper/75 text-ink ring-1 ring-line/60"
            }`}
          >
            <p>
              {tr("العظمى")} <bdi dir="ltr">{trv(weather.high)}°</bdi>
            </p>
            <p className={isDarkCard ? "text-white/80" : "text-muted"}>
              {tr("الصغرى")} <bdi dir="ltr">{trv(weather.low)}°</bdi>
            </p>
          </div>
        </div>

        <ul className="mt-3 flex flex-wrap gap-2 text-xs font-extrabold">
          {(weather.rainChance !== null || simRain) ? (
            <li
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${
                isDarkCard
                  ? "bg-sky-400/20 text-sky-100 ring-1 ring-sky-300/30"
                  : "chip"
              }`}
            >
              <Umbrella className="size-3.5" aria-hidden />
              {tr("احتمال المطر اليوم")}{" "}
              <bdi dir="ltr">{simRain ? "85" : trv(weather.rainChance)}%</bdi>
            </li>
          ) : null}
          {weather.feelsLike !== null ? (
            <li
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${
                isDarkCard ? "bg-white/12 text-white" : "chip"
              }`}
            >
              {tr("الإحساس")} <bdi dir="ltr">{trv(weather.feelsLike)}°</bdi>
            </li>
          ) : null}
          {weather.humidity !== null ? (
            <li
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${
                isDarkCard ? "bg-white/12 text-white" : "chip"
              }`}
            >
              <Droplets className="size-3.5" aria-hidden />
              {tr("الرطوبة")} <bdi dir="ltr">{trv(weather.humidity)}%</bdi>
            </li>
          ) : null}
          {weather.wind !== null ? (
            <li
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${
                isDarkCard ? "bg-white/12 text-white" : "chip"
              }`}
            >
              <Wind className="size-3.5" aria-hidden />
              {tr("الرياح")} <bdi dir="ltr">{trv(weather.wind)}</bdi> {tr("كم/س")}
            </li>
          ) : null}
        </ul>

        {weather.hours.length > 0 ? (
          <ul className="scroll-row -mx-4 mt-3.5 px-4" aria-label={tr("الساعات القادمة")}>
            {weather.hours.map((h) => {
              const hour = Number(h.time.slice(11, 13));
              return (
                <li
                  key={h.time}
                  className={`flex w-16 shrink-0 flex-col items-center rounded-2xl px-1.5 py-2 transition ${
                    isDarkCard
                      ? "bg-white/10 text-white ring-1 ring-white/15"
                      : "bg-paper/80 text-ink ring-1 ring-line/60"
                  }`}
                >
                  <span className="text-xs font-bold" dir="ltr">
                    {hourLabel(h.time)}
                  </span>
                  <WeatherIcon
                    code={simRain ? 61 : h.code}
                    isDay={hour >= 6 && hour < 18}
                    className="my-1 size-5"
                  />
                  <span className="font-extrabold" dir="ltr">
                    {trv(h.temp)}°
                  </span>
                  {h.rain !== null && h.rain > 0 ? (
                    <span
                      className={`text-[11px] font-bold ${
                        isDarkCard ? "text-sky-200" : "text-muted"
                      }`}
                      dir="ltr"
                    >
                      {trv(h.rain)}%
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
        <OpenMeteoCredit lightText={isDarkCard} />
      </div>
    </section>
  );
}

export function PrayerCard({ serverNow }: { serverNow: number }) {
  const now = useTick(serverNow);
  const st = useSiteSettings();
  const cfg = useMemo(() => parseWeatherPrayerStyleConfig(st.quickLinks), [st.quickLinks]);
  const slots = prayerDay(now);
  const next = nextPrayer(now);

  const isGoldStyle = cfg.style === "mosque-gold";
  const isNightRadar = cfg.style === "night-radar";
  const isSceneStyle = cfg.style === "scene-animated" || cfg.style === "glass-modern";

  const wrapClass = isNightRadar
    ? "relative overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-br from-[#0b1325] via-[#13203d] to-[#1e293b] p-5 text-white shadow-xl"
    : isGoldStyle
      ? "relative overflow-hidden rounded-3xl border-2 border-[#d9a92a] bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#374151] p-5 text-white shadow-xl"
      : isSceneStyle
        ? "stamp relative overflow-hidden rounded-3xl border border-primary-deep/35 bg-gradient-to-br from-paper via-paper to-primary-soft/35 p-5 shadow-lg"
        : "stamp p-4";

  const isDarkPrayer = isNightRadar || isGoldStyle;

  return (
    <section className={wrapClass} aria-labelledby="prayer-title">
      {/* Subtle Mosque Dome / Crescent Decorative Glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-12 -left-12 size-36 rounded-full bg-primary/15 blur-2xl"
      />

      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-primary text-base text-[#111827] shadow-xs">
              🕌
            </span>
            <h2 id="prayer-title" className="text-xl font-extrabold">
              {tr("أوقات الصلاة في رهط")}
            </h2>
          </div>
          <p className={`mt-1 text-sm font-bold ${isDarkPrayer ? "text-amber-200/85" : "text-muted"}`}>
            {new Intl.DateTimeFormat("ar-u-nu-latn", {
              timeZone: "Asia/Jerusalem",
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date(now))}
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-primary-deep bg-primary px-3.5 py-1.5 text-xs font-extrabold text-[#111827] shadow-sm">
          <Sparkles className="size-3.5" aria-hidden />
          <span>
            {tr("الصلاة القادمة:")} {trv(next.name)} ({countdownAr(next.at - now)})
          </span>
        </div>
      </div>

      <ul className="relative z-10 mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
        {slots.map((s) => {
          const active = s.key === next.key && s.at === next.at;
          return (
            <li
              key={s.key}
              className={
                active
                  ? "relative overflow-hidden rounded-2xl border-2 border-primary-deep bg-primary px-2.5 py-3 text-center text-[#111827] shadow-md transition-transform scale-[1.02]"
                  : isDarkPrayer
                    ? "rounded-2xl border border-white/12 bg-white/8 px-2.5 py-3 text-center text-white transition hover:bg-white/12"
                    : "rounded-2xl border border-line bg-surface/85 px-2.5 py-3 text-center text-ink transition hover:border-primary-deep/50"
              }
              aria-current={active ? "true" : undefined}
            >
              {active ? (
                <span className="mb-1 inline-block rounded-full bg-[#111827]/15 px-2 py-0.5 text-[10px] font-extrabold">
                  {tr("القادمة")}
                </span>
              ) : null}
              <span className="block text-sm font-extrabold">{trv(s.name)}</span>
              <span className="mt-0.5 block text-xl font-extrabold leading-tight" dir="ltr">
                {formatPrayerTime(s.at)}
              </span>
            </li>
          );
        })}
      </ul>

      <p className={`relative z-10 mt-3 text-xs font-semibold ${isDarkPrayer ? "text-white/70" : "text-muted"}`}>
        {tr("محسوبة لموقع رهط ·")} {trv(PRAYER_METHOD_LABEL)}
        {tr(". قد تختلف دقيقة أو دقيقتين عن تقويم مسجدك.")}
      </p>
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
          aria-label={tr("الطقس في رهط: {0} درجة، {1}", weather.temp, weatherLabel(weather.code))}
        >
          <WeatherIcon code={weather.code} isDay={weather.isDay} className="size-5" />
          <bdi dir="ltr">{trv(weather.temp)}°</bdi>
          <span className="text-muted">{weatherLabel(weather.code)}</span>
        </Link>
      ) : null}
      <Link to="/today" className="today-chip">
        <Moon className="size-5" aria-hidden />
        <span>
          {trv(next.name)} <bdi dir="ltr">{formatPrayerTime(next.at)}</bdi>
        </span>
        <span className="text-muted">{countdownAr(next.at - now)}</span>
      </Link>
    </div>
  );
}
