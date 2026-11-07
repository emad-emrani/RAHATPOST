import { useEffect, useMemo, useState } from "react";
import { useSiteSettings } from "@/lib/site-settings/context";
import { tr, trv } from "@/lib/i18n/core";

export interface SocialVipPostItem {
  id: string;
  platform: "x" | "facebook";
  authorName: string;
  authorHandle: string;
  authorRole: string;
  category: "politicians" | "celebrities" | "sports" | "local";
  avatarUrl: string;
  verified: "blue" | "gold" | "gray";
  publishedAgo: string;
  originalLang: "he" | "en" | "ar";
  originalText: string;
  translatedAr: string;
  trendTag?: string;
  likes: number;
  commentsCount: number;
  shares: number;
  views: string;
  sampleComments: { author: string; text: string; time: string }[];
}

export interface TrendTopicItem {
  rank: number;
  scope: "global" | "local";
  hashtag: string;
  categoryLabel: string;
  postsCount: string;
  summaryAr: string;
  isHot?: boolean;
}

export interface SocialHubConfig {
  vipSectionEnabled: boolean; // Default: false (مخفي لحين تفعيله من التواصل والنشرات)
  defaultTrendScope: "local" | "global";
  showTrendsDrawerOpen: boolean;
  fbPageName: string;
  fbPageUrl: string;
  fbPageId: string;
  fbAutoPublish: boolean;
  tiktokHandle: string;
  telegramChannel: string;
}

function fromBase64UrlSafe(b64u: string): string {
  try {
    const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
    const bin = typeof atob === "function" ? atob(b64 + pad) : "";
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

export function parseSocialHubConfig(
  quickLinks: { id: string; title?: string; subtitle?: string; url?: string }[] | undefined,
): SocialHubConfig {
  const item = (quickLinks ?? []).find((q) => q.id === "socialhubcfg");
  let vipSectionEnabled = false; // Hidden by default until activated in admin
  let defaultTrendScope: "local" | "global" = "local";
  let showTrendsDrawerOpen = false;
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
      if (p.startsWith("vip:")) vipSectionEnabled = p.slice(4) === "1";
      else if (p.startsWith("scope:")) {
        const v = p.slice(6);
        if (v === "global" || v === "local") defaultTrendScope = v;
      } else if (p.startsWith("open:")) showTrendsDrawerOpen = p.slice(5) === "1";
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
  const item = (quickLinks ?? []).find((q) => q.id === "socialvipcustom");
  if (!item?.url?.startsWith("/__svip?")) return [];
  const raw = fromBase64UrlSafe(item.url.slice(8) + (item.subtitle && item.subtitle !== "vip" ? item.subtitle : ""));
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function makeAvatarSvgDataUri(initials: string, bgHex: string, accentHex = "#ffffff"): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bgHex}"/><stop offset="100%" stop-color="#0f172a"/></linearGradient></defs><rect width="80" height="80" rx="40" fill="url(#g)"/><circle cx="40" cy="40" r="37" fill="none" stroke="${accentHex}" stroke-opacity="0.3" stroke-width="2"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="${accentHex}" font-family="system-ui, sans-serif" font-weight="800" font-size="26">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DEFAULT_TREND_TOPICS: TrendTopicItem[] = [
  // Local Trends (رهط والنقب والبلاد)
  {
    rank: 1,
    scope: "local",
    hashtag: "#رهط_بوست",
    categoryLabel: "رهط والنقب · متصدر",
    postsCount: "28.4K تفاعل",
    summaryAr: "تغطية مباشرة لأخبار مدينة رهط والنقب وخدمات الباصات والمباريات.",
    isHot: true,
  },
  {
    rank: 2,
    scope: "local",
    hashtag: "#النقب_والجنوب",
    categoryLabel: "شؤون محلية وسياسة",
    postsCount: "19.7K منشور",
    summaryAr: "نقاشات واسعة حول مشاريع البنية التحتية والتطوير الاقتصادي في بلدات النقب.",
    isHot: true,
  },
  {
    rank: 3,
    scope: "local",
    hashtag: "#هبوعيل_بئر_السبع",
    categoryLabel: "رياضة محلية · ليغات هعل",
    postsCount: "15.2K منشور",
    summaryAr: "تحليلات جماهير الكرة في رهط والجنوب لمباريات الدوري الإسرائيلي الممتاز.",
  },
  {
    rank: 4,
    scope: "local",
    hashtag: "#طقس_رهط_والبلاد",
    categoryLabel: "أحوال جوية",
    postsCount: "11.9K منشور",
    summaryAr: "توقعات الأمطار والأجواء في منطقة بئر السبع ورهط خلال الأيام القادمة.",
  },
  {
    rank: 5,
    scope: "local",
    hashtag: "#الكنيست_والأخبار",
    categoryLabel: "سياسة · البلاد",
    postsCount: "34.1K تغريدة",
    summaryAr: "آخر التصريحات السياسية والاقتصادية وتأثيرها على المجتمع العربي في البلاد.",
    isHot: true,
  },
  // Global Trends (التريند العالمي)
  {
    rank: 1,
    scope: "global",
    hashtag: "#ChampionsLeague",
    categoryLabel: "التريند العالمي · رياضة",
    postsCount: "412K تغريدة",
    summaryAr: "أصداء مواجهات دوري أبطال أوروبا وتألق نجوم ريال مدريد وليفربول وبرشلونة.",
    isHot: true,
  },
  {
    rank: 2,
    scope: "global",
    hashtag: "#AI_Revolution",
    categoryLabel: "تكنولوجيا وذكاء اصطناعي",
    postsCount: "289K منشور",
    summaryAr: "إطلاق جيل جديد من أدوات الذكاء الاصطناعي التوليدي للفيديو والترجمة الفورية.",
    isHot: true,
  },
  {
    rank: 3,
    scope: "global",
    hashtag: "#MiddleEastUpdates",
    categoryLabel: "سياسة دولية",
    postsCount: "530K تغريدة",
    summaryAr: "تصريحات قادة العالم والدبلوماسيين حول التطورات الإقليمية والاقتصادية.",
    isHot: true,
  },
  {
    rank: 4,
    scope: "global",
    hashtag: "#TechMarkets",
    categoryLabel: "اقتصاد وأسواق عالمية",
    postsCount: "164K منشور",
    summaryAr: "ارتفاع أسهم شركات التكنولوجيا والطاقة النظيفة في الأسواق العالمية.",
  },
  {
    rank: 5,
    scope: "global",
    hashtag: "#WorldFootball",
    categoryLabel: "نجوم الكرة العالمية",
    postsCount: "320K منشور",
    summaryAr: "تفاعل الملايين مع منشورات نجوم كرة القدم العالميين بعد جولة الحسم.",
  },
];

export const DEFAULT_VIP_POSTS: SocialVipPostItem[] = [
  {
    id: "vip-1",
    platform: "facebook",
    authorName: "بلدية رهط - الصفحة الرسمية",
    authorHandle: "@RahatMunicipality",
    authorRole: "مؤسسة رسمية · رهط",
    category: "local",
    avatarUrl: makeAvatarSvgDataUri("رهط", "#0e8f47", "#f2c94c"),
    verified: "gold",
    publishedAgo: "منذ 35 دقيقة",
    originalLang: "ar",
    originalText:
      "نواصل العمل على تطوير الشوارع والمرافق العامة في الأحياء الجديدة بمدينة رهط، وندعو المواطنين لمتابعة جدول الخدمات والمناوبات اليومية وتقديم الملاحظات عبر مركز 106 البلدي.",
    translatedAr:
      "نواصل العمل على تطوير الشوارع والمرافق العامة في الأحياء الجديدة بمدينة رهط، وندعو المواطنين لمتابعة جدول الخدمات والمناوبات اليومية وتقديم الملاحظات عبر مركز 106 البلدي.",
    trendTag: "#رهط_بوست",
    likes: 842,
    commentsCount: 96,
    shares: 124,
    views: "18.5K",
    sampleComments: [
      { author: "أبو سند الهزيل", text: "يعطيكم العافية، نأمل الإسراع في إنارة المدخل الشمالي.", time: "منذ 20 د" },
      { author: "محمد القريناوي", text: "خطوة مباركة لخدمة أهلنا في رهط.", time: "منذ 12 د" },
    ],
  },
  {
    id: "vip-2",
    platform: "x",
    authorName: "Yair Lapid - יאיר לפיד",
    authorHandle: "@yairlapid",
    authorRole: "رئيس المعارضة · سياسي",
    category: "politicians",
    avatarUrl: makeAvatarSvgDataUri("YL", "#1d4ed8", "#ffffff"),
    verified: "gray",
    publishedAgo: "منذ ساعة",
    originalLang: "he",
    originalText:
      "השקעה בתשתיות, בחינוך ובתעסוקה בנגב ובכלל החברה הישראלית היא אינטרס לאומי ראשון במעלה. חייבים לחזק את הכלכלה ולהוריד את יוקר המחיה עבור كل אזרח.",
    translatedAr:
      "إن الاستثمار في البنية التحتية والتعليم والتشغيل في النقب والمجتمع بأسره هو مصلحة وطنية من الدرجة الأولى. يجب تعزيز الاقتصاد وخفض غلاء المعيشة لكل مواطن.",
    trendTag: "#الكنيست_والأخبار",
    likes: 2450,
    commentsCount: 418,
    shares: 312,
    views: "94.2K",
    sampleComments: [
      { author: "محلل سياسي", text: "ملف غلاء المعيشة والبنية التحتية في الجنوب يتصدر النقاشات هذا الأسبوع.", time: "منذ 40 د" },
    ],
  },
  {
    id: "vip-3",
    platform: "x",
    authorName: "Fabrizio Romano",
    authorHandle: "@FabrizioRomano",
    authorRole: "صحفي رياضي عالمي",
    category: "sports",
    avatarUrl: makeAvatarSvgDataUri("FR", "#0284c7", "#ffffff"),
    verified: "blue",
    publishedAgo: "منذ ساعتين",
    originalLang: "en",
    originalText:
      "🚨✨ Incredible night of European football! Top clubs are already preparing their summer transfer plans as Real Madrid and Liverpool stars shine on the biggest stage. Here we go soon! ⚽️🔥",
    translatedAr:
      "🚨✨ ليلة مذهلة في كرة القدم الأوروبية! الأندية الكبرى بدأت بالفعل تجهيز خطط الانتقالات القادمة مع تألق نجوم ريال مدريد وليفربول على المسرح الكبير. ترقبوا المفاجآت قريباً! ⚽️🔥",
    trendTag: "#ChampionsLeague",
    likes: 48900,
    commentsCount: 3120,
    shares: 6400,
    views: "1.8M",
    sampleComments: [
      { author: "عشاق الملكي - رهط", text: "أجواء دوري الأبطال هذا الموسم تاريخية!", time: "منذ ساعة" },
    ],
  },
  {
    id: "vip-4",
    platform: "facebook",
    authorName: "منصور عباس - Mansour Abbas",
    authorHandle: "@MansourAbbasOfficial",
    authorRole: "عضو كنيست · سياسي",
    category: "politicians",
    avatarUrl: makeAvatarSvgDataUri("مع", "#0f766e", "#f2c94c"),
    verified: "blue",
    publishedAgo: "منذ 3 ساعات",
    originalLang: "ar",
    originalText:
      "أهلنا في النقب ورهط والبلدات العربية يستحقون ميزانيات عادلة في الصحة والتعليم والمواصلات العامة، وسنستمر بمتابعة كافة الخطط التنموية لضمان وصول الموارد لمستحقيها.",
    translatedAr:
      "أهلنا في النقب ورهط والبلدات العربية يستحقون ميزانيات عادلة في الصحة والتعليم والمواصلات العامة، وسنستمر بمتابعة كافة الخطط التنموية لضمان وصول الموارد لمستحقيها.",
    trendTag: "#النقب_والجنوب",
    likes: 1930,
    commentsCount: 275,
    shares: 189,
    views: "42.1K",
    sampleComments: [
      { author: "سليم العطاونة", text: "الأهم متابعة تنفيذ المشاريع على أرض الواقع في قرى ومدن النقب.", time: "منذ ساعتين" },
    ],
  },
  {
    id: "vip-5",
    platform: "x",
    authorName: "Sam Altman",
    authorHandle: "@sama",
    authorRole: "الرئيس التنفيذي لـ OpenAI · مشاهير التكنولوجيا",
    category: "celebrities",
    avatarUrl: makeAvatarSvgDataUri("SA", "#312e81", "#a5b4fc"),
    verified: "blue",
    publishedAgo: "منذ 4 ساعات",
    originalLang: "en",
    originalText:
      "AI video generation and real-time multilingual translation are transforming how local communities and independent media share news around the world.",
    translatedAr:
      "إن صناعة الفيديو بالذكاء الاصطناعي والترجمة الفورية متعددة اللغات تُحدثان ثورة حقيقية في طريقة نشر الأخبار والتواصل لدى المجتمعات والمنصات الإعلامية حول العالم.",
    trendTag: "#AI_Revolution",
    likes: 31200,
    commentsCount: 2150,
    shares: 4820,
    views: "1.1M",
    sampleComments: [
      { author: "Tech Negev", text: "رهط بوست سبّاق في دمج تقنيات الذكاء الاصطناعي للأخبار والفيديو!", time: "منذ ساعتين" },
    ],
  },
  {
    id: "vip-6",
    platform: "facebook",
    authorName: "محمد صلاح - Mohamed Salah",
    authorHandle: "@momosalah",
    authorRole: "نجم كرة قدم عالمي · ليفربول",
    category: "sports",
    avatarUrl: makeAvatarSvgDataUri("MS", "#b91c1c", "#fde047"),
    verified: "blue",
    publishedAgo: "منذ 5 ساعات",
    originalLang: "en",
    originalText:
      "Always grateful for the support everywhere. Focus stays on the next match and giving 100% on the pitch! 🔴⚽️",
    translatedAr:
      "ممتن دائماً لدعمكم في كل مكان. التركيز مستمر على المباراة القادمة وتقديم 100% داخل أرضية الملعب! 🔴⚽️",
    trendTag: "#WorldFootball",
    likes: 92400,
    commentsCount: 8430,
    shares: 11200,
    views: "3.4M",
    sampleComments: [
      { author: "يوسف الزيادنة", text: "فخر العرب يا أبو مكة!", time: "منذ 3 ساعات" },
    ],
  },
];

export function SocialVipFeedAndTrendsSection({
  forceShowForAdminPreview = false,
}: {
  forceShowForAdminPreview?: boolean;
}) {
  const st = useSiteSettings();
  const hubCfg = useMemo(() => parseSocialHubConfig(st.quickLinks), [st.quickLinks]);
  const customPosts = useMemo(() => parseCustomVipPosts(st.quickLinks), [st.quickLinks]);

  const [trendScope, setTrendScope] = useState<"local" | "global">(hubCfg.defaultTrendScope);
  const [showTrendsPanel, setShowTrendsPanel] = useState<boolean>(hubCfg.showTrendsDrawerOpen);
  const [selectedTrendTag, setSelectedTrendTag] = useState<string>("");
  const [platformFilter, setPlatformFilter] = useState<"all" | "x" | "facebook" | "politicians" | "celebrities">("all");
  const [translatedIds, setTranslatedIds] = useState<Record<string, boolean>>({});
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [sharedIds, setSharedIds] = useState<Record<string, number>>({});
  const [openCommentsId, setOpenCommentsId] = useState<string>("");
  const [userComments, setUserComments] = useState<Record<string, { author: string; text: string; time: string }[]>>({});
  const [commentDraft, setCommentDraft] = useState<string>("");

  useEffect(() => {
    setTrendScope(hubCfg.defaultTrendScope);
  }, [hubCfg.defaultTrendScope]);

  // If hidden in admin settings and not inside admin preview, keep hidden!
  if (!hubCfg.vipSectionEnabled && !forceShowForAdminPreview) {
    return null;
  }

  const allPosts = [...customPosts, ...DEFAULT_VIP_POSTS];
  const filteredPosts = allPosts.filter((p) => {
    if (selectedTrendTag && p.trendTag !== selectedTrendTag) return false;
    if (platformFilter === "x") return p.platform === "x";
    if (platformFilter === "facebook") return p.platform === "facebook";
    if (platformFilter === "politicians") return p.category === "politicians" || p.category === "local";
    if (platformFilter === "celebrities") return p.category === "celebrities" || p.category === "sports";
    return true;
  });

  const activeTrends = DEFAULT_TREND_TOPICS.filter((t) => t.scope === trendScope);

  return (
    <section
      id="social-vip-section"
      className="stamp overflow-hidden rounded-3xl border border-line bg-paper p-4 shadow-md sm:p-5"
      aria-labelledby="social-vip-heading"
    >
      {/* Top Header Bar with Title + Trends Button (زر التريند العالمي والمحلي) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#1d9bf0] via-[#1877f2] to-[#0f172a] text-lg text-white shadow-sm">
            🌐
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 id="social-vip-heading" className="text-lg font-extrabold text-ink sm:text-xl">
                {tr("تواصل اجتماعي · المشاهير والسياسيون")}
              </h2>
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-extrabold text-primary-ink">
                𝕏 + Facebook
              </span>
            </div>
            <p className="text-xs font-semibold text-muted">
              {tr("آخر التغريدات والمنشورات كما تظهر على إكس وفيسبوك مع ترجمة فورية للعربية")}
            </p>
          </div>
        </div>

        {/* Top Trend Button & Scope Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowTrendsPanel((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-extrabold shadow-xs transition ${
              showTrendsPanel
                ? "bg-[#111827] text-[#f2c94c] ring-2 ring-primary"
                : "bg-primary text-[#111827] hover:bg-primary-hover"
            }`}
          >
            <span>🔥</span>
            <span>{tr("التريند")}</span>
            <span className="rounded-full bg-black/15 px-1.5 py-0.5 text-[10px]">
              {trendScope === "global" ? tr("عالمي 🌍") : tr("محلي 📍")}
            </span>
          </button>

          <div className="inline-flex rounded-2xl border border-line bg-surface p-0.5 text-[11px] font-extrabold">
            <button
              type="button"
              onClick={() => {
                setTrendScope("local");
                setShowTrendsPanel(true);
                setSelectedTrendTag("");
              }}
              className={`rounded-xl px-2.5 py-1.5 transition ${
                trendScope === "local"
                  ? "bg-paper text-ink shadow-2xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              📍 {tr("محلي")}
            </button>
            <button
              type="button"
              onClick={() => {
                setTrendScope("global");
                setShowTrendsPanel(true);
                setSelectedTrendTag("");
              }}
              className={`rounded-xl px-2.5 py-1.5 transition ${
                trendScope === "global"
                  ? "bg-paper text-ink shadow-2xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              🌍 {tr("عالمي")}
            </button>
          </div>
        </div>
      </div>

      {/* Expandable Global & Local Trends Drawer */}
      {showTrendsPanel ? (
        <div className="mt-3.5 rounded-2xl border border-primary-deep/40 bg-gradient-to-br from-primary-soft/50 via-surface to-paper p-3.5">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-base">🔥</span>
              <h3 className="text-sm font-extrabold text-ink">
                {trendScope === "global"
                  ? tr("التريند العالمي الآن (Global Trends)")
                  : tr("التريند المحلي الآن (رهط والنقب والبلاد)")}
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              {selectedTrendTag ? (
                <button
                  type="button"
                  onClick={() => setSelectedTrendTag("")}
                  className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-extrabold text-paper"
                >
                  ✕ {tr("إلغاء فلتر")} {selectedTrendTag}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setShowTrendsPanel(false)}
                className="rounded-lg px-2 py-1 text-xs font-bold text-muted hover:bg-paper hover:text-ink"
              >
                {tr("إغلاق")}
              </button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {activeTrends.map((t) => {
              const active = selectedTrendTag === t.hashtag;
              return (
                <button
                  key={t.hashtag}
                  type="button"
                  onClick={() => setSelectedTrendTag(active ? "" : t.hashtag)}
                  className={`flex flex-col justify-between rounded-2xl border p-2.5 text-start transition ${
                    active
                      ? "border-primary-deep bg-primary text-[#111827] shadow-sm"
                      : "border-line bg-paper hover:border-primary-deep"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 text-[10px] font-bold opacity-75">
                      <span>#{t.rank} · {trv(t.categoryLabel)}</span>
                      {t.isHot ? <span className="text-amber-600">🔥 رائج</span> : null}
                    </div>
                    <p dir="auto" className="mt-1 text-sm font-extrabold">
                      {t.hashtag}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[11px] font-semibold opacity-80">
                      {trv(t.summaryAr)}
                    </p>
                  </div>
                  <p className="mt-2 text-[10px] font-extrabold text-primary-ink">
                    📊 {t.postsCount}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Platform & Category Filter Tabs */}
      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          { id: "all", label: "الكل ✨" },
          { id: "x", label: "𝕏 تغريدات إكس (تويتر)" },
          { id: "facebook", label: "📘 منشورات فيسبوك" },
          { id: "politicians", label: "🏛️ سياسيون وشؤون محلية" },
          { id: "celebrities", label: "⭐ مشاهير ورياضة" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setPlatformFilter(tab.id as typeof platformFilter)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition ${
              platformFilter === tab.id
                ? "bg-ink text-paper shadow-2xs"
                : "border border-line bg-surface text-ink hover:border-primary-deep"
            }`}
          >
            {tr(tab.label)}
          </button>
        ))}
      </div>

      {/* Cards Grid — Authentic X (Twitter) & Facebook Post Cards */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {filteredPosts.map((post) => {
          const isX = post.platform === "x";
          const isTranslated = Boolean(translatedIds[post.id]);
          const isLiked = Boolean(likedIds[post.id]);
          const extraShares = sharedIds[post.id] ?? 0;
          const isCommentsOpen = openCommentsId === post.id;
          const allPostComments = [
            ...post.sampleComments,
            ...(userComments[post.id] ?? []),
          ];

          return (
            <article
              key={post.id}
              className="flex flex-col justify-between rounded-2xl border border-line bg-surface/50 p-4 shadow-2xs transition hover:border-primary-deep/60 hover:bg-paper"
            >
              <div>
                {/* Author Header (looks just like X or Facebook) */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <img
                      src={post.avatarUrl}
                      alt={post.authorName}
                      width={44}
                      height={44}
                      className="size-11 shrink-0 rounded-full border border-line object-cover shadow-2xs"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <h3 className="truncate text-sm font-extrabold text-ink">
                          {post.authorName}
                        </h3>
                        {/* Verified Checkmark */}
                        <span
                          title={tr("حساب موثّق")}
                          className={`inline-flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white ${
                            post.verified === "gold"
                              ? "bg-amber-500"
                              : post.verified === "gray"
                                ? "bg-slate-500"
                                : "bg-[#1d9bf0]"
                          }`}
                        >
                          ✓
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-muted">
                        <span dir="ltr">{post.authorHandle}</span>
                        <span>·</span>
                        <span>{post.publishedAgo}</span>
                      </div>
                      <span className="mt-0.5 inline-block rounded-md bg-primary-soft px-1.5 py-0.5 text-[10px] font-extrabold text-primary-ink">
                        {trv(post.authorRole)}
                      </span>
                    </div>
                  </div>

                  {/* Platform Badge (X or Facebook) */}
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-extrabold text-white shadow-2xs ${
                      isX ? "bg-[#0f1419]" : "bg-[#1877f2]"
                    }`}
                  >
                    {isX ? "𝕏" : "f Facebook"}
                  </span>
                </div>

                {/* Original Post Text */}
                <p
                  dir="auto"
                  className="mt-3 whitespace-pre-line text-sm font-semibold leading-relaxed text-ink"
                >
                  {post.originalText}
                </p>

                {/* Trend Hashtag Pill + Translate Button Row */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  {post.trendTag ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTrendTag(
                          selectedTrendTag === post.trendTag ? "" : post.trendTag || "",
                        );
                        setShowTrendsPanel(true);
                      }}
                      dir="auto"
                      className="rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-extrabold text-sky-600 hover:bg-sky-500/20"
                    >
                      {post.trendTag}
                    </button>
                  ) : <span />}

                  {/* زر ترجمة التغريدة / المنشور */}
                  <button
                    type="button"
                    onClick={() =>
                      setTranslatedIds((prev) => ({
                        ...prev,
                        [post.id]: !prev[post.id],
                      }))
                    }
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-extrabold transition ${
                      isTranslated
                        ? "border-primary-deep bg-primary text-[#111827]"
                        : "border-line bg-paper text-ink hover:border-primary-deep"
                    }`}
                  >
                    <span>🌐</span>
                    <span>
                      {isTranslated ? tr("إخفاء الترجمة") : tr("ترجمة إلى العربية")}
                    </span>
                  </button>
                </div>

                {/* Inline Arabic Translation Box */}
                {isTranslated ? (
                  <div className="mt-2.5 rounded-2xl border border-primary-deep/50 bg-primary-soft/45 p-3 text-sm font-bold leading-relaxed text-ink">
                    <div className="mb-1 flex items-center justify-between text-[11px] font-extrabold text-primary-ink">
                      <span>✨ {tr("الترجمة العربية الفورية · رهط بوست")}</span>
                      <span>
                        {post.originalLang === "he"
                          ? tr("من العبرية")
                          : post.originalLang === "en"
                            ? tr("من الإنجليزية")
                            : tr("النص العربي المعتمد")}
                      </span>
                    </div>
                    <p dir="rtl">{post.translatedAr}</p>
                  </div>
                ) : null}
              </div>

              {/* Authentic X / Facebook Engagement Footer (تعليقات، إعادة نشر، إعجاب، مشاهدات) */}
              <div className="mt-3.5 border-t border-line/80 pt-2.5">
                <div className="flex items-center justify-between text-xs font-extrabold text-muted">
                  {/* Comments Button */}
                  <button
                    type="button"
                    onClick={() =>
                      setOpenCommentsId(isCommentsOpen ? "" : post.id)
                    }
                    className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 transition hover:bg-sky-500/10 hover:text-sky-600 ${
                      isCommentsOpen ? "bg-sky-500/10 text-sky-600" : ""
                    }`}
                  >
                    <span>💬</span>
                    <span>
                      {post.commentsCount + (userComments[post.id]?.length ?? 0)}
                    </span>
                    <span className="hidden sm:inline">{tr("تعليق")}</span>
                  </button>

                  {/* Repost / Share Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setSharedIds((prev) => ({
                        ...prev,
                        [post.id]: (prev[post.id] ?? 0) + 1,
                      }));
                      if (typeof navigator !== "undefined" && navigator.share) {
                        void navigator
                          .share({
                            title: `${post.authorName} عبر رهط بوست`,
                            text: post.translatedAr || post.originalText,
                            url: window.location.href,
                          })
                          .catch(() => {});
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 transition hover:bg-emerald-500/10 hover:text-emerald-600"
                  >
                    <span>🔁</span>
                    <span>{post.shares + extraShares}</span>
                    <span className="hidden sm:inline">
                      {isX ? tr("إعادة نشر") : tr("مشاركة")}
                    </span>
                  </button>

                  {/* Like / Reaction Button */}
                  <button
                    type="button"
                    onClick={() =>
                      setLikedIds((prev) => ({
                        ...prev,
                        [post.id]: !prev[post.id],
                      }))
                    }
                    className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 transition hover:bg-rose-500/10 hover:text-rose-600 ${
                      isLiked ? "bg-rose-500/10 text-rose-600" : ""
                    }`}
                  >
                    <span>{isLiked ? "❤️" : "🤍"}</span>
                    <span>{post.likes + (isLiked ? 1 : 0)}</span>
                    <span className="hidden sm:inline">{tr("تفاعل")}</span>
                  </button>

                  {/* Views Count */}
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-muted">
                    <span>📊</span>
                    <bdi dir="ltr">{post.views}</bdi>
                  </span>
                </div>

                {/* Expandable Comments Drawer */}
                {isCommentsOpen ? (
                  <div className="mt-2.5 rounded-2xl border border-line bg-paper p-3">
                    <p className="mb-2 text-xs font-extrabold text-ink">
                      💬 {tr("أبرز التعليقات والتفاعلات")}
                    </p>
                    <ul className="space-y-2">
                      {allPostComments.map((c, idx) => (
                        <li
                          key={idx}
                          className="rounded-xl bg-surface px-3 py-2 text-xs"
                        >
                          <div className="flex items-center justify-between font-extrabold text-ink">
                            <span>{c.author}</span>
                            <span className="text-[10px] font-semibold text-muted">
                              {c.time}
                            </span>
                          </div>
                          <p className="mt-0.5 font-semibold text-ink/90">{c.text}</p>
                        </li>
                      ))}
                    </ul>
                    <form
                      className="mt-2.5 flex gap-1.5"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const text = commentDraft.trim();
                        if (!text) return;
                        setUserComments((prev) => ({
                          ...prev,
                          [post.id]: [
                            ...(prev[post.id] ?? []),
                            { author: "زائر رهط بوست", text, time: "الآن" },
                          ],
                        }));
                        setCommentDraft("");
                      }}
                    >
                      <input
                        type="text"
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        placeholder={tr("أضف تعليقك على المنشور…")}
                        className="field min-h-9 flex-1 rounded-xl px-3 py-1.5 text-xs font-semibold"
                      />
                      <button
                        type="submit"
                        className="rounded-xl bg-primary px-3 py-1.5 text-xs font-extrabold text-[#111827]"
                      >
                        {tr("إرسال")}
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
