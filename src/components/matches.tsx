import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Star,
  Trash2,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  adminGetMatchesSettings,
  adminRefreshMatchesNow,
  adminSaveMatchesSettings,
  getMatchesBoard,
  type CustomMatch,
  type CustomMatchStatus,
  type LeagueConfig,
  type MatchesBoardData,
  type MatchesSettings,
  type MatchItem,
} from "@/lib/news/matches";
import { tr, trv } from "@/lib/i18n/core";

type DayTab = "today" | "yesterday" | "tomorrow" | "upcoming" | "live";

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

function MatchRowCard({ m, showLeagueBadge }: { m: MatchItem; showLeagueBadge?: boolean }) {
  const isLive = m.status === "in";
  const isDone = m.status === "post";
  return (
    <div
      className={`flex flex-col gap-1.5 rounded-2xl border px-3 py-2.5 transition ${
        isLive
          ? "border-alert/50 bg-alert/5 shadow-xs"
          : "border-line bg-paper hover:border-ink/25"
      }`}
    >
      {showLeagueBadge ? (
        <div className="flex items-center justify-between text-[11px] font-bold text-muted">
          <span className="inline-flex items-center gap-1">
            <span>{m.leagueBadge}</span>
            <span>{trv(m.leagueNameAr)}</span>
          </span>
          <span>{m.dateLabelAr}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {/* Home team */}
        <div className="flex min-w-0 items-center gap-2">
          <TeamCrest name={m.homeTeam} logo={m.homeLogo} />
          <span className="truncate text-sm font-bold">{trv(m.homeTeam)}</span>
        </div>

        {/* Center score / kickoff box */}
        <div className="flex flex-col items-center justify-center px-2">
          {m.status === "pre" ? (
            <span
              dir="ltr"
              className="rounded-xl bg-surface px-2.5 py-1 text-xs font-extrabold text-ink"
            >
              {m.kickoffTimeAr}
            </span>
          ) : (
            <div
              dir="ltr"
              className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-base font-extrabold ${
                isLive ? "bg-alert text-white" : "bg-surface text-ink"
              }`}
            >
              <span>{m.homeScore ?? 0}</span>
              <span className="opacity-60">:</span>
              <span>{m.awayScore ?? 0}</span>
            </div>
          )}

          <span
            className={`mt-1 inline-flex items-center gap-1 text-[11px] font-extrabold ${
              isLive ? "text-alert" : isDone ? "text-muted" : "text-primary-ink"
            }`}
          >
            {isLive ? (
              <span className="size-2 animate-ping rounded-full bg-alert" />
            ) : null}
            {trv(m.statusTextAr)}
          </span>
        </div>

        {/* Away team */}
        <div className="flex min-w-0 items-center justify-end gap-2 text-left">
          <span className="truncate text-sm font-bold">{trv(m.awayTeam)}</span>
          <TeamCrest name={m.awayTeam} logo={m.awayLogo} />
        </div>
      </div>

      {m.note ? (
        <p className="text-center text-[11px] font-semibold text-muted">{trv(m.note)}</p>
      ) : null}
    </div>
  );
}

/** Homepage Live Matches Widget with League & Day selector. */
export function HomeMatchesWidget({ initial }: { initial: MatchesBoardData | null }) {
  const [board, setBoard] = useState<MatchesBoardData | null>(initial);
  const [refreshing, setRefreshing] = useState(false);

  const initialLeague = useMemo(() => {
    if (!board) return "esp.1";
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

  // Auto-refresh live scores every 60s
  useEffect(() => {
    const id = setInterval(() => {
      void getMatchesBoard()
        .then((fresh) => setBoard(fresh))
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!board || !board.enabled || !board.showOnHome) return null;

  const liveCount = board.matches.filter((m) => m.status === "in").length;

  const leagueMatches = useMemo(
    () =>
      selectedLeague === "all"
        ? board.matches
        : board.matches.filter((m) => m.leagueId === selectedLeague),
    [board.matches, selectedLeague],
  );

  const filteredMatches = useMemo(() => {
    if (dayTab === "live") return leagueMatches.filter((m) => m.status === "in");
    const byDay = leagueMatches.filter((m) => m.dayKey === dayTab);
    if (byDay.length > 0) return byDay;
    // Smart fallback: if the chosen day has no matches for this league, show the closest matches in this league
    return leagueMatches.slice(0, 8);
  }, [leagueMatches, dayTab]);

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
      setBoard(fresh);
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
              <h2 className="text-lg font-extrabold">{tr("نتائج المباريات المباشرة")}</h2>
              {liveCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-alert px-2 py-0.5 text-xs font-extrabold text-white">
                  <span className="size-1.5 animate-ping rounded-full bg-white" />
                  {liveCount} {tr("مباشر")}
                </span>
              ) : null}
            </div>
            <p className="text-xs font-semibold text-muted">
              {tr("اختر الليغا لمتابعة نتائج ومواعيد المباريات لحظة بلحظة")}
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
          className={selectedLeague === "all" ? "chip chip-ink shrink-0" : "chip shrink-0"}
        >
          ⚽ {tr("كل الدوريات")}
        </button>
        {board.leagues.map((lg) => (
          <button
            key={lg.id}
            type="button"
            onClick={() => handleSelectLeague(lg.id)}
            className={selectedLeague === lg.id ? "chip chip-ink shrink-0" : "chip shrink-0"}
          >
            <span>{lg.badge}</span>
            <span>{trv(lg.shortAr)}</span>
          </button>
        ))}
      </div>

      {/* Day filter tabs */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5 border-b border-line pb-2.5 text-xs font-bold">
        {(
          [
            { key: "today", label: "اليوم" },
            { key: "yesterday", label: "أمس" },
            { key: "tomorrow", label: "غداً" },
            { key: "upcoming", label: "الجولة القادمة" },
          ] as { key: DayTab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setDayTab(t.key)}
            className={`rounded-xl px-3 py-1 transition ${
              dayTab === t.key
                ? "bg-primary font-extrabold text-ink"
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
            className={`rounded-xl px-3 py-1 font-extrabold transition ${
              dayTab === "live" ? "bg-alert text-white" : "bg-alert/10 text-alert"
            }`}
          >
            🔴 {tr("مباشر الآن")} ({liveCount})
          </button>
        ) : null}
      </div>

      {showingFallbackDay ? (
        <p className="mb-2 text-xs font-bold text-muted">
          {tr("لا توجد مباريات في هذا اليوم لهذا الدوري — إليك أقرب مباريات الجدول:")}
        </p>
      ) : null}

      {filteredMatches.length === 0 ? (
        <div className="rounded-2xl bg-surface p-5 text-center">
          <p className="font-bold text-muted">
            {tr("لا توجد مباريات مسجّلة حالياً في هذا التبويب — جرّب اختيار دوري آخر أو «كل الدوريات».")}
          </p>
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

  if (!board || !board.enabled) return null;

  const liveCount = board.matches.filter((m) => m.status === "in").length;

  const matches = useMemo(() => {
    const byLeague =
      selectedLeague === "all"
        ? board.matches
        : board.matches.filter((m) => m.leagueId === selectedLeague);
    if (dayTab === "live") return byLeague.filter((m) => m.status === "in");
    const byDay = byLeague.filter((m) => m.dayKey === dayTab);
    return byDay.length > 0 ? byDay : byLeague;
  }, [board.matches, selectedLeague, dayTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      setBoard(await getMatchesBoard());
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
              {tr("نتائج حية ومواعيد المباريات بتوقيت رهط والقدس")}
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

      {/* Day filter */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5 border-b border-line pb-2.5 text-xs font-bold">
        {(
          [
            { key: "today", label: "مباريات اليوم" },
            { key: "yesterday", label: "نتائج أمس" },
            { key: "tomorrow", label: "مباريات غداً" },
            { key: "upcoming", label: "الجولات القادمة" },
          ] as { key: DayTab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setDayTab(t.key)}
            className={`rounded-xl px-3 py-1.5 transition ${
              dayTab === t.key
                ? "bg-primary font-extrabold text-ink"
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

/** Admin Control Panel for choosing leagues, setting the default league (LaLiga, etc.), and adding custom matches. */
export function MatchesAdmin() {
  const [s, setS] = useState<MatchesSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");

  // New custom league form
  const [newLeagueId, setNewLeagueId] = useState("");
  const [newLeagueName, setNewLeagueName] = useState("");
  const [newLeagueBadge, setNewLeagueBadge] = useState("⚽");

  // New custom match form
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [matchLeagueId, setMatchLeagueId] = useState("local.rahat");
  const [kickoff, setKickoff] = useState("20:00");
  const [matchStatus, setMatchStatus] = useState<CustomMatchStatus>("pre");
  const [matchMinute, setMatchMinute] = useState("");
  const [matchNote, setMatchNote] = useState("");

  useEffect(() => {
    void adminGetMatchesSettings().then((r) => {
      setS(r.settings);
    });
  }, []);

  if (!s) {
    return <p className="stamp p-4 font-bold">{tr("جاري تحميل إعدادات المباريات والدوريات…")}</p>;
  }

  const update = (patch: Partial<MatchesSettings>) => {
    setS({ ...s, ...patch });
    setDirty(true);
    setMsg("");
  };

  const save = async (nextSettings?: MatchesSettings) => {
    const payload = nextSettings ?? s;
    setSaving(true);
    setMsg("");
    const res = await adminSaveMatchesSettings({ data: payload });
    setSaving(false);
    if (!res.ok || !res.settings) {
      setMsg(res.message || tr("تعذّر حفظ الإعدادات."));
      return;
    }
    setS(res.settings);
    setDirty(false);
    setMsg(tr("تم حفظ إعدادات الدوريات والليغا وتحديث الموقع فورا ✓"));
  };

  const refreshLive = async () => {
    setRefreshing(true);
    setMsg("");
    const res = await adminRefreshMatchesNow();
    setRefreshing(false);
    setMsg(res.message);
  };

  const toggleLeague = (id: string) => {
    const leagues = s.leagues.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l));
    update({ leagues });
  };

  const moveLeague = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= s.leagues.length) return;
    const leagues = [...s.leagues];
    [leagues[idx], leagues[j]] = [leagues[j], leagues[idx]];
    update({ leagues });
  };

  const setAsDefaultLeague = (id: string) => {
    const leagues = s.leagues.map((l) => (l.id === id ? { ...l, enabled: true } : l));
    const next = { ...s, leagues, defaultLeague: id };
    setS(next);
    void save(next);
  };

  const applyPreset = (mode: "laliga" | "top5" | "all") => {
    const top5 = new Set(["esp.1", "uefa.champions", "eng.1", "ita.1", "ger.1", "fra.1"]);
    const leagues = s.leagues.map((l) => ({
      ...l,
      enabled:
        mode === "all"
          ? true
          : mode === "laliga"
            ? l.id === "esp.1" || l.id === "uefa.champions"
            : top5.has(l.id),
    }));
    const defaultLeague = mode === "laliga" ? "esp.1" : s.defaultLeague;
    update({ leagues, defaultLeague });
  };

  const addCustomLeague = () => {
    const id = newLeagueId.trim().toLowerCase();
    const nameAr = newLeagueName.trim();
    if (!/^[a-z0-9._-]{2,40}$/.test(id) || !nameAr) {
      setMsg(tr("أدخل اسم الدوري بالعربية وكود الدوري باللإنجليزية (مثل ned.1 أو por.1)."));
      return;
    }
    if (s.leagues.some((l) => l.id === id)) {
      setMsg(tr("هذا الدوري موجود بالفعل في القائمة."));
      return;
    }
    const nextLeague: LeagueConfig = {
      id,
      nameAr,
      shortAr: nameAr.slice(0, 24),
      countryAr: "دولي",
      badge: newLeagueBadge.trim() || "⚽",
      enabled: true,
      builtin: false,
    };
    update({ leagues: [...s.leagues, nextLeague] });
    setNewLeagueId("");
    setNewLeagueName("");
  };

  const addCustomMatch = () => {
    if (!homeTeam.trim() || !awayTeam.trim()) {
      setMsg(tr("أدخل اسم الفريق الأول والفريق الثاني."));
      return;
    }
    const lg = s.leagues.find((l) => l.id === matchLeagueId);
    const m: CustomMatch = {
      id: Math.random().toString(36).slice(2, 10),
      leagueId: matchLeagueId,
      leagueNameAr: lg?.shortAr ?? "مباريات رهط والنقب",
      homeTeam: homeTeam.trim(),
      awayTeam: awayTeam.trim(),
      homeScore: Number(homeScore) || 0,
      awayScore: Number(awayScore) || 0,
      kickoff: kickoff.trim() || "20:00",
      dateOffset: 0,
      status: matchStatus,
      minute: matchMinute.trim() || undefined,
      note: matchNote.trim() || undefined,
    };
    update({ customMatches: [m, ...s.customMatches] });
    setHomeTeam("");
    setAwayTeam("");
    setHomeScore(0);
    setAwayScore(0);
    setMatchMinute("");
    setMatchNote("");
  };

  const enabledLeagues = s.leagues.filter((l) => l.enabled);

  return (
    <div className="flex flex-col gap-4">
      {/* Header & Quick Save Bar */}
      <section className="stamp flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h2 className="text-xl font-extrabold">{tr("إدارة نتائج المباريات المباشرة واختيار الليغا")}</h2>
          <p className="text-sm font-semibold text-muted">
            {tr("اختر الدوريات (الليغا) التي تريد عرضها في الموقع وحدد الليغا الافتراضية التي تفتح للزوار.")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={refreshLive}
            disabled={refreshing}
            className="btn btn-ghost text-sm"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? tr("جاري الجلب…") : tr("جلب وتحديث النتائج الآن")}
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="btn text-sm"
          >
            <Check className="size-4" />
            {saving ? tr("جاري الحفظ…") : tr("حفظ إعدادات الدوريات")}
          </button>
        </div>
      </section>

      {msg ? (
        <div className="rounded-2xl border border-primary bg-primary-soft p-3 font-extrabold text-ink">
          {trv(msg)}
        </div>
      ) : null}

      {/* 1. General Toggles + Default League Selector */}
      <section className="stamp grid gap-4 p-4 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-extrabold">{tr("1. حالة القسم ومكان العرض")}</h3>
          <label className="flex items-center gap-2.5 rounded-xl border border-line p-3 font-bold">
            <input
              type="checkbox"
              checked={s.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
              className="size-5 accent-primary"
            />
            <span>{tr("تفعيل قسم نتائج المباريات المباشرة في الموقع")}</span>
          </label>
          <label className="flex items-center gap-2.5 rounded-xl border border-line p-3 font-bold">
            <input
              type="checkbox"
              checked={s.showOnHome}
              onChange={(e) => update({ showOnHome: e.target.checked })}
              className="size-5 accent-primary"
            />
            <span>{tr("إظهار جدول المباريات المباشرة في الصفحة الرئيسية")}</span>
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-base font-extrabold">
            {tr("2. تحديد الليغا الافتراضية عند فتح الموقع")}
          </h3>
          <p className="text-xs font-semibold text-muted">
            {tr("اختر أي ليغا تريد أن تظهر نتائجها أولاً للزائر فور دخوله للموقع (أو اختر «كل الدوريات المفعّلة»):")}
          </p>
          <select
            className="field font-bold"
            value={s.defaultLeague}
            onChange={(e) => update({ defaultLeague: e.target.value })}
          >
            <option value="all">⚽ {tr("عرض كل الدوريات المفعّلة معاً")}</option>
            {enabledLeagues.map((lg) => (
              <option key={lg.id} value={lg.id}>
                {lg.badge} {lg.nameAr}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setAsDefaultLeague("esp.1")}
              className={s.defaultLeague === "esp.1" ? "chip chip-ink text-xs" : "chip text-xs"}
            >
              🇪🇸 {tr("تثبيت الدوري الإسباني (لا ليغا) كافتراضي")}
            </button>
            <button
              type="button"
              onClick={() => setAsDefaultLeague("uefa.champions")}
              className={
                s.defaultLeague === "uefa.champions" ? "chip chip-ink text-xs" : "chip text-xs"
              }
            >
              🏆 {tr("تثبيت أبطال أوروبا كافتراضي")}
            </button>
            <button
              type="button"
              onClick={() => setAsDefaultLeague("eng.1")}
              className={s.defaultLeague === "eng.1" ? "chip chip-ink text-xs" : "chip text-xs"}
            >
              🏴󠁧󠁢󠁥󠁮󠁧󠁿 {tr("تثبيت الدوري الإنجليزي كافتراضي")}
            </button>
          </div>
        </div>
      </section>

      {/* 2. League Selection List */}
      <section className="stamp flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-extrabold">
              {tr("3. اختيار الدوريات والبطولات المعروضة (الليغا)")}
            </h3>
            <p className="text-xs font-semibold text-muted">
              {tr("فعّل أو أخفِ أي دوري، ورتّب أولوية ظهوره بالأسهم، أو اضغط على النجمة ★ لجعله الدوري الافتراضي.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => applyPreset("laliga")}
              className="chip text-xs"
            >
              🇪🇸 {tr("لا ليغا وأبطال أوروبا فقط")}
            </button>
            <button
              type="button"
              onClick={() => applyPreset("top5")}
              className="chip text-xs"
            >
              🔥 {tr("الدوريات الـ 5 الكبرى")}
            </button>
            <button
              type="button"
              onClick={() => applyPreset("all")}
              className="chip text-xs"
            >
              ✅ {tr("تفعيل كل الدوريات")}
            </button>
          </div>
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
          {s.leagues.map((lg, i) => {
            const isDef = s.defaultLeague === lg.id;
            return (
              <li
                key={lg.id}
                className={`flex items-center justify-between gap-2 rounded-2xl border p-3 transition ${
                  lg.enabled ? "border-line bg-paper" : "border-line/50 bg-surface opacity-60"
                }`}
              >
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={lg.enabled}
                    onChange={() => toggleLeague(lg.id)}
                    className="size-4 accent-primary"
                  />
                  <span className="text-lg">{lg.badge}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-extrabold">{lg.nameAr}</span>
                      {isDef ? (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold text-ink">
                          {tr("الافتراضي ★")}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[11px] font-semibold text-muted">
                      {lg.countryAr} · <code dir="ltr">{lg.id}</code>
                    </span>
                  </div>
                </label>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setAsDefaultLeague(lg.id)}
                    title={tr("تعيين كليغا افتراضية")}
                    className={`grid size-8 place-items-center rounded-lg border ${
                      isDef
                        ? "border-primary bg-primary text-ink"
                        : "border-line bg-paper text-muted hover:text-ink"
                    }`}
                  >
                    <Star className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLeague(i, -1)}
                    disabled={i === 0}
                    className="grid size-8 place-items-center rounded-lg border border-line bg-paper disabled:opacity-30"
                    title={tr("تحريك لأعلى")}
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveLeague(i, 1)}
                    disabled={i === s.leagues.length - 1}
                    className="grid size-8 place-items-center rounded-lg border border-line bg-paper disabled:opacity-30"
                    title={tr("تحريك لأسفل")}
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleLeague(lg.id)}
                    className="grid size-8 place-items-center rounded-lg border border-line bg-paper"
                    title={lg.enabled ? tr("إخفاء") : tr("إظهار")}
                  >
                    {lg.enabled ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Add Custom League */}
        <div className="mt-2 rounded-2xl border border-dashed border-line bg-surface p-3">
          <p className="mb-2 text-xs font-extrabold">
            {tr("+ إضافة دوري إضافي مخصص (أمثلة أكواد: ned.1 الدوري الهولندي، por.1 البرتغالي، tur.1 التركي، mar.1 المغربي):")}
          </p>
          <div className="grid gap-2 sm:grid-cols-[70px_1fr_1fr_auto]">
            <input
              className="field text-center"
              value={newLeagueBadge}
              onChange={(e) => setNewLeagueBadge(e.target.value)}
              placeholder="⚽"
              maxLength={4}
            />
            <input
              className="field"
              value={newLeagueName}
              onChange={(e) => setNewLeagueName(e.target.value)}
              placeholder={tr("اسم الدوري بالعربية (مثلاً: الدوري التركي)")}
            />
            <input
              className="field"
              dir="ltr"
              value={newLeagueId}
              onChange={(e) => setNewLeagueId(e.target.value)}
              placeholder="tur.1"
            />
            <button type="button" onClick={addCustomLeague} className="btn text-xs">
              <Plus className="size-4" />
              {tr("إضافة الدوري")}
            </button>
          </div>
        </div>
      </section>

      {/* 3. Custom / Local Matches Manager (e.g. Hapoel Rahat / Negev) */}
      <section className="stamp flex flex-col gap-3 p-4">
        <div>
          <h3 className="text-base font-extrabold">
            {tr("4. إضافة مباراة محلية أو خاصة يدوياً (مثل مباريات فرق رهط والنقب)")}
          </h3>
          <p className="text-xs font-semibold text-muted">
            {tr("يمكنك إضافة أي مباراة محلية وتحديث نتيجتها المباشرة لتظهر للزوار في أعلى الجدول.")}
          </p>
        </div>

        <div className="grid gap-2 rounded-2xl bg-surface p-3 sm:grid-cols-3">
          <input
            className="field"
            value={homeTeam}
            onChange={(e) => setHomeTeam(e.target.value)}
            placeholder={tr("الفريق الأول (مثال: هبوعيل رهط)")}
          />
          <input
            className="field"
            value={awayTeam}
            onChange={(e) => setAwayTeam(e.target.value)}
            placeholder={tr("الفريق الثاني (مثال: شباب كسيفة)")}
          />
          <select
            className="field"
            value={matchLeagueId}
            onChange={(e) => setMatchLeagueId(e.target.value)}
          >
            {s.leagues.map((lg) => (
              <option key={lg.id} value={lg.id}>
                {lg.badge} {lg.nameAr}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <label className="flex-1 text-xs font-bold">
              {tr("نتيجة الأول")}
              <input
                type="number"
                min={0}
                max={99}
                className="field mt-1"
                value={homeScore}
                onChange={(e) => setHomeScore(Number(e.target.value))}
              />
            </label>
            <label className="flex-1 text-xs font-bold">
              {tr("نتيجة الثاني")}
              <input
                type="number"
                min={0}
                max={99}
                className="field mt-1"
                value={awayScore}
                onChange={(e) => setAwayScore(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex-1 text-xs font-bold">
              {tr("الحالة")}
              <select
                className="field mt-1"
                value={matchStatus}
                onChange={(e) => setMatchStatus(e.target.value as CustomMatchStatus)}
              >
                <option value="pre">{tr("لم تبدأ (عرض الوقت)")}</option>
                <option value="in">🔴 {tr("مباشر الآن")}</option>
                <option value="post">{tr("انتهت")}</option>
              </select>
            </label>
            <label className="flex-1 text-xs font-bold">
              {matchStatus === "in" ? tr("الدقيقة (مثل 65')") : tr("وقت البداية")}
              <input
                className="field mt-1"
                dir="ltr"
                value={matchStatus === "in" ? matchMinute : kickoff}
                onChange={(e) =>
                  matchStatus === "in" ? setMatchMinute(e.target.value) : setKickoff(e.target.value)
                }
                placeholder={matchStatus === "in" ? "65'" : "20:00"}
              />
            </label>
          </div>

          <div className="flex items-end gap-2">
            <label className="flex-1 text-xs font-bold">
              {tr("ملاحظة (الملعب / الجولة)")}
              <input
                className="field mt-1"
                value={matchNote}
                onChange={(e) => setMatchNote(e.target.value)}
                placeholder={tr("الملعب البلدي رهط")}
              />
            </label>
            <button type="button" onClick={addCustomMatch} className="btn h-11 shrink-0 text-xs">
              <Plus className="size-4" />
              {tr("إضافة")}
            </button>
          </div>
        </div>

        {s.customMatches.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {s.customMatches.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-paper p-3 text-sm font-bold"
              >
                <div className="flex items-center gap-2">
                  <span className="chip text-xs">{m.leagueNameAr}</span>
                  <span>{m.homeTeam}</span>
                  <span className="rounded-lg bg-surface px-2 py-0.5 font-extrabold" dir="ltr">
                    {m.status === "pre" ? m.kickoff : `${m.homeScore} : ${m.awayScore}`}
                  </span>
                  <span>{m.awayTeam}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      update({
                        customMatches: s.customMatches.map((x) =>
                          x.id === m.id
                            ? {
                                ...x,
                                status:
                                  x.status === "pre" ? "in" : x.status === "in" ? "post" : "pre",
                              }
                            : x,
                        ),
                      })
                    }
                    className="chip text-xs"
                  >
                    {m.status === "in"
                      ? "🔴 مباشر"
                      : m.status === "post"
                        ? "انتهت"
                        : "لم تبدأ"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      update({
                        customMatches: s.customMatches.filter((x) => x.id !== m.id),
                      })
                    }
                    className="grid size-8 place-items-center rounded-lg border border-line text-alert"
                    title={tr("حذف")}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* Bottom Sticky Save */}
      <div className="sticky bottom-20 z-20 flex items-center justify-between gap-3 rounded-2xl bg-paper p-3 shadow-[var(--shadow-lift)] md:bottom-4">
        <span className="text-sm font-bold text-muted">
          {dirty
            ? tr("لديك تعديلات غير محفوظة — اضغط حفظ لتطبيقها على الموقع")
            : tr("جميع إعدادات الدوريات محفوظة")}
        </span>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="btn px-6"
        >
          {saving ? tr("جاري الحفظ…") : tr("حفظ التغييرات")}
        </button>
      </div>
    </div>
  );
}
