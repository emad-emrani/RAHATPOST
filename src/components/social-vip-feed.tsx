import { ChevronLeft, ChevronRight, ExternalLink, Globe, Languages, MessageCircle, Repeat2, Share2, ThumbsUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSiteSettings } from "@/lib/site-settings/context";
import { tr, trv } from "@/lib/i18n/core";

export interface SocialHubConfig {
  vipSectionEnabled: boolean;
  defaultTrendScope: "local" | "global";
  showTrendsDrawerOpen: boolean;
  fbPageName: string;
  fbPageUrl: string;
  fbPageId: string;
  fbAutoPublish: boolean;
  tiktokHandle: string;
  telegramChannel: string;
}

export interface LocalTrackedFigure {
  id: string;
  name: string;
  fbUrl: string;
  role: string;
  category: "local" | "politicians" | "community";
  autoPublish: boolean;
}

export interface SocialVipPostItem {
  id: string;
  platform: "x" | "facebook";
  authorName: string;
  authorHandle: string;
  authorRole: string;
  authorAvatar: string;
  verified: boolean;
  category: "politicians" | "celebrities" | "sports" | "local";
  originalLang: "he" | "en" | "ar";
  originalText: string;
  translatedAr: string;
  publishedAgoAr: string;
  likesCount: string;
  commentsCount: string;
  sharesCount: string;
  sourceUrl: string;
  trendTag?: string;
  sampleComments: { author: string; text: string; time: string }[];
}

export interface WorldVipPreset {
  id: string;
  name: string;
  handle: string;
  role: string;
  platform: "x" | "facebook";
  category: "politicians" | "celebrities" | "sports" | "local";
  lang: "he" | "en" | "ar";
  sourceUrl: string;
}

export function toBase64UrlSafe(str: string): string {
  try {
    const utf8 = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16)),
    );
    return btoa(utf8).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch {
    return "";
  }
}

export function fromBase64UrlSafe(b64: string): string {
  try {
    const padded = b64.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(padded);
    const pct = Array.from(bin)
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("");
    return decodeURIComponent(pct);
  } catch {
    return "";
  }
}

export function makeAvatarSvgDataUri(initials: string, bgHex = "#1877F2"): string {
  const clean = initials.trim().slice(0, 2).toUpperCase() || "RP";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="${bgHex}"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-weight="900" font-size="34">${clean}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function parseSocialHubConfig(
  quickLinks: { id: string; title?: string; subtitle?: string; url?: string }[] | undefined,
): SocialHubConfig {
  const item = (quickLinks ?? []).find((q) => q.id === "socialhubcfg" || q.id === "socialhub" || q.subtitle === "socialhub");
  let vipSectionEnabled = true;
  let defaultTrendScope: "local" | "global" = "local";
  let showTrendsDrawerOpen = true;
  let fbPageName = "رهط بوست - Rahat Post";
  let fbPageUrl = "https://www.facebook.com/rahatpost";
  let fbPageId = "";
  let fbAutoPublish = true;
  let tiktokHandle = "@rahatpost";
  let telegramChannel = "https://t.me/rahatpost";

  if (item) {
    const raw = `${item.title ?? ""}|${item.subtitle ?? ""}`;
    for (const part of raw.split("|")) {
      const p = part.trim();
      if (p.startsWith("vip:")) vipSectionEnabled = p.slice(4) !== "0";
      else if (p.startsWith("scope:")) {
        const v = p.slice(6);
        if (v === "global" || v === "local") defaultTrendScope = v;
      } else if (p.startsWith("open:")) showTrendsDrawerOpen = p.slice(5) !== "0";
      else if (p.startsWith("fbauto:")) fbAutoPublish = p.slice(7) !== "0";
      else if (p.startsWith("fbid:")) fbPageId = p.slice(5);
      else if (p.startsWith("tt:")) tiktokHandle = p.slice(3) || tiktokHandle;
    }
    if (item.url && item.url.startsWith("/__shcfg?")) {
      const jsonStr = fromBase64UrlSafe(item.url.slice(9));
      if (jsonStr) {
        try {
          const parsed = JSON.parse(jsonStr);
          if (typeof parsed.fbPageName === "string" && parsed.fbPageName) fbPageName = parsed.fbPageName;
          if (typeof parsed.fbPageUrl === "string" && parsed.fbPageUrl) fbPageUrl = parsed.fbPageUrl;
          if (typeof parsed.telegramChannel === "string" && parsed.telegramChannel)
            telegramChannel = parsed.telegramChannel;
        } catch {
          /* ignore */
        }
      }
    }
  }
  return {
    vipSectionEnabled,
    defaultTrendScope,
    showTrendsDrawerOpen,
    fbPageName,
    fbPageUrl,
    fbPageId,
    fbAutoPublish,
    tiktokHandle,
    telegramChannel,
  };
}

export function parseCustomVipPosts(
  quickLinks: { id: string; title?: string; subtitle?: string; url?: string }[] | undefined,
): SocialVipPostItem[] {
  const item = (quickLinks ?? []).find(
    (q) => q.id === "socialvipposts" || q.id === "social2" || q.title === "social2",
  );
  if (!item) return [];
  const b64 = item.url?.startsWith("/__svip?")
    ? item.url.slice(8)
    : item.subtitle?.startsWith("json:")
      ? item.subtitle.slice(5)
      : "";
  if (!b64) return [];
  const raw = fromBase64UrlSafe(b64);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export const DEFAULT_LOCAL_FIGURES: LocalTrackedFigure[] = [
  {
    id: "fig-rahat-muni",
    name: "بلدية رهط - עיריית רהט",
    fbUrl: "https://www.facebook.com/rahat.muni",
    role: "الصفحة الرسمية لبلدية رهط",
    category: "local",
    autoPublish: true,
  },
  {
    id: "fig-talal",
    name: "طلال القريناوي - رئيس بلدية رهط",
    fbUrl: "https://www.facebook.com/rahat.muni",
    role: "رئيس بلدية رهط",
    category: "local",
    autoPublish: true,
  },
  {
    id: "fig-matnas-rahat",
    name: "المركز الجماهيري رهط - מתנ״ס רהט",
    fbUrl: "https://www.facebook.com/matnasrahat",
    role: "المركز الجماهيري والثقافي في رهط",
    category: "community",
    autoPublish: true,
  },
];

export function parseLocalTrackedFigures(
  quickLinks: { id: string; title?: string; subtitle?: string; url?: string }[] | undefined,
): LocalTrackedFigure[] {
  const item = (quickLinks ?? []).find((q) => q.id === "sociallocalfigs");
  if (!item?.url || !item.url.startsWith("/__slfig?")) return DEFAULT_LOCAL_FIGURES;
  const raw = fromBase64UrlSafe(item.url.slice(9));
  if (!raw) return DEFAULT_LOCAL_FIGURES;
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length > 0 ? arr : DEFAULT_LOCAL_FIGURES;
  } catch {
    return DEFAULT_LOCAL_FIGURES;
  }
}

export function encodeLocalTrackedFigures(list: LocalTrackedFigure[]): string {
  return `/__slfig?${toBase64UrlSafe(JSON.stringify(list))}`;
}

export const WORLD_VIP_PRESETS: WorldVipPreset[] = [
  {
    id: "vip-musk",
    name: "Elon Musk",
    handle: "@elonmusk",
    role: "الرئيس التنفيذي لـ Tesla وSpaceX ومنصة 𝕏",
    platform: "x",
    category: "celebrities",
    lang: "en",
    sourceUrl: "https://x.com/elonmusk",
  },
  {
    id: "vip-trump",
    name: "Donald J. Trump",
    handle: "@realDonaldTrump",
    role: "الرئيس الأمريكي",
    platform: "x",
    category: "politicians",
    lang: "en",
    sourceUrl: "https://x.com/realDonaldTrump",
  },
  {
    id: "vip-netanyahu",
    name: "Benjamin Netanyahu - בנימין נתניהו",
    handle: "@netanyahu",
    role: "رئيس الوزراء الإسرائيلي",
    platform: "x",
    category: "politicians",
    lang: "he",
    sourceUrl: "https://x.com/netanyahu",
  },
  {
    id: "vip-tibi",
    name: "د. أحمد الطيبي - Ahmad Tibi",
    handle: "@Ahmad_tibi",
    role: "رئيس الحركة العربية للتغيير",
    platform: "facebook",
    category: "politicians",
    lang: "ar",
    sourceUrl: "https://www.facebook.com/AhmadTibi",
  },
  {
    id: "vip-rahat-muni",
    name: "بلدية رهط - עיריית רהט",
    handle: "@RahatMuni",
    role: "الصفحة الرسمية لبلدية رهط",
    platform: "facebook",
    category: "local",
    lang: "ar",
    sourceUrl: "https://www.facebook.com/rahat.muni",
  },
];

export const DEFAULT_TREND_TOPICS = [
  {
    rank: 1,
    scope: "local" as const,
    hashtag: "#رهط_بوست",
    categoryLabel: "تريند رهط والنقب",
    summaryAr: "تغطية شاملة لأخبار ومشاريع أحياء مدينة رهط وخدمات الباصات والبلدية",
    postsCount: "18.4K تفاعل",
    isHot: true,
  },
  {
    rank: 2,
    scope: "local" as const,
    hashtag: "#باصات_رهط_غاليم",
    categoryLabel: "مواصلات وخدمات",
    summaryAr: "تتبع حي ومباشر لخطوط باصات رهط 1–6 وخطوط بئر السبع عبر الخريطة التفاعلية",
    postsCount: "9.2K تفاعل",
    isHot: true,
  },
  {
    rank: 3,
    scope: "local" as const,
    hashtag: "#بلدية_رهط",
    categoryLabel: "أخبار محلية",
    summaryAr: "خدمات الأرنونا وإصدار شهادة مواطن (אישור תושב) وتطوير البنية التحتية في الضواحي الجديدة",
    postsCount: "7.8K تفاعل",
    isHot: false,
  },
  {
    rank: 4,
    scope: "local" as const,
    hashtag: "#حراج_رهط_والنقب",
    categoryLabel: "بيع وشراء",
    summaryAr: "إعلانات السيارات والعقارات والأجهزة والوظائف اليومية في رهط وبئر السبع",
    postsCount: "6.5K تفاعل",
    isHot: false,
  },
  {
    rank: 1,
    scope: "global" as const,
    hashtag: "#AI_Innovation",
    categoryLabel: "تريند عالمي · 𝕏 وتكنولوجيا",
    summaryAr: "تغريدات إيلون ماسك وقادة التقنية حول ثورة الذكاء الاصطناعي والروبوتات",
    postsCount: "420K تغريدة",
    isHot: true,
  },
  {
    rank: 2,
    scope: "global" as const,
    hashtag: "#MiddleEastNews",
    categoryLabel: "سياسة وأخبار دولية",
    summaryAr: "تصريحات قادة العالم حول المستجدات الإقليمية والدبلوماسية الدولية",
    postsCount: "680K تغريدة وتفاعل",
    isHot: true,
  },
  {
    rank: 3,
    scope: "global" as const,
    hashtag: "#ChampionsLeague",
    categoryLabel: "تريند عالمي · رياضة",
    summaryAr: "أصداء مواجهات دوري أبطال أوروبا وتألق نجوم كرة القدم العالمية",
    postsCount: "530K منشور وتغريدة",
    isHot: true,
  },
  {
    rank: 4,
    scope: "global" as const,
    hashtag: "#TechTrends2026",
    categoryLabel: "ابتكارات واقتصاد رقمي",
    summaryAr: "تقنيات الهواتف الذكية والنظارات الذكية وتطبيقات المستقبل",
    postsCount: "215K تغريدة",
    isHot: false,
  },
];

export const DEFAULT_VIP_POSTS: SocialVipPostItem[] = [
  {
    id: "post-rahat-muni-1",
    platform: "facebook",
    authorName: "بلدية رهط - עיריית רהט",
    authorHandle: "@RahatMuni",
    authorRole: "الصفحة الرسمية لبلدية رهط",
    authorAvatar: makeAvatarSvgDataUri("بل", "#0e8f47"),
    verified: true,
    category: "local",
    originalLang: "ar",
    originalText:
      "أهلنا الكرام في مدينة رهط، نعلن عن استمرار أعمال تطوير وتعبيد الشوارع والإنارة الذكية في الأحياء الجديدة، وتفعيل خدمة إصدار شهادة مواطن سنوية (אישור תושב שנתי) ودفع الأرنونا إلكترونياً لخدمتكم على مدار الساعة.",
    translatedAr:
      "أهلنا الكرام في مدينة رهط، نعلن عن استمرار أعمال تطوير وتعبيد الشوارع والإنارة الذكية في الأحياء الجديدة، وتفعيل خدمة إصدار شهادة مواطن سنوية (אישור תושב שנתי) ودفع الأرنونا إلكترونياً لخدمتكم على مدار الساعة.",
    publishedAgoAr: "منذ 18 دقيقة",
    likesCount: "1.4K",
    commentsCount: "215",
    sharesCount: "94",
    sourceUrl: "https://www.facebook.com/rahat.muni",
    trendTag: "#بلدية_رهط",
    sampleComments: [
      { author: "أبو محمد القريناوي", text: "بارك الله في جهودكم لخدمة أهل البلد", time: "منذ 10 د" },
    ],
  },
  {
    id: "post-musk-1",
    platform: "x",
    authorName: "Elon Musk",
    authorHandle: "@elonmusk",
    authorRole: "الرئيس التنفيذي لـ Tesla وSpaceX ومنصة 𝕏",
    authorAvatar: makeAvatarSvgDataUri("EM", "#0f1419"),
    verified: true,
    category: "celebrities",
    originalLang: "en",
    originalText:
      "Next-generation AI, humanoid robotics, and autonomous transit systems will transform everyday life faster than most people realize.",
    translatedAr:
      "الجيل القادم من الذكاء الاصطناعي، والروبوتات البشرية، وأنظمة النقل الذاتية ستغيّر الحياة اليومية بشكل أسرع مما يتخيله معظم الناس.",
    publishedAgoAr: "منذ 28 دقيقة",
    likesCount: "142K",
    commentsCount: "14.2K",
    sharesCount: "21.5K",
    sourceUrl: "https://x.com/elonmusk",
    trendTag: "#AI_Innovation",
    sampleComments: [
      { author: "Tech Insider", text: "The pace of AI progress this year is remarkable.", time: "منذ 15 د" },
    ],
  },
  {
    id: "post-tibi-1",
    platform: "facebook",
    authorName: "د. أحمد الطيبي - Ahmad Tibi",
    authorHandle: "@Ahmad_tibi",
    authorRole: "عضو الكنيست · رئيس الحركة العربية للتغيير",
    authorAvatar: makeAvatarSvgDataUri("أط", "#1877F2"),
    verified: true,
    category: "politicians",
    originalLang: "ar",
    originalText:
      "متابعة حثيثة لقضايا بلداتنا في النقب ورهط، وتعزيز الميزانيات المخصصة للبنية التحتية والتعليم والمواصلات العامة لخدمة أهلنا وشبابنا.",
    translatedAr:
      "متابعة حثيثة لقضايا بلداتنا في النقب ورهط، وتعزيز الميزانيات المخصصة للبنية التحتية والتعليم والمواصلات العامة لخدمة أهلنا وشبابنا.",
    publishedAgoAr: "منذ 45 دقيقة",
    likesCount: "3.8K",
    commentsCount: "412",
    sharesCount: "180",
    sourceUrl: "https://www.facebook.com/AhmadTibi",
    trendTag: "#رهط_بوست",
    sampleComments: [],
  },
  {
    id: "post-trump-1",
    platform: "x",
    authorName: "Donald J. Trump",
    authorHandle: "@realDonaldTrump",
    authorRole: "الرئيس الأمريكي",
    authorAvatar: makeAvatarSvgDataUri("DT", "#0f1419"),
    verified: true,
    category: "politicians",
    originalLang: "en",
    originalText:
      "Working around the clock to bring stability, economic growth, and historic diplomatic agreements across the region and the world!",
    translatedAr:
      "نعمل على مدار الساعة لتحقيق الاستقرار والنمو الاقتصادي واتفاقيات دبلوماسية تاريخية في المنطقة والعالم!",
    publishedAgoAr: "منذ ساعة",
    likesCount: "210K",
    commentsCount: "32K",
    sharesCount: "44K",
    sourceUrl: "https://x.com/realDonaldTrump",
    trendTag: "#MiddleEastNews",
    sampleComments: [],
  },
  {
    id: "post-netanyahu-1",
    platform: "x",
    authorName: "Benjamin Netanyahu - בנימין נתניהו",
    authorHandle: "@netanyahu",
    authorRole: "رئيس الوزراء الإسرائيلي",
    authorAvatar: makeAvatarSvgDataUri("BN", "#0f1419"),
    verified: true,
    category: "politicians",
    originalLang: "he",
    originalText:
      "קיימתי היום דיון כלכלי וביטחוני מיוחד לקידום פיתוח הנגב, התשתיות והתחבורה בדרום.",
    translatedAr:
      "عقدتُ اليوم مداولات اقتصادية وأمنية خاصة لتعزيز مشاريع تطوير النقب والبنية التحتية والمواصلات في الجنوب.",
    publishedAgoAr: "منذ ساعتين",
    likesCount: "12.4K",
    commentsCount: "2.9K",
    sharesCount: "1.6K",
    sourceUrl: "https://x.com/netanyahu",
    trendTag: "#MiddleEastNews",
    sampleComments: [],
  },
  {
    id: "post-salah-1",
    platform: "x",
    authorName: "Mohamed Salah - محمد صلاح",
    authorHandle: "@MoSalah",
    authorRole: "نجم نادي ليفربول والمنتخب المصري",
    authorAvatar: makeAvatarSvgDataUri("MS", "#0f1419"),
    verified: true,
    category: "sports",
    originalLang: "en",
    originalText:
      "Focused on the next big challenge. Thank you to all the fans for the incredible support home and away! ⚽🔴",
    translatedAr:
      "تركيز كامل على التحدي الكبير القادم. شكراً لجميع الجماهير على الدعم المذهل في كل مكان! ⚽🔴",
    publishedAgoAr: "منذ 3 ساعات",
    likesCount: "195K",
    commentsCount: "8.4K",
    sharesCount: "19K",
    sourceUrl: "https://x.com/MoSalah",
    trendTag: "#ChampionsLeague",
    sampleComments: [],
  },
];

export function SocialVipFeedAndTrendsSection({
  forceShowForAdminPreview = false,
  isFullPage = false,
}: {
  forceShowForAdminPreview?: boolean;
  isFullPage?: boolean;
}) {
  const st = useSiteSettings();
  const hubCfg = useMemo(() => parseSocialHubConfig(st.quickLinks), [st.quickLinks]);
  const customPosts = useMemo(() => parseCustomVipPosts(st.quickLinks), [st.quickLinks]);
  const trendScrollRef = useRef<HTMLDivElement>(null);

  const [trendScope, setTrendScope] = useState<"local" | "global">(hubCfg.defaultTrendScope);
  const [showTrendsPanel, setShowTrendsPanel] = useState<boolean>(hubCfg.showTrendsDrawerOpen || isFullPage);
  const [selectedTrendTag, setSelectedTrendTag] = useState<string>("");
  const [platformFilter, setPlatformFilter] = useState<"all" | "x" | "facebook" | "politicians" | "celebrities" | "local">("all");
  const [translatedIds, setTranslatedIds] = useState<Record<string, boolean>>({});
  const [reactionsMap, setReactionsMap] = useState<Record<string, { emoji: string; count: number }>>({});
  const [sharedIds, setSharedIds] = useState<Record<string, number>>({});
  const [openCommentsId, setOpenCommentsId] = useState<string>("");
  const [userComments, setUserComments] = useState<Record<string, { author: string; text: string; time: string }[]>>({});
  const [commentDraft, setCommentDraft] = useState<string>("");

  useEffect(() => {
    setTrendScope(hubCfg.defaultTrendScope);
  }, [hubCfg.defaultTrendScope]);

  if (!hubCfg.vipSectionEnabled && !forceShowForAdminPreview && !isFullPage) {
    return null;
  }

  const allPosts = [...customPosts, ...DEFAULT_VIP_POSTS];
  const filteredPosts = allPosts.filter((p) => {
    if (selectedTrendTag && p.trendTag !== selectedTrendTag) return false;
    if (platformFilter === "x") return p.platform === "x";
    if (platformFilter === "facebook") return p.platform === "facebook";
    if (platformFilter === "politicians") return p.category === "politicians";
    if (platformFilter === "celebrities") return p.category === "celebrities" || p.category === "sports";
    if (platformFilter === "local") return p.category === "local";
    return true;
  });

  const activeTrends = DEFAULT_TREND_TOPICS.filter((t) => t.scope === trendScope);

  const scrollTrends = (direction: "left" | "right") => {
    if (trendScrollRef.current) {
      const scrollAmount = direction === "left" ? -240 : 240;
      trendScrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <section id="social-vip-section" className="space-y-3" aria-labelledby="social-vip-heading">
      {/* Compact Header with Circular Local/Global Trend Icons */}
      <div className="stamp flex items-center justify-between gap-2 rounded-2xl border border-line bg-paper px-3 py-2 shadow-2xs">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#0f1419] via-[#1877f2] to-[#0f1419] text-sm font-black text-white shadow-2xs">
            🌐
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 id="social-vip-heading" className="truncate text-sm font-extrabold text-ink sm:text-base">
                {tr("تواصل اجتماعي والتريند")}
              </h2>
              <span className="shrink-0 rounded-lg bg-[#1877F2] px-1.5 py-0.5 text-[9px] font-black text-white">
                📘
              </span>
              <span className="shrink-0 rounded-lg bg-[#0f1419] px-1.5 py-0.5 text-[9px] font-black text-white">
                𝕏
              </span>
            </div>
            <p className="truncate text-[10px] font-semibold text-muted">
              {tr("تغريدات ومنشورات المشاهير والسياسيين مميزة بألوان كل منصة مع ترجمة فورية")}
            </p>
          </div>
        </div>

        {/* Circular Local / Global Icons */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setTrendScope("local");
              setShowTrendsPanel(true);
            }}
            className="flex flex-col items-center gap-0.5"
          >
            <span
              className={`grid size-9 place-items-center rounded-full border-2 text-sm transition ${
                trendScope === "local"
                  ? "border-primary-deep bg-primary text-[#111827] shadow-sm scale-105"
                  : "border-line bg-surface text-muted hover:border-primary-deep"
              }`}
            >
              📍
            </span>
            <span className={`text-[9px] font-extrabold ${trendScope === "local" ? "text-ink" : "text-muted"}`}>
              {tr("محلي")}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTrendScope("global");
              setShowTrendsPanel(true);
            }}
            className="flex flex-col items-center gap-0.5"
          >
            <span
              className={`grid size-9 place-items-center rounded-full border-2 text-sm transition ${
                trendScope === "global"
                  ? "border-[#0f1419] bg-[#0f1419] text-white shadow-sm scale-105"
                  : "border-line bg-surface text-muted hover:border-ink"
              }`}
            >
              🌍
            </span>
            <span className={`text-[9px] font-extrabold ${trendScope === "global" ? "text-ink" : "text-muted"}`}>
              {tr("عالمي")}
            </span>
          </button>
        </div>
      </div>

      {/* Single-Row Horizontal Trend Slide Strip */}
      {showTrendsPanel ? (
        <div className="rounded-2xl border border-primary-deep/40 bg-gradient-to-r from-primary-soft/45 via-surface to-paper px-2.5 py-2 shadow-xs">
          <div className="mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🔥</span>
              <h3 className="text-[11px] font-extrabold text-ink">
                {trendScope === "local"
                  ? tr("أبرز مواضيع تريند رهط والنقب:")
                  : tr("أبرز مواضيع تريند إكس (تويتر) وفيسبوك العالمي:")}
              </h3>
            </div>

            <div className="flex items-center gap-1">
              {selectedTrendTag ? (
                <button
                  type="button"
                  onClick={() => setSelectedTrendTag("")}
                  className="rounded-full bg-ink px-2 py-0.5 text-[9.5px] font-extrabold text-paper"
                >
                  ✕ {selectedTrendTag}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => scrollTrends("right")}
                aria-label={tr("التالي")}
                className="grid size-6 place-items-center rounded-full border border-line bg-paper text-ink transition hover:bg-surface"
              >
                <ChevronRight className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => scrollTrends("left")}
                aria-label={tr("السابق")}
                className="grid size-6 place-items-center rounded-full border border-line bg-paper text-ink transition hover:bg-surface"
              >
                <ChevronLeft className="size-3.5" />
              </button>
            </div>
          </div>

          <div
            ref={trendScrollRef}
            className="flex flex-nowrap gap-2 overflow-x-auto scroll-smooth py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {activeTrends.map((t) => {
              const active = selectedTrendTag === t.hashtag;
              return (
                <button
                  key={t.hashtag}
                  type="button"
                  onClick={() => setSelectedTrendTag(active ? "" : t.hashtag)}
                  className={`flex shrink-0 min-w-[175px] max-w-[210px] flex-col justify-between rounded-xl border px-2.5 py-1.5 text-start transition ${
                    active
                      ? "border-primary-deep bg-primary text-[#111827] shadow-sm"
                      : "border-line bg-paper hover:border-primary-deep"
                  }`}
                >
                  <div className="flex items-center justify-between text-[9px] font-bold opacity-75">
                    <span className="truncate">#{t.rank} · {trv(t.categoryLabel)}</span>
                    <span className="shrink-0 font-extrabold text-[#1877F2]">📊 {t.postsCount}</span>
                  </div>
                  <p dir="auto" className="mt-0.5 truncate text-[11px] font-extrabold">
                    {t.hashtag}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Circular Filter Icons */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:justify-start sm:gap-4">
        {[
          { id: "all", icon: "🌐", label: "الكل", activeBg: "bg-ink text-paper border-ink" },
          { id: "x", icon: "𝕏", label: "إكس", activeBg: "bg-[#0f1419] text-white border-[#0f1419]" },
          { id: "facebook", icon: "📘", label: "فيسبوك", activeBg: "bg-[#1877F2] text-white border-[#1877F2]" },
          { id: "politicians", icon: "🏛️", label: "سياسيون", activeBg: "bg-slate-800 text-white border-slate-800" },
          { id: "celebrities", icon: "⭐", label: "مشاهير", activeBg: "bg-amber-600 text-white border-amber-600" },
          { id: "local", icon: "📍", label: "رهط", activeBg: "bg-[#0e8f47] text-white border-[#0e8f47]" },
        ].map((tab) => {
          const isActive = platformFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPlatformFilter(tab.id as typeof platformFilter)}
              className="group flex shrink-0 flex-col items-center gap-1"
            >
              <span
                className={`grid size-11 place-items-center rounded-full border-2 text-base font-black transition ${
                  isActive
                    ? `${tab.activeBg} shadow-md scale-105`
                    : "border-line bg-paper text-ink hover:border-primary-deep"
                }`}
              >
                {tab.icon}
              </span>
              <span className={`text-[10px] font-extrabold ${isActive ? "text-ink font-black" : "text-muted"}`}>
                {tr(tab.label)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Color-Coded Social Posts Grid */}
      <div className="grid gap-3.5 md:grid-cols-2">
        {filteredPosts.map((post) => {
          const isX = post.platform === "x";
          const isLocal = post.category === "local";
          const isTranslated = Boolean(translatedIds[post.id]);
          const currentReaction = reactionsMap[post.id];
          const extraShares = sharedIds[post.id] ?? 0;
          const isCommentsOpen = openCommentsId === post.id;
          const allComments = [...post.sampleComments, ...(userComments[post.id] ?? [])];

          const cardThemeCls = isLocal
            ? "border-t-4 border-t-[#0e8f47] bg-gradient-to-b from-[#0e8f47]/[0.05] to-paper"
            : isX
              ? "border-t-4 border-t-[#0f1419] bg-gradient-to-b from-black/[0.04] to-paper"
              : "border-t-4 border-t-[#1877F2] bg-gradient-to-b from-[#1877F2]/[0.05] to-paper";

          const badgeCls = isLocal
            ? "bg-[#0e8f47] text-white"
            : isX
              ? "bg-[#0f1419] text-white"
              : "bg-[#1877F2] text-white";

          return (
            <article
              key={post.id}
              className={`stamp flex flex-col justify-between rounded-2xl border border-line p-3.5 shadow-2xs transition ${cardThemeCls}`}
            >
              <div>
                {/* Author Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={post.authorAvatar}
                      alt={post.authorName}
                      className={`size-10 shrink-0 rounded-full object-cover ring-2 ${
                        isLocal ? "ring-[#0e8f47]" : isX ? "ring-[#0f1419]" : "ring-[#1877F2]"
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <h3 className="truncate text-xs font-extrabold text-ink sm:text-sm">
                          {post.authorName}
                        </h3>
                        {post.verified ? (
                          <span className="text-xs text-[#1877F2]" title={tr("حساب موثّق")}>
                            ✓
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-[10px] font-semibold text-muted">
                        <bdi dir="ltr">{post.authorHandle}</bdi> · {post.publishedAgoAr}
                      </p>
                    </div>
                  </div>

                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black ${badgeCls}`}>
                    {isLocal ? "📍 رهط" : isX ? "𝕏 إكس" : "📘 فيسبوك"}
                  </span>
                </div>

                {/* Post Body */}
                <div className="mt-2.5 space-y-2">
                  <p dir="auto" className="text-xs font-bold leading-relaxed text-ink sm:text-sm">
                    {isTranslated ? post.translatedAr : post.originalText}
                  </p>

                  {post.originalLang !== "ar" ? (
                    <button
                      type="button"
                      onClick={() =>
                        setTranslatedIds((prev) => ({ ...prev, [post.id]: !prev[post.id] }))
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-primary-deep/40 bg-primary-soft/60 px-2.5 py-1 text-[11px] font-extrabold text-ink transition hover:bg-primary"
                    >
                      <Languages className="size-3.5" />
                      <span>
                        {isTranslated ? tr("عرض النص الأصلي") : tr("ترجمة فورية للعربية")}
                      </span>
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Footer Actions + Copyright Attribution */}
              <div className="mt-3 border-t border-line/70 pt-2.5">
                <div className="flex items-center justify-between text-[11px] font-extrabold text-muted">
                  <button
                    type="button"
                    onClick={() =>
                      setReactionsMap((prev) => ({
                        ...prev,
                        [post.id]: prev[post.id]
                          ? { emoji: "👍", count: 0 }
                          : { emoji: isX ? "❤️" : "👍", count: 1 },
                      }))
                    }
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-surface ${
                      currentReaction?.count ? "text-[#1877F2] font-black" : ""
                    }`}
                  >
                    <ThumbsUp className="size-3.5" />
                    <span>{post.likesCount}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOpenCommentsId(isCommentsOpen ? "" : post.id)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-surface"
                  >
                    <MessageCircle className="size-3.5" />
                    <span>{allComments.length || post.commentsCount}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setSharedIds((prev) => ({ ...prev, [post.id]: (prev[post.id] ?? 0) + 1 }))
                    }
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 transition hover:bg-surface"
                  >
                    {isX ? <Repeat2 className="size-3.5" /> : <Share2 className="size-3.5" />}
                    <span>{extraShares ? `${post.sharesCount}+` : post.sharesCount}</span>
                  </button>

                  <a
                    href={post.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-primary-ink underline-offset-2 hover:underline"
                    title={tr("المصدر الأصلي وحقوق النشر محفوظة لصاحب الحساب")}
                  >
                    <span>{tr("المصدر")}</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>

                {isCommentsOpen ? (
                  <div className="mt-2.5 space-y-2 rounded-xl bg-surface p-2.5 text-xs">
                    {allComments.map((c, idx) => (
                      <div key={idx} className="rounded-lg bg-paper p-2">
                        <div className="flex justify-between text-[10px] font-extrabold text-muted">
                          <span className="text-ink">{c.author}</span>
                          <span>{c.time}</span>
                        </div>
                        <p className="mt-0.5 font-semibold text-ink">{c.text}</p>
                      </div>
                    ))}
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        placeholder={tr("أضف تعليقاً...")}
                        className="field flex-1 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!commentDraft.trim()) return;
                          setUserComments((prev) => ({
                            ...prev,
                            [post.id]: [
                              ...(prev[post.id] ?? []),
                              { author: "زائر رهط بوست", text: commentDraft.trim(), time: "الآن" },
                            ],
                          }));
                          setCommentDraft("");
                        }}
                        className="btn px-3 py-1 text-xs font-extrabold"
                      >
                        {tr("نشر")}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      {/* Institutional & Platform Copyright Attribution Notice */}
      <p className="rounded-xl border border-line/70 bg-surface/60 px-3 py-2 text-[11px] font-semibold text-muted">
        © {tr("جميع العلامات التجارية وحقوق النشر للمنشورات المقتبسة محفوظة لأصحابها ومؤسساتها الرسمية (بلدية رهط، منصة 𝕏، فيسبوك Meta) مع رابط مباشر لكل مصدر أصلي.")}
      </p>
    </section>
  );
}

export const SocialVipFeedSection = SocialVipFeedAndTrendsSection;
