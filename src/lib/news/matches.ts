import { createServerFn } from "@tanstack/react-start";

export type LeagueConfig = {
  id: string;
  nameAr: string;
  shortAr: string;
  countryAr: string;
  badge: string;
  enabled: boolean;
  builtin?: boolean;
};

export type CustomMatchStatus = "pre" | "in" | "post";

export type CustomMatch = {
  id: string;
  leagueId: string;
  leagueNameAr: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  kickoff: string; // HH:mm or label
  dateOffset: -1 | 0 | 1; // -1 yesterday, 0 today, 1 tomorrow
  status: CustomMatchStatus;
  minute?: string;
  note?: string;
};

export type MatchesSettings = {
  enabled: boolean;
  showOnHome: boolean;
  /** "all" or a specific league id like "isr.1" or "esp.1" */
  defaultLeague: string;
  leagues: LeagueConfig[];
  customMatches: CustomMatch[];
};

export type MatchItem = {
  id: string;
  leagueId: string;
  leagueNameAr: string;
  leagueBadge: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo?: string;
  awayLogo?: string;
  homeScore: number | null;
  awayScore: number | null;
  status: "pre" | "in" | "post";
  statusTextAr: string;
  kickoffIso: string;
  kickoffTimeAr: string;
  dayKey: "yesterday" | "today" | "tomorrow" | "upcoming";
  dateLabelAr: string;
  venue?: string;
  note?: string;
};

export type MatchesBoardData = {
  enabled: boolean;
  showOnHome: boolean;
  defaultLeague: string;
  leagues: LeagueConfig[];
  matches: MatchItem[];
  fetchedAt: number;
};

export const BUILTIN_LEAGUES: LeagueConfig[] = [
  {
    id: "isr.1",
    nameAr: "الدوري الإسرائيلي الممتاز (ليغات هعَل)",
    shortAr: "الدوري الإسرائيلي",
    countryAr: "البلاد",
    badge: "⚽",
    enabled: true,
    builtin: true,
  },
  {
    id: "esp.1",
    nameAr: "الدوري الإسباني (لا ليغا)",
    shortAr: "لا ليغا",
    countryAr: "إسبانيا",
    badge: "🇪🇸",
    enabled: true,
    builtin: true,
  },
  {
    id: "uefa.champions",
    nameAr: "دوري أبطال أوروبا",
    shortAr: "أبطال أوروبا",
    countryAr: "أوروبا",
    badge: "🏆",
    enabled: true,
    builtin: true,
  },
  {
    id: "eng.1",
    nameAr: "الدوري الإنجليزي الممتاز",
    shortAr: "البريميرليغ",
    countryAr: "إنجلترا",
    badge: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
    enabled: true,
    builtin: true,
  },
  {
    id: "ita.1",
    nameAr: "الدوري الإيطالي (سيريا آ)",
    shortAr: "الدوري الإيطالي",
    countryAr: "إيطاليا",
    badge: "🇮🇹",
    enabled: true,
    builtin: true,
  },
  {
    id: "ger.1",
    nameAr: "الدوري الألماني (بوندسليغا)",
    shortAr: "بوندسليغا",
    countryAr: "ألمانيا",
    badge: "🇩🇪",
    enabled: true,
    builtin: true,
  },
  {
    id: "fra.1",
    nameAr: "الدوري الفرنسي (ليغ 1)",
    shortAr: "الدوري الفرنسي",
    countryAr: "فرنسا",
    badge: "🇫🇷",
    enabled: true,
    builtin: true,
  },
  {
    id: "sau.1",
    nameAr: "الدوري السعودي روشن",
    shortAr: "دوري روشن",
    countryAr: "السعودية",
    badge: "🇸🇦",
    enabled: true,
    builtin: true,
  },
  {
    id: "isr.2",
    nameAr: "الدرجة الوطنية الإسرائيلية (ليئوميت)",
    shortAr: "الدرجة الوطنية",
    countryAr: "البلاد",
    badge: "🥅",
    enabled: true,
    builtin: true,
  },
  {
    id: "isr.cup",
    nameAr: "كأس الدولة الإسرائيلي",
    shortAr: "كأس الدولة",
    countryAr: "البلاد",
    badge: "🏅",
    enabled: false,
    builtin: true,
  },
  {
    id: "uefa.europa",
    nameAr: "الدوري الأوروبي",
    shortAr: "الدوري الأوروبي",
    countryAr: "أوروبا",
    badge: "🟠",
    enabled: false,
    builtin: true,
  },
  {
    id: "uefa.europa.conf",
    nameAr: "دوري المؤتمر الأوروبي",
    shortAr: "المؤتمر الأوروبي",
    countryAr: "أوروبا",
    badge: "🟢",
    enabled: false,
    builtin: true,
  },
  {
    id: "esp.copa_del_rey",
    nameAr: "كأس ملك إسبانيا",
    shortAr: "كأس الملك",
    countryAr: "إسبانيا",
    badge: "👑",
    enabled: false,
    builtin: true,
  },
  {
    id: "eng.fa",
    nameAr: "كأس الاتحاد الإنجليزي",
    shortAr: "كأس إنجلترا",
    countryAr: "إنجلترا",
    badge: "🏅",
    enabled: false,
    builtin: true,
  },
  {
    id: "egy.1",
    nameAr: "الدوري المصري الممتاز",
    shortAr: "الدوري المصري",
    countryAr: "مصر",
    badge: "🇪🇬",
    enabled: false,
    builtin: true,
  },
  {
    id: "afc.champions",
    nameAr: "دوري أبطال آسيا للنخبة",
    shortAr: "أبطال آسيا",
    countryAr: "آسيا",
    badge: "🌏",
    enabled: false,
    builtin: true,
  },
  {
    id: "caf.champions",
    nameAr: "دوري أبطال أفريقيا",
    shortAr: "أبطال أفريقيا",
    countryAr: "أفريقيا",
    badge: "🌍",
    enabled: false,
    builtin: true,
  },
  {
    id: "fifa.world",
    nameAr: "كأس العالم والمنتخبات",
    shortAr: "كأس العالم",
    countryAr: "دولي",
    badge: "🌐",
    enabled: false,
    builtin: true,
  },
  {
    id: "local.rahat",
    nameAr: "مباريات رهط والنقب",
    shortAr: "رهط والنقب",
    countryAr: "رهط والنقب",
    badge: "🏟️",
    enabled: true,
    builtin: true,
  },
];

export const DEFAULT_MATCHES_SETTINGS: MatchesSettings = {
  enabled: true,
  showOnHome: true,
  defaultLeague: "all",
  leagues: BUILTIN_LEAGUES,
  customMatches: [],
};

/** Arabic translations for clubs in Israeli Premier League (Ligat Ha'Al), Liga Leumit, LaLiga, Premier League, UCL, Serie A, Bundesliga, Ligue 1, and Arab leagues. */
const TEAM_AR: Record<string, string> = {
  // Israeli Premier League (Ligat Ha'Al) & Liga Leumit (English + Hebrew variants)
  "hapoel be'er sheva": "هبوعيل بئر السبع",
  "hapoel beer sheva": "هبوعيل بئر السبع",
  "hapoel beer-sheva": "هبوعيل بئر السبع",
  "הפועל באר שבע": "هبوعيل بئر السبع",
  "maccabi haifa": "مكابي حيفا",
  "מכבי חיפה": "مكابي حيفا",
  "maccabi tel aviv": "مكابي تل أبيب",
  "maccabi tel-aviv": "مكابي تل أبيب",
  "מכבי תל אביב": "مكابي تل أبيب",
  "hapoel tel aviv": "هبوعيل تل أبيب",
  "hapoel tel-aviv": "هبوعيل تل أبيب",
  "הפועל תל אביב": "هبوعيل تل أبيب",
  "beitar jerusalem": "بيتار القدس",
  "בית\"ר ירושלים": "بيتار القدس",
  "hapoel jerusalem": "هبوعيل القدس",
  "הפועל ירושלים": "هبوعيل القدس",
  "bnei sakhnin": "أبناء سخنين",
  "ihud bnei sakhnin": "اتحاد أبناء سخنين",
  "בני סכנין": "أبناء سخنين",
  "maccabi bnei reineh": "مكابي أبناء الرينة",
  "maccabi bnei raina": "مكابي أبناء الرينة",
  "bnei reineh": "أبناء الرينة",
  "מכבי בני ריינה": "مكابي أبناء الرينة",
  "maccabi netanya": "مكابي نتانيا",
  "מכבי נתניה": "مكابي نتانيا",
  "hapoel haifa": "هبوعيل حيفا",
  "הפועל חיפה": "هبوعيل حيفا",
  "maccabi petah tikva": "مكابي بيتح تكفا",
  "maccabi petah-tikva": "مكابي بيتح تكفا",
  "מכבי פתח תקווה": "مكابي بيتح تكفا",
  "hapoel petah tikva": "هبوعيل بيتح تكفا",
  "hapoel petah-tikva": "هبوعيل بيتح تكفا",
  "הפועל פתח תקווה": "هبوعيل بيتح تكفا",
  "ashdod": "م.س أشدود",
  "fc ashdod": "م.س أشدود",
  "f.c. ashdod": "م.س أشدود",
  "ms ashdod": "م.س أشدود",
  "sc ashdod": "م.س أشدود",
  "מ.ס. אשדוד": "م.س أشدود",
  "ironi kiryat shmona": "عيروني كريات شمونة",
  "hapoel ironi kiryat shmona": "هبوعيل كريات شمونة",
  "kiryat shmona": "كريات شمونة",
  "עירוני קריית שמונה": "عيروني كريات شمونة",
  "ironi tiberias": "عيروني طبريا",
  "עירוני טבריה": "عيروني طبريا",
  "hapoel hadera": "هبوعيل الخضيرة",
  "הפועל חדרה": "هبوعيل الخضيرة",
  "hapoel ramat gan": "هبوعيل رمات غان",
  "hapoel ramat-gan": "هبوعيل رمات غان",
  "bnei yehuda": "بني يهودا تل أبيب",
  "bnei yehuda tel aviv": "بني يهودا تل أبيب",
  "hapoel kfar saba": "هبوعيل كفار سابا",
  "hapoel umm al-fahm": "هبوعيل أم الفحم",
  "maccabi ahi nazareth": "مكابي إخاء الناصرة",
  "ms kafr qasim": "م.س كفر قاسم",
  "sc kafr qasim": "م.س كفر قاسم",
  "hapoel acre": "هبوعيل عكا",
  "hapoel akko": "هبوعيل عكا",
  "hapoel rishon lezion": "هبوعيل ريشون لتسيون",
  "maccabi herzliya": "مكابي هرتسليا",
  "hapoel afula": "هبوعيل العفولة",
  "hapoel nof hagalil": "هبوعيل نوف هجليل",
  "maccabi jaffa": "مكابي يافا",
  "maccabi kabilio jaffa": "مكابي كابيليو يافا",
  "hapoel kfar shalem": "هبوعيل كفار شاليم",
  "hapoel raanana": "هبوعيل رعنانا",
  "hapoel rahat": "هبوعيل رهط",
  // LaLiga (Spain)
  "real madrid": "ريال مدريد",
  "barcelona": "برشلونة",
  "fc barcelona": "برشلونة",
  "atletico madrid": "أتلتيكو مدريد",
  "atlético madrid": "أتلتيكو مدريد",
  "atlético de madrid": "أتلتيكو مدريد",
  "girona": "جيرونا",
  "athletic club": "أتلتيك بيلباو",
  "athletic bilbao": "أتلتيك بيلباو",
  "real sociedad": "ريال سوسيداد",
  "real betis": "ريال بيتيس",
  "villarreal": "فياريال",
  "valencia": "فالنسيا",
  "sevilla": "إشبيلية",
  "celta vigo": "سيلتا فيغو",
  "rc celta": "سيلتا فيغو",
  "osasuna": "أوساسونا",
  "ca osasuna": "أوساسونا",
  "getafe": "خيتافي",
  "rayo vallecano": "رايو فايكانو",
  "mallorca": "ريال مايوركا",
  "rcd mallorca": "ريال مايوركا",
  "las palmas": "لاس بالماس",
  "ud las palmas": "لاس بالماس",
  "alaves": "ديبورتيفو ألافيس",
  "deportivo alavés": "ديبورتيفو ألافيس",
  "leganes": "ليغانيس",
  "cd leganés": "ليغانيس",
  "espanyol": "إسبانيول",
  "rcd espanyol": "إسبانيول",
  "real valladolid": "بلد الوليد",
  // Premier League (England)
  "manchester city": "مانشستر سيتي",
  "arsenal": "أرسنال",
  "liverpool": "ليفربول",
  "chelsea": "تشيلسي",
  "manchester united": "مانشستر يونايتد",
  "tottenham hotspur": "توتنهام هوتسبير",
  "tottenham": "توتنهام",
  "newcastle united": "نيوكاسل يونايتد",
  "aston villa": "أستون فيلا",
  "brighton & hove albion": "برايتون",
  "brighton": "برايتون",
  "west ham united": "وست هام يونايتد",
  "crystal palace": "كريستال بالاس",
  "fulham": "فولهام",
  "brentford": "برينتفورد",
  "everton": "إيفرتون",
  "wolverhampton wanderers": "وولفرهامبتون",
  "wolves": "وولفرهامبتون",
  "afc bournemouth": "بورنموث",
  "bournemouth": "بورنموث",
  "nottingham forest": "نوتنغهام فورست",
  "leicester city": "ليستر سيتي",
  "ipswich town": "إيبسويتش تاون",
  "southampton": "ساوثهامبتون",
  // Serie A (Italy)
  "inter": "إنتر ميلان",
  "internazionale": "إنتر ميلان",
  "inter milan": "إنتر ميلان",
  "ac milan": "ميلان",
  "milan": "ميلان",
  "juventus": "يوفنتوس",
  "napoli": "نابولي",
  "as roma": "روما",
  "roma": "روما",
  "lazio": "لاتسيو",
  "atalanta": "أتالانتا",
  "fiorentina": "فيورنتينا",
  "bologna": "بولونيا",
  "torino": "تورينو",
  "udinese": "أودينيزي",
  "genoa": "جنوى",
  "como": "كومو",
  "parma": "بارما",
  "hellas verona": "هيلاس فيرونا",
  "cagliari": "كالياري",
  "empoli": "إمبولي",
  "lecce": "ليتشي",
  "monza": "مونزا",
  "venezia": "فينيزيا",
  // Bundesliga (Germany)
  "bayern munich": "بايرن ميونخ",
  "fc bayern münchen": "بايرن ميونخ",
  "bayer leverkusen": "باير ليفركوزن",
  "borussia dortmund": "بوروسيا دورتموند",
  "rb leipzig": "لايبزيغ",
  "vfb stuttgart": "شتوتغارت",
  "eintracht frankfurt": "آينتراخت فرانكفورت",
  "tsg hoffenheim": "هوفنهايم",
  "sc freiburg": "فرايبورغ",
  "sv werder bremen": "فيردر بريمن",
  "fc augsburg": "أوغسبورغ",
  "vfl wolfsburg": "فولفسبورغ",
  "borussia monchengladbach": "بوروسيا مونشنغلادباخ",
  "borussia mönchengladbach": "بوروسيا مونشنغلادباخ",
  "1. fc union berlin": "يونيون برلين",
  "mainz 05": "ماينتس",
  "1. fsv mainz 05": "ماينتس",
  "vfl bochum": "بوخوم",
  "fc st. pauli": "سانت باولي",
  "holstein kiel": "هولشتاين كيل",
  "1. fc heidenheim 1846": "هايدنهايم",
  // Ligue 1 (France)
  "paris saint-germain": "باريس سان جيرمان",
  "psg": "باريس سان جيرمان",
  "marseille": "مارسيليا",
  "olympique de marseille": "مارسيليا",
  "monaco": "موناكو",
  "as monaco": "موناكو",
  "lyon": "ليون",
  "olympique lyonnais": "ليون",
  "lille": "ليل",
  "losc lille": "ليل",
  "nice": "نيس",
  "ogc nice": "نيس",
  "lens": "لانس",
  "rc lens": "لانس",
  "rennes": "رين",
  "stade rennais": "رين",
  "stade brestois 29": "بريست",
  "brest": "بريست",
  // Other UCL & European clubs
  "benfica": "بنفيكا",
  "sporting cp": "سبورتينغ لشبونة",
  "fc porto": "بورتو",
  "porto": "بورتو",
  "ajax": "أياكس أمستردام",
  "psv eindhoven": "آيندهوفن",
  "feyenoord": "فينورد",
  "celtic": "سيلتيك",
  "rangers": "رينجرز",
  "galatasaray": "غلطة سراي",
  "fenerbahce": "فنربخشة",
  "besiktas": "بشكتاش",
  "shakhtar donetsk": "شاختار دونيتسك",
  "red bull salzburg": "ريد بول سالزبورغ",
  "club brugge": "كلوب بروج",
  "dinamo zagreb": "دينامو زغرب",
  "sparta prague": "سبارتا براغ",
  "slovan bratislava": "سلوفان براتيسلافا",
  "young boys": "يونغ بويز",
  "crvena zvezda": "النجم الأحمر",
  "sturm graz": "شتورم غراتس",
  // Saudi Pro League & Arab clubs
  "al hilal": "الهلال",
  "al-hilal": "الهلال",
  "al nassr": "النصر",
  "al-nassr": "النصر",
  "al ittihad": "الاتحاد",
  "al-ittihad": "الاتحاد",
  "al ahli": "الأهلي",
  "al-ahli": "الأهلي",
  "al shabab": "الشباب",
  "al-shabab": "الشباب",
  "al ettifaq": "الاتفاق",
  "al taawoun": "التعاون",
  "al fateh": "الفتح",
  "al qadsiah": "القادسية",
  "zamalek": "الزمالك",
  "pyramids fc": "بيراميدز",
  "esperance": "الترجي التونسي",
  "wydad": "الوداد الرياضي",
  "raja": "الرجاء الرياضي",
  "al ain": "العين الإماراتي",
  "al sadd": "السد القطري",
};

export function translateTeamName(raw: string): string {
  const clean = raw.trim();
  const key = clean.toLowerCase();
  if (TEAM_AR[key]) return TEAM_AR[key];
  for (const [k, v] of Object.entries(TEAM_AR)) {
    if (key === k || key.startsWith(k + " ") || key.endsWith(" " + k) || key.includes(k)) {
      return v;
    }
  }
  return clean;
}

let tableEnsured = false;
async function ensureMatchesTable() {
  if (tableEnsured) return;
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      create table if not exists matches_settings (
        id int primary key default 1,
        data jsonb not null,
        updated_at timestamptz not null default now()
      )
    `;
    tableEnsured = true;
  } catch (e) {
    console.error("[matches] ensure table", e);
  }
}

export function sanitizeMatchesSettings(raw: unknown): MatchesSettings {
  const d = DEFAULT_MATCHES_SETTINGS;
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  const enabled = obj.enabled !== undefined ? Boolean(obj.enabled) : d.enabled;
  const showOnHome = obj.showOnHome !== undefined ? Boolean(obj.showOnHome) : d.showOnHome;

  const byId = new Map<string, LeagueConfig>();
  if (Array.isArray(obj.leagues)) {
    for (const item of obj.leagues) {
      const id = String(item?.id ?? "").trim().toLowerCase();
      if (!/^[a-z0-9._-]{2,40}$/.test(id) || byId.has(id)) continue;
      const builtin = BUILTIN_LEAGUES.find((b) => b.id === id);
      byId.set(id, {
        id,
        nameAr: String(item?.nameAr ?? builtin?.nameAr ?? id).trim().slice(0, 60) || id,
        shortAr: String(item?.shortAr ?? builtin?.shortAr ?? item?.nameAr ?? id).trim().slice(0, 30) || id,
        countryAr: String(item?.countryAr ?? builtin?.countryAr ?? "دولي").trim().slice(0, 30),
        badge: String(item?.badge ?? builtin?.badge ?? "⚽").trim().slice(0, 6) || "⚽",
        enabled: item?.enabled !== undefined ? Boolean(item.enabled) : (builtin?.enabled ?? true),
        builtin: Boolean(builtin),
      });
    }
  }
  for (const b of BUILTIN_LEAGUES) {
    if (!byId.has(b.id)) byId.set(b.id, { ...b });
  }
  const leagues = [...byId.values()];
  if (!leagues.some((l) => l.enabled)) {
    const isr = leagues.find((l) => l.id === "isr.1");
    if (isr) isr.enabled = true;
  }

  const rawDef = String(obj.defaultLeague ?? d.defaultLeague).trim();
  const defaultLeague =
    rawDef === "all" || leagues.some((l) => l.id === rawDef && l.enabled)
      ? rawDef
      : (leagues.find((l) => l.enabled)?.id ?? "all");

  const customMatches: CustomMatch[] = [];
  if (Array.isArray(obj.customMatches)) {
    for (const m of obj.customMatches.slice(0, 30)) {
      const homeTeam = String(m?.homeTeam ?? "").trim().slice(0, 50);
      const awayTeam = String(m?.awayTeam ?? "").trim().slice(0, 50);
      if (!homeTeam || !awayTeam) continue;
      const status: CustomMatchStatus =
        m?.status === "in" || m?.status === "post" ? m.status : "pre";
      const offset = m?.dateOffset === -1 || m?.dateOffset === 1 ? m.dateOffset : 0;
      const leagueId = String(m?.leagueId ?? "local.rahat").trim();
      const lg = leagues.find((l) => l.id === leagueId);
      customMatches.push({
        id: String(m?.id ?? Math.random().toString(36).slice(2, 10)).slice(0, 24),
        leagueId,
        leagueNameAr: lg?.shortAr ?? String(m?.leagueNameAr ?? "مباريات رهط والنقب").slice(0, 40),
        homeTeam,
        awayTeam,
        homeScore: Math.max(0, Math.min(99, Number(m?.homeScore) || 0)),
        awayScore: Math.max(0, Math.min(99, Number(m?.awayScore) || 0)),
        kickoff: String(m?.kickoff ?? "20:00").trim().slice(0, 16) || "20:00",
        dateOffset: offset,
        status,
        minute: m?.minute ? String(m.minute).trim().slice(0, 12) : undefined,
        note: m?.note ? String(m.note).trim().slice(0, 80) : undefined,
      });
    }
  }

  return { enabled, showOnHome, defaultLeague, leagues, customMatches };
}

let cachedSettings: { data: MatchesSettings; at: number } | null = null;

export async function loadMatchesSettings(fresh = false): Promise<MatchesSettings> {
  if (!fresh && cachedSettings && Date.now() - cachedSettings.at < 30_000) {
    return cachedSettings.data;
  }
  try {
    await ensureMatchesTable();
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ data: unknown }>`select data from matches_settings where id = 1`;
    const settings = rows[0]?.data
      ? sanitizeMatchesSettings(rows[0].data)
      : DEFAULT_MATCHES_SETTINGS;
    cachedSettings = { data: settings, at: Date.now() };
    return settings;
  } catch (e) {
    console.error("[matches] load settings", e);
    return cachedSettings?.data ?? DEFAULT_MATCHES_SETTINGS;
  }
}

export async function saveMatchesSettingsToDb(input: unknown): Promise<MatchesSettings> {
  const clean = sanitizeMatchesSettings(input);
  await ensureMatchesTable();
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  await sql`
    insert into matches_settings (id, data, updated_at)
    values (1, ${JSON.stringify(clean)}::jsonb, now())
    on conflict (id) do update set data = excluded.data, updated_at = now()
  `;
  cachedSettings = { data: clean, at: Date.now() };
  boardCache = null;
  return clean;
}

function formatYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function israelDateKey(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jerusalem",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

function formatTimeJerusalem(iso: string): string {
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

function formatShortDateAr(iso: string): string {
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

function classifyDayKey(kickoffIso: string): MatchItem["dayKey"] {
  const now = new Date();
  const todayKey = israelDateKey(now.toISOString());
  const yestKey = israelDateKey(new Date(now.getTime() - 86_400_000).toISOString());
  const tomKey = israelDateKey(new Date(now.getTime() + 86_400_000).toISOString());
  const dKey = israelDateKey(kickoffIso);
  if (dKey === todayKey) return "today";
  if (dKey === yestKey) return "yesterday";
  if (dKey === tomKey) return "tomorrow";
  return "upcoming";
}

/** Map league IDs to TheSportsDB league IDs for supplementary/fallback rounds (especially Israeli Ligat Ha'Al 4644). */
const SPORTSDB_LEAGUE_IDS: Record<string, string> = {
  "isr.1": "4644", // Israeli Premier League (Ligat Ha'Al)
  "esp.1": "4335", // Spanish La Liga
  "eng.1": "4328", // English Premier League
  "ita.1": "4332", // Italian Serie A
  "ger.1": "4331", // German Bundesliga
  "fra.1": "4334", // French Ligue 1
  "uefa.champions": "4480", // UEFA Champions League
  "sau.1": "4668", // Saudi Pro League
};

async function fetchSportsDbEvents(league: LeagueConfig): Promise<MatchItem[]> {
  const sdbId = SPORTSDB_LEAGUE_IDS[league.id];
  if (!sdbId) return [];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3_800);
  try {
    const [nextRes, pastRes] = await Promise.allSettled([
      fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${sdbId}`, {
        signal: ctrl.signal,
        headers: { accept: "application/json" },
      }),
      fetch(`https://www.thesportsdb.com/api/v1/json/3/eventspastleague.php?id=${sdbId}`, {
        signal: ctrl.signal,
        headers: { accept: "application/json" },
      }),
    ]);

    const rawEvents: any[] = [];
    for (const r of [nextRes, pastRes]) {
      if (r.status === "fulfilled" && r.value.ok) {
        const j = (await r.value.json().catch(() => ({}))) as { events?: any[] };
        if (Array.isArray(j?.events)) rawEvents.push(...j.events);
      }
    }

    const out: MatchItem[] = [];
    for (const ev of rawEvents.slice(0, 20)) {
      if (!ev?.strHomeTeam || !ev?.strAwayTeam) continue;
      const dateStr = String(ev.dateEvent ?? "");
      const timeStr = String(ev.strTime ?? "18:00:00").slice(0, 8);
      if (!dateStr) continue;
      const kickoffIso = `${dateStr}T${timeStr.includes(":") ? timeStr : "18:00:00"}Z`;
      const hasScore = ev.intHomeScore !== null && ev.intHomeScore !== undefined && ev.intHomeScore !== "";
      const rawStatus = String(ev.strStatus ?? "").toUpperCase();
      const isLive = rawStatus === "LIVE" || rawStatus === "1H" || rawStatus === "2H" || rawStatus === "HT";
      const status: "pre" | "in" | "post" = isLive ? "in" : hasScore ? "post" : "pre";
      const dayKey = classifyDayKey(kickoffIso);

      out.push({
        id: `sdb-${ev.idEvent ?? `${league.id}-${dateStr}-${ev.strHomeTeam}`}`,
        leagueId: league.id,
        leagueNameAr: league.shortAr,
        leagueBadge: league.badge,
        homeTeam: translateTeamName(String(ev.strHomeTeam)),
        awayTeam: translateTeamName(String(ev.strAwayTeam)),
        homeLogo: typeof ev.strHomeTeamBadge === "string" ? ev.strHomeTeamBadge : undefined,
        awayLogo: typeof ev.strAwayTeamBadge === "string" ? ev.strAwayTeamBadge : undefined,
        homeScore: hasScore ? Number(ev.intHomeScore) : null,
        awayScore: hasScore ? Number(ev.intAwayScore) : null,
        status,
        statusTextAr:
          status === "in"
            ? "مباشر الآن"
            : status === "post"
              ? "انتهت"
              : formatTimeJerusalem(kickoffIso),
        kickoffIso,
        kickoffTimeAr: formatTimeJerusalem(kickoffIso),
        dayKey,
        dateLabelAr: formatShortDateAr(kickoffIso),
        venue: ev.strVenue ? String(ev.strVenue) : undefined,
      });
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchLeagueEvents(league: LeagueConfig, dateRangeParam: string): Promise<MatchItem[]> {
  if (league.id === "local.rahat") return [];
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${encodeURIComponent(league.id)}/scoreboard?dates=${dateRangeParam}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3_800);
  let espnItems: MatchItem[] = [];
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; RahatPostBot/1.0; +https://rahatpost.com)",
        accept: "application/json",
      },
    });
    if (res.ok) {
      const json = (await res.json()) as { events?: any[] };
      const events = Array.isArray(json?.events) ? json.events : [];
      const now = new Date();

      for (const ev of events.slice(0, 24)) {
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
        const dayKey = classifyDayKey(kickoffIso);

        let statusTextAr = formatTimeJerusalem(kickoffIso);
        if (status === "in") {
          statusTextAr = detail === "HT" ? "استراحة الشوطين" : clock ? `مباشر ${clock}` : "مباشر الآن";
        } else if (status === "post") {
          statusTextAr = "انتهت";
        }

        const homeScore = status === "pre" ? null : Number(home?.score ?? 0);
        const awayScore = status === "pre" ? null : Number(away?.score ?? 0);

        espnItems.push({
          id: String(ev?.id ?? `${league.id}-${kickoffIso}-${home.team.displayName}`),
          leagueId: league.id,
          leagueNameAr: league.shortAr,
          leagueBadge: league.badge,
          homeTeam: translateTeamName(
            String(home.team.shortDisplayName || home.team.displayName || home.team.name || ""),
          ),
          awayTeam: translateTeamName(
            String(away.team.shortDisplayName || away.team.displayName || away.team.name || ""),
          ),
          homeLogo: typeof home.team.logo === "string" ? home.team.logo : undefined,
          awayLogo: typeof away.team.logo === "string" ? away.team.logo : undefined,
          homeScore: Number.isFinite(homeScore) ? homeScore : null,
          awayScore: Number.isFinite(awayScore) ? awayScore : null,
          status,
          statusTextAr,
          kickoffIso,
          kickoffTimeAr: formatTimeJerusalem(kickoffIso),
          dayKey,
          dateLabelAr: formatShortDateAr(kickoffIso),
          venue: comp?.venue?.fullName ? String(comp.venue.fullName) : undefined,
        });
      }
    }
  } catch {
    // fallback below
  } finally {
    clearTimeout(timer);
  }

  // Always enrich Israeli Premier League (isr.1) or any league where ESPN returned < 2 matches using TheSportsDB
  if (league.id === "isr.1" || espnItems.length < 2) {
    const sdbItems = await fetchSportsDbEvents(league);
    const seen = new Set(
      espnItems.map((m) => `${m.homeTeam}-${m.awayTeam}-${m.kickoffIso.slice(0, 10)}`),
    );
    for (const item of sdbItems) {
      const key = `${item.homeTeam}-${item.awayTeam}-${item.kickoffIso.slice(0, 10)}`;
      if (!seen.has(key)) {
        seen.add(key);
        espnItems.push(item);
      }
    }
  }

  return espnItems;
}

let boardCache: { data: MatchesBoardData; at: number } | null = null;
let boardInflight: Promise<MatchesBoardData> | null = null;

export async function loadMatchesBoard(forceFresh = false): Promise<MatchesBoardData> {
  const settings = await loadMatchesSettings(forceFresh);
  if (!settings.enabled) {
    return {
      enabled: false,
      showOnHome: settings.showOnHome,
      defaultLeague: settings.defaultLeague,
      leagues: settings.leagues.filter((l) => l.enabled),
      matches: [],
      fetchedAt: Date.now(),
    };
  }

  if (!forceFresh && boardCache && Date.now() - boardCache.at < 60_000) {
    return {
      ...boardCache.data,
      enabled: settings.enabled,
      showOnHome: settings.showOnHome,
      defaultLeague: settings.defaultLeague,
    };
  }

  if (!forceFresh && boardInflight) return boardInflight;

  boardInflight = (async () => {
    const enabledLeagues = settings.leagues.filter((l) => l.enabled);
    const now = new Date();
    // Fetch an 8-day window (-3 days to +5 days) so all weekend & mid-week rounds appear
    const start = new Date(now.getTime() - 3 * 86_400_000);
    const end = new Date(now.getTime() + 5 * 86_400_000);
    const rangeParam = `${formatYmd(start)}-${formatYmd(end)}`;

    const results = await Promise.all(
      enabledLeagues.map((lg) => fetchLeagueEvents(lg, rangeParam)),
    );

    const customItems: MatchItem[] = settings.customMatches.map((m) => {
      const lg = settings.leagues.find((l) => l.id === m.leagueId);
      const dayKey: MatchItem["dayKey"] =
        m.dateOffset === -1 ? "yesterday" : m.dateOffset === 1 ? "tomorrow" : "today";
      const d = new Date(now.getTime() + m.dateOffset * 86_400_000);
      return {
        id: `custom-${m.id}`,
        leagueId: m.leagueId,
        leagueNameAr: lg?.shortAr ?? m.leagueNameAr,
        leagueBadge: lg?.badge ?? "🏟️",
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeScore: m.status === "pre" ? null : m.homeScore,
        awayScore: m.status === "pre" ? null : m.awayScore,
        status: m.status,
        statusTextAr:
          m.status === "in"
            ? m.minute
              ? `مباشر ${m.minute}`
              : "مباشر الآن"
            : m.status === "post"
              ? "انتهت"
              : m.kickoff,
        kickoffIso: d.toISOString(),
        kickoffTimeAr: m.kickoff,
        dayKey,
        dateLabelAr: formatShortDateAr(d.toISOString()),
        note: m.note,
      };
    });

    const allMatches = [...customItems, ...results.flat()].sort((a, b) => {
      // Live matches always come first
      if (a.status === "in" && b.status !== "in") return -1;
      if (b.status === "in" && a.status !== "in") return 1;
      return Date.parse(a.kickoffIso) - Date.parse(b.kickoffIso);
    });

    const board: MatchesBoardData = {
      enabled: settings.enabled,
      showOnHome: settings.showOnHome,
      defaultLeague: settings.defaultLeague,
      leagues: enabledLeagues,
      matches: allMatches,
      fetchedAt: Date.now(),
    };
    boardCache = { data: board, at: Date.now() };
    return board;
  })().finally(() => {
    boardInflight = null;
  });

  return boardInflight;
}

export const getMatchesBoard = createServerFn({ method: "GET" }).handler(
  async (): Promise<MatchesBoardData> => {
    try {
      return await loadMatchesBoard(false);
    } catch (e) {
      console.error("[matches] getMatchesBoard", e);
      return {
        enabled: true,
        showOnHome: true,
        defaultLeague: "all",
        leagues: BUILTIN_LEAGUES.filter((l) => l.enabled),
        matches: [],
        fetchedAt: Date.now(),
      };
    }
  },
);

export const adminGetMatchesSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ authed: boolean; settings: MatchesSettings }> => {
    const { isAdmin } = await import("@/lib/admin-auth");
    if (!(await isAdmin())) return { authed: false, settings: DEFAULT_MATCHES_SETTINGS };
    const settings = await loadMatchesSettings(true);
    return { authed: true, settings };
  },
);

export const adminSaveMatchesSettings = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => d)
  .handler(async ({ data }): Promise<{ ok: boolean; settings?: MatchesSettings; message?: string }> => {
    const { isAdmin } = await import("@/lib/admin-auth");
    if (!(await isAdmin())) return { ok: false, message: "غير مصرح" };
    try {
      const settings = await saveMatchesSettingsToDb(data);
      return { ok: true, settings };
    } catch (e) {
      console.error("[matches] save settings", e);
      return { ok: false, message: "تعذّر حفظ إعدادات الدوريات." };
    }
  });

export const adminRefreshMatchesNow = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ ok: boolean; count: number; message: string }> => {
    const { isAdmin } = await import("@/lib/admin-auth");
    if (!(await isAdmin())) return { ok: false, count: 0, message: "غير مصرح" };
    const board = await loadMatchesBoard(true);
    return {
      ok: true,
      count: board.matches.length,
      message: `تم تحديث جدول المباريات بنجاح (${board.matches.length} مباراة من ${board.leagues.length} دوريات مفعّلة) ✓`,
    };
  },
);
