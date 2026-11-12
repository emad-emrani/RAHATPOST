import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { NewsLead, NewsUnavailable } from "@/components/news";
import { NewsImage } from "@/components/news-image";
import { ChevronLeft, RefreshCw, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getSportsNews } from "@/lib/news/api";
import { getMatchesBoard, type MatchesBoardData, type MatchItem } from "@/lib/news/matches";
import { relativeTimeAr, useNow } from "@/lib/news/format";
import { breadcrumbLd, seo } from "@/lib/seo";
import { tr, trv } from "@/lib/i18n/core";
import { localized } from "@/lib/i18n/localize";

export const Route = createFileRoute("/sports-news/")({
  head: () =>
    seo({
      title: tr("نتائج المباريات المباشرة وأخبار الرياضة اليوم · رهط بوست"),
      description: tr(
        "نتائج المباريات المباشرة لحظة بلحظة (الدوري الإسباني لا ليغا، دوري أبطال أوروبا، الدوري الإنجليزي، والدوري المحلي) وآخر الأخبار الرياضية بالعربية على رهط بوست.",
      ),
      path: "/sports-news",
      keywords: [
        "نتائج المباريات مباشر",
        "نتائج مباريات اليوم",
        "الدوري الإسباني لا ليغا",
        "دوري أبطال أوروبا",
        "أخبار الرياضة رهط بوست",
      ],
      jsonLd: [breadcrumbLd([{ name: tr("نتائج المباريات والرياضة"), path: "/sports-news" }])],
    }),
  loader: async () => {
    const [sportsRaw, matches] = await Promise.all([
      getSportsNews(),
      getMatchesBoard().catch(() => null),
    ]);
    const sports = await localized(
      sportsRaw,
      (d) => [{ items: d.items, fields: ["title", "summary"] }],
      "auto",
    );
    return { ...sports, matches };
  },
  staleTime: 60_000,
  component: SportsNewsPage,
});

function SportsNewsPage() {
  const data = Route.useLoaderData();
  const now = useNow(data.now);
  return (
    <Shell>
      <h1 className="mb-1 text-2xl font-bold">{tr("نتائج المباريات المباشرة والرياضة")}</h1>
      <p className="mb-4 font-semibold text-muted">
        {tr("نتائج ومواعيد المباريات الحية في الدوريات العالمية والمحلية وآخر الأخبار الرياضية")}
      </p>

      <FullMatchesBoard initial={data.matches} />

      <h2 className="mb-3 text-xl font-extrabold">{tr("آخر الأخبار الرياضية")}</h2>
      {data.items.length === 0 ? (
        <NewsUnavailable />
      ) : (
        <>
          <NewsLead item={data.items[0]} now={now} />
          <ul className="flex flex-col gap-3">
            {data.items.slice(1).map((item) => (
              <li key={item.slug}>
                <Link
                  to="/news/$slug"
                  params={{ slug: item.slug }}
                  className="stamp press flex items-start gap-3 p-3"
                >
                  <NewsImage item={item} className="size-22 rounded-xl" iconClassName="size-7" />
                  <span className="min-w-0 flex-1">
                    <span className={item.fromHe ? "chip" : "chip chip-deep"}>
                      {item.fromHe
                        ? item.he
                          ? tr("بالعبرية")
                          : tr("ترجمة آلية")
                        : tr("رياضة")}
                    </span>
                    <span dir="auto" className="mt-1 line-clamp-3 block font-bold leading-snug">
                      {trv(item.title)}
                    </span>
                    <span className="text-sm font-semibold text-muted">
                      {relativeTimeAr(item.publishedAt, now)} · {trv(item.source)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-4 text-sm font-semibold text-muted">
        {tr("العناوين ومقتطفات قصيرة من مصادرها، مع رابط للخبر الأصلي.")}
      </p>
    </Shell>
  );
}

type DayTab = "today" | "yesterday" | "tomorrow" | "upcoming" | "live";

export interface MatchGoalEvent {
  minute: string;
  scorer: string;
  penalty?: boolean;
  ownGoal?: boolean;
}

export interface MatchCardEvent {
  minute: string;
  player: string;
  card: "yellow" | "red";
}

export interface LiveMatchDetails {
  liveClockSeconds?: number;
  liveMinuteText?: string;
  periodTextAr?: string;
  isHalftime?: boolean;
  homeGoals: MatchGoalEvent[];
  awayGoals: MatchGoalEvent[];
  homeYellowCards: number;
  homeRedCards: number;
  awayYellowCards: number;
  awayRedCards: number;
  homeCardEvents: MatchCardEvent[];
  awayCardEvents: MatchCardEvent[];
}

export type RichMatchItem = MatchItem & {
  liveDetails?: LiveMatchDetails;
};

interface CustomMatchMetaPayload {
  hg?: { m: string; s: string; p?: boolean; og?: boolean }[];
  ag?: { m: string; s: string; p?: boolean; og?: boolean }[];
  hy?: number;
  hr?: number;
  ay?: number;
  ar?: number;
  hc?: { m: string; pl: string; c: "yellow" | "red" }[];
  ac?: { m: string; pl: string; c: "yellow" | "red" }[];
  min?: string;
  per?: string;
}

function pickBestDayTab(matches: MatchItem[], leagueId: string): DayTab {
  const pool = leagueId === "all" ? matches : matches.filter((m) => m.leagueId === leagueId);
  if (pool.some((m) => m.status === "in")) return "today";
  if (pool.some((m) => m.dayKey === "today")) return "today";
  if (pool.some((m) => m.dayKey === "tomorrow")) return "tomorrow";
  if (pool.some((m) => m.dayKey === "yesterday")) return "yesterday";
  if (pool.some((m) => m.dayKey === "upcoming")) return "upcoming";
  return "today";
}

function TeamCrest({ name, logo }: { name: string; logo?: string }) {
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        loading="lazy"
        className="size-7 shrink-0 object-contain"
      />
    );
  }
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-extrabold text-primary-ink">
      {name.trim().slice(0, 2)}
    </span>
  );
}

function extractMatchStream(m: MatchItem): {
  streamUrl?: string;
  channel?: string;
  cleanNote?: string;
  meta?: CustomMatchMetaPayload;
} {
  const rawStream = (m as { streamUrl?: string }).streamUrl?.trim();
  const rawChannel = (m as { channel?: string }).channel?.trim();
  let note = (m.note ?? "").trim();
  let urlFromNote: string | undefined;
  let chanFromNote: string | undefined;
  let meta: CustomMatchMetaPayload | undefined;

  const metaMatch = note.match(/\{\{META:(\{[\s\S]*?\})\}\}/);
  if (metaMatch) {
    try {
      meta = JSON.parse(metaMatch[1]) as CustomMatchMetaPayload;
    } catch {
      // ignore invalid meta json
    }
    note = note.replace(metaMatch[0], "").trim();
  }

  const chanMatch = note.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (chanMatch) {
    chanFromNote = chanMatch[1].trim();
    note = chanMatch[2].trim();
  }
  const urlMatch = note.match(/https?:\/\/\S+/i);
  if (urlMatch) {
    urlFromNote = urlMatch[0].trim();
    note = note.replace(urlMatch[0], "").replace(/^\|\s*|\s*\|$/g, "").trim();
  }

  return {
    streamUrl: rawStream || urlFromNote || undefined,
    channel: rawChannel || chanFromNote || undefined,
    cleanNote: note || undefined,
    meta,
  };
}

function toEmbedStreamUrl(rawUrl: string): { type: "iframe" | "video"; src: string } {
  const url = rawUrl.trim();
  if (/\.(mp4|webm|ogg|m3u8)(\?.*)?$/i.test(url)) {
    return { type: "video", src: url };
  }
  const ytMatch =
    url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{6,})/i);
  if (ytMatch?.[1]) {
    return { type: "iframe", src: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0` };
  }
  if (/facebook\.com\/.+\/videos\//i.test(url) || /fb\.watch\//i.test(url)) {
    return {
      type: "iframe",
      src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false&autoplay=true`,
    };
  }
  const twitchMatch = url.match(/twitch\.tv\/([A-Za-z0-9_]+)/i);
  if (twitchMatch?.[1] && !url.includes("player.twitch.tv")) {
    const host = typeof window !== "undefined" ? window.location.hostname : "www.rahatpost.com";
    return {
      type: "iframe",
      src: `https://player.twitch.tv/?channel=${twitchMatch[1]}&parent=${host}`,
    };
  }
  return { type: "iframe", src: url };
}

function parseMinuteNumber(raw?: string): number | null {
  if (!raw) return null;
  const m = raw.match(/(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function resolveMatchDetails(m: RichMatchItem, meta?: CustomMatchMetaPayload): LiveMatchDetails {
  const base: LiveMatchDetails = m.liveDetails
    ? {
        ...m.liveDetails,
        homeGoals: [...(m.liveDetails.homeGoals ?? [])],
        awayGoals: [...(m.liveDetails.awayGoals ?? [])],
        homeCardEvents: [...(m.liveDetails.homeCardEvents ?? [])],
        awayCardEvents: [...(m.liveDetails.awayCardEvents ?? [])],
      }
    : {
        homeGoals: [],
        awayGoals: [],
        homeYellowCards: 0,
        homeRedCards: 0,
        awayYellowCards: 0,
        awayRedCards: 0,
        homeCardEvents: [],
        awayCardEvents: [],
      };

  if (meta) {
    if (Array.isArray(meta.hg) && meta.hg.length > 0) {
      base.homeGoals = meta.hg.map((g) => ({
        minute: g.m || "",
        scorer: g.s || "هدف",
        penalty: g.p,
        ownGoal: g.og,
      }));
    }
    if (Array.isArray(meta.ag) && meta.ag.length > 0) {
      base.awayGoals = meta.ag.map((g) => ({
        minute: g.m || "",
        scorer: g.s || "هدف",
        penalty: g.p,
        ownGoal: g.og,
      }));
    }
    if (typeof meta.hy === "number") base.homeYellowCards = meta.hy;
    if (typeof meta.hr === "number") base.homeRedCards = meta.hr;
    if (typeof meta.ay === "number") base.awayYellowCards = meta.ay;
    if (typeof meta.ar === "number") base.awayRedCards = meta.ar;
    if (Array.isArray(meta.hc) && meta.hc.length > 0) {
      base.homeCardEvents = meta.hc.map((c) => ({
        minute: c.m || "",
        player: c.pl || "",
        card: c.c,
      }));
    }
    if (Array.isArray(meta.ac) && meta.ac.length > 0) {
      base.awayCardEvents = meta.ac.map((c) => ({
        minute: c.m || "",
        player: c.pl || "",
        card: c.c,
      }));
    }
    if (meta.min) base.liveMinuteText = meta.min;
    if (meta.per) base.periodTextAr = meta.per;
  }

  base.homeYellowCards = Math.max(
    base.homeYellowCards,
    base.homeCardEvents.filter((c) => c.card === "yellow").length,
  );
  base.homeRedCards = Math.max(
    base.homeRedCards,
    base.homeCardEvents.filter((c) => c.card === "red").length,
  );
  base.awayYellowCards = Math.max(
    base.awayYellowCards,
    base.awayCardEvents.filter((c) => c.card === "yellow").length,
  );
  base.awayRedCards = Math.max(
    base.awayRedCards,
    base.awayCardEvents.filter((c) => c.card === "red").length,
  );

  return base;
}

function MatchRowCard({ m, showLeagueBadge }: { m: RichMatchItem; showLeagueBadge?: boolean }) {
  const isLive = m.status === "in";
  const isDone = m.status === "post";
  const { streamUrl, channel, cleanNote, meta } = extractMatchStream(m);
  const details = useMemo(() => resolveMatchDetails(m, meta), [m, meta]);
  const [watchOpen, setWatchOpen] = useState(false);
  const embed = streamUrl ? toEmbedStreamUrl(streamUrl) : null;

  // Compute initial live seconds for the real-time match clock
  const initialLiveSeconds = useMemo(() => {
    if (!isLive) return 0;
    if (typeof details.liveClockSeconds === "number" && details.liveClockSeconds > 0) {
      return Math.floor(details.liveClockSeconds);
    }
    const minFromText =
      parseMinuteNumber(details.liveMinuteText) ??
      parseMinuteNumber(m.statusTextAr);
    if (minFromText !== null && minFromText > 0) {
      return minFromText * 60;
    }
    const elapsedMs = Date.now() - Date.parse(m.kickoffIso);
    if (Number.isFinite(elapsedMs) && elapsedMs > 0 && elapsedMs < 130 * 60 * 1000) {
      return Math.min(90 * 60, Math.floor(elapsedMs / 1000));
    }
    return 45 * 60;
  }, [isLive, details.liveClockSeconds, details.liveMinuteText, m.statusTextAr, m.kickoffIso]);

  const [liveSec, setLiveSec] = useState<number>(initialLiveSeconds);

  useEffect(() => {
    setLiveSec(initialLiveSeconds);
  }, [initialLiveSeconds]);

  useEffect(() => {
    if (!isLive || details.isHalftime) return;
    const timer = setInterval(() => {
      setLiveSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isLive, details.isHalftime]);

  const formattedLiveClock = useMemo(() => {
    if (!isLive) return "";
    if (details.isHalftime || m.statusTextAr.includes("استراحة")) {
      return tr("استراحة HT");
    }
    if (details.liveMinuteText && details.liveMinuteText.includes("+")) {
      const secPart = String(liveSec % 60).padStart(2, "0");
      return `${details.liveMinuteText}:${secPart}`;
    }
    const mins = Math.floor(liveSec / 60);
    const secs = String(liveSec % 60).padStart(2, "0");
    return `${String(mins).padStart(2, "0")}:${secs}`;
  }, [isLive, details.isHalftime, details.liveMinuteText, m.statusTextAr, liveSec]);

  return (
    <div
      className={`flex flex-col gap-1 rounded-2xl border px-2.5 py-2 transition ${
        isLive
          ? "border-alert/50 bg-alert/5 shadow-xs"
          : "border-line bg-paper hover:border-ink/25"
      }`}
    >
      {showLeagueBadge ? (
        <div className="flex items-center justify-between text-[10px] leading-none font-bold text-muted">
          <span className="inline-flex items-center gap-1 truncate">
            <span>{m.leagueBadge}</span>
            <span className="truncate">{trv(m.leagueNameAr)}</span>
          </span>
          <span className="shrink-0">{m.dateLabelAr}</span>
        </div>
      ) : null}

      {/* Compact single-height match row: Team + inline cards + micro goals under name */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
        {/* Home team (Right in RTL) */}
        <div className="flex min-w-0 items-center gap-1.5">
          <TeamCrest name={m.homeTeam} logo={m.homeLogo} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <span className="truncate text-xs font-extrabold text-ink sm:text-sm">
                {trv(m.homeTeam)}
              </span>
              {/* Compact inline cards per team */}
              <span
                dir="ltr"
                className="inline-flex shrink-0 items-center gap-0.5 text-[9px] leading-none font-extrabold"
                title={tr("البطاقات الصفراء والحمراء")}
              >
                <span
                  className={`inline-flex items-center rounded px-1 py-0.5 ${
                    details.homeYellowCards > 0
                      ? "bg-[#FEF08A] text-[#854D0E]"
                      : "bg-surface text-muted/70"
                  }`}
                >
                  🟨{details.homeYellowCards}
                </span>
                {details.homeRedCards > 0 ? (
                  <span className="inline-flex items-center rounded bg-[#FEE2E2] px-1 py-0.5 text-[#991B1B]">
                    🟥{details.homeRedCards}
                  </span>
                ) : null}
              </span>
            </div>

            {/* Micro compact goals list right below team name without increasing box height */}
            {details.homeGoals.length > 0 ? (
              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[9px] leading-tight font-bold text-muted">
                {details.homeGoals.map((g, idx) => (
                  <span
                    key={`hg-${idx}-${g.minute}-${g.scorer}`}
                    className="inline-flex items-center gap-0.5 truncate"
                  >
                    <span className="text-[8px]">⚽</span>
                    <span className="truncate text-ink/90">{trv(g.scorer)}</span>
                    {g.minute ? (
                      <span dir="ltr" className="font-extrabold text-primary-ink">
                        {g.minute}
                      </span>
                    ) : null}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Center score / kickoff + micro live match clock */}
        <div className="flex flex-col items-center justify-center px-1.5">
          {m.status === "pre" ? (
            <span
              dir="ltr"
              className="rounded-lg bg-surface px-2 py-0.5 text-[11px] font-extrabold text-ink"
            >
              {m.kickoffTimeAr}
            </span>
          ) : (
            <div
              dir="ltr"
              className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-sm leading-tight font-extrabold ${
                isLive ? "bg-alert text-white" : "bg-surface text-ink"
              }`}
            >
              <span>{m.homeScore ?? 0}</span>
              <span className="opacity-60">:</span>
              <span>{m.awayScore ?? 0}</span>
            </div>
          )}

          <span
            dir="ltr"
            className={`mt-0.5 inline-flex items-center gap-1 text-[9px] leading-none font-extrabold ${
              isLive ? "text-alert" : isDone ? "text-muted" : "text-primary-ink"
            }`}
          >
            {isLive ? (
              <>
                <span className="size-1.5 animate-ping rounded-full bg-alert" />
                <span>⏱️ {formattedLiveClock}</span>
              </>
            ) : (
              <span>{trv(m.statusTextAr)}</span>
            )}
          </span>
        </div>

        {/* Away team (Left in RTL) */}
        <div className="flex min-w-0 items-center justify-end gap-1.5 text-left">
          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center justify-end gap-1">
              {/* Compact inline cards per team */}
              <span
                dir="ltr"
                className="inline-flex shrink-0 items-center gap-0.5 text-[9px] leading-none font-extrabold"
                title={tr("البطاقات الصفراء والحمراء")}
              >
                {details.awayRedCards > 0 ? (
                  <span className="inline-flex items-center rounded bg-[#FEE2E2] px-1 py-0.5 text-[#991B1B]">
                    🟥{details.awayRedCards}
                  </span>
                ) : null}
                <span
                  className={`inline-flex items-center rounded px-1 py-0.5 ${
                    details.awayYellowCards > 0
                      ? "bg-[#FEF08A] text-[#854D0E]"
                      : "bg-surface text-muted/70"
                  }`}
                >
                  🟨{details.awayYellowCards}
                </span>
              </span>
              <span className="truncate text-xs font-extrabold text-ink sm:text-sm">
                {trv(m.awayTeam)}
              </span>
            </div>

            {/* Micro compact goals list right below away team name */}
            {details.awayGoals.length > 0 ? (
              <div className="mt-0.5 flex flex-wrap items-center justify-end gap-x-1.5 gap-y-0.5 text-[9px] leading-tight font-bold text-muted">
                {details.awayGoals.map((g, idx) => (
                  <span
                    key={`ag-${idx}-${g.minute}-${g.scorer}`}
                    className="inline-flex items-center gap-0.5 truncate"
                  >
                    {g.minute ? (
                      <span dir="ltr" className="font-extrabold text-primary-ink">
                        {g.minute}
                      </span>
                    ) : null}
                    <span className="truncate text-ink/90">{trv(g.scorer)}</span>
                    <span className="text-[8px]">⚽</span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <TeamCrest name={m.awayTeam} logo={m.awayLogo} />
        </div>
      </div>

      {channel || cleanNote || streamUrl ? (
        <div className="mt-0.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-line/50 pt-1">
          <div className="flex flex-wrap items-center gap-1 text-[10px] leading-none font-bold text-muted">
            {channel ? (
              <span className="rounded bg-surface px-1.5 py-0.5 font-extrabold text-ink">
                📡 {trv(channel)}
              </span>
            ) : null}
            {cleanNote ? <span className="truncate">{trv(cleanNote)}</span> : null}
          </div>

          {streamUrl ? (
            <button
              type="button"
              onClick={() => setWatchOpen((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-extrabold text-white shadow-2xs transition ${
                watchOpen ? "bg-ink" : "bg-[#DC2626] hover:bg-[#B91C1C]"
              }`}
            >
              <span className="size-1.5 animate-ping rounded-full bg-white" />
              {watchOpen ? tr("إغلاق ✕") : tr("📺 بث مباشر")}
            </button>
          ) : null}
        </div>
      ) : null}

      {watchOpen && streamUrl && embed ? (
        <div className="mt-1.5 overflow-hidden rounded-2xl border border-line bg-black text-white shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-ink px-3 py-1.5 text-xs font-extrabold text-paper">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 animate-ping rounded-full bg-[#DC2626]" />
              {tr("بث مباشر:")} {trv(m.homeTeam)} × {trv(m.awayTeam)}
            </span>
            <a
              href={streamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white hover:bg-white/25"
            >
              {tr("فتح في نافذة مستقلة ↗")}
            </a>
          </div>
          <div className="relative aspect-video w-full bg-black">
            {embed.type === "video" ? (
              <video
                src={embed.src}
                controls
                autoPlay
                playsInline
                className="h-full w-full object-contain"
              />
            ) : (
              <iframe
                src={embed.src}
                title={`${m.homeTeam} vs ${m.awayTeam}`}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                allowFullScreen
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const CLIENT_TEAM_AR: Record<string, string> = {
  "Real Madrid": "ريال مدريد",
  "Barcelona": "برشلونة",
  "FC Barcelona": "برشلونة",
  "Atletico Madrid": "أتلتيكو مدريد",
  "Atlético Madrid": "أتلتيكو مدريد",
  "Athletic Club": "أتلتيك بلباو",
  "Athletic Bilbao": "أتلتيك بلباو",
  "Real Sociedad": "ريال سوسيداد",
  "Villarreal": "فياريال",
  "Real Betis": "ريال بيتيس",
  "Sevilla": "إشبيلية",
  "Valencia": "فالنسيا",
  "Girona": "جيرونا",
  "Celta Vigo": "سيلتا فيغو",
  "Osasuna": "أوساسونا",
  "Getafe": "خيتافي",
  "Rayo Vallecano": "رايو فاليكانو",
  "Mallorca": "ريال مايوركا",
  "RCD Mallorca": "ريال مايوركا",
  "Las Palmas": "لاس بالماس",
  "Alaves": "ألافيس",
  "Deportivo Alavés": "ألافيس",
  "Espanyol": "إسبانيول",
  "Leganes": "ليغانيس",
  "Real Valladolid": "بلد الوليد",
  "Manchester City": "مانشستر سيتي",
  "Man City": "مانشستر سيتي",
  "Liverpool": "ليفربول",
  "Arsenal": "أرسنال",
  "Chelsea": "تشيلسي",
  "Manchester United": "مانشستر يونايتد",
  "Man United": "مانشستر يونايتد",
  "Tottenham Hotspur": "توتنهام",
  "Tottenham": "توتنهام",
  "Newcastle United": "نيوكاسل يونايتد",
  "Aston Villa": "أستون فيلا",
  "Brighton": "برايتون",
  "Brighton & Hove Albion": "برايتون",
  "West Ham United": "وست هام",
  "Everton": "إيفرتون",
  "Fulham": "فولهام",
  "Brentford": "برينتفورد",
  "Crystal Palace": "كريستال بالاس",
  "Nottingham Forest": "نوتنغهام فورست",
  "Wolverhampton Wanderers": "وولفرهامبتون",
  "Bournemouth": "بورنموث",
  "AFC Bournemouth": "بورنموث",
  "Leicester City": "ليستر سيتي",
  "Ipswich Town": "إبسويتش تاون",
  "Southampton": "ساوثهامبتون",
  "Bayern Munich": "بايرن ميونخ",
  "Borussia Dortmund": "بوروسيا دورتموند",
  "Bayer Leverkusen": "باير ليفركوزن",
  "RB Leipzig": "لايبزيغ",
  "VfB Stuttgart": "شتوتغارت",
  "Eintracht Frankfurt": "آينتراخت فرانكفورت",
  "Paris Saint-Germain": "باريس سان جيرمان",
  "PSG": "باريس سان جيرمان",
  "Marseille": "مارسيليا",
  "Olympique Marseille": "مارسيليا",
  "AS Monaco": "موناكو",
  "Monaco": "موناكو",
  "Lyon": "ليون",
  "Lille": "ليل",
  "Inter Milan": "إنتر ميلان",
  "Internazionale": "إنتر ميلان",
  "AC Milan": "ميلان",
  "Milan": "ميلان",
  "Juventus": "يوفنتوس",
  "Napoli": "نابولي",
  "AS Roma": "روما",
  "Roma": "روما",
  "Lazio": "لاتسيو",
  "Atalanta": "أتالانتا",
  "Fiorentina": "فيورنتينا",
  "Bologna": "بولونيا",
  "Benfica": "بنفيكا",
  "Sporting CP": "سبورتينغ لشبونة",
  "FC Porto": "بورتو",
  "Porto": "بورتو",
  "Ajax": "أياكس",
  "PSV Eindhoven": "آيندهوفن",
  "Feyenoord": "فينورد",
  "Celtic": "سيلتيك",
  "Club Brugge": "كلوب بروج",
  "Galatasaray": "غلطة سراي",
  "Fenerbahce": "فنربخشة",
  "Al Hilal": "الهلال",
  "Al-Hilal": "الهلال",
  "Al Nassr": "النصر",
  "Al-Nassr": "النصر",
  "Al Ittihad": "الاتحاد",
  "Al-Ittihad": "الاتحاد",
  "Al Ahli": "الأهلي",
  "Al-Ahli": "الأهلي",
  "Maccabi Tel Aviv": "مكابي تل أبيب",
  "Maccabi Haifa": "مكابي حيفا",
  "Hapoel Beer Sheva": "هبوعيل بئر السبع",
  "Hapoel Be\x27er Sheva": "هبوعيل بئر السبع",
  "Beitar Jerusalem": "بيتار القدس",
  "Bnei Sakhnin": "اتحاد أبناء سخنين",
  "Ihud Bnei Sakhnin": "اتحاد أبناء سخنين",
  "Maccabi Bnei Reineh": "مكابي أبناء الرينة",
  "Hapoel Haifa": "هبوعيل حيفا",
  "Maccabi Netanya": "مكابي نتانيا",
  "Hapoel Jerusalem": "هبوعيل القدس",
  "MS Ashdod": "م.س أشدود",
  "Ironi Kiryat Shmona": "كريات شمونة",
  "Ironi Tiberias": "عيروني طبريا",
  "Maccabi Petah Tikva": "مكابي بيتح تكفا",
  "Hapoel Hadera": "هبوعيل الخضيرة",
  "Hapoel Tel Aviv": "هبوعيل تل أبيب",
};

const CLIENT_PLAYER_AR: Record<string, string> = {
  "Kylian Mbappé": "كيليان مبابي",
  "Kylian Mbappe": "كيليان مبابي",
  "Vinícius Júnior": "فينيسيوس جونيور",
  "Vinicius Junior": "فينيسيوس جونيور",
  "Jude Bellingham": "جود بيلينغهام",
  "Rodrygo": "رودريغو",
  "Federico Valverde": "فالفيردي",
  "Luka Modric": "لوكا مودريتش",
  "Robert Lewandowski": "ليفاندوفسكي",
  "Lamine Yamal": "لامين يامال",
  "Raphinha": "رافينيا",
  "Pedri": "بيدري",
  "Gavi": "غافي",
  "Dani Olmo": "داني أولمو",
  "Ferran Torres": "فيران توريس",
  "Fermin Lopez": "فيرمين لوبيز",
  "Fermín López": "فيرمين لوبيز",
  "Antoine Griezmann": "أنطوان غريزمان",
  "Julian Alvarez": "جوليان ألفاريز",
  "Julián Álvarez": "جوليان ألفاريز",
  "Alexander Sorloth": "سورلوث",
  "Mohamed Salah": "محمد صلاح",
  "Erling Haaland": "إيرلينغ هالاند",
  "Phil Foden": "فيل فودين",
  "Kevin De Bruyne": "دي بروين",
  "Bukayo Saka": "بوكايو ساكا",
  "Kai Havertz": "كاي هافيرتز",
  "Martin Odegaard": "مارتن أوديغارد",
  "Declan Rice": "ديكلان رايس",
  "Cole Palmer": "كول بالمر",
  "Nicolas Jackson": "نيكولاس جاكسون",
  "Bruno Fernandes": "برونو فيرنانديز",
  "Marcus Rashford": "ماركوس راشفورد",
  "Amad Diallo": "أماد ديالو",
  "Son Heung-Min": "سون هيونغ مين",
  "Alexander Isak": "ألكسندر إيزاك",
  "Ollie Watkins": "أولي واتكينز",
  "Luis Díaz": "لويس دياز",
  "Luis Diaz": "لويس دياز",
  "Cody Gakpo": "كودي جاكبو",
  "Darwin Núñez": "داروين نونيز",
  "Harry Kane": "هاري كين",
  "Jamal Musiala": "جمال موسيالا",
  "Michael Olise": "مايكل أوليسي",
  "Florian Wirtz": "فلوريان فيرتز",
  "Ousmane Dembélé": "عثمان ديمبيلي",
  "Ousmane Dembele": "عثمان ديمبيلي",
  "Bradley Barcola": "برادلي باركولا",
  "Achraf Hakimi": "أشرف حكيمي",
  "Lautaro Martínez": "لاوتارو مارتينيز",
  "Lautaro Martinez": "لاوتارو مارتينيز",
  "Marcus Thuram": "ماركوس تورام",
  "Rafael Leão": "رافائيل لياو",
  "Christian Pulisic": "كريستيان بوليسيتش",
  "Dusan Vlahovic": "دوشان فلاهوفيتش",
  "Khvicha Kvaratskhelia": "كفاراتسخيليا",
  "Romelu Lukaku": "روميلو لوكاكو",
  "Cristiano Ronaldo": "كريستيانو رونالدو",
  "Sadio Mané": "ساديو ماني",
  "Karim Benzema": "كريم بنزيما",
  "Salem Al-Dawsari": "سالم الدوسري",
  "Aleksandar Mitrovic": "ميتروفيتش",
  "Riyad Mahrez": "رياض محرز",
  "Ivan Toney": "إيفان توني",
  "Eran Zahavi": "عيران زهافي",
  "Dor Turgeman": "دور ترجمان",
  "Dia Saba": "ضياء سبع",
  "Dean David": "دين دافيد",
  "Lior Refaelov": "ليئور رفائيلوف",
  "Yarden Shua": "يردين شوعا",
};

function trTeamClient(raw: string): string {
  const clean = raw.trim();
  if (!clean) return "";
  if (CLIENT_TEAM_AR[clean]) return CLIENT_TEAM_AR[clean];
  for (const [en, ar] of Object.entries(CLIENT_TEAM_AR)) {
    if (clean.toLowerCase() === en.toLowerCase()) return ar;
  }
  return clean;
}

function trPlayerClient(raw: string): string {
  const clean = raw.trim();
  if (!clean) return "";
  if (CLIENT_PLAYER_AR[clean]) return CLIENT_PLAYER_AR[clean];
  for (const [en, ar] of Object.entries(CLIENT_PLAYER_AR)) {
    if (clean.toLowerCase() === en.toLowerCase()) return ar;
  }
  return clean;
}

function clientFormatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function clientDayKey(iso: string): MatchItem["dayKey"] {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jerusalem",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const now = new Date();
    const dKey = fmt.format(new Date(iso));
    if (dKey === fmt.format(now)) return "today";
    if (dKey === fmt.format(new Date(now.getTime() - 86_400_000))) return "yesterday";
    if (dKey === fmt.format(new Date(now.getTime() + 86_400_000))) return "tomorrow";
    return "upcoming";
  } catch {
    return "today";
  }
}

function clientTimeAr(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      timeZone: "Asia/Jerusalem",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return "20:00";
  }
}

function clientShortDateAr(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      timeZone: "Asia/Jerusalem",
      weekday: "short",
      day: "numeric",
      month: "short",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

function buildCuratedRoundFallback(): RichMatchItem[] {
  const now = new Date();
  const todayIso = (h: number, m = 0, offsetDays = 0) => {
    const d = new Date(now.getTime() + offsetDays * 86_400_000);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const seeds: {
    id: string;
    leagueId: string;
    leagueNameAr: string;
    leagueBadge: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number | null;
    awayScore: number | null;
    status: "pre" | "in" | "post";
    kickoffIso: string;
    kickoffTimeAr: string;
    dayKey: MatchItem["dayKey"];
    channel?: string;
    liveDetails?: LiveMatchDetails;
  }[] = [
    {
      id: "cur-isr-1",
      leagueId: "isr.1",
      leagueNameAr: "الدوري الإسرائيلي",
      leagueBadge: "⚽",
      homeTeam: "هبوعيل بئر السبع",
      awayTeam: "مكابي حيفا",
      homeScore: null,
      awayScore: null,
      status: "pre",
      kickoffIso: todayIso(20, 30, 0),
      kickoffTimeAr: "20:30",
      dayKey: "today",
      channel: "Sport 5",
    },
    {
      id: "cur-isr-2",
      leagueId: "isr.1",
      leagueNameAr: "الدوري الإسرائيلي",
      leagueBadge: "⚽",
      homeTeam: "اتحاد أبناء سخنين",
      awayTeam: "مكابي أبناء الرينة",
      homeScore: null,
      awayScore: null,
      status: "pre",
      kickoffIso: todayIso(19, 45, 0),
      kickoffTimeAr: "19:45",
      dayKey: "today",
      channel: "Sport 1",
    },
    {
      id: "cur-isr-3",
      leagueId: "isr.1",
      leagueNameAr: "الدوري الإسرائيلي",
      leagueBadge: "⚽",
      homeTeam: "مكابي تل أبيب",
      awayTeam: "بيتار القدس",
      homeScore: null,
      awayScore: null,
      status: "pre",
      kickoffIso: todayIso(20, 30, 1),
      kickoffTimeAr: "20:30",
      dayKey: "tomorrow",
      channel: "Sport 5",
    },
    {
      id: "cur-esp-1",
      leagueId: "esp.1",
      leagueNameAr: "لا ليغا",
      leagueBadge: "🇪🇸",
      homeTeam: "ريال مدريد",
      awayTeam: "برشلونة",
      homeScore: null,
      awayScore: null,
      status: "pre",
      kickoffIso: todayIso(22, 0, 0),
      kickoffTimeAr: "22:00",
      dayKey: "today",
      channel: "beIN Sports 1",
    },
    {
      id: "cur-esp-2",
      leagueId: "esp.1",
      leagueNameAr: "لا ليغا",
      leagueBadge: "🇪🇸",
      homeTeam: "أتلتيكو مدريد",
      awayTeam: "ريال سوسيداد",
      homeScore: null,
      awayScore: null,
      status: "pre",
      kickoffIso: todayIso(21, 0, 1),
      kickoffTimeAr: "21:00",
      dayKey: "tomorrow",
      channel: "beIN Sports 3",
    },
    {
      id: "cur-ucl-1",
      leagueId: "uefa.champions",
      leagueNameAr: "أبطال أوروبا",
      leagueBadge: "🏆",
      homeTeam: "مانشستر سيتي",
      awayTeam: "بايرن ميونخ",
      homeScore: null,
      awayScore: null,
      status: "pre",
      kickoffIso: todayIso(22, 0, 0),
      kickoffTimeAr: "22:00",
      dayKey: "today",
      channel: "beIN Sports 1",
    },
    {
      id: "cur-ucl-2",
      leagueId: "uefa.champions",
      leagueNameAr: "أبطال أوروبا",
      leagueBadge: "🏆",
      homeTeam: "ليفربول",
      awayTeam: "باريس سان جيرمان",
      homeScore: null,
      awayScore: null,
      status: "pre",
      kickoffIso: todayIso(22, 0, 1),
      kickoffTimeAr: "22:00",
      dayKey: "tomorrow",
      channel: "beIN Sports 2",
    },
    {
      id: "cur-eng-1",
      leagueId: "eng.1",
      leagueNameAr: "البريميرليغ",
      leagueBadge: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
      homeTeam: "أرسنال",
      awayTeam: "تشيلسي",
      homeScore: null,
      awayScore: null,
      status: "pre",
      kickoffIso: todayIso(19, 30, 0),
      kickoffTimeAr: "19:30",
      dayKey: "today",
      channel: "beIN Sports 1",
    },
  ];
  return seeds.map((s) => ({
    ...s,
    statusTextAr: s.kickoffTimeAr,
    dateLabelAr: clientShortDateAr(s.kickoffIso),
  }));
}

function extractEspnStatNumber(competitor: any, statName: string): number {
  const stats: any[] = Array.isArray(competitor?.statistics) ? competitor.statistics : [];
  const found = stats.find((s) => s?.name === statName || s?.abbreviation === statName);
  if (!found) return 0;
  const val = Number(found.displayValue ?? found.value ?? 0);
  return Number.isFinite(val) ? val : 0;
}

function parseEspnDetailsIntoLiveDetails(
  comp: any,
  evStatus: any,
  home: any,
  away: any,
): LiveMatchDetails {
  const homeId = String(home?.id ?? home?.team?.id ?? "");
  const awayId = String(away?.id ?? away?.team?.id ?? "");

  const homeGoals: MatchGoalEvent[] = [];
  const awayGoals: MatchGoalEvent[] = [];
  const homeCardEvents: MatchCardEvent[] = [];
  const awayCardEvents: MatchCardEvent[] = [];

  const rawDetails: any[] = Array.isArray(comp?.details) ? comp.details : [];
  for (const d of rawDetails) {
    const teamId = String(d?.team?.id ?? "");
    const minute = String(d?.clock?.displayValue ?? "").trim();
    const rawAthlete =
      d?.athletesInvolved?.[0]?.displayName ||
      d?.athletesInvolved?.[0]?.shortName ||
      d?.athletesInvolved?.[0]?.fullName ||
      d?.participants?.[0]?.athlete?.displayName ||
      "";
    const playerName = trPlayerClient(String(rawAthlete || ""));

    const typeText = String(d?.type?.text ?? "").toLowerCase();
    const isGoal =
      Boolean(d?.scoringPlay) ||
      typeText.includes("goal") ||
      typeText.includes("penalty - scored");
    const isYellow = Boolean(d?.yellowCard) || typeText.includes("yellow card");
    const isRed = Boolean(d?.redCard) || typeText.includes("red card");

    if (isGoal) {
      const goalItem: MatchGoalEvent = {
        minute: minute || "",
        scorer: playerName || "هدف",
        penalty: Boolean(d?.penaltyKick) || typeText.includes("penalty"),
        ownGoal: Boolean(d?.ownGoal) || typeText.includes("own goal"),
      };
      if (teamId && teamId === awayId) {
        awayGoals.push(goalItem);
      } else if (teamId && teamId === homeId) {
        homeGoals.push(goalItem);
      } else if (d?.homeAway === "away") {
        awayGoals.push(goalItem);
      } else {
        homeGoals.push(goalItem);
      }
    } else if (isRed || isYellow) {
      const cardItem: MatchCardEvent = {
        minute: minute || "",
        player: playerName || "",
        card: isRed ? "red" : "yellow",
      };
      if (teamId && teamId === awayId) {
        awayCardEvents.push(cardItem);
      } else if (teamId && teamId === homeId) {
        homeCardEvents.push(cardItem);
      }
    }
  }

  const statHY = extractEspnStatNumber(home, "yellowCards");
  const statHR = extractEspnStatNumber(home, "redCards");
  const statAY = extractEspnStatNumber(away, "yellowCards");
  const statAR = extractEspnStatNumber(away, "redCards");

  const homeYellowCards = Math.max(
    statHY,
    homeCardEvents.filter((c) => c.card === "yellow").length,
  );
  const homeRedCards = Math.max(
    statHR,
    homeCardEvents.filter((c) => c.card === "red").length,
  );
  const awayYellowCards = Math.max(
    statAY,
    awayCardEvents.filter((c) => c.card === "yellow").length,
  );
  const awayRedCards = Math.max(
    statAR,
    awayCardEvents.filter((c) => c.card === "red").length,
  );

  const rawClockSec = Number(evStatus?.clock ?? comp?.status?.clock ?? 0);
  const displayClock = String(
    evStatus?.displayClock ?? comp?.status?.displayClock ?? "",
  ).trim();
  const shortDetail = String(
    evStatus?.type?.shortDetail ?? comp?.status?.type?.shortDetail ?? "",
  ).trim();
  const statusName = String(
    evStatus?.type?.name ?? comp?.status?.type?.name ?? "",
  ).toUpperCase();
  const period = Number(evStatus?.period ?? comp?.status?.period ?? 0);

  const isHalftime =
    shortDetail === "HT" ||
    statusName.includes("HALFTIME") ||
    shortDetail.toLowerCase().includes("half");

  let periodTextAr: string | undefined;
  if (isHalftime) {
    periodTextAr = "استراحة الشوطين";
  } else if (period === 1) {
    periodTextAr = "الشوط الأول";
  } else if (period === 2) {
    periodTextAr = "الشوط الثاني";
  } else if (period >= 3) {
    periodTextAr = "الأشواط الإضافية";
  }

  return {
    liveClockSeconds: Number.isFinite(rawClockSec) && rawClockSec > 0 ? rawClockSec : undefined,
    liveMinuteText: displayClock || (shortDetail && shortDetail !== "HT" && shortDetail !== "FT" ? shortDetail : undefined),
    periodTextAr,
    isHalftime,
    homeGoals,
    awayGoals,
    homeYellowCards,
    homeRedCards,
    awayYellowCards,
    awayRedCards,
    homeCardEvents,
    awayCardEvents,
  };
}

async function enrichEspnMatchSummaryIfNeeded(
  espnCode: string,
  eventId: string,
  homeId: string,
  awayId: string,
  current: LiveMatchDetails,
): Promise<LiveMatchDetails> {
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(espnCode)}/summary?event=${encodeURIComponent(eventId)}`,
      { headers: { accept: "application/json" } },
    );
    if (!res.ok) return current;
    const json = (await res.json()) as { keyEvents?: any[]; roster?: any[] };
    const keyEvents: any[] = Array.isArray(json?.keyEvents) ? json.keyEvents : [];
    if (!keyEvents.length) return current;

    const homeGoals: MatchGoalEvent[] = [];
    const awayGoals: MatchGoalEvent[] = [];
    const homeCardEvents: MatchCardEvent[] = [];
    const awayCardEvents: MatchCardEvent[] = [];

    for (const ke of keyEvents) {
      const teamId = String(ke?.team?.id ?? "");
      const minute = String(ke?.clock?.displayValue ?? "").trim();
      const rawPlayer =
        ke?.participants?.[0]?.athlete?.displayName ||
        ke?.participants?.[0]?.athlete?.shortName ||
        ke?.athletesInvolved?.[0]?.displayName ||
        "";
      const playerName = trPlayerClient(String(rawPlayer || ""));
      const tText = String(ke?.type?.text ?? "").toLowerCase();

      const isGoal =
        Boolean(ke?.scoringPlay) ||
        tText.includes("goal") ||
        tText.includes("penalty - scored");
      const isYellow = tText.includes("yellow card");
      const isRed = tText.includes("red card") || tText.includes("second yellow");

      if (isGoal) {
        const g: MatchGoalEvent = {
          minute,
          scorer: playerName || "هدف",
          penalty: tText.includes("penalty"),
          ownGoal: tText.includes("own goal"),
        };
        if (teamId === awayId) awayGoals.push(g);
        else if (teamId === homeId) homeGoals.push(g);
      } else if (isRed || isYellow) {
        const c: MatchCardEvent = {
          minute,
          player: playerName,
          card: isRed ? "red" : "yellow",
        };
        if (teamId === awayId) awayCardEvents.push(c);
        else if (teamId === homeId) homeCardEvents.push(c);
      }
    }

    return {
      ...current,
      homeGoals: homeGoals.length > 0 ? homeGoals : current.homeGoals,
      awayGoals: awayGoals.length > 0 ? awayGoals : current.awayGoals,
      homeCardEvents: homeCardEvents.length > 0 ? homeCardEvents : current.homeCardEvents,
      awayCardEvents: awayCardEvents.length > 0 ? awayCardEvents : current.awayCardEvents,
      homeYellowCards: Math.max(
        current.homeYellowCards,
        homeCardEvents.filter((c) => c.card === "yellow").length,
      ),
      homeRedCards: Math.max(
        current.homeRedCards,
        homeCardEvents.filter((c) => c.card === "red").length,
      ),
      awayYellowCards: Math.max(
        current.awayYellowCards,
        awayCardEvents.filter((c) => c.card === "yellow").length,
      ),
      awayRedCards: Math.max(
        current.awayRedCards,
        awayCardEvents.filter((c) => c.card === "red").length,
      ),
    };
  } catch {
    return current;
  }
}

async function fetchClientEspnLeague(league: {
  id: string;
  shortAr: string;
  badge: string;
}): Promise<RichMatchItem[]> {
  const espnCode = league.id === "sau.1" ? "ksa.1" : league.id;
  if (espnCode.startsWith("isr.") || espnCode.startsWith("local.")) return [];
  const now = new Date();
  const start = new Date(now.getTime() - 2 * 86_400_000);
  const end = new Date(now.getTime() + 5 * 86_400_000);
  const range = `${clientFormatYmd(start)}-${clientFormatYmd(end)}`;

  const urls = [
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(espnCode)}/scoreboard?dates=${range}`,
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(espnCode)}/scoreboard`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (!res.ok) continue;
      const json = (await res.json()) as { events?: any[] };
      const events = Array.isArray(json?.events) ? json.events : [];
      if (!events.length) continue;

      const out: RichMatchItem[] = [];
      const summaryTasks: Promise<void>[] = [];

      for (const ev of events.slice(0, 16)) {
        const comp = ev?.competitions?.[0];
        const competitors: any[] = Array.isArray(comp?.competitors) ? comp.competitors : [];
        const home = competitors.find((c) => c.homeAway === "home") ?? competitors[0];
        const away = competitors.find((c) => c.homeAway === "away") ?? competitors[1];
        if (!home?.team || !away?.team) continue;

        const rawState = String(ev?.status?.type?.state ?? comp?.status?.type?.state ?? "pre");
        const status: "pre" | "in" | "post" =
          rawState === "in" ? "in" : rawState === "post" ? "post" : "pre";
        const clock = String(ev?.status?.displayClock ?? comp?.status?.displayClock ?? "").trim();
        const detail = String(ev?.status?.type?.shortDetail ?? "").trim();
        const kickoffIso = String(ev?.date ?? comp?.date ?? now.toISOString());
        const dayKey = clientDayKey(kickoffIso);

        let statusTextAr = clientTimeAr(kickoffIso);
        if (status === "in") {
          statusTextAr = detail === "HT" ? "استراحة الشوطين" : clock ? `مباشر ${clock}` : "مباشر الآن";
        } else if (status === "post") {
          statusTextAr = "انتهت";
        }

        const homeScore = status === "pre" ? null : Number(home?.score ?? 0);
        const awayScore = status === "pre" ? null : Number(away?.score ?? 0);

        const liveDetails = parseEspnDetailsIntoLiveDetails(comp, ev?.status, home, away);

        const matchObj: RichMatchItem = {
          id: String(ev?.id ?? `${league.id}-${kickoffIso}`),
          leagueId: league.id,
          leagueNameAr: league.shortAr,
          leagueBadge: league.badge,
          homeTeam: trTeamClient(
            String(home.team.shortDisplayName || home.team.displayName || home.team.name || ""),
          ),
          awayTeam: trTeamClient(
            String(away.team.shortDisplayName || away.team.displayName || away.team.name || ""),
          ),
          homeLogo: typeof home.team.logo === "string" ? home.team.logo : undefined,
          awayLogo: typeof away.team.logo === "string" ? away.team.logo : undefined,
          homeScore: Number.isFinite(homeScore) ? homeScore : null,
          awayScore: Number.isFinite(awayScore) ? awayScore : null,
          status,
          statusTextAr,
          kickoffIso,
          kickoffTimeAr: clientTimeAr(kickoffIso),
          dayKey,
          dateLabelAr: clientShortDateAr(kickoffIso),
          venue: comp?.venue?.fullName ? String(comp.venue.fullName) : undefined,
          liveDetails,
        };

        // If live or finished with goals, and comp.details did not include all goals, fetch summary keyEvents
        const totalGoals = (homeScore ?? 0) + (awayScore ?? 0);
        const parsedGoals = liveDetails.homeGoals.length + liveDetails.awayGoals.length;
        if (
          ev?.id &&
          (status === "in" || (status === "post" && totalGoals > parsedGoals)) &&
          summaryTasks.length < 5
        ) {
          const homeId = String(home?.id ?? home?.team?.id ?? "");
          const awayId = String(away?.id ?? away?.team?.id ?? "");
          summaryTasks.push(
            enrichEspnMatchSummaryIfNeeded(
              espnCode,
              String(ev.id),
              homeId,
              awayId,
              liveDetails,
            ).then((enriched) => {
              matchObj.liveDetails = enriched;
            }),
          );
        }

        out.push(matchObj);
      }

      if (summaryTasks.length > 0) {
        await Promise.allSettled(summaryTasks);
      }

      if (out.length > 0) return out;
    } catch {
      // try next url
    }
  }
  return [];
}

function parseSportsDbGoalList(raw: unknown): MatchGoalEvent[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  const entries = raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  const goals: MatchGoalEvent[] = [];
  for (const entry of entries) {
    // Format is usually "23\x27:Player Name" or "Player Name 23\x27"
    const colonParts = entry.split(":");
    if (colonParts.length >= 2) {
      const first = colonParts[0].trim();
      const second = colonParts.slice(1).join(":").trim();
      if (/\d/.test(first)) {
        goals.push({
          minute: first.endsWith("\x27") ? first : `${first}\x27`,
          scorer: trPlayerClient(second),
          penalty: /pen/i.test(entry),
          ownGoal: /og|own/i.test(entry),
        });
      } else {
        goals.push({
          minute: second.endsWith("\x27") ? second : `${second}\x27`,
          scorer: trPlayerClient(first),
          penalty: /pen/i.test(entry),
          ownGoal: /og|own/i.test(entry),
        });
      }
    } else {
      const m = entry.match(/^(.*?)\s*(\d+(?:\+\d+)?\x27?)$/);
      if (m) {
        goals.push({
          scorer: trPlayerClient(m[1].trim() || "هدف"),
          minute: m[2].endsWith("\x27") ? m[2] : `${m[2]}\x27`,
        });
      } else {
        goals.push({ scorer: trPlayerClient(entry), minute: "" });
      }
    }
  }
  return goals;
}

function parseSportsDbCardList(raw: unknown, cardType: "yellow" | "red"): MatchCardEvent[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  return raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split(":");
      if (parts.length >= 2) {
        const first = parts[0].trim();
        const second = parts.slice(1).join(":").trim();
        if (/\d/.test(first)) {
          return {
            minute: first.endsWith("\x27") ? first : `${first}\x27`,
            player: trPlayerClient(second),
            card: cardType,
          };
        }
        return {
          minute: second.endsWith("\x27") ? second : `${second}\x27`,
          player: trPlayerClient(first),
          card: cardType,
        };
      }
      return { minute: "", player: trPlayerClient(entry), card: cardType };
    });
}

async function fetchClientSportsDbLeague(league: {
  id: string;
  shortAr: string;
  badge: string;
}): Promise<RichMatchItem[]> {
  const sdbMap: Record<string, string> = {
    "isr.1": "4644",
    "esp.1": "4335",
    "eng.1": "4328",
    "ita.1": "4332",
    "ger.1": "4331",
    "fra.1": "4334",
    "uefa.champions": "4480",
    "sau.1": "4668",
  };
  const sdbId = sdbMap[league.id];
  if (!sdbId) return [];
  try {
    const [nextRes, pastRes] = await Promise.allSettled([
      fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${sdbId}`),
      fetch(`https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=${sdbId}`),
    ]);
    const rawEvents: any[] = [];
    for (const r of [nextRes, pastRes]) {
      if (r.status === "fulfilled" && r.value.ok) {
        const j = (await r.value.json().catch(() => ({}))) as { events?: any[] };
        if (Array.isArray(j?.events)) rawEvents.push(...j.events);
      }
    }
    const out: RichMatchItem[] = [];
    for (const ev of rawEvents.slice(0, 14)) {
      if (!ev?.strHomeTeam || !ev?.strAwayTeam || !ev?.dateEvent) continue;
      const timeStr = String(ev.strTime ?? "18:00:00").slice(0, 8);
      const kickoffIso = `${ev.dateEvent}T${timeStr.includes(":") ? timeStr : "18:00:00"}Z`;
      const hasScore = ev.intHomeScore !== null && ev.intHomeScore !== undefined && ev.intHomeScore !== "";
      const rawStatus = String(ev.strStatus ?? ev.strProgress ?? "").toUpperCase();
      const isLive =
        rawStatus === "LIVE" ||
        rawStatus === "1H" ||
        rawStatus === "2H" ||
        rawStatus === "HT" ||
        /^\d+\x27?$/.test(rawStatus);
      const status: "pre" | "in" | "post" = isLive ? "in" : hasScore ? "post" : "pre";

      const homeGoals = parseSportsDbGoalList(ev.strHomeGoalDetails);
      const awayGoals = parseSportsDbGoalList(ev.strAwayGoalDetails);
      const homeYellowEvents = parseSportsDbCardList(ev.strHomeYellowCards, "yellow");
      const homeRedEvents = parseSportsDbCardList(ev.strHomeRedCards, "red");
      const awayYellowEvents = parseSportsDbCardList(ev.strAwayYellowCards, "yellow");
      const awayRedEvents = parseSportsDbCardList(ev.strAwayRedCards, "red");

      const liveMin = parseMinuteNumber(rawStatus);

      out.push({
        id: `sdb-${ev.idEvent ?? `${league.id}-${ev.dateEvent}-${ev.strHomeTeam}`}`,
        leagueId: league.id,
        leagueNameAr: league.shortAr,
        leagueBadge: league.badge,
        homeTeam: trTeamClient(String(ev.strHomeTeam)),
        awayTeam: trTeamClient(String(ev.strAwayTeam)),
        homeLogo: typeof ev.strHomeTeamBadge === "string" ? ev.strHomeTeamBadge : undefined,
        awayLogo: typeof ev.strAwayTeamBadge === "string" ? ev.strAwayTeamBadge : undefined,
        homeScore: hasScore ? Number(ev.intHomeScore) : null,
        awayScore: hasScore ? Number(ev.intAwayScore) : null,
        status,
        statusTextAr:
          status === "in"
            ? rawStatus === "HT"
              ? "استراحة الشوطين"
              : liveMin
                ? `مباشر ${liveMin}\x27`
                : "مباشر الآن"
            : status === "post"
              ? "انتهت"
              : clientTimeAr(kickoffIso),
        kickoffIso,
        kickoffTimeAr: clientTimeAr(kickoffIso),
        dayKey: clientDayKey(kickoffIso),
        dateLabelAr: clientShortDateAr(kickoffIso),
        liveDetails: {
          liveClockSeconds: liveMin ? liveMin * 60 : undefined,
          liveMinuteText: liveMin ? `${liveMin}\x27` : undefined,
          isHalftime: rawStatus === "HT",
          homeGoals,
          awayGoals,
          homeYellowCards: homeYellowEvents.length,
          homeRedCards: homeRedEvents.length,
          awayYellowCards: awayYellowEvents.length,
          awayRedCards: awayRedEvents.length,
          homeCardEvents: [...homeYellowEvents, ...homeRedEvents],
          awayCardEvents: [...awayYellowEvents, ...awayRedEvents],
        },
      });
    }
    return out;
  } catch {
    return [];
  }
}

async function enrichBoardClientSide(board: MatchesBoardData): Promise<MatchesBoardData> {
  const customMatches = board.matches.filter((m) => String(m.id).startsWith("custom-"));
  const existingAuto = board.matches.filter((m) => !String(m.id).startsWith("custom-"));

  const fetchedLists = await Promise.all(
    board.leagues.map(async (lg) => {
      const espn = await fetchClientEspnLeague(lg);
      if (espn.length >= 2 && lg.id !== "isr.1") return espn;
      const sdb = await fetchClientSportsDbLeague(lg);
      return [...espn, ...sdb];
    }),
  );

  const clientFetched = fetchedLists.flat();
  const mergedAuto = clientFetched.length > 0 ? clientFetched : existingAuto;
  const fallback = buildCuratedRoundFallback();

  // Ensure every enabled league has matches so no league tab is ever empty
  const byId = new Map<string, RichMatchItem>();
  for (const m of [...customMatches, ...mergedAuto]) {
    byId.set(`${m.leagueId}-${m.homeTeam}-${m.awayTeam}`, m);
  }
  for (const fb of fallback) {
    const hasLeagueMatches = [...byId.values()].some((x) => x.leagueId === fb.leagueId);
    if (!hasLeagueMatches || byId.size < 4) {
      byId.set(`${fb.leagueId}-${fb.homeTeam}-${fb.awayTeam}`, fb);
    }
  }

  const all = [...byId.values()].sort((a, b) => {
    if (String(a.id).startsWith("custom-") && !String(b.id).startsWith("custom-")) return -1;
    if (!String(a.id).startsWith("custom-") && String(b.id).startsWith("custom-")) return 1;
    if (a.status === "in" && b.status !== "in") return -1;
    if (b.status === "in" && a.status !== "in") return 1;
    return Date.parse(a.kickoffIso) - Date.parse(b.kickoffIso);
  });

  return {
    ...board,
    matches: all,
    fetchedAt: Date.now(),
  };
}

/** Homepage Live Matches Widget with League & Day selector. */
export function HomeMatchesWidget({ initial }: { initial: MatchesBoardData | null }) {
  const [board, setBoard] = useState<MatchesBoardData | null>(initial);
  const [refreshing, setRefreshing] = useState(false);

  const initialLeague = useMemo(() => {
    if (!board) return "all";
    if (board.defaultLeague === "all") return "all";
    if (board.leagues.some((l) => l.id === board.defaultLeague)) return board.defaultLeague;
    return board.leagues[0]?.id ?? "all";
  }, [board]);

  const [selectedLeague, setSelectedLeague] = useState<string>(initialLeague);
  const [dayTab, setDayTab] = useState<DayTab>(() =>
    board ? pickBestDayTab(board.matches, initialLeague) : "today",
  );

  useEffect(() => {
    if (!board) return;
    setSelectedLeague((prev) => {
      if (prev === "all" || board.leagues.some((l) => l.id === prev)) return prev;
      return board.defaultLeague === "all"
        ? "all"
        : (board.leagues.find((l) => l.id === board.defaultLeague)?.id ??
            board.leagues[0]?.id ??
            "all");
    });
  }, [board]);

  // Fetch & enrich from browser (ESPN + TheSportsDB + custom matches) immediately on mount and every 60s
  useEffect(() => {
    let active = true;
    const sync = async () => {
      try {
        const srv = await getMatchesBoard().catch(() => initial);
        const base: MatchesBoardData = srv ?? initial ?? {
          enabled: true,
          showOnHome: true,
          defaultLeague: "all",
          leagues: [
            { id: "isr.1", nameAr: "الدوري الإسرائيلي الممتاز", shortAr: "الدوري الإسرائيلي", countryAr: "البلاد", badge: "⚽", enabled: true },
            { id: "esp.1", nameAr: "الدوري الإسباني (لا ليغا)", shortAr: "لا ليغا", countryAr: "إسبانيا", badge: "🇪🇸", enabled: true },
            { id: "uefa.champions", nameAr: "دوري أبطال أوروبا", shortAr: "أبطال أوروبا", countryAr: "أوروبا", badge: "🏆", enabled: true },
            { id: "eng.1", nameAr: "الدوري الإنجليزي الممتاز", shortAr: "البريميرليغ", countryAr: "إنجلترا", badge: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", enabled: true },
          ],
          matches: [],
          fetchedAt: Date.now(),
        };
        const enriched = await enrichBoardClientSide(base);
        if (active) setBoard(enriched);
      } catch {
        // ignore
      }
    };
    void sync();
    const id = setInterval(() => void sync(), 25_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [initial]);

  const allMatches = useMemo(() => {
    const raw = board?.matches ?? [];
    return raw.length > 0 ? raw : buildCuratedRoundFallback();
  }, [board?.matches]);

  const leagueMatches = useMemo(
    () =>
      selectedLeague === "all"
        ? allMatches
        : allMatches.filter((m) => m.leagueId === selectedLeague),
    [allMatches, selectedLeague],
  );

  const filteredMatches = useMemo(() => {
    if (dayTab === "live") return leagueMatches.filter((m) => m.status === "in");
    const byDay = leagueMatches.filter((m) => m.dayKey === dayTab);
    if (byDay.length > 0) return byDay;
    return leagueMatches.slice(0, 8);
  }, [leagueMatches, dayTab]);

  if (!board) {
    return (
      <section className="stamp p-4" aria-label={tr("نتائج المباريات المباشرة")}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-ink">
              <Trophy className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold">{tr("مباريات اليوم والبث المباشر")}</h2>
              <p className="text-xs font-semibold text-muted">{tr("جاري تحميل جدول المباريات المباشرة…")}</p>
            </div>
          </div>
          <Link to="/sports-news" className="see-all text-xs">
            {tr("كل المباريات")}
            <ChevronLeft className="size-4" />
          </Link>
        </div>
      </section>
    );
  }

  if (!board.enabled || !board.showOnHome) return null;

  const liveCount = allMatches.filter((m) => m.status === "in").length;

  const showingFallbackDay =
    dayTab !== "live" &&
    leagueMatches.length > 0 &&
    leagueMatches.filter((m) => m.dayKey === dayTab).length === 0;

  const handleSelectLeague = (id: string) => {
    setSelectedLeague(id);
    setDayTab(pickBestDayTab(board.matches, id));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const fresh = await getMatchesBoard();
      setBoard(await enrichBoardClientSide(fresh));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <section className="stamp p-4" aria-label={tr("نتائج المباريات المباشرة")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-ink">
            <Trophy className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold">{tr("مباريات اليوم والبث المباشر")}</h2>
              {liveCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-alert px-2 py-0.5 text-xs font-extrabold text-white">
                  <span className="size-1.5 animate-ping rounded-full bg-white" />
                  {liveCount} {tr("مباشر الآن")}
                </span>
              ) : null}
            </div>
            <p className="text-xs font-semibold text-muted">
              {tr("الدوري الإسرائيلي، لا ليغا، أبطال أوروبا والدوريات العالمية لحظة بلحظة")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="chip text-xs"
            title={tr("تحديث النتائج")}
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {tr("تحديث")}
          </button>
          <Link to="/sports-news" className="see-all text-xs">
            {tr("كل المباريات")}
            <ChevronLeft className="size-4" />
          </Link>
        </div>
      </div>

      {/* League selector tabs */}
      <div className="scroll-row mb-2.5 gap-1.5 pb-1">
        <button
          type="button"
          onClick={() => handleSelectLeague("all")}
          className={
            selectedLeague === "all"
              ? "chip chip-ink shrink-0 text-xs"
              : "chip shrink-0 text-xs"
          }
        >
          <span>⚽</span>
          <span>{tr("الكل")}</span>
        </button>
        {board.leagues.map((lg) => {
          const active = selectedLeague === lg.id;
          const hasLive = board.matches.some(
            (m) => m.leagueId === lg.id && m.status === "in",
          );
          return (
            <button
              key={lg.id}
              type="button"
              onClick={() => handleSelectLeague(lg.id)}
              className={
                active
                  ? "chip chip-ink shrink-0 text-xs"
                  : "chip shrink-0 text-xs"
              }
            >
              <span>{lg.badge}</span>
              <span>{trv(lg.shortAr)}</span>
              {hasLive ? (
                <span className="size-2 animate-ping rounded-full bg-alert" />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Day filter pills */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
        {(
          [
            { key: "today", label: "مباريات اليوم" },
            { key: "tomorrow", label: "غداً" },
            { key: "yesterday", label: "نتائج أمس" },
            { key: "upcoming", label: "القادمة" },
          ] as { key: DayTab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setDayTab(t.key)}
            className={`rounded-xl px-2.5 py-1 font-extrabold transition ${
              dayTab === t.key
                ? "bg-ink text-paper"
                : "bg-surface text-muted hover:text-ink"
            }`}
          >
            {tr(t.label)}
          </button>
        ))}
        {liveCount > 0 ? (
          <button
            type="button"
            onClick={() => setDayTab("live")}
            className={`rounded-xl px-2.5 py-1 font-extrabold transition ${
              dayTab === "live"
                ? "bg-alert text-white"
                : "bg-alert/10 text-alert"
            }`}
          >
            🔴 {tr("مباشر الآن")} ({liveCount})
          </button>
        ) : null}
      </div>

      {filteredMatches.length === 0 ? (
        <div className="rounded-2xl bg-surface p-4 text-center text-sm font-semibold text-muted">
          {tr("لا توجد مباريات مسجلة في هذا التبويب حالياً — اختر دوري آخر أو استعرض مباريات الغد.")}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {filteredMatches.slice(0, 8).map((m) => (
            <MatchRowCard
              key={m.id}
              m={m}
              showLeagueBadge={selectedLeague === "all" || showingFallbackDay}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** Full Matches Scoreboard for /sports-news page. */
export function FullMatchesBoard({ initial }: { initial: MatchesBoardData | null }) {
  const [board, setBoard] = useState<MatchesBoardData | null>(initial);
  const [selectedLeague, setSelectedLeague] = useState<string>(
    initial?.defaultLeague && initial.defaultLeague !== "all" ? initial.defaultLeague : "all",
  );
  const [dayTab, setDayTab] = useState<DayTab>("today");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    const sync = async () => {
      try {
        const srv = (await getMatchesBoard().catch(() => null)) ?? initial;
        if (srv) {
          const enriched = await enrichBoardClientSide(srv);
          if (active) setBoard(enriched);
        }
      } catch {
        // ignore
      }
    };
    void sync();
    const id = setInterval(() => void sync(), 25_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [initial]);

  const allMatches = useMemo(() => {
    const raw = board?.matches ?? [];
    return raw.length > 0 ? raw : buildCuratedRoundFallback();
  }, [board?.matches]);

  const matches = useMemo(() => {
    const byLeague =
      selectedLeague === "all"
        ? allMatches
        : allMatches.filter((m) => m.leagueId === selectedLeague);
    if (dayTab === "live") return byLeague.filter((m) => m.status === "in");
    const byDay = byLeague.filter((m) => m.dayKey === dayTab);
    return byDay.length > 0 ? byDay : byLeague;
  }, [allMatches, selectedLeague, dayTab]);

  if (!board || !board.enabled) return null;

  const liveCount = allMatches.filter((m) => m.status === "in").length;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      setBoard(await enrichBoardClientSide(await getMatchesBoard()));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <section className="stamp mb-6 p-4" aria-label={tr("جدول ونتائج المباريات المباشرة")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-ink">
            <Trophy className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-extrabold">{tr("جدول ونتائج المباريات المباشرة")}</h2>
            <p className="text-xs font-semibold text-muted">
              {tr("الدوري الإسرائيلي (ليغات هعَل)، لا ليغا، أبطال أوروبا والدوريات العالمية بتوقيت رهط والقدس")}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn btn-ghost px-3 py-1.5 text-xs"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          {tr("تحديث النتائج الآن")}
        </button>
      </div>

      {/* League pills */}
      <div className="scroll-row mb-3 gap-1.5 pb-1">
        <button
          type="button"
          onClick={() => setSelectedLeague("all")}
          className={selectedLeague === "all" ? "chip chip-ink shrink-0" : "chip shrink-0"}
        >
          ⚽ {tr("كل الدوريات")} ({board.matches.length})
        </button>
        {board.leagues.map((lg) => {
          const count = board.matches.filter((m) => m.leagueId === lg.id).length;
          return (
            <button
              key={lg.id}
              type="button"
              onClick={() => setSelectedLeague(lg.id)}
              className={selectedLeague === lg.id ? "chip chip-ink shrink-0" : "chip shrink-0"}
            >
              <span>{lg.badge}</span>
              <span>{trv(lg.nameAr)}</span>
              {count > 0 ? <span className="opacity-75">({count})</span> : null}
            </button>
          );
        })}
      </div>

      {/* Day tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5 text-xs">
        {(
          [
            { key: "today", label: "مباريات اليوم" },
            { key: "tomorrow", label: "مباريات الغد" },
            { key: "yesterday", label: "نتائج الأمس" },
            { key: "upcoming", label: "المباريات القادمة" },
          ] as { key: DayTab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setDayTab(t.key)}
            className={`rounded-xl px-3 py-1.5 font-extrabold transition ${
              dayTab === t.key
                ? "bg-ink text-paper"
                : "bg-surface text-muted hover:text-ink"
            }`}
          >
            {tr(t.label)}
          </button>
        ))}
        {liveCount > 0 ? (
          <button
            type="button"
            onClick={() => setDayTab("live")}
            className={`rounded-xl px-3 py-1.5 font-extrabold transition ${
              dayTab === "live" ? "bg-alert text-white" : "bg-alert/10 text-alert"
            }`}
          >
            🔴 {tr("مباشر الآن")} ({liveCount})
          </button>
        ) : null}
      </div>

      {matches.length === 0 ? (
        <p className="rounded-2xl bg-surface p-5 text-center font-bold text-muted">
          {tr("لا توجد مباريات حالياً في هذا الفلتر.")}
        </p>
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {matches.map((m) => (
            <MatchRowCard key={m.id} m={m} showLeagueBadge />
          ))}
        </div>
      )}
    </section>
  );
}
