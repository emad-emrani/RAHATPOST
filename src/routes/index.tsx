import { createFileRoute, Link } from "@tanstack/react-router";
import { Bus, ChevronDown, ChevronLeft, ChevronRight, Cpu, Globe, House, MapPin, Megaphone, Newspaper, Plus, RefreshCw, Search, Siren, Sparkles, Store, Trophy, Tv, type LucideIcon } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSiteSettings } from "@/lib/site-settings/context";
import type { HomeSectionId } from "@/lib/site-settings/types";
import { AdSlots } from "@/components/google-services";
import { NewsImage } from "@/components/news-image";
import { HomePostCard } from "@/components/guide";
import { getGuide } from "@/data/guides";
import { CommentCount } from "@/components/comment-count";
import { HomeCarousel, HomeTiles, QuickLinks, type SectionSlide } from "@/components/home-parts";
import { SectionTitle, Shell } from "@/components/shell";
import { AlertsBanner, DutyCard } from "@/components/duty";
import { getBoard } from "@/lib/board/api";
import { InstallBanner } from "@/components/install-app";
import { HomeTodayChips } from "@/components/today-cards";
import { weatherWithin } from "@/lib/weather/api";
import { weatherKind, weatherLabel, type Weather } from "@/lib/weather/types";
import { countdownAr, formatPrayerTime, nextPrayer } from "@/lib/prayer/times";
import { mediaUrl } from "@/lib/media/types";
import { NotifyPrompt } from "@/components/notify";
import { NewsLead, NewsUnavailable, newestFirst } from "@/components/news";
import { getApprovedEntries } from "@/lib/directory/api";
import { osmEntries, type DirectoryEntry } from "@/lib/directory/types";
import { getAutoSectionFlags, getCustomSectionsNews, getNews, getSportsNews, getTechNews, type CustomSectionResult } from "@/lib/news/api";
import { getMatchesBoard, type MatchesBoardData, type MatchItem } from "@/lib/news/matches";
import { newsByline, relativeTimeAr, useNow } from "@/lib/news/format";
import type { IsraelNewsItem, IsraelNewsResult, NewsItem } from "@/lib/news/types";
import { getIsraelNews } from "@/lib/news/israel-api";
import { IsraelNewsCredit, IsraelNewsLead, IsraelNewsRow, IsraelTitle } from "@/components/israel-news";
import { emergency } from "@/data/content";
import { getListings } from "@/lib/market/api";
import { priceLabel } from "@/lib/market/types";
import { getStore } from "@/lib/store/api";
import { ProductCard } from "@/components/store-parts";
import type { ListAd } from "@/lib/ads/display";
import { organizationLd, seo, websiteLd } from "@/lib/seo";
import { getLang, tr, trv } from "@/lib/i18n/core";
import { localizeTexts } from "@/lib/i18n/api";
import { localized, localizedIsrael } from "@/lib/i18n/localize";

const postGuide = getGuide("post");

export const Route = createFileRoute("/")({
  // ?q= opens the page with the search filled in (WebSite SearchAction target).
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === "string" && search.q.trim() ? search.q.trim().slice(0, 80) : undefined,
  }),
  head: () =>
    seo({
      title: tr("رهط بوست | أخبار رهط والنقب، باصات رهط، دليل وإعلانات"),
      description:
        tr("رهط بوست: آخر أخبار رهط والنقب، مواعيد باصات رهط، دليل محلات وخدمات رهط، إعلانات مبوبة، صيدلية الحراسة وأرقام الطوارئ — كل ما تحتاجه في مدينة رهط في مكان واحد."),
      path: "/",
      jsonLd: [organizationLd, websiteLd],
    }),
  loader: async () => {
    const [news, approved, ads, israel, weather, board, store, tech, flags, sports, matches, customSecs] = await Promise.all([
      getNews(),
      getApprovedEntries(),
      getListings(),
      israelNewsForHome(),
      weatherWithin(2_000),
      getBoard(),
      getStore(),
      getTechNews().catch(() => null),
      getAutoSectionFlags().catch(() => ({}) as Record<string, boolean>),
      getSportsNews().catch(() => null),
      matchesForHome(),
      getCustomSectionsNews().catch(() => [] as CustomSectionResult[]),
    ]);
    const [lNews, lIsrael, lStore, lTech, lSports, lCustomSecs] = await Promise.all([
      localized(news, (d) => [{ items: d.items, fields: ["title", "summary", "body"] }], "auto"),
      localizedIsrael(israel, (d) => d?.items ?? []),
      localized(store, (d) => [{ items: d.products, fields: ["name", "shortDesc", "description"] }, { items: d.categories, fields: ["name", "description"] }]),
      tech ? localized(tech, (d) => [{ items: d.items.slice(0, 5), fields: ["title", "summary"] }], "auto") : null,
      sports ? localized(sports, (d) => [{ items: d.items.slice(0, 5), fields: ["title", "summary"] }], "auto") : null,
      localized(customSecs, (secs) => secs.map((s) => ({ items: s.items.slice(0, 10), fields: ["title", "summary", "body"] })), "auto"),
    ]);
    return { news: lNews, approved: approved.entries, ads, israel: lIsrael, weather, board, store: lStore, tech: lTech, sports: lSports, flags, matches, customSecs: lCustomSecs };
  },
  // New items must show up within a minute or two: short CDN cache, revalidated in the background.
  headers: () => ({ "Cache-Control": HOME_CACHE }),
  staleTime: 0,
  component: Home,
});

const HOME_CACHE = "public, max-age=0, s-maxage=1, stale-while-revalidate=5";

const ISRAEL_HOME_WAIT_MS = 3_500;
async function israelNewsForHome(): Promise<IsraelNewsResult | null> {
  try {
    return await Promise.race([
      getIsraelNews(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ISRAEL_HOME_WAIT_MS)),
    ]);
  } catch {
    return null;
  }
}

async function matchesForHome(): Promise<MatchesBoardData | null> {
  try {
    return await Promise.race([
      getMatchesBoard(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3_500)),
    ]);
  } catch {
    return null;
  }
}

/** Apply deterministic per-section & per-item natural time offsets when RSS feeds emit batch timestamps. */
function staggerSectionItems<T extends { slug: string; publishedAt: string; reader?: unknown; staff?: boolean }>(
  items: T[],
  sectionOffsetMin: number,
): T[] {
  const seenMinutes = new Map<number, number>();
  return items.map((item, idx) => {
    if (item.reader || item.staff) return item;
    const ms = Date.parse(item.publishedAt);
    if (Number.isNaN(ms)) return item;
    const minBucket = Math.floor(ms / 60_000);
    const dupCount = seenMinutes.get(minBucket) ?? 0;
    seenMinutes.set(minBucket, dupCount + 1);
    const hashSeed = item.slug.split("").reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) & 0xffff, 0);
    const extraSec = ((hashSeed % 110) + dupCount * 135 + sectionOffsetMin * 60 + idx * 25) * 1000;
    const adjustedMs = Math.min(Date.now() - 30_000, ms - extraSec);
    return { ...item, publishedAt: new Date(adjustedMs).toISOString() };
  });
}

function Home() {
  const loaderData = Route.useLoaderData();
  const { approved, ads: adsData, weather, board, store, flags, matches } = loaderData;
  const [news, setNews] = useState(loaderData.news);
  const [israel, setIsrael] = useState(loaderData.israel);
  const [sports, setSports] = useState(loaderData.sports);
  const [tech, setTech] = useState(loaderData.tech);

  useEffect(() => {
    setNews(loaderData.news);
    setIsrael(loaderData.israel);
    setSports(loaderData.sports);
    setTech(loaderData.tech);
  }, [loaderData.news, loaderData.israel, loaderData.sports, loaderData.tech]);

  // Independent staggered per-section RSS polling (News: 3m, Israel: 7m, Sports: 11m, Tech: 17m)
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const scheduleStaggered = (
      offsetMs: number,
      intervalMs: number,
      task: () => Promise<void>,
    ) => {
      const t1 = setTimeout(() => {
        if (document.visibilityState === "visible") void task();
        const t2 = setInterval(() => {
          if (document.visibilityState === "visible") void task();
        }, intervalMs);
        timers.push(t2 as unknown as ReturnType<typeof setTimeout>);
      }, offsetMs);
      timers.push(t1);
    };

    scheduleStaggered(45_000, 3 * 60_000, async () => {
      try {
        const fresh = await getNews();
        if (fresh?.items?.length) setNews(fresh);
      } catch {}
    });
    scheduleStaggered(2 * 60_000 + 15_000, 7 * 60_000, async () => {
      try {
        const fresh = await getIsraelNews();
        if (fresh?.items?.length) setIsrael(fresh);
      } catch {}
    });
    scheduleStaggered(5 * 60_000 + 10_000, 11 * 60_000, async () => {
      try {
        const fresh = await getSportsNews();
        if (fresh?.items?.length) setSports(fresh);
      } catch {}
    });
    scheduleStaggered(9 * 60_000 + 20_000, 17 * 60_000, async () => {
      try {
        const fresh = await getTechNews();
        if (fresh?.items?.length) setTech(fresh);
      } catch {}
    });

    return () => {
      timers.forEach((t) => {
        clearTimeout(t);
        clearInterval(t);
      });
    };
  }, []);

  const showSec = (id: string) => flags[id] !== false;
  const techTop = useMemo(
    () => (tech?.home ? staggerSectionItems(tech.items.slice(0, 5), 9) : []),
    [tech],
  );
  const sportsTop = useMemo(
    () => (sports?.home ? staggerSectionItems(sports.items.slice(0, 5), 5) : []),
    [sports],
  );
  const [customSecsState, setCustomSecsState] = useState<CustomSectionResult[]>(loaderData.customSecs ?? []);
  useEffect(() => {
    setCustomSecsState(loaderData.customSecs ?? []);
  }, [loaderData.customSecs]);

  // Also refresh custom sections on a staggered 13-minute timer
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        void getCustomSectionsNews()
          .then((res) => {
            if (Array.isArray(res)) setCustomSecsState(res);
          })
          .catch(() => {});
      }
    }, 13 * 60_000);
    return () => clearInterval(id);
  }, []);

  const settings = useSiteSettings();
  const visibleCustomSections = useMemo(() => {
    const out: {
      id: string;
      rawName: string;
      name: string;
      home: boolean;
      items: NewsItem[];
      icon: string;
      url: string;
    }[] = [];
    const seenNames = new Set<string>();

    const emojiToIcon: Record<string, string> = {
      "✨": "sparkles",
      "📰": "news",
      "📺": "tv",
      "🔴": "tv",
      "⚽": "trophy",
      "🚌": "bus",
      "📢": "ad",
      "🚨": "siren",
      "📍": "pin",
      "🛍️": "store",
      "💼": "store",
      "🌍": "globe",
      "💻": "cpu",
    };

    const pickIconForName = (n: string, emoji?: string) =>
      (emoji && emojiToIcon[emoji]) ||
      (/فن|موضة|ثقافة|مشاهير|جمال/.test(n)
        ? "sparkles"
        : /رياضة|مباريات|كرة/.test(n)
          ? "trophy"
          : /تقنية|تكنولوجيا/.test(n)
            ? "cpu"
            : "news");

    // 1. Custom sections from database (created in SectionAdmin like "فن و موضة")
    for (const cs of customSecsState) {
      const cleanName = cs.name.trim();
      if (!cleanName || seenNames.has(cleanName)) continue;
      seenNames.add(cleanName);
      const qlOverride = (settings.quickLinks ?? []).find(
        (q) => q.id.startsWith("sec") && q.title.trim() === cleanName,
      );
      const matchedFromNews = news.items.filter(
        (i) =>
          i.category === cleanName ||
          i.title.includes(cleanName) ||
          (/فن|موضة/.test(cleanName) &&
            /فن|موضة|ثقافة|مهرجان|أزياء|سينما|مسرح|فنان/.test(
              `${i.title} ${i.summary} ${i.category}`,
            )),
      );
      const mergedItems =
        cs.items.length > 0
          ? cs.items
          : matchedFromNews.length > 0
            ? matchedFromNews
            : news.items.slice(0, 4);
      out.push({
        id: cs.id,
        rawName: cleanName,
        name: cleanName,
        home: cs.home !== false && !qlOverride?.subtitle?.includes("مَخفي_رئيسية"),
        items: staggerSectionItems(mergedItems, 4),
        icon: pickIconForName(cleanName, qlOverride?.emoji),
        url: qlOverride?.url?.trim() || `/?q=${cleanName}`,
      });
    }

    // 2. Quick custom sections from siteSettings.quickLinks
    for (const q of settings.quickLinks ?? []) {
      if (!q.id.startsWith("sec")) continue;
      const cleanName = q.title.trim();
      if (!cleanName || seenNames.has(cleanName)) continue;
      seenNames.add(cleanName);
      const isHiddenHome =
        q.subtitle?.includes("مَخفي_رئيسية") || q.subtitle === " مَخفي";
      const cat = q.url.includes("q=")
        ? decodeURIComponent(q.url.split("q=")[1] ?? "")
        : "";
      const matched = news.items.filter(
        (i) =>
          (cat &&
            (i.category === cat ||
              i.title.includes(cat) ||
              i.summary.includes(cat))) ||
          i.category === cleanName ||
          i.title.includes(cleanName) ||
          (/فن|موضة/.test(cleanName) &&
            /فن|موضة|ثقافة|مهرجان|أزياء|سينما|مسرح|فنان/.test(
              `${i.title} ${i.summary} ${i.category}`,
            )),
      );
      out.push({
        id: q.id,
        rawName: cleanName,
        name: `${q.emoji ? q.emoji + " " : ""}${cleanName}`,
        home: !isHiddenHome,
        items: staggerSectionItems(
          matched.length > 0 ? matched : news.items.slice(0, 4),
          5,
        ),
        icon: pickIconForName(cleanName, q.emoji),
        url: q.url?.trim() || `/?q=${cleanName}`,
      });
    }

    // 3. Also discover any custom section present in topbarcfg or slidercfg (/csec~.../) or default "فن و موضة"
    const extraCustomNames = new Set<string>(["فن و موضة"]);
    const topCfg = (settings.quickLinks ?? []).find((q) => q.id === "topbarcfg");
    if (topCfg && topCfg.url.startsWith("/__top?")) {
      const labels = (topCfg.subtitle ?? "").split("|");
      const pairs = topCfg.url.slice(7).split("|").filter(Boolean);
      pairs.forEach((p, idx) => {
        const colon = p.indexOf(":");
        const rawTo = (colon > 0 ? p.slice(colon + 1) : p).replace(/%20/g, " ");
        const lbl = (labels[idx] ?? "").trim();
        if (lbl && (rawTo.includes("?q=") || p.startsWith("sparkles:"))) {
          extraCustomNames.add(lbl);
        }
      });
    }
    const sliderCfgItem = (settings.quickLinks ?? []).find(
      (q) => q.id === "slidercfg",
    );
    if (sliderCfgItem?.url?.startsWith("/__hord?")) {
      for (const token of sliderCfgItem.url.slice(8).split("|").filter(Boolean)) {
        const colon = token.lastIndexOf(":");
        const rawKey = (colon > 0 ? token.slice(0, colon) : token).replace(
          /%20/g,
          " ",
        );
        if (rawKey.startsWith("csec~")) {
          const cName = rawKey.slice(5).trim();
          if (cName) extraCustomNames.add(cName);
        }
      }
    }

    for (const cName of extraCustomNames) {
      if (!cName || seenNames.has(cName)) continue;
      seenNames.add(cName);
      const matched = news.items.filter(
        (i) =>
          i.category === cName ||
          i.title.includes(cName) ||
          (/فن|موضة/.test(cName) &&
            /فن|موضة|ثقافة|مهرجان|أزياء|سينما|مسرح|فنان/.test(
              `${i.title} ${i.summary} ${i.category}`,
            )),
      );
      out.push({
        id: `csec-${cName}`,
        rawName: cName,
        name: `${/فن|موضة|ثقافة/.test(cName) ? "✨ " : ""}${cName}`,
        home: true,
        items: staggerSectionItems(
          matched.length > 0 ? matched : news.items.slice(0, 4),
          6,
        ),
        icon: pickIconForName(cName),
        url: `/?q=${cName}`,
      });
    }

    return out;
  }, [customSecsState, settings.quickLinks, news.items]);
  const israelItems = useMemo(
    () => staggerSectionItems(israel?.items ?? [], 2),
    [israel],
  );
  const israelTop = [
    ...israelItems.filter((item) => item.pinned),
    ...israelItems.filter((item) => item.titleAr && !item.pinned),
    ...israelItems.filter((item) => !item.titleAr && !item.pinned),
  ].slice(0, 5);
  const classifieds: ListAd[] = useMemo(
    () =>
      adsData.items
        .filter((l) => !l.sold)
        .map((l) => ({ id: l.id, type: l.category, title: l.title, neighborhood: l.area, price: priceLabel(l), photo: l.photos[0] })),
    [adsData],
  );
  const places = useMemo(() => [...approved, ...osmEntries()], [approved]);
  const now = useNow(news.now);
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  useEffect(() => {
    setQ(search.q ?? "");
  }, [search.q]);
  const query = q.trim();
  const ranked = useMemo(() => staggerSectionItems(newestFirst(news.items), 0), [news.items]);
  const breaking = news.items.find((item) => item.breaking);
  const israelBreaking = israelItems.find((item) => item.breaking);
  const txMapHome = useMemo(() => parseTxSecsMap(settings.quickLinks), [settings.quickLinks]);
  const { resolvedItems: rankedTx } = useTranslatedNewsList(
    ranked.slice(0, 10),
    isSectionTxEnabled(txMapHome, "news", "الأخبار المحلية"),
  );
  const { resolvedItems: sportsTopTx } = useTranslatedNewsList(
    sportsTop,
    isSectionTxEnabled(txMapHome, "sports", "رياضة"),
  );
  const { resolvedItems: techTopTx } = useTranslatedNewsList(
    techTop,
    isSectionTxEnabled(txMapHome, "tech", "أخبار تقنية"),
  );
  const top = rankedTx[0] ?? ranked[0];
  const remaining = rankedTx.slice(1);
  const lead = remaining[0] ?? top;
  const rest = remaining.slice(1, 7);

  // Slider: the latest item of every enabled section (sections with nothing are skipped).
  const latestFeed = ranked.find((i) => !i.reader);
  const latestReader = ranked.find((i) => i.reader);
  const newsSlide = (key: string, label: string, i: NewsItem): SectionSlide => ({
    key,
    label,
    link: { to: "/news/$slug", params: { slug: i.slug } },
    item: { image: i.image, title: i.title, category: i.category, source: i.source },
    meta: `${relativeTimeAr(i.publishedAt, now)} · ${newsByline(i)}`,
  });
  const sliderCfg = useMemo(() => {
    const raw = (settings.quickLinks ?? []).find((q) => q.id === "slidercfg")?.subtitle ?? "";
    let size: "sm" | "md" | "lg" | "xl" = "md";
    let secs: string[] | null = null;
    for (const part of raw.split("|")) {
      if (part.startsWith("size:")) {
        const v = part.slice(5).trim();
        if (v === "sm" || v === "md" || v === "lg" || v === "xl") size = v;
      } else if (part.startsWith("secs:")) {
        const list = part.slice(5).split(",").map((x) => x.trim()).filter(Boolean);
        if (list.length > 0) secs = list;
      }
    }
    const heightPx = size === "sm" ? "180px" : size === "lg" ? "310px" : size === "xl" ? "380px" : "240px";
    return { size, secs, heightPx };
  }, [settings.quickLinks]);

  const israelSlide = (key: string, i: IsraelNewsItem): SectionSlide => ({
    key,
    label: "أخبار إسرائيل",
    link: { to: "/israel-news/$slug" as const, params: { slug: i.slug } },
    item: { image: i.image, title: i.titleAr ?? i.titleHe, category: i.category, source: i.source },
    title: <IsraelTitle item={i} />,
    meta: `${relativeTimeAr(i.publishedAt, now)} · ${trv(i.source)}`,
  });

  const sectionSlides: SectionSlide[] = (() => {
    const picked = sliderCfg.secs;
    // If admin selected a single specific section for the slider, show up to 5 items from that section!
    if (picked && picked.length === 1) {
      const onlyId = picked[0];
      if (onlyId === "news") {
        return ranked.filter((i) => !i.reader).slice(0, 5).map((i, idx) => newsSlide(`news-${idx}`, "آخر الأخبار", i));
      }
      if (onlyId === "israel") {
        return israelTop.slice(0, 5).map((i, idx) => israelSlide(`israel-${idx}`, i));
      }
      if (onlyId === "sports") {
        return (sports?.items ?? []).slice(0, 5).map((i, idx) => newsSlide(`sports-${idx}`, "رياضة", i));
      }
      if (onlyId === "tech") {
        return (tech?.items ?? []).slice(0, 5).map((i, idx) => newsSlide(`tech-${idx}`, "أخبار تقنية", i));
      }
      if (onlyId === "reader") {
        return ranked.filter((i) => i.reader).slice(0, 5).map((i, idx) => newsSlide(`reader-${idx}`, "من القراء", i));
      }
      const custom = visibleCustomSections.find((cs) => cs.id === onlyId);
      if (custom && custom.items.length > 0) {
        return custom.items.slice(0, 5).map((i, idx) => newsSlide(`custom-${custom.id}-${idx}`, custom.name, i));
      }
    }

    const allow = (id: string) => !picked || picked.includes(id);
    const israelFirst = israelTop[0];
    return [
      ...(allow("news") && showSec("news") && latestFeed ? [newsSlide("news", "آخر الأخبار", latestFeed)] : []),
      ...visibleCustomSections
        .filter((cs) => allow(cs.id) && cs.items.length > 0)
        .map((cs) => newsSlide(`custom-${cs.id}`, cs.name, cs.items[0])),
      ...(allow("israel") && showSec("israel") && israelFirst ? [israelSlide("israel", israelFirst)] : []),
      ...(allow("sports") && sportsTop[0] ? [newsSlide("sports", "رياضة", sportsTop[0])] : []),
      ...(allow("tech") && tech?.items[0] && showSec("tech") ? [newsSlide("tech", "أخبار تقنية", tech.items[0])] : []),
      ...(allow("reader") && latestReader ? [newsSlide("reader", "من القراء", latestReader)] : []),
    ];
  })();

  const results = useMemo(() => {
    if (!query) return null;
    const matchedCustomSec = visibleCustomSections.find(
      (cs) => cs.rawName === query || cs.name === query || cs.id === query,
    );
    const hay = (value: string) => value.includes(query);
    const filteredNews = news.items.filter(
      (item) => hay(item.title) || hay(item.category) || hay(item.source) || hay(item.summary),
    );
    return {
      news:
        matchedCustomSec && matchedCustomSec.items.length > 0
          ? matchedCustomSec.items
          : filteredNews,
      places: places.filter(
        (item) =>
          hay(item.name) ||
          hay(item.category) ||
          hay(item.altName ?? "") ||
          hay(item.address ?? item.area ?? ""),
      ),
      ads: classifieds.filter((item) => hay(item.title) || hay(item.type)),
      israel: israelItems.filter(
        (item) =>
          hay(item.titleAr ?? "") ||
          hay(item.titleHe) ||
          hay(item.summaryAr ?? "") ||
          hay(item.source),
      ),
    };
  }, [query, news.items, places, classifieds, israelItems]);

  const filteredStoreProducts = useMemo(
    () => store.products.filter((p) => p.slug !== "hub-cfg-main" && !p.slug.startsWith("offer-")),
    [store.products],
  );
  const directoryPreview = places.length ? (
    <InteractiveDirectoryHomeSection
      places={places}
      storeProducts={filteredStoreProducts}
      storeCurrency={store.settings.currency}
    />
  ) : null;

  type ExtendedHomeSectionId = HomeSectionId | "matches" | `csec~${string}`;
  const customSectionBlocks: Record<string, ReactNode> = {};
  for (const cs of visibleCustomSections) {
    const blockEl = (
      <CustomSectionTranslatedBlock
        key={cs.id}
        cs={cs}
        now={now}
      />
    );
    const rName = cs.rawName.trim();
    const compactName = rName.replace(/\s*و\s*/g, " و");
    const spacedName = rName.replace(/\s*و\s*/g, " و ");
    customSectionBlocks[`csec~${rName}`] = blockEl;
    customSectionBlocks[`csec~${compactName}`] = blockEl;
    customSectionBlocks[`csec~${spacedName}`] = blockEl;
    customSectionBlocks[`csec~${cs.id}`] = blockEl;
  }

  const blocks: Record<string, ReactNode> = {
    ...customSectionBlocks,
    weather: !showSec("weather") ? null : <AnimatedWeatherPrayerBar weather={weather} serverNow={news.now} />,
    slider: (
      <div className="home-slider-sized" style={{ ["--slider-custom-h" as string]: sliderCfg.heightPx }}>
        {sliderCfg.size !== "md" ? (
          <style>{`.home-slider-sized .carousel > * { min-height: var(--slider-custom-h) !important; height: var(--slider-custom-h) !important; }`}</style>
        ) : null}
        <HomeCarousel
          lead={(!sliderCfg.secs || sliderCfg.secs.includes("news")) ? top : sectionSlides[0] ? undefined : top}
          leadTime={top ? relativeTimeAr(top.publishedAt, now) : ""}
          sections={sectionSlides}
        />
      </div>
    ),
    search: (
      <label className="search-field block">
        <span className="sr-only">{tr("بحث")}</span>
        <Search className="size-5" aria-hidden />
        <input
          type="search"
          className="field"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder={tr("ابحث في أخبار رهط والباصات والدليل والحراج…")}
        />
      </label>
    ),
    tiles: <HomeTilesBar hasLiveMatch={Boolean(matches?.matches?.some((m) => m.status === "in" || (m as { streamUrl?: string }).streamUrl || (m.note && /https?:\/\//i.test(m.note))))} customSections={visibleCustomSections} />,
    quicklinks: <HomeQuickLinks />,
    news: !showSec("news") ? null : (
      <>
        <section>
          <SectionTitle title={tr("آخر الأخبار")} to="/news" more={tr("كل الأخبار")} />
          {lead ? (
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <NewsLead item={lead} now={now} />
              </div>
              <ul className="stack-list lg:col-span-6">
                {rest.map((item) => (
                  <li key={item.slug}>
                    <Link
                      to="/news/$slug"
                      params={{ slug: item.slug }}
                      className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface/60"
                    >
                      <NewsImage item={item} className="size-16 rounded-xl" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          {item.pinned ? (
                            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold text-ink">
                              📌 {tr("مثبّت")}
                            </span>
                          ) : null}
                          {item.sourceUrl === "live" ? (
                            <span className="rounded-full bg-alert px-2 py-0.5 text-[10px] font-extrabold text-white">
                              🔴 {tr("بث مباشر")}
                            </span>
                          ) : item.sourceUrl === "video" ? (
                            <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-extrabold text-paper">
                              🎬 {tr("فيديو")}
                            </span>
                          ) : null}
                        </span>
                        <span className="block font-bold leading-snug">{trv(item.title)}</span>
                        <span className="text-sm font-semibold text-muted">
                          {trv(item.category)} · {relativeTimeAr(item.publishedAt, now)} ·{" "}
                          {newsByline(item)}
                          <CommentCount n={item.comments} className="ms-2" />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <NewsUnavailable />
          )}
        </section>
        <AdSlots placement="home" />
      </>
    ),
    matches: <HomeMatchesWidget initial={matches} />,
    sports:
      sportsTopTx.length > 0 ? (
        <section>
          <SectionTitle title={tr("رياضة")} to="/sports-news" more={tr("عرض الكل")} />
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <NewsLead item={sportsTopTx[0]} now={now} />
            </div>
            <ul className="stack-list lg:col-span-6">
              {sportsTopTx.slice(1).map((item) => (
                <li key={item.slug}>
                  <Link to="/news/$slug" params={{ slug: item.slug }} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface/60">
                    <NewsImage item={item} className="size-16 rounded-xl" />
                    <span className="min-w-0 flex-1">
                      <span dir="auto" className="block font-bold leading-snug">{trv(item.title)}</span>
                      <span className="text-sm font-semibold text-muted">
                        {relativeTimeAr(item.publishedAt, now)} · {trv(item.source)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null,
    tech:
      techTopTx.length > 0 ? (
        <section>
          <SectionTitle title={tr("أخبار تقنية")} to="/tech-news" more={tr("عرض الكل")} />
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <NewsLead item={techTopTx[0]} now={now} />
            </div>
            <ul className="stack-list lg:col-span-6">
              {techTopTx.slice(1).map((item) => (
                <li key={item.slug}>
                  <Link to="/news/$slug" params={{ slug: item.slug }} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface/60">
                    <NewsImage item={item} className="size-16 rounded-xl" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold leading-snug">{trv(item.title)}</span>
                      <span className="text-sm font-semibold text-muted">
                        {relativeTimeAr(item.publishedAt, now)} · {trv(item.source)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null,
    israel:
      showSec("israel") && israelTop.length > 0 && israel ? (
        <section>
          <SectionTitle title={tr("أخبار إسرائيل")} to="/israel-news" more={tr("عرض الكل")} />
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <IsraelNewsLead item={israelTop[0]} now={now} />
            </div>
            <ul className="stack-list lg:col-span-6">
              {israelTop.slice(1).map((item) => (
                <li key={item.slug}>
                  <IsraelNewsRow item={item} now={now} />
                </li>
              ))}
            </ul>
          </div>
          <IsraelNewsCredit data={israel} />
        </section>
      ) : null,
    post: postGuide ? (
      <section>
        <SectionTitle title={tr("دليل البريد والخدمات في رهط")} to="/directory/guide/$guide" params={{ guide: "post" }} more={tr("الدليل الكامل")} />
        <InteractiveRahatServicesHub now={now} />
      </section>
    ) : null,
    install: <HomeAppAndNotifySection />,
    buses: <InteractiveGalimBusesHomeSection />, 
    directory: directoryPreview,
    ads: (
      <section>
        <SectionTitle title={tr("جديد {0}", settings.texts.harajName)} to="/haraj" more={tr("كل الإعلانات")} />
        {classifieds.length === 0 ? (
          <Link to="/haraj/new" className="stamp press block p-4 font-bold">
            {tr("عندك غرض للبيع؟ أضفه إلى الحراج مجاناً.")}
          </Link>
        ) : null}
        <ul className="grid gap-3 sm:grid-cols-2">
          {classifieds.slice(0, 4).map((item) => (
            <li key={item.id}>
              <Link
                to="/haraj/$id"
                params={{ id: item.id }}
                className="stamp press flex items-center justify-between gap-3 px-4 py-3"
              >
                {item.photo ? (
                  <img
                    src={mediaUrl(item.photo)}
                    alt={trv(item.title)}
                    className="thumb size-16"
                    loading="lazy"
                    decoding="async"
                  />
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className={item.quiet ? "chip" : "chip chip-deep"}>{trv(item.type)}</span>
                  <span className="mt-1 block font-bold">{trv(item.title)}</span>
                  <span className="text-sm font-semibold text-muted">{trv(item.neighborhood)}</span>
                </span>
                {item.price ? <span className="shrink-0 font-bold">{trv(item.price)}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    ),
    duty: board.dutyVisible === false ? null : <DutyCard duty={board.duty} />,
    emergency: <InteractiveEmergencyHomeSection />, 
  };

  // Build the homepage section order from slidercfg (/hord) + settings.home + all visibleCustomSections
  const order: ExtendedHomeSectionId[] = (() => {
    const sliderItem = (settings.quickLinks ?? []).find(
      (q) => q.id === "slidercfg",
    );
    const hordRaw = sliderItem?.url?.startsWith("/__hord?")
      ? sliderItem.url.slice(8)
      : "";

    const hiddenByHord = new Set<string>();
    const customConfiguredOrder: ExtendedHomeSectionId[] = [];

    if (hordRaw) {
      for (const token of hordRaw.split("|").filter(Boolean)) {
        const colon = token.lastIndexOf(":");
        const rawKey = (colon > 0 ? token.slice(0, colon) : token).replace(
          /%20/g,
          " ",
        );
        const vis = colon > 0 ? token.slice(colon + 1) !== "0" : true;
        if (!vis) {
          hiddenByHord.add(rawKey);
        } else {
          customConfiguredOrder.push(rawKey as ExtendedHomeSectionId);
        }
      }
    }

    const rawOrder = settings.home
      .filter((h) => h.visible && !hiddenByHord.has(h.id))
      .map((h) => h.id as ExtendedHomeSectionId);

    let working: ExtendedHomeSectionId[] =
      customConfiguredOrder.length > 0 ? [...customConfiguredOrder] : [...rawOrder];

    // Append any visible built-in sections that were not in customConfiguredOrder
    for (const bId of rawOrder) {
      if (!working.includes(bId)) working.push(bId);
    }

    // Automatically inject any visible custom section (like "فن و موضة" or newly added sections) if not yet placed in working
    for (const cs of visibleCustomSections) {
      const cKey = `csec~${cs.rawName}` as ExtendedHomeSectionId;
      if (!cs.home || hiddenByHord.has(cKey)) continue;
      if (!working.includes(cKey)) {
        const newsIdx = working.indexOf("news");
        if (newsIdx !== -1) {
          working.splice(newsIdx + 1, 0, cKey);
        } else {
          working.push(cKey);
        }
      }
    }

    // Ensure matches widget is included
    if (!working.includes("matches") && !hiddenByHord.has("matches")) {
      const newsIdx = working.indexOf("news");
      const hasLive = Boolean(
        matches?.matches?.some(
          (m) =>
            m.status === "in" ||
            (m as { streamUrl?: string }).streamUrl ||
            (m.note && /https?:\/\//i.test(m.note)),
        ),
      );
      if (newsIdx !== -1) {
        working.splice(hasLive ? newsIdx : newsIdx + 1, 0, "matches");
      } else {
        working.unshift("matches");
      }
    }

    // Respect exact admin section position for install and all sections

    return working;
  })();
  const TOP: ExtendedHomeSectionId[] = ["weather", "slider", "search"];

  const sidebarSlot1 = settings.google?.slots?.[0]?.slot || "";
  const sidebarSlot2 = settings.google?.slots?.[1]?.slot || "";

  return (
    <Shell wide>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Main Content Column (8 cols on lg, 9 cols on xl) */}
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-8 xl:col-span-9">
          <h1 className="sr-only">{tr("رهط بوست: أخبار وخدمات رهط والنقب")}</h1>
          <AlertsBanner alerts={board.alerts} />
          {breaking ? (
            <Link
              to="/news/$slug"
              params={{ slug: breaking.slug }}
              className="alert-card press block px-4 py-3"
            >
              <span className="chip bg-white/20 text-white">{tr("عاجل")}</span>
              <span className="mt-2 block text-lg font-bold">{trv(breaking.title)}</span>
              <span className="text-sm font-semibold">
                {relativeTimeAr(breaking.publishedAt, now)} · {trv(breaking.source)}
              </span>
            </Link>
          ) : israelBreaking ? (
            <Link
              to="/israel-news/$slug"
              params={{ slug: israelBreaking.slug }}
              className="alert-card press block px-4 py-3"
            >
              <span className="chip bg-white/20 text-white">{tr("عاجل")}</span>
              <span className="mt-2 block text-lg font-bold">
                {israelBreaking.titleAr ?? israelBreaking.titleHe}
              </span>
              <span className="text-sm font-semibold">
                {relativeTimeAr(israelBreaking.publishedAt, now)} · {trv(israelBreaking.source)}
              </span>
            </Link>
          ) : null}
          {results ? (
            <>
              {order
                .filter((id) => TOP.includes(id))
                .map((id) => (
                  <Fragment key={id}>{trv(blocks[id])}</Fragment>
                ))}
              {order.includes("search") ? null : blocks.search}
              <SearchResults query={query} results={results} />
            </>
          ) : (
            <>
              {order.map((id) => (
                <Fragment key={id}>{trv(blocks[id])}</Fragment>
              ))}
            </>
          )}
        </div>

        {/* Sticky Desktop Sidebar Column (4 cols on lg, 3 cols on xl) */}
        <aside
          aria-label={tr("الشريط الجانبي للخدمات والإعلانات")}
          className="hidden w-full space-y-5 lg:sticky lg:top-20 lg:col-span-4 lg:block xl:col-span-3"
        >
          {/* Quick Community Services Card */}
          <div className="rounded-3xl border border-line bg-paper p-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="text-sm font-extrabold text-ink">
                {tr("خدمات رهط والنقب السريعة")}
              </h2>
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-extrabold text-ink">
                {tr("مباشر")}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-extrabold">
              <Link
                to="/buses"
                className="flex items-center justify-center gap-1.5 rounded-2xl bg-surface px-3 py-2.5 text-ink transition hover:bg-primary"
              >
                <Bus className="size-4 shrink-0" />
                <span>{tr("خريطة الباصات")}</span>
              </Link>
              <Link
                to="/sports-news"
                className="flex items-center justify-center gap-1.5 rounded-2xl bg-surface px-3 py-2.5 text-ink transition hover:bg-primary"
              >
                <Tv className="size-4 shrink-0" />
                <span>{tr("بث مباريات")}</span>
              </Link>
              <Link
                to="/today"
                className="flex items-center justify-center gap-1.5 rounded-2xl bg-surface px-3 py-2.5 text-ink transition hover:bg-primary"
              >
                <Siren className="size-4 shrink-0" />
                <span>{tr("لوحة اليوم")}</span>
              </Link>
              <Link
                to="/haraj"
                className="flex items-center justify-center gap-1.5 rounded-2xl bg-surface px-3 py-2.5 text-ink transition hover:bg-primary"
              >
                <Megaphone className="size-4 shrink-0" />
                <span>{tr("حراج رهط")}</span>
              </Link>
              <Link
                to="/directory"
                className="col-span-2 flex items-center justify-center gap-1.5 rounded-2xl bg-ink px-3 py-2.5 text-paper transition hover:opacity-90"
              >
                <MapPin className="size-4 shrink-0" />
                <span>{tr("دليل محلات وخدمات رهط")}</span>
              </Link>
            </div>
          </div>

          {/* Configured Sticky Sidebar AdSense Units */}
          {sidebarSlot1 ? (
            <AdBanner
              dataAdSlot={sidebarSlot1}
              dataAdFormat="rectangle"
              minHeight={250}
            />
          ) : (
            <AdSlots placement="home" />
          )}

          {sidebarSlot2 ? (
            <AdBanner
              dataAdSlot={sidebarSlot2}
              dataAdFormat="vertical"
              minHeight={600}
            />
          ) : null}
        </aside>
      </div>
      <AmpAutoAdsBridge />
      <CustomBottomBar />
    </Shell>
  );
}

const CUSTOM_SECTION_DICT: Record<string, { ar: string; he: string; en: string }> = {
  "فن و موضة": { ar: "فن و موضة", he: "אמנות ואופנה", en: "Art & Fashion" },
  "فن وموضة": { ar: "فن وموضة", he: "אמנות ואופנה", en: "Art & Fashion" },
  "ثقافة وفن": { ar: "ثقافة وفن", he: "תרבות ואמנות", en: "Culture & Art" },
  "فن وثقافة": { ar: "فن وثقافة", he: "אמנות ותרבות", en: "Art & Culture" },
  "موضة": { ar: "موضة", he: "אופנה", en: "Fashion" },
  "فن": { ar: "فن", he: "אמנות", en: "Art" },
  "مشاهير": { ar: "مشاهير", he: "סלבס ובידור", en: "Celebrities" },
  "الذكاء": { ar: "الذكاء", he: "בינה מלאכותית", en: "AI" },
  "ذكاء اصطناعي": { ar: "ذكاء اصطناعي", he: "בינה מלאכותית", en: "Artificial Intelligence" },
  "نتفليكس": { ar: "نتفليكس", he: "נטפליקס", en: "Netflix" },
  "أخبار محلية": { ar: "أخبار محلية", he: "חדשות מקומיות", en: "Local News" },
};

function trSecLabel(raw: string, overrideLang?: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const emojiMatch = trimmed.match(/^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\s]+)(.+)$/u);
  const prefix = emojiMatch ? emojiMatch[1] : "";
  const core = (emojiMatch ? emojiMatch[2] : trimmed).trim();
  const lang = overrideLang || getLang() || "ar";
  const entry = CUSTOM_SECTION_DICT[core];
  if (entry && (lang === "ar" || lang === "he" || lang === "en")) {
    return `${prefix}${entry[lang]}`;
  }
  if (lang === "ar") return trimmed;
  const byDict = trv(core);
  if (byDict !== core) return `${prefix}${byDict}`;
  return trv(trimmed);
}

function detectSourceLang(text: string): "ar" | "he" | "en" {
  if (/[\u0590-\u05FF]/.test(text)) return "he";
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  return "en";
}

const clientTxMemoryCache = new Map<string, string>();

async function translateSingleTextClient(text: string, targetLang: "ar" | "he" | "en"): Promise<string> {
  const clean = text.trim();
  if (!clean) return "";
  const srcLang = detectSourceLang(clean);
  if (srcLang === targetLang) return clean;

  const cacheKey = `rp_tx_${srcLang}_${targetLang}_${clean.slice(0, 120)}`;
  const mem = clientTxMemoryCache.get(cacheKey);
  if (mem) return mem;
  if (typeof window !== "undefined") {
    try {
      const saved = window.localStorage.getItem(cacheKey);
      if (saved) {
        clientTxMemoryCache.set(cacheKey, saved);
        return saved;
      }
    } catch {
      // ignore storage errors
    }
  }

  // 1. Try server localizeTexts first if source is Arabic and target is he/en
  if (srcLang === "ar" && targetLang !== "ar") {
    try {
      const srvOut = await localizeTexts({ data: { lang: targetLang, texts: [clean], kind: "auto" } });
      if (Array.isArray(srvOut) && srvOut[0] && srvOut[0].trim() !== clean) {
        const resText = srvOut[0].trim();
        clientTxMemoryCache.set(cacheKey, resText);
        if (typeof window !== "undefined") {
          try { window.localStorage.setItem(cacheKey, resText); } catch {}
        }
        return resText;
      }
    } catch {
      // fallback to MyMemory below
    }
  }

  // 2. Fallback to MyMemory free translation API (supports he->ar, en->ar, ar->he, ar->en)
  try {
    const params = new URLSearchParams({
      q: clean.slice(0, 450),
      langpair: `${srcLang}|${targetLang}`,
    });
    const res = await fetch(`https://api.mymemory.translated.net/get?${params.toString()}`);
    if (res.ok) {
      const json = (await res.json()) as { responseData?: { translatedText?: string } };
      const out = json?.responseData?.translatedText?.trim();
      if (out && !out.includes("MYMEMORY WARNING")) {
        clientTxMemoryCache.set(cacheKey, out);
        if (typeof window !== "undefined") {
          try { window.localStorage.setItem(cacheKey, out); } catch {}
        }
        return out;
      }
    }
  } catch {
    // keep original on network error
  }
  return clean;
}

function parseTxSecsMap(quickLinks: { id: string; subtitle?: string }[] | undefined): Record<string, boolean> {
  const item = (quickLinks ?? []).find((q) => q.id === "txsecscfg");
  const map: Record<string, boolean> = {};
  if (!item?.subtitle) return map;
  for (const part of item.subtitle.split(",")) {
    const [k, v] = part.split(":");
    if (k) map[k.trim()] = v !== "0";
  }
  return map;
}

function isSectionTxEnabled(
  map: Record<string, boolean>,
  secKey: string,
  rawName?: string,
): boolean {
  if (rawName && rawName in map) return map[rawName];
  if (secKey in map) return map[secKey];
  if (rawName && /فن|موضة/.test(rawName) && "art-fashion" in map) return map["art-fashion"];
  return true; // enabled by default unless turned off in /admin
}

function useTranslatedNewsList(items: NewsItem[], enabled = true) {
  const siteLang = getLang();
  const targetLang: "ar" | "he" | "en" =
    siteLang === "he" ? "he" : siteLang === "en" ? "en" : "ar";
  const [translatedMap, setTranslatedMap] = useState<Record<string, { title: string; summary: string; category: string }>>({});

  useEffect(() => {
    if (!enabled || items.length === 0) return;
    let active = true;
    const toTranslate = items.slice(0, 10).filter((it) => {
      const key = `${it.slug}_${targetLang}`;
      if (translatedMap[key]) return false;
      const detected = detectSourceLang(it.title);
      return detected !== targetLang;
    });

    if (toTranslate.length === 0) return;

    void (async () => {
      const nextEntries: Record<string, { title: string; summary: string; category: string }> = {};
      await Promise.all(
        toTranslate.map(async (it) => {
          const [tTitle, tSummary] = await Promise.all([
            translateSingleTextClient(it.title, targetLang),
            it.summary ? translateSingleTextClient(it.summary, targetLang) : Promise.resolve(""),
          ]);
          nextEntries[`${it.slug}_${targetLang}`] = {
            title: tTitle || it.title,
            summary: tSummary || it.summary,
            category: trSecLabel(it.category, targetLang),
          };
        }),
      );
      if (active) {
        setTranslatedMap((prev) => ({ ...prev, ...nextEntries }));
      }
    })();

    return () => {
      active = false;
    };
  }, [items, targetLang, enabled]);

  const resolvedItems = useMemo(() => {
    if (!enabled) return items;
    return items.map((it) => {
      const hit = translatedMap[`${it.slug}_${targetLang}`];
      if (!hit) {
        return {
          ...it,
          category: trSecLabel(it.category, targetLang),
        };
      }
      return {
        ...it,
        title: hit.title,
        summary: hit.summary,
        category: hit.category,
      };
    });
  }, [items, translatedMap, targetLang, enabled]);

  return { resolvedItems };
}

function CustomSectionTranslatedBlock({
  cs,
  now,
}: {
  cs: {
    id: string;
    rawName: string;
    name: string;
    home: boolean;
    items: NewsItem[];
    icon: string;
    url: string;
  };
  now: number;
}) {
  const settings = useSiteSettings();
  const txMap = useMemo(() => parseTxSecsMap(settings.quickLinks), [settings.quickLinks]);
  const txEnabled = isSectionTxEnabled(txMap, cs.id, cs.rawName);
  const { resolvedItems } = useTranslatedNewsList(cs.items, txEnabled);
  const displayTitle = txEnabled ? trSecLabel(cs.name) : cs.name;

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold">{displayTitle}</h2>
        <Link
          to="/news"
          search={{ cat: cs.rawName.trim() } as never}
          className="inline-flex min-h-10 items-center gap-0.5 text-sm font-bold text-primary-ink"
        >
          <span>{tr("كل الأخبار")}</span>
          <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" aria-hidden />
        </Link>
      </div>
      {resolvedItems.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <NewsLead item={resolvedItems[0]} now={now} />
          </div>
          {resolvedItems.length > 1 ? (
            <ul className="stack-list lg:col-span-6">
              {resolvedItems.slice(1, 6).map((item) => (
                <li key={item.slug}>
                  <Link
                    to="/news/$slug"
                    params={{ slug: item.slug }}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface/60"
                  >
                    <NewsImage item={item} className="size-16 rounded-xl" />
                    <span className="min-w-0 flex-1">
                      <span dir="auto" className="block font-bold leading-snug">
                        {trv(item.title)}
                      </span>
                      <span className="text-sm font-semibold text-muted">
                        {txEnabled ? trSecLabel(item.category) : item.category} ·{" "}
                        {relativeTimeAr(item.publishedAt, now)} ·{" "}
                        {newsByline(item)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="stamp p-4 text-sm font-semibold text-muted">
          {tr(
            "قسم جديد — يمكنك نشر أخبار في هذا القسم من لوحة التحكم ← نشر خبر جديد.",
          )}
        </p>
      )}
    </section>
  );
}

function SearchResults({
  query,
  results,
}: {
  query: string;
  results: {
    news: NewsItem[];
    places: DirectoryEntry[];
    ads: ListAd[];
    israel: IsraelNewsItem[];
  };
}) {
  const settings = useSiteSettings();
  const txMap = useMemo(() => parseTxSecsMap(settings.quickLinks), [settings.quickLinks]);
  const txEnabled = isSectionTxEnabled(txMap, query, query);
  const { resolvedItems: translatedNews } = useTranslatedNewsList(results.news, txEnabled);

  const empty =
    translatedNews.length + results.places.length + results.ads.length + results.israel.length === 0;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">
        {tr("نتائج «")}{txEnabled ? trSecLabel(query) : query}»
      </h1>
      {empty ? (
        <p className="stamp p-4 font-semibold">{tr("لا توجد نتيجة. جرّب اسماً أو حياً أو تصنيفاً.")}</p>
      ) : null}
      {translatedNews.map((item) => (
        <Link
          key={item.slug}
          to="/news/$slug"
          params={{ slug: item.slug }}
          className="stamp press block p-4"
        >
          <span className="chip chip-deep">{txEnabled ? trSecLabel(item.category) : item.category}</span>
          <span dir="auto" className="mt-2 block font-bold">{trv(item.title)}</span>
          <span className="text-sm font-semibold text-muted">{trv(item.source)}</span>
        </Link>
      ))}
      {results.israel.map((item) => (
        <Link
          key={item.slug}
          to="/israel-news/$slug"
          params={{ slug: item.slug }}
          className="stamp press block p-4"
        >
          <span className="chip">{tr("أخبار إسرائيل")}</span>
          <span className="mt-2 block font-bold">
            <IsraelTitle item={item} />
          </span>
          <span className="text-sm font-semibold text-muted">{trv(item.source)}</span>
        </Link>
      ))}
      {results.places.map((item) => (
        <Link
          key={item.slug}
          to="/directory/$slug"
          params={{ slug: item.slug }}
          className="stamp press block p-4"
        >
          <span className="chip">{trv(item.category)}</span>
          <span className="mt-2 block font-bold">{trv(item.name)}</span>
          <span className="text-sm font-semibold text-muted">{trv(item.address ?? item.area ?? "")}</span>
        </Link>
      ))}
      {results.ads.map((item) => (
        <Link
          key={item.id}
          to="/haraj/$id"
          params={{ id: item.id }}
          className="stamp press block p-4"
        >
          <span className="chip">{trv(item.type)}</span>
          <span className="mt-2 block font-bold">{trv(item.title)}</span>
          <span className="text-sm font-semibold text-muted">
            {trv(item.neighborhood)}
            {item.price ? ` · ${trv(item.price)}` : ""}
          </span>
        </Link>
      ))}
    </div>
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

const STADIUM_PITCH_KEYFRAMES = `
@keyframes rpTurfBreeze {
  0%, 100% { background-position: 0% 50%, 0 0; }
  50% { background-position: 100% 50%, 24px 0; }
}
@keyframes rpFloodlightSweep {
  0%, 100% { transform: translateX(-30%) rotate(-12deg); opacity: 0.22; }
  50% { transform: translateX(30%) rotate(12deg); opacity: 0.38; }
}
@keyframes rpBallRoam {
  0%   { transform: translate(0px, 0px) scale(1); }
  20%  { transform: translate(58px, -14px) scale(1.08); }
  45%  { transform: translate(110px, 10px) scale(0.96); }
  70%  { transform: translate(-65px, -12px) scale(1.08); }
  88%  { transform: translate(-112px, 8px) scale(1.12); }
  100% { transform: translate(0px, 0px) scale(1); }
}
@keyframes rpGoalCelebration {
  0%   { transform: scale(0.75); opacity: 0; }
  15%  { transform: scale(1.06); opacity: 1; }
  30%  { transform: scale(0.98); opacity: 1; }
  85%  { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.92); opacity: 0; }
}
@keyframes rpCardFlipIn {
  0%   { transform: perspective(400px) rotateY(90deg) scale(0.6); opacity: 0; }
  25%  { transform: perspective(400px) rotateY(-12deg) scale(1.08); opacity: 1; }
  45%  { transform: perspective(400px) rotateY(0deg) scale(1); opacity: 1; }
  85%  { transform: perspective(400px) rotateY(0deg) scale(1); opacity: 1; }
  100% { transform: perspective(400px) rotateY(-45deg) scale(0.85); opacity: 0; }
}
@keyframes rpRadarWave {
  0%   { transform: scale(0.5); opacity: 0.85; }
  100% { transform: scale(2.4); opacity: 0; }
}
`;

type PitchEventKind = "none" | "goal" | "foul" | "red" | "attack";

function MatchRowCard({ m, showLeagueBadge }: { m: RichMatchItem; showLeagueBadge?: boolean }) {
  const isLive = m.status === "in";
  const isDone = m.status === "post";
  const { streamUrl, channel, cleanNote, meta } = extractMatchStream(m);
  const details = useMemo(() => resolveMatchDetails(m, meta), [m, meta]);
  const [watchOpen, setWatchOpen] = useState(false);
  const embed = streamUrl ? toEmbedStreamUrl(streamUrl) : null;

  // Live animated stadium event state ("goal" | "foul" | "red" | "attack" | "none")
  const [pitchEvent, setPitchEvent] = useState<PitchEventKind>("none");
  const [pitchEventText, setPitchEventText] = useState<string>("");
  const [pitchEventSub, setPitchEventSub] = useState<string>("");
  const eventTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerPitchEvent = (kind: PitchEventKind, customTitle?: string, customSub?: string) => {
    if (eventTimerRef.current) clearTimeout(eventTimerRef.current);
    setPitchEvent(kind);
    if (kind === "goal") {
      const lastGoal =
        details.homeGoals[details.homeGoals.length - 1] ??
        details.awayGoals[details.awayGoals.length - 1];
      const scorerText = lastGoal
        ? `${trv(lastGoal.scorer)} ${lastGoal.minute ? `(${lastGoal.minute})` : ""}`
        : `${trv(m.homeTeam)} × ${trv(m.awayTeam)}`;
      setPitchEventText(customTitle || tr("⚽ هـــــدف! GOOOAL!"));
      setPitchEventSub(customSub || scorerText);
    } else if (kind === "foul") {
      const lastYellow =
        details.homeCardEvents.filter((c) => c.card === "yellow").slice(-1)[0] ??
        details.awayCardEvents.filter((c) => c.card === "yellow").slice(-1)[0];
      setPitchEventText(customTitle || tr("📢 صافرة الحكم: فاول وبطاقة صفراء!"));
      setPitchEventSub(
        customSub ||
          (lastYellow?.player
            ? `${trv(lastYellow.player)} ${lastYellow.minute ? `(${lastYellow.minute})` : ""}`
            : `${tr("خطأ تكتيكي في وسط الملعب")} · ${trv(m.homeTeam)} × ${trv(m.awayTeam)}`),
      );
    } else if (kind === "red") {
      const lastRed =
        details.homeCardEvents.filter((c) => c.card === "red").slice(-1)[0] ??
        details.awayCardEvents.filter((c) => c.card === "red").slice(-1)[0];
      setPitchEventText(customTitle || tr("🟥 قرار حاسم: بطاقة حمراء وطرد!"));
      setPitchEventSub(
        customSub ||
          (lastRed?.player
            ? `${trv(lastRed.player)} ${lastRed.minute ? `(${lastRed.minute})` : ""}`
            : `${tr("تدخل قوي ومراجعة الحكم")} · ${trv(m.homeTeam)} × ${trv(m.awayTeam)}`),
      );
    } else if (kind === "attack") {
      setPitchEventText(customTitle || tr("⚡ هجمة خطيرة داخل منطقة الجزاء!"));
      setPitchEventSub(
        customSub || `${tr("ضغط هجومي متواصل على المرمى")} · ${trv(m.homeTeam)} × ${trv(m.awayTeam)}`,
      );
    }
    if (kind !== "none") {
      eventTimerRef.current = setTimeout(() => {
        setPitchEvent("none");
      }, 4600);
    }
  };

  useEffect(() => {
    return () => {
      if (eventTimerRef.current) clearTimeout(eventTimerRef.current);
    };
  }, []);

  // Automatically detect real-time score, yellow card, or red card changes and fire stadium animation!
  const prevMetricsRef = useRef<{
    id: string;
    hs: number;
    as: number;
    yc: number;
    rc: number;
  }>({
    id: m.id,
    hs: m.homeScore ?? 0,
    as: m.awayScore ?? 0,
    yc: details.homeYellowCards + details.awayYellowCards,
    rc: details.homeRedCards + details.awayRedCards,
  });

  useEffect(() => {
    const curHs = m.homeScore ?? 0;
    const curAs = m.awayScore ?? 0;
    const curYc = details.homeYellowCards + details.awayYellowCards;
    const curRc = details.homeRedCards + details.awayRedCards;
    const prev = prevMetricsRef.current;

    if (prev.id !== m.id) {
      prevMetricsRef.current = { id: m.id, hs: curHs, as: curAs, yc: curYc, rc: curRc };
      // If switched to a match with goals or live action, show a brief welcome stadium event
      if (curHs + curAs > 0 && isLive) {
        triggerPitchEvent("goal");
      } else if (curRc > 0 && isLive) {
        triggerPitchEvent("red");
      } else if (curYc > 0 && isLive) {
        triggerPitchEvent("foul");
      }
      return;
    }

    if (curHs > prev.hs) {
      triggerPitchEvent(
        "goal",
        `⚽ ${tr("هـــدف لصالح")} ${trv(m.homeTeam)}!`,
        `${curHs} - ${curAs}`,
      );
    } else if (curAs > prev.as) {
      triggerPitchEvent(
        "goal",
        `⚽ ${tr("هـــدف لصالح")} ${trv(m.awayTeam)}!`,
        `${curHs} - ${curAs}`,
      );
    } else if (curRc > prev.rc) {
      triggerPitchEvent("red");
    } else if (curYc > prev.yc) {
      triggerPitchEvent("foul");
    }

    prevMetricsRef.current = { id: m.id, hs: curHs, as: curAs, yc: curYc, rc: curRc };
  }, [
    m.id,
    m.homeScore,
    m.awayScore,
    m.homeTeam,
    m.awayTeam,
    isLive,
    details.homeYellowCards,
    details.awayYellowCards,
    details.homeRedCards,
    details.awayRedCards,
  ]);

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

  const borderGlowCls =
    pitchEvent === "goal"
      ? "border-2 border-[#FACC15] shadow-[0_0_24px_rgba(250,204,21,0.55)]"
      : pitchEvent === "foul"
        ? "border-2 border-[#FDE047] shadow-[0_0_20px_rgba(253,224,71,0.45)]"
        : pitchEvent === "red"
          ? "border-2 border-[#EF4444] shadow-[0_0_22px_rgba(239,68,68,0.55)]"
          : pitchEvent === "attack"
            ? "border-2 border-[#38BDF8] shadow-[0_0_18px_rgba(56,189,248,0.45)]"
            : isLive
              ? "border-2 border-[#22C55E]/80 shadow-sm"
              : "border border-[#15803D]/60 shadow-xs";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl px-3 py-2.5 text-white transition-all duration-300 ${borderGlowCls}`}
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.16) 0%, rgba(0,0,0,0.28) 90%), repeating-linear-gradient(90deg, #0b532b 0px, #0b532b 22px, #0f6837 22px, #0f6837 44px)",
        backgroundSize: "200% 100%, 44px 100%",
        animation: "rpTurfBreeze 9s ease-in-out infinite",
      }}
    >
      <style>{STADIUM_PITCH_KEYFRAMES}</style>

      {/* Animated Stadium Floodlight Beams */}
      <div
        className="pointer-events-none absolute -top-10 inset-x-0 h-28"
        style={{
          background:
            "conic-gradient(from 180deg at 50% 0%, transparent 30%, rgba(255,255,255,0.22) 48%, rgba(250,204,21,0.18) 52%, transparent 70%)",
          animation: "rpFloodlightSweep 6s ease-in-out infinite",
        }}
        aria-hidden
      />

      {/* Authentic SVG Football Pitch Markings & Animated Ball on Pitch */}
      <svg
        viewBox="0 0 400 130"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-35"
        aria-hidden
      >
        {/* Outer Pitch Boundary */}
        <rect x="6" y="6" width="388" height="118" rx="6" fill="none" stroke="#ffffff" strokeWidth="1.6" />
        {/* Halfway Line */}
        <line x1="200" y1="6" x2="200" y2="124" stroke="#ffffff" strokeWidth="1.5" />
        {/* Center Circle & Spot */}
        <circle cx="200" cy="65" r="24" fill="none" stroke="#ffffff" strokeWidth="1.5" />
        <circle cx="200" cy="65" r="2.6" fill="#ffffff" />
        {/* Left Penalty Area & 6-Yard Box */}
        <rect x="6" y="28" width="48" height="74" fill="none" stroke="#ffffff" strokeWidth="1.5" />
        <rect x="6" y="45" width="18" height="40" fill="none" stroke="#ffffff" strokeWidth="1.3" />
        <path d="M 54 49 A 18 18 0 0 1 54 81" fill="none" stroke="#ffffff" strokeWidth="1.4" />
        {/* Right Penalty Area & 6-Yard Box */}
        <rect x="346" y="28" width="48" height="74" fill="none" stroke="#ffffff" strokeWidth="1.5" />
        <rect x="376" y="45" width="18" height="40" fill="none" stroke="#ffffff" strokeWidth="1.3" />
        <path d="M 346 49 A 18 18 0 0 0 346 81" fill="none" stroke="#ffffff" strokeWidth="1.4" />
        {/* Corner Arcs */}
        <path d="M 6 14 A 8 8 0 0 0 14 6" fill="none" stroke="#ffffff" strokeWidth="1.3" />
        <path d="M 386 6 A 8 8 0 0 0 394 14" fill="none" stroke="#ffffff" strokeWidth="1.3" />
        <path d="M 6 116 A 8 8 0 0 1 14 124" fill="none" stroke="#ffffff" strokeWidth="1.3" />
        <path d="M 386 124 A 8 8 0 0 1 394 116" fill="none" stroke="#ffffff" strokeWidth="1.3" />
      </svg>

      {/* Moving Ball & Radar Pulse in the Pitch Background */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 z-0 -translate-x-1/2 -translate-y-1/2"
        aria-hidden
      >
        <div
          className="relative flex items-center justify-center"
          style={{
            animation: "rpBallRoam 11s ease-in-out infinite",
          }}
        >
          <span
            className="absolute size-7 rounded-full border border-[#FACC15]/70 bg-[#FACC15]/20"
            style={{ animation: "rpRadarWave 1.8s ease-out infinite" }}
          />
          <span className="text-[11px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">⚽</span>
        </div>
      </div>

      {/* Live Match Event Overlay Banner (Goal / Foul / Red Card / Dangerous Attack) */}
      {pitchEvent !== "none" ? (
        <div
          onClick={() => setPitchEvent("none")}
          className="absolute inset-0 z-20 flex cursor-pointer flex-col items-center justify-center bg-black/75 px-3 text-center backdrop-blur-[2px]"
          style={{
            animation:
              pitchEvent === "goal"
                ? "rpGoalCelebration 4.5s ease-in-out forwards"
                : "rpCardFlipIn 4.5s ease-in-out forwards",
          }}
        >
          {pitchEvent === "goal" ? (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-2xl sm:text-3xl">
                <span className="animate-bounce">⚽</span>
                <span className="rounded-2xl bg-gradient-to-r from-[#FACC15] via-[#FEF08A] to-[#FACC15] px-4 py-1 text-base font-extrabold text-[#111827] shadow-[0_0_25px_rgba(250,204,21,0.9)] sm:text-lg">
                  {pitchEventText}
                </span>
                <span className="animate-bounce">🥅</span>
              </div>
              <p className="mt-1.5 text-xs font-extrabold text-[#FEF08A] sm:text-sm">
                🎉 {pitchEventSub}
              </p>
            </div>
          ) : pitchEvent === "foul" ? (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <span className="inline-block h-8 w-6 rounded-sm border-2 border-white bg-[#FACC15] shadow-[0_0_20px_rgba(250,204,21,0.95)]" />
                <span className="rounded-xl bg-[#FACC15] px-3.5 py-1 text-sm font-extrabold text-[#111827] shadow-lg">
                  {pitchEventText}
                </span>
              </div>
              <p className="mt-1.5 text-xs font-extrabold text-white/95">
                ⚠️ {pitchEventSub}
              </p>
            </div>
          ) : pitchEvent === "red" ? (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <span className="inline-block h-8 w-6 rounded-sm border-2 border-white bg-[#EF4444] shadow-[0_0_24px_rgba(239,68,68,0.95)]" />
                <span className="rounded-xl bg-[#EF4444] px-3.5 py-1 text-sm font-extrabold text-white shadow-lg">
                  {pitchEventText}
                </span>
              </div>
              <p className="mt-1.5 text-xs font-extrabold text-[#FECACA]">
                🚨 {pitchEventSub}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="rounded-xl bg-[#0284C7] px-3.5 py-1 text-sm font-extrabold text-white shadow-[0_0_20px_rgba(56,189,248,0.85)]">
                {pitchEventText}
              </span>
              <p className="mt-1.5 text-xs font-extrabold text-[#BAE6FD]">
                🔥 {pitchEventSub}
              </p>
            </div>
          )}
        </div>
      ) : null}

      {/* Foreground Content Over the Stadium Pitch */}
      <div className="relative z-10 flex flex-col gap-1.5">
        {showLeagueBadge ? (
          <div className="flex items-center justify-between text-[10px] leading-none font-extrabold text-white/90">
            <span className="inline-flex items-center gap-1 truncate rounded-full bg-black/35 px-2 py-0.5 backdrop-blur-[1px]">
              <span>{m.leagueBadge}</span>
              <span className="truncate">{trv(m.leagueNameAr)}</span>
            </span>
            <span className="shrink-0 rounded-full bg-black/35 px-2 py-0.5 text-[#FEF08A]">
              {m.dateLabelAr}
            </span>
          </div>
        ) : null}

        {/* Main Match Scoreboard Row on the Pitch */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5 py-1">
          {/* Home team (Right in RTL) */}
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="rounded-full bg-white/95 p-0.5 shadow-sm">
              <TeamCrest name={m.homeTeam} logo={m.homeLogo} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="truncate text-xs font-extrabold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] sm:text-sm">
                  {trv(m.homeTeam)}
                </span>
                {/* Compact inline cards per team (clickable to trigger card animation!) */}
                <button
                  type="button"
                  dir="ltr"
                  onClick={() =>
                    triggerPitchEvent(
                      details.homeRedCards > 0 ? "red" : "foul",
                      details.homeRedCards > 0
                        ? `🟥 ${tr("بطاقة حمراء")} — ${trv(m.homeTeam)}`
                        : `🟨 ${tr("فاول وإنذار")} — ${trv(m.homeTeam)}`,
                    )
                  }
                  className="inline-flex shrink-0 items-center gap-0.5 text-[9px] leading-none font-extrabold"
                  title={tr("اضغط لعرض أنيميشن الفاول والبطاقات")}
                >
                  <span
                    className={`inline-flex items-center rounded px-1 py-0.5 ${
                      details.homeYellowCards > 0
                        ? "bg-[#FEF08A] text-[#854D0E] shadow-2xs"
                        : "bg-black/40 text-white/80"
                    }`}
                  >
                    🟨{details.homeYellowCards}
                  </span>
                  {details.homeRedCards > 0 ? (
                    <span className="inline-flex items-center rounded bg-[#EF4444] px-1 py-0.5 text-white shadow-2xs">
                      🟥{details.homeRedCards}
                    </span>
                  ) : null}
                </button>
              </div>

              {/* Micro compact goals list right below team name */}
              {details.homeGoals.length > 0 ? (
                <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[9px] leading-tight font-bold text-[#FEF08A]">
                  {details.homeGoals.map((g, idx) => (
                    <button
                      type="button"
                      key={`hg-${idx}-${g.minute}-${g.scorer}`}
                      onClick={() =>
                        triggerPitchEvent(
                          "goal",
                          `⚽ ${tr("هدف")} ${trv(m.homeTeam)}!`,
                          `${trv(g.scorer)} ${g.minute || ""}`,
                        )
                      }
                      className="inline-flex items-center gap-0.5 truncate rounded bg-black/35 px-1 py-0.5"
                    >
                      <span className="text-[8px]">⚽</span>
                      <span className="truncate text-white">{trv(g.scorer)}</span>
                      {g.minute ? (
                        <span dir="ltr" className="font-extrabold text-[#FACC15]">
                          {g.minute}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* Center Score / Kickoff + Live Match Clock over Center Circle */}
          <div className="flex flex-col items-center justify-center px-1.5">
            {m.status === "pre" ? (
              <button
                type="button"
                onClick={() => triggerPitchEvent("attack")}
                dir="ltr"
                className="rounded-xl border border-white/25 bg-black/55 px-2.5 py-1 text-xs font-extrabold text-[#FACC15] shadow-sm backdrop-blur-[2px]"
                title={tr("اضغط لمعاينة أجواء الملعب")}
              >
                {m.kickoffTimeAr}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => triggerPitchEvent("goal")}
                dir="ltr"
                className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-sm leading-tight font-extrabold shadow-sm ${
                  isLive
                    ? "border-[#FACC15] bg-[#DC2626] text-white"
                    : "border-white/25 bg-black/60 text-white"
                }`}
                title={tr("اضغط لإعادة احتفالية الهدف")}
              >
                <span>{m.homeScore ?? 0}</span>
                <span className="text-[#FACC15]">:</span>
                <span>{m.awayScore ?? 0}</span>
              </button>
            )}

            <span
              dir="ltr"
              className={`mt-1 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[9px] leading-none font-extrabold ${
                isLive ? "text-[#FACC15]" : isDone ? "text-white/80" : "text-[#FEF08A]"
              }`}
            >
              {isLive ? (
                <>
                  <span className="size-1.5 animate-ping rounded-full bg-[#22C55E]" />
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
                <button
                  type="button"
                  dir="ltr"
                  onClick={() =>
                    triggerPitchEvent(
                      details.awayRedCards > 0 ? "red" : "foul",
                      details.awayRedCards > 0
                        ? `🟥 ${tr("بطاقة حمراء")} — ${trv(m.awayTeam)}`
                        : `🟨 ${tr("فاول وإنذار")} — ${trv(m.awayTeam)}`,
                    )
                  }
                  className="inline-flex shrink-0 items-center gap-0.5 text-[9px] leading-none font-extrabold"
                  title={tr("اضغط لعرض أنيميشن الفاول والبطاقات")}
                >
                  {details.awayRedCards > 0 ? (
                    <span className="inline-flex items-center rounded bg-[#EF4444] px-1 py-0.5 text-white shadow-2xs">
                      🟥{details.awayRedCards}
                    </span>
                  ) : null}
                  <span
                    className={`inline-flex items-center rounded px-1 py-0.5 ${
                      details.awayYellowCards > 0
                        ? "bg-[#FEF08A] text-[#854D0E] shadow-2xs"
                        : "bg-black/40 text-white/80"
                    }`}
                  >
                    🟨{details.awayYellowCards}
                  </span>
                </button>
                <span className="truncate text-xs font-extrabold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] sm:text-sm">
                  {trv(m.awayTeam)}
                </span>
              </div>

              {/* Micro compact goals list right below away team name */}
              {details.awayGoals.length > 0 ? (
                <div className="mt-0.5 flex flex-wrap items-center justify-end gap-x-1.5 gap-y-0.5 text-[9px] leading-tight font-bold text-[#FEF08A]">
                  {details.awayGoals.map((g, idx) => (
                    <button
                      type="button"
                      key={`ag-${idx}-${g.minute}-${g.scorer}`}
                      onClick={() =>
                        triggerPitchEvent(
                          "goal",
                          `⚽ ${tr("هدف")} ${trv(m.awayTeam)}!`,
                          `${trv(g.scorer)} ${g.minute || ""}`,
                        )
                      }
                      className="inline-flex items-center gap-0.5 truncate rounded bg-black/35 px-1 py-0.5"
                    >
                      {g.minute ? (
                        <span dir="ltr" className="font-extrabold text-[#FACC15]">
                          {g.minute}
                        </span>
                      ) : null}
                      <span className="truncate text-white">{trv(g.scorer)}</span>
                      <span className="text-[8px]">⚽</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="rounded-full bg-white/95 p-0.5 shadow-sm">
              <TeamCrest name={m.awayTeam} logo={m.awayLogo} />
            </div>
          </div>
        </div>

        {/* Bottom Interactive Pitch FX Bar + Channel / Live Stream */}
        <div className="mt-0.5 flex flex-wrap items-center justify-between gap-1.5 border-t border-white/15 pt-1.5">
          {/* Interactive Stadium Event Triggers (Goal / Foul / Red Card / Attack) */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => triggerPitchEvent("goal")}
              className="press inline-flex items-center gap-0.5 rounded-lg bg-black/40 px-1.5 py-0.5 text-[10px] font-extrabold text-[#FEF08A] hover:bg-[#FACC15] hover:text-[#111827]"
              title={tr("عرض أنيميشن الهدف")}
            >
              <span>⚽</span>
              <span>{tr("هدف")}</span>
            </button>
            <button
              type="button"
              onClick={() => triggerPitchEvent("foul")}
              className="press inline-flex items-center gap-0.5 rounded-lg bg-black/40 px-1.5 py-0.5 text-[10px] font-extrabold text-white/90 hover:bg-[#FACC15] hover:text-[#111827]"
              title={tr("عرض أنيميشن الفاول والإنذار")}
            >
              <span>🟨</span>
              <span>{tr("فاول")}</span>
            </button>
            <button
              type="button"
              onClick={() => triggerPitchEvent("red")}
              className="press inline-flex items-center gap-0.5 rounded-lg bg-black/40 px-1.5 py-0.5 text-[10px] font-extrabold text-[#FCA5A5] hover:bg-[#EF4444] hover:text-white"
              title={tr("عرض أنيميشن البطاقة الحمراء")}
            >
              <span>🟥</span>
              <span>{tr("طرد")}</span>
            </button>
            <button
              type="button"
              onClick={() => triggerPitchEvent("attack")}
              className="press inline-flex items-center gap-0.5 rounded-lg bg-black/40 px-1.5 py-0.5 text-[10px] font-extrabold text-[#BAE6FD] hover:bg-[#0284C7] hover:text-white"
              title={tr("عرض أنيميشن هجمة خطيرة")}
            >
              <span>⚡</span>
              <span>{tr("هجمة")}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[10px] leading-none font-bold">
            {channel ? (
              <span className="rounded-lg bg-black/45 px-2 py-0.5 font-extrabold text-white">
                📡 {trv(channel)}
              </span>
            ) : null}
            {cleanNote ? (
              <span className="truncate text-white/85">{trv(cleanNote)}</span>
            ) : null}
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
        </div>

        {watchOpen && streamUrl && embed ? (
          <div className="mt-1.5 overflow-hidden rounded-2xl border border-white/25 bg-black text-white shadow-md">
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

/** Homepage Live Matches Widget — Compact by default (shows ongoing/featured match + compact league dropdown) & expandable. */
export function HomeMatchesWidget({ initial }: { initial: MatchesBoardData | null }) {
  const [board, setBoard] = useState<MatchesBoardData | null>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [featuredIdx, setFeaturedIdx] = useState(0);

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

  const leagueMatches = useMemo(() => {
    const filtered =
      selectedLeague === "all"
        ? allMatches
        : allMatches.filter((m) => m.leagueId === selectedLeague);
    const list = filtered.length > 0 ? filtered : allMatches;
    // Prioritize live ("in") matches first, then today matches
    return [...list].sort((a, b) => {
      if (a.status === "in" && b.status !== "in") return -1;
      if (b.status === "in" && a.status !== "in") return 1;
      if (a.dayKey === "today" && b.dayKey !== "today") return -1;
      if (b.dayKey === "today" && a.dayKey !== "today") return 1;
      return Date.parse(a.kickoffIso) - Date.parse(b.kickoffIso);
    });
  }, [allMatches, selectedLeague]);

  const filteredMatches = useMemo(() => {
    if (dayTab === "live") return leagueMatches.filter((m) => m.status === "in");
    const byDay = leagueMatches.filter((m) => m.dayKey === dayTab);
    if (byDay.length > 0) return byDay;
    return leagueMatches.slice(0, 8);
  }, [leagueMatches, dayTab]);

  if (!board) {
    return (
      <section className="stamp px-3 py-2.5" aria-label={tr("نتائج المباريات المباشرة")}>
        <div className="flex items-center justify-between gap-2 text-xs font-extrabold">
          <span className="inline-flex items-center gap-1.5">
            <Trophy className="size-4 text-primary-ink" />
            {tr("مباريات اليوم")}
          </span>
          <Link to="/sports-news" className="see-all text-xs">
            {tr("الكل")}
            <ChevronLeft className="size-3.5" />
          </Link>
        </div>
      </section>
    );
  }

  if (!board.enabled || !board.showOnHome) return null;

  const liveCount = allMatches.filter((m) => m.status === "in").length;
  const safeFeaturedIdx = leagueMatches.length > 0 ? featuredIdx % leagueMatches.length : 0;
  const currentFeaturedMatch = leagueMatches[safeFeaturedIdx] ?? leagueMatches[0];

  const handleSelectLeague = (id: string) => {
    setSelectedLeague(id);
    setFeaturedIdx(0);
    setDayTab(pickBestDayTab(allMatches, id));
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
    <section className="stamp px-3 py-2.5" aria-label={tr("نتائج المباريات المباشرة")}>
      {/* Compact Header Row: Title + Compact League Dropdown + Expand/Collapse */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary text-ink">
            <Trophy className="size-4" />
          </span>
          <h2 className="text-sm font-extrabold">{tr("مباريات اليوم")}</h2>
          {liveCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-alert px-2 py-0.5 text-[10px] font-extrabold text-white">
              <span className="size-1.5 animate-ping rounded-full bg-white" />
              {liveCount} {tr("مباشر")}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Compact League Selector Dropdown */}
          <select
            aria-label={tr("اختر الدوري أو البطولة")}
            value={selectedLeague}
            onChange={(e) => handleSelectLeague(e.target.value)}
            className="max-w-36 rounded-xl border border-line bg-surface px-2 py-1 text-xs font-extrabold text-ink focus:outline-none"
          >
            <option value="all">⚽ {tr("كل الدوريات")}</option>
            {board.leagues.map((lg) => (
              <option key={lg.id} value={lg.id}>
                {lg.badge} {trv(lg.shortAr)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="grid size-7 place-items-center rounded-xl border border-line bg-surface text-muted hover:text-ink"
            title={tr("تحديث النتائج")}
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 rounded-xl border border-line bg-surface px-2.5 py-1 text-xs font-extrabold text-ink hover:bg-primary-soft"
          >
            <span>{expanded ? tr("تصغير") : tr("المزيد")}</span>
            <ChevronDown className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* Compact Mode (Default): Shows ONLY the ongoing/featured match + small next/prev switcher */}
      {!expanded ? (
        <div className="mt-2">
          {currentFeaturedMatch ? (
            <div className="space-y-1.5">
              <MatchRowCard m={currentFeaturedMatch} showLeagueBadge />
              {leagueMatches.length > 1 ? (
                <div className="flex items-center justify-between px-1 pt-0.5 text-[11px] font-bold text-muted">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setFeaturedIdx((i) => (i - 1 + leagueMatches.length) % leagueMatches.length)
                      }
                      className="grid size-6 place-items-center rounded-lg border border-line bg-surface text-ink hover:bg-primary-soft"
                      aria-label={tr("المباراة السابقة")}
                    >
                      <ChevronRight className="size-3.5" />
                    </button>
                    <span className="px-1 text-[10px] font-extrabold">
                      {safeFeaturedIdx + 1} / {leagueMatches.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFeaturedIdx((i) => (i + 1) % leagueMatches.length)}
                      className="grid size-6 place-items-center rounded-lg border border-line bg-surface text-ink hover:bg-primary-soft"
                      aria-label={tr("المباراة التالية")}
                    >
                      <ChevronLeft className="size-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="font-extrabold text-primary-ink hover:underline"
                  >
                    {tr("عرض كل المباريات ({0}) ▾", leagueMatches.length)}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        /* Expanded Mode: Day tabs + full matches grid */
        <div className="mt-2.5 border-t border-line/60 pt-2.5">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-1.5 text-xs">
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  { key: "today", label: "اليوم" },
                  { key: "tomorrow", label: "غداً" },
                  { key: "yesterday", label: "أمس" },
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
                  🔴 {tr("مباشر")} ({liveCount})
                </button>
              ) : null}
            </div>
            <Link to="/sports-news" className="see-all text-xs">
              {tr("صفحة المباريات")}
              <ChevronLeft className="size-3.5" />
            </Link>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {filteredMatches.slice(0, 8).map((m) => (
              <MatchRowCard key={m.id} m={m} showLeagueBadge />
            ))}
          </div>
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

const ICON_MAP: Record<string, LucideIcon> = {
  home: House,
  news: Newspaper,
  tv: Tv,
  trophy: Trophy,
  bus: Bus,
  ad: Megaphone,
  siren: Siren,
  pin: MapPin,
  store: Store,
  globe: Globe,
  cpu: Cpu,
  sparkles: Sparkles,
  plus: Plus,
};

const DEFAULT_TOP_TILES: { icon: string; label: string; to: string }[] = [
  { icon: "news", label: "الأخبار", to: "/news" },
  { icon: "tv", label: "بث مباريات", to: "/sports-news" },
  { icon: "siren", label: "اليوم", to: "/today" },
  { icon: "ad", label: "حراج", to: "/haraj" },
  { icon: "bus", label: "الباصات", to: "/buses" },
  { icon: "store", label: "المتجر", to: "/store" },
  { icon: "pin", label: "الدليل", to: "/directory" },
];

const DEFAULT_BOT_TILES: { icon: string; label: string; to: string }[] = [
  { icon: "home", label: "الرئيسية", to: "/" },
  { icon: "news", label: "الأخبار", to: "/news" },
  { icon: "tv", label: "بث مباريات", to: "/sports-news" },
  { icon: "bus", label: "باصات", to: "/buses" },
  { icon: "ad", label: "حراج", to: "/haraj" },
  { icon: "siren", label: "اليوم", to: "/today" },
];

function HomeTilesBar({
  hasLiveMatch,
  customSections = [],
}: {
  hasLiveMatch?: boolean;
  customSections?: { id: string; rawName: string; name: string; icon: string; url?: string }[];
}) {
  const st = useSiteSettings();
  const topCfgItem = (st.quickLinks ?? []).find((q) => q.id === "topbarcfg");
  const liveTileCfg = (st.quickLinks ?? []).find((q) => q.id === "tilelive");
  const showLiveTile = liveTileCfg ? !liveTileCfg.subtitle?.includes("مَخفي") : true;
  const liveTileGlow =
    !liveTileCfg?.subtitle?.includes("بدون توهج") && liveTileCfg?.emoji !== "⚪";
  const liveTileLabel = liveTileCfg?.title?.trim() || "بث مباريات";

  const configuredList = useMemo(() => {
    if (topCfgItem && topCfgItem.url.startsWith("/__top?")) {
      const labels = (topCfgItem.subtitle ?? "").split("|");
      const pairs = topCfgItem.url.slice(7).split("|").filter(Boolean);
      if (pairs.length > 0) {
        return pairs.map((p, idx) => {
          const colon = p.indexOf(":");
          const icon = colon > 0 ? p.slice(0, colon) : "news";
          const rawTo = colon > 0 ? p.slice(colon + 1) : p;
          const to = rawTo.replace(/%20/g, " ");
          return {
            icon: icon || "news",
            to: to || "/news",
            label: (labels[idx] ?? "").trim() || "قسم",
          };
        });
      }
    }
    const visibleIds = new Set(st.tiles.filter((o) => o.visible).map((o) => o.id));
    return DEFAULT_TOP_TILES.filter((t) => {
      if (t.to === "/sports-news") return showLiveTile;
      return visibleIds.size === 0 || visibleIds.has(t.to as "/news");
    }).map((t) => (t.to === "/sports-news" ? { ...t, label: liveTileLabel } : t));
  }, [topCfgItem, st.tiles, showLiveTile, liveTileLabel]);

  // Include all custom sections from database (e.g. "فن و موضة") and quickLinks in the Top Menu!
  const combined = [...configuredList];
  for (const cs of customSections) {
    const cleanLabel = cs.rawName.trim();
    if (!cleanLabel) continue;
    const hiddenByAdmin = (st.quickLinks ?? []).some(
      (q) => q.title.trim() === cleanLabel && q.subtitle?.includes("مَخفي_علوي"),
    );
    if (hiddenByAdmin) continue;
    if (!combined.some((c) => c.label.trim().replace(/\s+/g, "") === cleanLabel.replace(/\s+/g, ""))) {
      combined.push({
        icon: cs.icon || (/فن|موضة|ثقافة/.test(cleanLabel) ? "sparkles" : "news"),
        to: `/news?cat=${cleanLabel}`,
        label: cleanLabel,
      });
    }
  }

  if (!combined.length) return null;

  const GENERAL_NEWS_LABELS = new Set(["الأخبار", "أخبار", "أخبار رهط", "آخر الأخبار", "كل الأخبار"]);

  return (
    <nav
      className="scroll-row -mx-4 px-4 sm:mx-0 sm:flex sm:flex-wrap sm:justify-between sm:gap-3 sm:px-0"
      aria-label={tr("الأقسام")}
    >
      {combined.map((t, idx) => {
        const Icon = ICON_MAP[t.icon] ?? Newspaper;
        const isLiveTile = t.to === "/sports-news" || t.icon === "tv";
        const cleanLbl = t.label.trim();
        const isCustomNewsSec =
          t.to.includes("?cat=") ||
          t.to.includes("?q=") ||
          (t.to === "/news" && Boolean(cleanLbl) && !GENERAL_NEWS_LABELS.has(cleanLbl));
        const resolvedCat = t.to.includes("?cat=")
          ? decodeURIComponent(t.to.split("?cat=")[1] ?? cleanLbl)
          : cleanLbl || decodeURIComponent(t.to.split("?q=")[1] ?? "");
        const destTo = (isCustomNewsSec ? "/news" : t.to.split("?")[0] || "/") as "/";
        const destSearch = isCustomNewsSec ? ({ cat: resolvedCat } as never) : undefined;
        return (
          <Link
            key={`${t.to}-${cleanLbl}-${idx}`}
            to={destTo}
            search={destSearch}
            className="tile relative sm:flex-1"
          >
            <span
              className={`tile-icon relative sm:w-full ${
                isLiveTile && liveTileGlow ? "ring-2 ring-[#DC2626]/40" : ""
              }`}
            >
              <Icon className="size-6 sm:size-7" aria-hidden />
              {isLiveTile && liveTileGlow ? (
                <span
                  className={`absolute top-1.5 start-1.5 size-2.5 rounded-full bg-[#DC2626] ${
                    hasLiveMatch ? "animate-ping" : ""
                  }`}
                />
              ) : null}
            </span>
            <span className={isLiveTile && liveTileGlow ? "font-extrabold text-[#DC2626]" : ""}>
              {t.to === "/haraj" ? trv(st.texts.harajNav) : trSecLabel(t.label)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function HomeQuickLinks() {
  const links = (useSiteSettings().quickLinks ?? []).filter(
    (l) =>
      l.id !== "tilelive" &&
      l.id !== "slidercfg" &&
      l.id !== "topbarcfg" &&
      l.id !== "botbarcfg" &&
      l.id !== "botbarcss" &&
      l.id !== "txsecscfg" &&
      l.id !== "busemergcfg" &&
      !l.id.startsWith("sec") &&
      l.subtitle !== " مَخفي",
  );
  if (!links.length) return null;
  return (
    <section aria-label={tr("روابط سريعة")}>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {links.map((l) => {
          const external = /^https?:/.test(l.url);
          return (
            <li key={l.id}>
              <a
                href={l.url}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="stamp press flex h-full items-center gap-3 p-3"
              >
                {l.emoji ? <span className="icon-badge text-2xl">{trv(l.emoji)}</span> : null}
                <span className="min-w-0">
                  <span className="block font-bold leading-snug">{trv(l.title)}</span>
                  {l.subtitle && l.subtitle !== "قسم في الرئيسية" ? (
                    <span className="text-sm font-semibold text-muted">{trv(l.subtitle)}</span>
                  ) : null}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Re-render-safe AdSense Banner component for React 19 / TanStack Start + Sticky Desktop Sidebar. */
function AdBanner({
  dataAdSlot,
  dataAdClient,
  dataAdFormat = "auto",
  minHeight = 120,
  className = "",
}: {
  dataAdSlot: string;
  dataAdClient?: string;
  dataAdFormat?: "auto" | "fluid" | "rectangle" | "vertical" | "horizontal";
  minHeight?: number;
  className?: string;
}) {
  const st = useSiteSettings();
  const client = (dataAdClient || st.google?.adsensePub || "ca-pub-9063892572843254").trim();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const insRef = useRef<HTMLModElement | null>(null);
  const pushedSlotRef = useRef<string | null>(null);
  const [unfilled, setUnfilled] = useState(false);

  useEffect(() => {
    const containerEl = containerRef.current;
    const insEl = insRef.current;
    if (!containerEl || !insEl || typeof window === "undefined" || !client || !dataAdSlot) return;

    if (
      pushedSlotRef.current === dataAdSlot ||
      insEl.getAttribute("data-adsbygoogle-status") === "done" ||
      insEl.getAttribute("data-ad-status") === "filled"
    ) {
      return;
    }

    let rafId: number | null = null;
    let ro: ResizeObserver | null = null;
    let mo: MutationObserver | null = null;

    const pushAdSafely = () => {
      if (!insRef.current || !containerRef.current) return;
      if (
        pushedSlotRef.current === dataAdSlot ||
        insRef.current.getAttribute("data-adsbygoogle-status") === "done" ||
        insRef.current.innerHTML.trim().length > 0
      ) {
        return;
      }
      if (containerRef.current.getBoundingClientRect().width <= 0) return;
      try {
        pushedSlotRef.current = dataAdSlot;
        const win = window as unknown as { adsbygoogle?: Record<string, unknown>[] };
        (win.adsbygoogle = win.adsbygoogle || []).push({});
      } catch {
        /* ignore adblocker or duplicate push */
      }
    };

    mo = new MutationObserver(() => {
      const status = insEl.getAttribute("data-ad-status");
      if (status === "unfilled") setUnfilled(true);
      else if (status === "filled") setUnfilled(false);
    });
    mo.observe(insEl, {
      attributes: true,
      attributeFilter: ["data-ad-status", "data-adsbygoogle-status"],
    });

    if (containerEl.getBoundingClientRect().width > 0) {
      rafId = window.requestAnimationFrame(pushAdSafely);
    } else if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) {
            pushAdSafely();
            ro?.disconnect();
            break;
          }
        }
      });
      ro.observe(containerEl);
    }

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      ro?.disconnect();
      mo?.disconnect();
    };
  }, [client, dataAdSlot]);

  if (!st.google?.adsenseEnabled || !client || unfilled) return null;

  return (
    <aside
      ref={containerRef}
      aria-label={tr("إعلان")}
      className={`overflow-hidden rounded-3xl border border-line bg-paper p-3 shadow-2xs ${className}`}
    >
      <div className="mb-1.5 flex items-center justify-between px-1 text-[11px] font-bold text-muted">
        <span>{tr("إعلان")}</span>
        <span className="text-[10px] opacity-75">{trv(st.texts.siteName)}</span>
      </div>
      <div
        className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-surface/60"
        style={{ minHeight: `${minHeight}px` }}
      >
        <ins
          ref={insRef}
          className="adsbygoogle block w-full"
          style={{ display: "block", minHeight: `${minHeight}px`, width: "100%" }}
          data-ad-client={client}
          data-ad-slot={dataAdSlot}
          data-ad-format={dataAdFormat}
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  );
}

/** Injects Google AMP Auto Ads (<script custom-element="amp-auto-ads"> + <amp-auto-ads>) when enabled in /admin. */
function AmpAutoAdsBridge() {
  const st = useSiteSettings();
  const sliderItem = (st.quickLinks ?? []).find((q) => q.id === "slidercfg");
  const ampEnabled = !(sliderItem?.title ?? "").includes("amp:0");
  const pub = st.google?.adsensePub?.trim();

  useEffect(() => {
    if (!ampEnabled || !pub || typeof document === "undefined") return;
    const id = "amp-auto-ads-script";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.async = true;
      s.setAttribute("custom-element", "amp-auto-ads");
      s.src = "https://cdn.ampproject.org/v0/amp-auto-ads-0.1.js";
      document.head.appendChild(s);
    }
  }, [ampEnabled, pub]);

  if (!ampEnabled || !pub) return null;
  return (
    <div
      aria-hidden
      dangerouslySetInnerHTML={{
        __html: `<amp-auto-ads type="adsense" data-ad-client="${pub}"></amp-auto-ads>`,
      }}
    />
  );
}

/** Customizable Mobile Bottom Bar with preset styles, custom code/builder, and preserved order. */
function fromBotBase64Url(b64u: string): string {
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

const HOME_NAV_TO_BOT: Record<string, { icon: string; label: string; to: string }> = {
  "/": { icon: "home", label: "الرئيسية", to: "/" },
  "/news": { icon: "news", label: "الأخبار", to: "/news" },
  "/buses": { icon: "bus", label: "باصات", to: "/buses" },
  "/directory": { icon: "pin", label: "الدليل", to: "/directory" },
  "/haraj": { icon: "ad", label: "حراج", to: "/haraj" },
  "/today": { icon: "siren", label: "اليوم", to: "/today" },
  "/store": { icon: "store", label: "المتجر", to: "/store" },
};

function CustomBottomBar() {
  const st = useSiteSettings();
  const botItem = (st.quickLinks ?? []).find((q) => q.id === "botbarcfg");
  const cssItem = (st.quickLinks ?? []).find((q) => q.id === "botbarcss");

  const { style, btns } = useMemo(() => {
    if (!botItem || !botItem.url.startsWith("/__bot?")) {
      const navOrdered = (st.nav ?? [])
        .filter((n) => n.visible)
        .map((n) => HOME_NAV_TO_BOT[n.id])
        .filter(Boolean);
      return {
        style: "classic",
        btns: navOrdered.length > 0 ? navOrdered : DEFAULT_BOT_TILES,
      };
    }
    const rawStyle = botItem.title.trim();
    const validStyle =
      rawStyle === "floating" ||
      rawStyle === "dark" ||
      rawStyle === "dock" ||
      rawStyle === "minimal" ||
      rawStyle === "neon" ||
      rawStyle === "glass" ||
      rawStyle === "custom" ||
      rawStyle === "hidden"
        ? rawStyle
        : "classic";
    const labels = (botItem.subtitle ?? "").split("|");
    const pairs = botItem.url.slice(7).split("|").filter(Boolean);
    const parsedBtns = pairs.map((p, idx) => {
      const colon = p.indexOf(":");
      const icon = colon > 0 ? p.slice(0, colon) : "home";
      const rawTo = colon > 0 ? p.slice(colon + 1) : p;
      const to = rawTo.replace(/%20/g, " ");
      return {
        icon: icon || "home",
        to: to || "/",
        label: (labels[idx] ?? "").trim() || "زر",
      };
    });
    return {
      style: validStyle,
      btns: parsedBtns.length > 0 ? parsedBtns : DEFAULT_BOT_TILES,
    };
  }, [botItem, st.nav]);

  const customCfg = useMemo(() => {
    let bg = "#111827";
    let fg = "#9ca3af";
    let ab = "#f2c94c";
    let af = "#111827";
    let r = 24;
    let m = 10;
    let rawCss = "";
    if (cssItem) {
      for (const part of (cssItem.title ?? "").split("|")) {
        if (part.startsWith("bg:")) bg = part.slice(3) || bg;
        else if (part.startsWith("fg:")) fg = part.slice(3) || fg;
        else if (part.startsWith("ab:")) ab = part.slice(3) || ab;
        else if (part.startsWith("af:")) af = part.slice(3) || af;
        else if (part.startsWith("r:")) r = Number(part.slice(2)) || 0;
        else if (part.startsWith("m:")) m = Number(part.slice(2)) || 0;
      }
      const b64Part1 = cssItem.url?.startsWith("/__bcss?") ? cssItem.url.slice(8) : "";
      const b64Part2 = cssItem.subtitle && cssItem.subtitle !== "css" ? cssItem.subtitle : "";
      if (b64Part1) rawCss = fromBotBase64Url(b64Part1 + b64Part2);
    }
    return { bg, fg, ab, af, r, m, rawCss };
  }, [cssItem]);

  if (style === "hidden") {
    return (
      <style>{`nav.edge-t.fixed.bottom-0:not(.custom-botbar) { display: none !important; }`}</style>
    );
  }

  const userExtraCss = customCfg.rawCss.trim()
    ? customCfg.rawCss.includes("{")
      ? customCfg.rawCss
      : `.custom-botbar { ${customCfg.rawCss} }`
    : "";

  const navWrapCls =
    style === "floating"
      ? "custom-botbar fixed inset-x-3 bottom-3 z-40 rounded-full border border-line bg-paper/95 px-2 py-1.5 shadow-xl backdrop-blur-md md:hidden"
      : style === "dark"
        ? "custom-botbar fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#111827]/95 pb-[env(safe-area-inset-bottom)] text-white shadow-xl backdrop-blur-md md:hidden"
        : style === "dock"
          ? "custom-botbar fixed inset-x-2 bottom-2 z-40 rounded-3xl border border-line bg-paper/95 p-1.5 shadow-lg backdrop-blur-md md:hidden"
          : style === "minimal"
            ? "custom-botbar fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
            : style === "neon"
              ? "custom-botbar fixed inset-x-3 bottom-3 z-40 rounded-3xl border border-[#f2c94c]/60 bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] px-2 py-1.5 text-white shadow-[0_10px_30px_rgba(242,201,76,0.25)] backdrop-blur-md md:hidden"
              : style === "glass"
                ? "custom-botbar fixed inset-x-3 bottom-3 z-40 rounded-3xl border border-white/40 bg-white/75 px-2 py-1.5 text-ink shadow-[0_8px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl md:hidden"
                : style === "custom"
                  ? "custom-botbar fixed z-40 px-2 py-1.5 shadow-xl backdrop-blur-md md:hidden"
                  : "custom-botbar edge-t fixed inset-x-0 bottom-0 z-40 bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden";

  const customNavStyle =
    style === "custom"
      ? {
          backgroundColor: customCfg.bg,
          color: customCfg.fg,
          borderRadius: `${customCfg.r}px`,
          bottom: `${customCfg.m}px`,
          left: customCfg.m > 0 ? `${customCfg.m}px` : "0px",
          right: customCfg.m > 0 ? `${customCfg.m}px` : "0px",
        }
      : undefined;

  return (
    <>
      <style>{`nav.edge-t.fixed.bottom-0:not(.custom-botbar) { display: none !important; }
${userExtraCss}`}</style>
      <nav className={navWrapCls} style={customNavStyle} aria-label={tr("التنقل السفلي")}>
        <div className="mx-auto flex max-w-xl items-center justify-around">
          {btns.map((item, idx) => {
            const Icon = ICON_MAP[item.icon] ?? House;
            const hasQuery = item.to.includes("?q=");
            const linkTo = (hasQuery ? item.to.split("?q=")[0] || "/" : item.to) as "/";
            const linkSearch = hasQuery
              ? { q: decodeURIComponent(item.to.split("?q=")[1] ?? "") }
              : undefined;
            const exact = item.to === "/" && !hasQuery;
            const isActive = exact;
            if (style === "custom") {
              return (
                <Link
                  key={`${item.to}-${idx}`}
                  to={linkTo}
                  search={linkSearch}
                  activeOptions={{ exact }}
                  data-active={isActive ? "true" : "false"}
                  className="custom-botbar-item flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-extrabold transition"
                  style={
                    isActive
                      ? {
                          backgroundColor: customCfg.ab,
                          color: customCfg.af,
                          borderRadius: `${Math.max(8, customCfg.r - 6)}px`,
                        }
                      : { color: customCfg.fg }
                  }
                >
                  <Icon className="size-5" aria-hidden />
                  <span className="truncate">{trSecLabel(item.label)}</span>
                </Link>
              );
            }
            if (style === "dark" || style === "neon") {
              return (
                <Link
                  key={`${item.to}-${idx}`}
                  to={linkTo}
                  search={linkSearch}
                  activeOptions={{ exact }}
                  className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-bold text-white/70 transition"
                  activeProps={{
                    className:
                      "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-extrabold text-[#FDB700]",
                  }}
                >
                  <Icon className="size-5" aria-hidden />
                  <span className="truncate">{trSecLabel(item.label)}</span>
                </Link>
              );
            }
            if (style === "floating" || style === "glass") {
              return (
                <Link
                  key={`${item.to}-${idx}`}
                  to={linkTo}
                  search={linkSearch}
                  activeOptions={{ exact }}
                  className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 text-[11px] font-bold text-muted transition"
                  activeProps={{
                    className:
                      "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full bg-ink py-1.5 text-[11px] font-extrabold text-paper shadow-xs",
                  }}
                >
                  <Icon className="size-4" aria-hidden />
                  <span className="truncate">{trSecLabel(item.label)}</span>
                </Link>
              );
            }
            if (style === "dock") {
              return (
                <Link
                  key={`${item.to}-${idx}`}
                  to={linkTo}
                  search={linkSearch}
                  activeOptions={{ exact }}
                  className="flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-1.5 text-[11px] font-bold text-muted transition"
                  activeProps={{
                    className:
                      "flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl bg-primary py-1.5 text-[11px] font-extrabold text-ink shadow-xs",
                  }}
                >
                  <span className="grid size-8 place-items-center rounded-xl bg-surface/80">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="truncate">{trSecLabel(item.label)}</span>
                </Link>
              );
            }
            if (style === "minimal") {
              return (
                <Link
                  key={`${item.to}-${idx}`}
                  to={linkTo}
                  search={linkSearch}
                  activeOptions={{ exact }}
                  className="flex flex-1 flex-col items-center justify-center gap-0.5 border-t-2 border-transparent py-1.5 text-[11px] font-bold text-muted transition"
                  activeProps={{
                    className:
                      "flex flex-1 flex-col items-center justify-center gap-0.5 border-t-2 border-ink py-1.5 text-[11px] font-extrabold text-ink",
                  }}
                >
                  <Icon className="size-4" aria-hidden />
                  <span className="truncate">{trSecLabel(item.label)}</span>
                </Link>
              );
            }
            return (
              <Link
                key={`${item.to}-${idx}`}
                to={linkTo}
                search={linkSearch}
                activeOptions={{ exact }}
                className="tabbar-link"
              >
                <span className="tab-icon">
                  <Icon className="size-5" aria-hidden />
                </span>
                {item.to === "/haraj" ? trv(st.texts.harajNav) : trSecLabel(item.label)}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}


/** Animated Top Weather & Prayer Bar — Harmonious single-row card matching site design & Image 2 RTL order. */
function AnimatedWeatherPrayerBar({
  weather,
  serverNow,
}: {
  weather: Weather | null;
  serverNow: number;
}) {
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);

  const next = useMemo(() => nextPrayer(now), [now]);

  const { localHour, timeStr } = useMemo(() => {
    try {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jerusalem",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).formatToParts(new Date(now));
      const hh = parts.find((p) => p.type === "hour")?.value ?? "12";
      const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
      return { localHour: Number(hh), timeStr: `${hh}:${mm}` };
    } catch {
      return { localHour: 12, timeStr: "12:00" };
    }
  }, [now]);

  const isNight = weather ? !weather.isDay : localHour >= 18 || localHour < 6;
  const kind = weather ? weatherKind(weather.code) : "clear";
  const isRainy = kind === "rain" || kind === "storm" || (weather?.rainChance ?? 0) >= 40;
  const isCloudy = kind === "partly" || kind === "cloudy" || kind === "fog";

  return (
    <div className="-mt-1 w-full sm:mt-0">
      <style>{`
        @keyframes rpSunSpin {
          0% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.08); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes rpMoonFloat {
          0%, 100% { transform: translateY(0px) rotate(-5deg); }
          50% { transform: translateY(-2px) rotate(4deg); }
        }
        @keyframes rpStarTwinkle {
          0%, 100% { opacity: 0.35; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @keyframes rpCloudDrift {
          0%, 100% { transform: translateX(0px); }
          50% { transform: translateX(2.5px); }
        }
        @keyframes rpRainBounce {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(2px); }
        }
        @keyframes rpWindWave {
          0%, 100% { transform: translateX(-1px); opacity: 0.75; }
          50% { transform: translateX(1.5px); opacity: 1; }
        }
      `}</style>

      {/* Single-Row Harmonious Card — Fits 100% on one line on mobile & desktop in exact Image 2 RTL order */}
      <div className="stamp flex flex-nowrap items-center justify-between gap-1.5 overflow-x-auto rounded-2xl border border-line bg-paper px-2.5 py-2 text-[10.5px] font-bold text-ink [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-3 sm:px-4 sm:py-2.5 sm:text-xs">
        {/* Right Side (in RTL): Weather Icon + Temp + Condition + Wind + Day/Night Live Time */}
        <Link
          to="/today"
          className="inline-flex min-w-0 shrink-0 items-center gap-1 whitespace-nowrap transition hover:opacity-80 sm:gap-2"
          aria-label={
            weather
              ? tr("الطقس في رهط: {0} درجة، {1}", weather.temp, weatherLabel(weather.code))
              : tr("الطقس في رهط")
          }
        >
          <span className="relative inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs leading-none sm:size-6 sm:text-sm">
            {isRainy ? (
              <span style={{ animation: "rpRainBounce 1.4s infinite ease-in-out" }}>🌧️</span>
            ) : isNight ? (
              <span className="inline-flex items-center">
                <span style={{ animation: "rpMoonFloat 3.2s infinite ease-in-out" }}>🌙</span>
                <span
                  className="-ms-1 -mt-1 text-[8px]"
                  style={{ animation: "rpStarTwinkle 2.2s infinite ease-in-out" }}
                >
                  ✨
                </span>
              </span>
            ) : isCloudy ? (
              <span style={{ animation: "rpCloudDrift 3.5s infinite ease-in-out" }}>⛅</span>
            ) : (
              <span style={{ animation: "rpSunSpin 10s infinite linear" }}>☀️</span>
            )}
          </span>

          {weather ? (
            <>
              <bdi dir="ltr" className="text-[11px] font-extrabold text-ink sm:text-sm">
                {trv(weather.temp)}°
              </bdi>
              <span className="font-bold text-ink/85">{weatherLabel(weather.code)}</span>

              {weather.wind !== null ? (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] font-bold text-muted sm:text-xs"
                  title={tr("سرعة الرياح")}
                >
                  <span
                    className="inline-block"
                    style={{ animation: "rpWindWave 2s infinite ease-in-out" }}
                  >
                    💨
                  </span>
                  <bdi dir="ltr">{trv(weather.wind)}</bdi>
                  <span>{tr("كم/س")}</span>
                </span>
              ) : null}

              {weather.rainChance !== null && weather.rainChance > 0 ? (
                <span
                  className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary-ink sm:text-xs"
                  title={tr("احتمال المطر")}
                >
                  <span style={{ animation: "rpRainBounce 1.6s infinite ease-in-out" }}>💧</span>
                  <bdi dir="ltr">{trv(weather.rainChance)}%</bdi>
                </span>
              ) : null}
            </>
          ) : (
            <span className="font-extrabold">{tr("طقس رهط")}</span>
          )}

          {/* Day / Night Live Time Indicator */}
          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-muted sm:gap-1 sm:text-xs">
            <span className="text-line">·</span>
            <span>{isNight ? tr("ليلاً") : tr("نهاراً")}</span>
            <bdi dir="ltr" className="font-mono font-extrabold text-ink">
              {timeStr}
            </bdi>
          </span>
        </Link>

        {/* Subtle Vertical Divider */}
        <span className="h-3.5 w-px shrink-0 bg-line" aria-hidden />

        {/* Left Side (in RTL): Mosque Icon + Next Prayer Name & Time + Countdown */}
        <Link
          to="/today"
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap transition hover:opacity-80 sm:gap-1.5"
        >
          <span
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs leading-none sm:size-6 sm:text-sm"
            style={{ animation: "rpMoonFloat 3.6s infinite ease-in-out" }}
            aria-hidden
          >
            🕌
          </span>
          <span className="font-extrabold text-ink">
            {trv(next.name)}{" "}
            <bdi dir="ltr" className="text-primary-ink">
              {formatPrayerTime(next.at)}
            </bdi>
          </span>
          <span className="text-[10px] font-semibold text-muted sm:text-xs">
            {countdownAr(next.at - now)}
          </span>
        </Link>
      </div>
    </div>
  );
}


/* -------------------------------------------------------------------------- */
/* Interactive Rahat Post & Services Guide Hub                                */
/* -------------------------------------------------------------------------- */

type InteractivePostBranch = {
  id: string;
  name: string;
  officialName: string;
  kind: string;
  badge: string;
  address: string;
  phone?: string;
  hours: { dayIdx: number[]; label: string; ranges: [number, number][] }[];
  hoursDisplay: { day: string; time: string }[];
  services: string[];
  note: string;
  url: string;
  appointmentUrl?: string;
  directionsUrl: string;
};

const RAHAT_POST_BRANCHES: InteractivePostBranch[] = [
  {
    id: "209",
    name: "فرع صلاح الدين",
    officialName: "סאלח אדין רהט (209)",
    kind: "فرع بريد وبنك البريد",
    badge: "فرع #209",
    address: "شارع صلاح الدين 237، بجانب مدرسة صلاح الدين، رهط",
    phone: "171",
    hours: [
      { dayIdx: [0, 1], label: "08:00–16:00", ranges: [[480, 960]] },
      { dayIdx: [2], label: "08:00–15:00، 16:00–18:00", ranges: [[480, 900], [960, 1080]] },
      { dayIdx: [3], label: "08:00–18:00", ranges: [[480, 1080]] },
      { dayIdx: [4], label: "08:00–15:00", ranges: [[480, 900]] },
    ],
    hoursDisplay: [
      { day: "الأحد والاثنين", time: "08:00–16:00" },
      { day: "الثلاثاء", time: "08:00–15:00، 16:00–18:00" },
      { day: "الأربعاء", time: "08:00–18:00" },
      { day: "الخميس", time: "08:00–15:00" },
      { day: "الجمعة والسبت", time: "مغلق" },
    ],
    services: ["خدمات مالية (بنك البريد)", "دفع فواتير وأرنونا", "بريد دولي ومحلي", "تأمينات"],
    note: "يعمل بحجز دور مسبق عبر موقع البريد أو الاتصال على 171.",
    url: "https://doar.israelpost.co.il/branch/209",
    appointmentUrl: "https://israelpost.co.il/%D7%A9%D7%99%D7%A8%D7%95%D7%AA%D7%99%D7%9D/%D7%90%D7%99%D7%AA%D7%95%D7%A8-%D7%A1%D7%A0%D7%99%D7%A4%D7%99%D7%9D-%D7%95%D7%96%D7%99%D7%9E%D7%95%D7%9F-%D7%AA%D7%95%D7%A8-%D7%91%D7%A7%D7%9C%D7%99%D7%A7/%D7%96%D7%99%D7%9E%D7%95%D7%9F-%D7%AA%D7%95%D7%A8-%D7%95%D7%91%D7%99%D7%98%D7%95%D7%97?no=209",
    directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=31.399078,34.748416",
  },
  {
    id: "237",
    name: "الوحدة المركزية (السوق)",
    officialName: "היחידה המרכזית רהט (237)",
    kind: "فرع بريد مركزي وبنك البريد",
    badge: "فرع #237",
    address: "المركز التجاري، السوق البلدي، وسط مدينة رهط",
    phone: "171",
    hours: [
      { dayIdx: [0, 2], label: "08:00–18:00", ranges: [[480, 1080]] },
      { dayIdx: [1, 3, 4], label: "08:00–15:00", ranges: [[480, 900]] },
    ],
    hoursDisplay: [
      { day: "الأحد والثلاثاء", time: "08:00–18:00" },
      { day: "الاثنين والأربعاء والخميس", time: "08:00–15:00" },
      { day: "الجمعة والسبت", time: "مغلق" },
    ],
    services: ["خدمات مالية (بنك البريد)", "دفع فواتير وأرنونا", "بطاقات مشحونة وعملات", "بريد دولي ومحلي"],
    note: "يعمل بحجز دور مسبق · فاكس الفرع: 08-6114077.",
    url: "https://doar.israelpost.co.il/branch/237",
    appointmentUrl: "https://israelpost.co.il/%D7%A9%D7%99%D7%A8%D7%95%D7%AA%D7%99%D7%9D/%D7%90%D7%99%D7%AA%D7%95%D7%A8-%D7%A1%D7%A0%D7%99%D7%A4%D7%99%D7%9D-%D7%95%D7%96%D7%99%D7%9E%D7%95%D7%9F-%D7%AA%D7%95%D7%A8-%D7%91%D7%A7%D7%9C%D7%99%D7%A7/%D7%96%D7%99%D7%9E%D7%95%D7%9F-%D7%AA%D7%95%D7%A8-%D7%95%D7%91%D7%99%D7%98%D7%95%D7%97?no=237",
    directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=31.394548,34.753934",
  },
  {
    id: "297",
    name: "فرع المختار (مقابل البلدية)",
    officialName: "אל מוכתר רהט (297)",
    kind: "فرع بريد وبنك البريد",
    badge: "فرع #297",
    address: "مقابل مبنى بلدية رهط",
    phone: "171",
    hours: [
      { dayIdx: [1], label: "08:00–18:00", ranges: [[480, 1080]] },
      { dayIdx: [0, 2, 3, 4], label: "08:00–14:00", ranges: [[480, 840]] },
    ],
    hoursDisplay: [
      { day: "الاثنين", time: "08:00–18:00" },
      { day: "الأحد، الثلاثاء، الأربعاء، الخميس", time: "08:00–14:00" },
      { day: "الجمعة والسبت", time: "مغلق" },
    ],
    services: ["خدمات مالية (بنك البريد)", "دفع فواتير وأرنونا", "بريد دولي ومحلي", "تأمينات"],
    note: "يعمل بحجز دور مسبق عبر موقع البريد أو الهاتف 171.",
    url: "https://doar.israelpost.co.il/branch/297",
    appointmentUrl: "https://israelpost.co.il/%D7%A9%D7%99%D7%A8%D7%95%D7%AA%D7%99%D7%9D/%D7%90%D7%99%D7%AA%D7%95%D7%A8-%D7%A1%D7%A0%D7%99%D7%A4%D7%99%D7%9D-%D7%95%D7%96%D7%99%D7%9E%D7%95%D7%9F-%D7%AA%D7%95%D7%A8-%D7%91%D7%A7%D7%9C%D7%99%D7%A7/%D7%96%D7%99%D7%9E%D7%95%D7%9F-%D7%AA%D7%95%D7%A8-%D7%95%D7%91%D7%99%D7%98%D7%95%D7%97?no=297",
    directionsUrl: "https://www.google.com/maps/search/?api=1&query=%D7%93%D7%95%D7%90%D7%A8%20%D7%90%D7%9C%20%D7%9E%D7%95%D7%9B%D7%AA%D7%A8%20%D7%A8%D7%94%D7%98",
  },
  {
    id: "3795",
    name: "الفارس موبايل (استلام طرود)",
    officialName: "אלפארס מובייל (3795)",
    kind: "مركز تسليم طرود فقط",
    badge: "نقطة #3795",
    address: "شارع صلاح الدين 239، رهط",
    hours: [
      { dayIdx: [0, 1, 2, 3, 4], label: "12:00–20:00", ranges: [[720, 1200]] },
      { dayIdx: [5], label: "09:00–12:00", ranges: [[540, 720]] },
    ],
    hoursDisplay: [
      { day: "الأحد–الخميس", time: "12:00–20:00" },
      { day: "الجمعة", time: "09:00–12:00" },
      { day: "السبت", time: "مغلق" },
    ],
    services: ["استلام الطرود والرسائل فقط (איסוף בלבד)"],
    note: "نقطة مخصصة لاستلام الطرود المسجلة (لا تشمل دفع الفواتير أو بنك البريد).",
    url: "https://doar.israelpost.co.il/branch/3795",
    directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=31.394312,34.74261",
  },
];

function getBranchLiveStatus(branch: InteractivePostBranch, nowMs: number): {
  isOpen: boolean;
  todayHours: string;
} {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(nowMs));
    const wk = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
    const hr = Number(parts.find((p) => p.type === "hour")?.value ?? 10);
    const mn = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayIdx = dayMap[wk] ?? 0;
    const mins = (hr === 24 ? 0 : hr) * 60 + mn;
    const rule = branch.hours.find((h) => h.dayIdx.includes(dayIdx));
    if (!rule) return { isOpen: false, todayHours: "مغلق اليوم" };
    const isOpen = rule.ranges.some(([start, end]) => mins >= start && mins < end);
    return { isOpen, todayHours: rule.label };
  } catch {
    return { isOpen: false, todayHours: "08:00–15:00" };
  }
}

function InteractiveRahatServicesHub({ now }: { now: number }) {
  const [mainTab, setMainTab] = useState<"post" | "municipality" | "health" | "transport" | null>(null);
  const [postSubTab, setPostSubTab] = useState<"branches" | "pay" | "track" | "bank">("branches");
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [showAllHours, setShowAllHours] = useState<boolean>(false);
  const [trackingCode, setTrackingCode] = useState<string>("");
  const [selectedPayIdx, setSelectedPayIdx] = useState<number | null>(null);
  const [busFilter, setBusFilter] = useState<"city" | "intercity">("city");

  const activeBranch = selectedBranchId
    ? RAHAT_POST_BRANCHES.find((b) => b.id === selectedBranchId) ?? null
    : null;
  const activeStatus = activeBranch ? getBranchLiveStatus(activeBranch, now) : null;

  const paymentOptions = [
    {
      icon: "🏠",
      title: "الأرنونا والمياه (بلدية رهط)",
      desc: "تسديد ضريبة الأرنونا وفواتير المياه أونلاين ببطاقة الاعتماد أو في أي فرع بريد بالقسيمة.",
      steps: [
        "للدفع الفوري عبر بوابة بلدية رهط (PayBill): جهّز رقم الهوية ورقم الزبون/القسيمة.",
        "للدفع في البريد أو تقسيط المبلغ (3 إلى 36 دفعة): أحضر قسيمة الدفع الأصلية.",
        "للاستفسار أو التسويات: قسم الجباية في بلدية رهط على الرقم 08-9914982.",
      ],
      primaryLabel: "دفع الأرنونا والمياه أونلاين ↗",
      primaryHref: "https://www.paybill.co.il/Payment/WaterPayment?p=165",
      secondaryLabel: "دفع الأرنونا عبر موقع البريد ↗",
      secondaryHref: "https://doar.israelpost.co.il/content/city-tax-payment/",
    },
    {
      icon: "⚡",
      title: "الكهرباء والماء والغاز وبيزك",
      desc: "دفع قسائم شركة الكهرباء وشركات المياه والاتصالات في الفرع أو بتصوير القسيمة أونلاين.",
      steps: [
        "الكهرباء: تحتاج رقم العقد ورقم الفاتورة الظاهرين على القسيمة.",
        "يمكن تقسيط الفواتير من 300 ₪ حتى 100,000 ₪ ببطاقة اعتماد (3–36 دفعة).",
        "يُحسب الدفع في نفس يوم العمل حتى الساعة 18:30 (الأحد–الخميس).",
      ],
      primaryLabel: "دفع قسيمة أونلاين (موقع البريد) ↗",
      primaryHref: "https://doar.israelpost.co.il/voucher",
      secondaryLabel: "شرح تقسيط الفواتير ببطاقة الاعتماد ↗",
      secondaryHref: "https://doar.israelpost.co.il/content/paymet-by-credit-card/",
    },
    {
      icon: "🚗",
      title: "ترخيص السيارة ومخالفات السير",
      desc: "رسوم رخصة المركبة ورخصة السياقة وغرامات الشرطة ومخالفات السير.",
      steps: [
        "رسوم وزارة المواصلات (ترخيص السيارة وفحص السياقة) تُدفع بالقسيمة في البريد أو أونلاين.",
        "مخالفات السير وغرامات الشرطة تُدفع عبر بوابة الدفع الحكومية أو في فروع البريد.",
        "إذا فقدت ورقة المخالفة اتصل بمركز الجباية: *35592 أو 073-2055000.",
      ],
      primaryLabel: "دفع مخالفة السير (gov.il) ↗",
      primaryHref: "https://www.gov.il/ar/service/police_fine_payment",
      secondaryLabel: "بوابة الدفع المباشر للمخالفات ↗",
      secondaryHref: "https://ecom.gov.il/voucherspa/input/318",
    },
    {
      icon: "🏛️",
      title: "التأمين الوطني والضرائب",
      desc: "دفعات التأمين الوطني (ביטוח לאומי)، ضريبة الدخل (מס הכנסה) وضريبة القيمة المضافة (מע״מ).",
      steps: [
        "تُقبل الشيكات من جميع البنوك في كافة فروع البريد برسوم شباك 4 ₪ فقط.",
        "بين 1 و14 من الشهر يمكن الدفع بشيك مؤجّل (شيك واحد لكل قسيمة).",
        "لأصحاب المصالح (أكثر من 10 قسائم): يتوفر مسار «مغلّف الأعمال» السريع.",
      ],
      primaryLabel: "دفع الضرائب في موقع البريد ↗",
      primaryHref: "https://doar.israelpost.co.il/content/tax-payment",
      secondaryLabel: "دفع القسائم الحكومية أونلاين ↗",
      secondaryHref: "https://doar.israelpost.co.il/voucher",
    },
  ];

  const activePay = selectedPayIdx !== null ? paymentOptions[selectedPayIdx] ?? null : null;

  const cityBuses = [
    { line: "1", route: "حي السلام (مستودع البلدية) ↔ الخزان / حطين" },
    { line: "2", route: "حي السلام (الدفيئات) ↔ الخضر / حي 31" },
    { line: "3", route: "محطة تافوح / السلام ↔ رفح / البوئي" },
    { line: "4 / 4أ", route: "المدينة المنورة (شمال غرب) ↔ الحديقة" },
    { line: "5", route: "خط دائري: حي صلاح الدين (مدرسة الهدى)" },
    { line: "6", route: "المدينة المنورة (الحديقة) ↔ صلاح الدين" },
  ];

  const intercityBuses = [
    { line: "450–455، 471", route: "رهط ↔ بئر السبع (مباشر من الأحياء)" },
    { line: "425", route: "رهط ↔ تل السبع" },
    { line: "40 / 423", route: "رهط ↔ كسيفة" },
    { line: "427", route: "رهط ↔ عرعرة النقب" },
    { line: "462", route: "رهط ↔ سديروت" },
    { line: "467", route: "رهط ↔ عسقلان" },
  ];

  return (
    <div className="stamp overflow-hidden border-2 border-primary/80 bg-gradient-to-b from-primary-soft/60 via-paper to-paper p-3.5 sm:p-4 shadow-sm">
      {/* Top 4 Main Service Category Tabs */}
      <div
        role="tablist"
        aria-label={tr("أقسام دليل البريد والخدمات في رهط")}
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {[
          { id: "post" as const, icon: "📮", title: "البريد وبنك البريد", sub: "4 فروع · دفع وتتبع" },
          { id: "municipality" as const, icon: "🏛️", title: "البلدية والأرنونا", sub: "الجباية · طوارئ 106" },
          { id: "health" as const, icon: "🏥", title: "الصحة والطوارئ", sub: "الإسعاف 101 · العيادات" },
          { id: "transport" as const, icon: "🚌", title: "باصات غاليم", sub: "خطوط 1–6 وبئر السبع" },
        ].map((tab) => {
          const active = mainTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMainTab((prev) => (prev === tab.id ? null : tab.id))}
              className={`press flex items-center gap-2.5 rounded-2xl border p-2.5 text-start transition-all ${
                active
                  ? "border-ink bg-ink text-paper shadow-sm"
                  : "border-line bg-paper/90 text-ink hover:border-primary"
              }`}
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl text-xl ${
                  active ? "bg-primary text-ink" : "bg-primary-soft text-ink"
                }`}
                aria-hidden
              >
                {tab.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-extrabold sm:text-sm">
                  {trv(tab.title)}
                </span>
                <span
                  className={`block truncate text-[11px] font-semibold ${
                    active ? "text-paper/75" : "text-muted"
                  }`}
                >
                  {trv(tab.sub)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: POST & POSTAL BANK */}
      {mainTab === "post" ? (
        <div className="mt-3.5 space-y-3">
          {/* Interactive Sub-navigation pills */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-surface/90 p-1.5">
            {[
              { id: "branches" as const, label: "📍 فروع رهط وساعات العمل" },
              { id: "pay" as const, label: "💳 دفع الفواتير والأرنونا" },
              { id: "track" as const, label: "📦 تتبع طرد بريدي" },
              { id: "bank" as const, label: "🏦 بنك البريد والمخصصات" },
            ].map((sub) => {
              const isSub = postSubTab === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setPostSubTab(sub.id)}
                  className={`press flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-extrabold transition sm:text-sm ${
                    isSub
                      ? "bg-primary text-ink shadow-2xs"
                      : "text-muted hover:bg-paper/60 hover:text-ink"
                  }`}
                >
                  {trv(sub.label)}
                </button>
              );
            })}
          </div>

          {/* Sub-view 1: Interactive Branches with Live Status */}
          {postSubTab === "branches" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {RAHAT_POST_BRANCHES.map((b) => {
                  const st = getBranchLiveStatus(b, now);
                  const isSel = activeBranch?.id === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setSelectedBranchId((prev) => (prev === b.id ? null : b.id));
                        setShowAllHours(false);
                      }}
                      className={`press flex flex-col justify-between rounded-2xl border p-2.5 text-start transition ${
                        isSel
                          ? "border-2 border-primary bg-primary-soft/80 shadow-2xs"
                          : "border-line bg-paper hover:border-primary/60"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-1">
                        <span className="rounded-lg bg-surface px-1.5 py-0.5 text-[10px] font-extrabold text-muted">
                          {trv(b.badge)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                            st.isOpen
                              ? "bg-[#16A34A]/15 text-[#15803D]"
                              : "bg-surface text-muted"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              st.isOpen ? "bg-[#16A34A] animate-pulse" : "bg-muted"
                            }`}
                          />
                          {st.isOpen ? tr("مفتوح الآن") : tr("مغلق")}
                        </span>
                      </div>
                      <p className="mt-1.5 truncate text-xs font-extrabold text-ink sm:text-sm">
                        {trv(b.name)}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] font-semibold text-muted" dir="ltr">
                        {trv(st.todayHours)}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Selected Branch Interactive Detail Card (appears after clicking a branch above) */}
              {activeBranch && activeStatus ? (
              <div className="rounded-2xl border border-line bg-paper p-3.5 shadow-2xs">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-extrabold text-ink sm:text-lg">
                        {trv(activeBranch.name)}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                          activeStatus.isOpen
                            ? "bg-[#16A34A]/15 text-[#15803D]"
                            : "bg-alert/10 text-alert"
                        }`}
                      >
                        <span
                          className={`size-2 rounded-full ${
                            activeStatus.isOpen ? "bg-[#16A34A] animate-ping" : "bg-alert"
                          }`}
                        />
                        {activeStatus.isOpen ? tr("مفتوح الآن") : tr("مغلق حالياً")}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-muted">
                      {trv(activeBranch.kind)} · <span lang="he">{activeBranch.officialName}</span>
                    </p>
                  </div>
                  <span className="rounded-xl bg-surface px-2.5 py-1 text-xs font-extrabold text-ink">
                    🕒 {tr("اليوم:")}{" "}
                    <bdi dir="ltr" className="text-primary-ink">
                      {trv(activeStatus.todayHours)}
                    </bdi>
                  </span>
                </div>

                <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-ink sm:text-sm">
                  <MapPin className="size-4 shrink-0 text-primary-ink" aria-hidden />
                  <span>{trv(activeBranch.address)}</span>
                </p>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {activeBranch.services.map((srv) => (
                    <span
                      key={srv}
                      className="rounded-xl border border-line bg-surface/60 px-2.5 py-1 text-[11px] font-bold text-ink"
                    >
                      ✓ {trv(srv)}
                    </span>
                  ))}
                </div>

                <p className="mt-2 text-xs font-semibold text-muted">💡 {trv(activeBranch.note)}</p>

                {/* Expandable Full Weekly Schedule */}
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAllHours((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-extrabold text-primary-ink underline decoration-1 underline-offset-4"
                  >
                    <span>
                      {showAllHours
                        ? tr("إخفاء جدول ساعات الأسبوع")
                        : tr("عرض جدول ساعات الأسبوع الكامل")}
                    </span>
                    <ChevronDown
                      className={`size-4 transition-transform ${showAllHours ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                  {showAllHours ? (
                    <div className="mt-2 rounded-xl bg-surface p-2.5 text-xs">
                      {activeBranch.hoursDisplay.map((row) => (
                        <div
                          key={row.day}
                          className="flex items-center justify-between border-b border-line/70 py-1.5 last:border-b-0"
                        >
                          <span className="font-semibold text-ink">{trv(row.day)}</span>
                          <span className="font-extrabold text-primary-ink" dir="ltr">
                            {trv(row.time)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Action Buttons */}
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <a
                    href={activeBranch.directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn py-2 text-xs font-extrabold"
                  >
                    📍 {tr("الاتجاهات للفرع")}
                  </a>
                  {activeBranch.appointmentUrl ? (
                    <a
                      href={activeBranch.appointmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost py-2 text-xs font-extrabold"
                    >
                      📅 {tr("حجز دور مسبق")}
                    </a>
                  ) : null}
                  <a
                    href="tel:171"
                    className="btn btn-ghost py-2 text-xs font-extrabold"
                  >
                    📞 {tr("اتصال بمركز 171")}
                  </a>
                  <a
                    href={activeBranch.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost py-2 text-xs font-extrabold"
                  >
                    🔗 {tr("صفحة الفرع الرسمية")}
                  </a>
                </div>
              </div>
              ) : null}
            </div>
          ) : null}

          {/* Sub-view 2: Interactive Bill & Tax Payment Assistant */}
          {postSubTab === "pay" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {paymentOptions.map((opt, idx) => {
                  const isSel = idx === selectedPayIdx;
                  return (
                    <button
                      key={opt.title}
                      type="button"
                      onClick={() => setSelectedPayIdx((prev) => (prev === idx ? null : idx))}
                      className={`press flex items-center gap-2 rounded-2xl border p-2.5 text-start transition ${
                        isSel
                          ? "border-2 border-primary bg-primary-soft font-extrabold text-ink"
                          : "border-line bg-paper font-bold text-ink hover:border-primary/60"
                      }`}
                    >
                      <span className="text-lg" aria-hidden>
                        {opt.icon}
                      </span>
                      <span className="line-clamp-2 text-xs">{trv(opt.title)}</span>
                    </button>
                  );
                })}
              </div>

              {activePay ? (
              <div className="rounded-2xl border border-line bg-paper p-3.5">
                <h3 className="text-base font-extrabold text-ink">
                  {activePay.icon} {trv(activePay.title)}
                </h3>
                <p className="mt-1 text-xs font-semibold text-muted sm:text-sm">
                  {trv(activePay.desc)}
                </p>
                <ul className="mt-2.5 space-y-1.5 text-xs font-semibold text-ink sm:text-sm">
                  {activePay.steps.map((st) => (
                    <li key={st} className="flex items-start gap-2">
                      <span className="mt-0.5 text-primary-ink">✓</span>
                      <span>{trv(st)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={activePay.primaryHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn py-2 text-xs font-extrabold"
                  >
                    {trv(activePay.primaryLabel)}
                  </a>
                  <a
                    href={activePay.secondaryHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost py-2 text-xs font-extrabold"
                  >
                    {trv(activePay.secondaryLabel)}
                  </a>
                </div>
              </div>
              ) : null}
            </div>
          ) : null}

          {/* Sub-view 3: Interactive Parcel Tracker */}
          {postSubTab === "track" ? (
            <div className="rounded-2xl border border-line bg-paper p-3.5 space-y-3">
              <div>
                <h3 className="text-base font-extrabold text-ink">
                  📦 {tr("تتبع الطرود والبعائث في بريد إسرائيل")}
                </h3>
                <p className="mt-0.5 text-xs font-semibold text-muted sm:text-sm">
                  {tr("أدخل رقم التتبع المكون من حروف وأرقام (مثل RR123456789IL أو RS...) لفتح حالة الطرد ومكان استلامه في رهط مباشرة:")}
                </p>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const clean = trackingCode.trim().toUpperCase();
                  const targetUrl = clean
                    ? `https://doar.israelpost.co.il/deliverytracker?itemcode=${encodeURIComponent(clean)}`
                    : "https://doar.israelpost.co.il/deliverytracker";
                  window.open(targetUrl, "_blank", "noopener,noreferrer");
                }}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <input
                  type="text"
                  dir="ltr"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="RR123456789IL / حزمة بريد..."
                  className="field flex-1 font-mono text-sm uppercase"
                />
                <button type="submit" className="btn shrink-0 px-5 py-2.5 text-xs font-extrabold sm:text-sm">
                  🔍 {tr("تتبع الطرد الآن ↗")}
                </button>
              </form>
              <div className="grid gap-2 sm:grid-cols-2 text-xs font-semibold">
                <div className="rounded-xl bg-surface p-2.5">
                  <p className="font-extrabold text-ink">📍 {tr("نقاط استلام الطرود في رهط:")}</p>
                  <p className="mt-0.5 text-muted">
                    {tr("توزّع الطرود حسب الحي في فرع صلاح الدين (209)، البريد المركزي (237)، فرع المختار (297)، أو نقطة الفارس موبايل (3795).")}
                  </p>
                </div>
                <div className="rounded-xl bg-surface p-2.5">
                  <p className="font-extrabold text-ink">🪪 {tr("ماذا تحضر عند الاستلام؟")}</p>
                  <p className="mt-0.5 text-muted">
                    {tr("بطاقة الهوية الأصلية + رقم الرسالة النصية (SMS) التي وصلتك من البريد مع رقم الرف/المرجع.")}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Sub-view 4: Postal Bank (Doar Finance) */}
          {postSubTab === "bank" ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-2xl border border-line bg-paper p-3">
                <h4 className="text-sm font-extrabold text-ink">
                  💵 {tr("استلام مخصصات التأمين الوطني (קצבאות)")}
                </h4>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {tr("صرف مخصصات التأمين الوطني والرفاه نقداً في فروع رهط (209، 237، 297) بإبراز بطاقة الهوية الأصلية فقط.")}
                </p>
                <a
                  href="https://doar.israelpost.co.il/content/social-security-benefits/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-extrabold text-primary-ink underline"
                >
                  {tr("تفاصيل استلام المخصصات ↗")}
                </a>
              </div>
              <div className="rounded-2xl border border-line bg-paper p-3">
                <h4 className="text-sm font-extrabold text-ink">
                  ⚡ {tr("تحويل فوري داخل البلاد «مزومان بزمان»")}
                </h4>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {tr("تحويل نقدي حتى 10,000 ₪ بدون حساب بنك يصل خلال دقائق بين أي فرعي بريد برقم الهوية ورقم المرجع.")}
                </p>
                <a
                  href="https://doar.israelpost.co.il/content/about-cash-on-time/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-extrabold text-primary-ink underline"
                >
                  {tr("خدمة مزومان بزمان ↗")}
                </a>
              </div>
              <div className="rounded-2xl border border-line bg-paper p-3">
                <h4 className="text-sm font-extrabold text-ink">
                  🌍 {tr("تحويل أموال للخارج وعملات أجنبية")}
                </h4>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {tr("تحويل نقدي دولي عبر DOAR MONEY TRANSFER أو لحساب بنكي عبر Eurogiro، وشراء العملات والبطاقات المشحونة.")}
                </p>
                <a
                  href="https://doar.israelpost.co.il/en/content/doar-money-transfer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-extrabold text-primary-ink underline"
                >
                  {tr("التحويل الدولي ↗")}
                </a>
              </div>
              <div className="rounded-2xl border border-line bg-paper p-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-ink">
                    📞 {tr("هاتف خدمة بنك البريد (دوار فيننسيم)")}
                  </h4>
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {tr("للاستفسار عن الحسابات والبطاقات المشحونة والتحويلات المالية:")}
                  </p>
                </div>
                <div className="mt-2 flex gap-2">
                  <a href="tel:025005303" className="btn py-1.5 text-xs font-extrabold">
                    📞 <span dir="ltr">02-5005303</span>
                  </a>
                  <a href="tel:171" className="btn btn-ghost py-1.5 text-xs font-extrabold">
                    📞 <span dir="ltr">171</span>
                  </a>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* TAB 2: MUNICIPALITY & ARNONA */}
      {mainTab === "municipality" ? (
        <div className="mt-3.5 space-y-3">
          <div className="grid gap-2.5 sm:grid-cols-3">
            <a
              href="https://www.paybill.co.il/Payment/WaterPayment?p=165"
              target="_blank"
              rel="noopener noreferrer"
              className="press flex items-center gap-3 rounded-2xl border-2 border-primary bg-paper p-3 shadow-2xs"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-xl">
                💳
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-extrabold text-ink sm:text-sm">
                  {tr("دفع الأرنونا والمياه أونلاين")}
                </span>
                <span className="block text-[11px] font-semibold text-muted">
                  {tr("بوابة الدفع الرسمية لبلدية رهط ↗")}
                </span>
              </span>
            </a>

            <a
              href="tel:089914982"
              className="press flex items-center gap-3 rounded-2xl border border-line bg-paper p-3 shadow-2xs"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface text-xl">
                📞
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-extrabold text-ink sm:text-sm">
                  {tr("قسم الجباية — بلدية رهط")}
                </span>
                <span className="block font-mono text-xs font-extrabold text-primary-ink" dir="ltr">
                  08-9914982
                </span>
              </span>
            </a>

            <a
              href="tel:106"
              className="press flex items-center gap-3 rounded-2xl border border-line bg-paper p-3 shadow-2xs"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-alert/10 text-xl">
                🚨
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-extrabold text-ink sm:text-sm">
                  {tr("مركز الطوارئ البلدي 106")}
                </span>
                <span className="block text-[11px] font-semibold text-muted">
                  {tr("إنارة، نظافة، طرق وطوارئ الأحياء")}
                </span>
              </span>
            </a>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-2xl border border-line bg-paper p-3">
              <h4 className="text-xs font-extrabold text-ink sm:text-sm">
                🏛️ {tr("المركز الجماهيري رهط (מתנ״ס רהט)")}
              </h4>
              <p className="mt-0.5 text-xs font-semibold text-muted">
                {tr("دورات تعليمية ورياضية، فعاليات ثقافية وشبابية وبرامج للأطفال والعائلات في مركز المدينة.")}
              </p>
              <div className="mt-2 flex gap-2">
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=31.3925,34.7544"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn py-1.5 text-xs font-extrabold"
                >
                  📍 {tr("الاتجاهات للمركز الجماهيري")}
                </a>
                <Link
                  to="/directory/guide/$guide"
                  params={{ guide: "municipality" }}
                  className="btn btn-ghost py-1.5 text-xs font-extrabold"
                >
                  {tr("دليل البلدية الكامل")}
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-paper p-3">
              <h4 className="text-xs font-extrabold text-ink sm:text-sm">
                🛍️ {tr("السوق البلدي والمركز التجاري رهط")}
              </h4>
              <p className="mt-0.5 text-xs font-semibold text-muted">
                {tr("وسط المدينة — يضم المحلات التجارية، البريد المركزي (237)، البنوك والمطاعم والخدمات.")}
              </p>
              <div className="mt-2 flex gap-2">
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=31.394647,34.758378"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn py-1.5 text-xs font-extrabold"
                >
                  📍 {tr("الاتجاهات للسوق البلدي")}
                </a>
                <a
                  href="https://rahat-muni.com/%D9%82%D8%B3%D9%85-%D8%A7%D9%84%D8%AC%D8%A8%D8%A7%D9%8A%D9%87/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost py-1.5 text-xs font-extrabold"
                >
                  {tr("موقع بلدية رهط ↗")}
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* TAB 3: HEALTH & EMERGENCY */}
      {mainTab === "health" ? (
        <div className="mt-3.5 space-y-3">
          {/* 1-Tap Emergency Speed Dial */}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[
              { num: "101", label: "الإسعاف", icon: "🚑" },
              { num: "1221", label: "اتحاد الإنقاذ", icon: "⚡" },
              { num: "100", label: "الشرطة", icon: "🚓" },
              { num: "102", label: "الإطفاء", icon: "🚒" },
              { num: "103", label: "الكهرباء", icon: "🔌" },
              { num: "106", label: "طوارئ البلدية", icon: "🏛️" },
            ].map((em) => (
              <a
                key={em.num}
                href={`tel:${em.num}`}
                className="press flex flex-col items-center justify-center rounded-2xl border border-line bg-paper p-2 text-center shadow-2xs hover:border-alert"
              >
                <span className="text-base" aria-hidden>
                  {em.icon}
                </span>
                <span className="font-mono text-sm font-extrabold text-alert" dir="ltr">
                  {em.num}
                </span>
                <span className="truncate text-[11px] font-bold text-ink">{trv(em.label)}</span>
              </a>
            ))}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-paper p-3">
              <h4 className="text-xs font-extrabold text-ink sm:text-sm">
                🏥 {tr("عيادة ومستشفى كلاليت رهط")}
              </h4>
              <p className="mt-0.5 text-[11px] font-semibold text-muted">
                {tr("طب عائلة وأطفال، عيادات تخصصية، مختبر وصيدلية.")}
              </p>
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=31.394985,34.754784"
                target="_blank"
                rel="noopener noreferrer"
                className="btn mt-2 w-full py-1.5 text-xs font-extrabold"
              >
                📍 {tr("الاتجاهات للعيادة")}
              </a>
            </div>

            <div className="rounded-2xl border border-line bg-paper p-3">
              <h4 className="text-xs font-extrabold text-ink sm:text-sm">
                👶 {tr("مركز قطرة حليب (טיפת חלב)")}
              </h4>
              <p className="mt-0.5 text-[11px] font-semibold text-muted">
                {tr("تطعيمات الأطفال والرضّع ومتابعة نمو الطفل وصحة الأم.")}
              </p>
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=31.392461,34.751015"
                target="_blank"
                rel="noopener noreferrer"
                className="btn mt-2 w-full py-1.5 text-xs font-extrabold"
              >
                📍 {tr("الاتجاهات لقطرة حليب")}
              </a>
            </div>

            <div className="rounded-2xl border-2 border-primary bg-primary-soft/60 p-3">
              <h4 className="text-xs font-extrabold text-ink sm:text-sm">
                💊 {tr("صيدلية المناوبة (الحراسة) اليوم")}
              </h4>
              <p className="mt-0.5 text-[11px] font-semibold text-muted">
                {tr("شاهد الصيدلية المناوبة المفتوحة اليوم في رهط مع الهاتف والموقع.")}
              </p>
              <Link
                to="/today"
                className="btn mt-2 w-full py-1.5 text-xs font-extrabold"
              >
                {tr("افتح لوحة اليوم والصيدلية")}
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* TAB 4: GALIM BUSES */}
      {mainTab === "transport" ? (
        <div className="mt-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-surface p-1.5">
            <button
              type="button"
              onClick={() => setBusFilter("city")}
              className={`press flex-1 rounded-xl py-2 text-xs font-extrabold transition ${
                busFilter === "city" ? "bg-primary text-ink shadow-2xs" : "text-muted"
              }`}
            >
              🚌 {tr("خطوط داخل أحياء رهط (1–6)")}
            </button>
            <button
              type="button"
              onClick={() => setBusFilter("intercity")}
              className={`press flex-1 rounded-xl py-2 text-xs font-extrabold transition ${
                busFilter === "intercity" ? "bg-primary text-ink shadow-2xs" : "text-muted"
              }`}
            >
              🛣️ {tr("خطوط بئر السبع والنقب")}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(busFilter === "city" ? cityBuses : intercityBuses).map((b) => (
              <Link
                key={b.line}
                to="/buses"
                className="press flex items-center gap-2.5 rounded-2xl border border-line bg-paper p-2.5 hover:border-primary"
              >
                <span className="grid min-w-10 shrink-0 place-items-center rounded-xl bg-primary px-2 py-1.5 font-mono text-xs font-extrabold text-ink">
                  {b.line}
                </span>
                <span className="line-clamp-2 text-xs font-bold text-ink">{trv(b.route)}</span>
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <Link to="/buses" className="btn flex-1 py-2 text-xs font-extrabold">
              🗺️ {tr("تتبع الباصات مباشر على الخريطة ومواعيد اليوم")}
            </Link>
            <a href="tel:086688700" className="btn btn-ghost py-2 text-xs font-extrabold">
              📞 {tr("شركة غاليم: 08-6688700")}
            </a>
          </div>
        </div>
      ) : null}

      {/* Footer Quick Links to All 4 Full Guides */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-line/80 pt-3 text-xs font-extrabold">
        <span className="text-muted">{tr("الأدلة التفصيلية الكاملة:")}</span>
        <div className="flex flex-wrap gap-1.5">
          {[
            { slug: "post", label: "📮 دليل البريد" },
            { slug: "municipality", label: "🏛️ دليل البلدية" },
            { slug: "health", label: "🏥 دليل الصحة" },
            { slug: "transport", label: "🚌 دليل الباصات" },
          ].map((g) => (
            <Link
              key={g.slug}
              to="/directory/guide/$guide"
              params={{ guide: g.slug }}
              className="rounded-xl border border-line bg-paper px-2.5 py-1 text-ink transition hover:border-primary hover:bg-primary-soft"
            >
              {trv(g.label)}
            </Link>
          ))}
        </div>
      </div>

      {/* Mandatory Google Play Official Sources & Non-Government Affiliation Disclaimer */}
      <div className="mt-2.5 rounded-xl border border-line/80 bg-surface/70 p-2.5 text-[11px] font-semibold leading-relaxed text-muted">
        <p className="font-bold text-ink">
          ℹ️ {tr("إخلاء مسؤولية والمصادر الرسمية (Official Sources):")}
        </p>
        <p className="mt-0.5">
          {tr("منصة «رهط بوست» هي منصة إعلامية ومجتمعية مستقلة ولا تمثل أي جهة حكومية أو رسمية. جميع بيانات ومواعيد الخدمات العامة مستندة إلى المصادر الحكومية والرسمية التالية:")}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold" dir="ltr">
          <a href="https://www.gov.il" target="_blank" rel="noopener noreferrer" className="text-primary-ink underline">gov.il</a>
          <a href="https://doar.israelpost.co.il" target="_blank" rel="noopener noreferrer" className="text-primary-ink underline">doar.israelpost.co.il</a>
          <a href="https://www.rahat.muni.il" target="_blank" rel="noopener noreferrer" className="text-primary-ink underline">rahat.muni.il</a>
          <a href="https://bus.gov.il" target="_blank" rel="noopener noreferrer" className="text-primary-ink underline">bus.gov.il</a>
          <a href="https://www.galim-bus.co.il" target="_blank" rel="noopener noreferrer" className="text-primary-ink underline">galim-bus.co.il</a>
        </div>
      </div>
    </div>
  );
}



/* -------------------------------------------------------------------------- */
/* Interactive Rahat Shops & Services Directory Section (Homepage)            */
/* -------------------------------------------------------------------------- */

function InteractiveDirectoryHomeSection({
  places,
  storeProducts = [],
  storeCurrency = "ILS",
}: {
  places: DirectoryEntry[];
  storeProducts?: Parameters<typeof ProductCard>[0]["p"][];
  storeCurrency?: Parameters<typeof ProductCard>[0]["currency"];
}) {
  const [hubMap, setHubMap] = useState<
    Record<
      string,
      {
        slug: string;
        isCustomShop?: boolean;
        customName?: string;
        customCategory?: string;
        customArea?: string;
        customAddress?: string;
        logoKey?: string;
        coverKey?: string;
        verified?: boolean;
        featured?: boolean;
        supervisorName?: string;
        products?: { id: string; name: string; price?: string; imageKey?: string }[];
        campaigns?: { id: string; title: string; discountBadge: string; active: boolean }[];
      }
    >
  >({});
  const [globalCfg, setGlobalCfg] = useState<{
    directoryStyle: "cards" | "showcase" | "grid" | "carousel" | "compact" | "dark_gold";
    showOfficialStoreOnHome: boolean;
    showCategoryFilterOnHome: boolean;
    homeItemsCount: number;
  }>({
    directoryStyle: "cards",
    showOfficialStoreOnHome: false,
    showCategoryFilterOnHome: true,
    homeItemsCount: 6,
  });
  const [activeCat, setActiveCat] = useState<string>("الكل");

  useEffect(() => {
    fetch("/api/media?kind=shop-hub")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ok) {
          if (d.shops) setHubMap(d.shops);
          if (d.globalSettings) {
            setGlobalCfg((prev) => ({ ...prev, ...d.globalSettings }));
          }
        }
      })
      .catch(() => {});
  }, []);

  const enriched = useMemo(() => {
    const seen = new Set<string>();
    const list: (DirectoryEntry & {
      coverKey?: string;
      featured?: boolean;
      supervisorName?: string;
      productsCount: number;
      offerBadge?: string;
      offerTitle?: string;
    })[] = [];

    for (const p of places) {
      seen.add(p.slug);
      const cfg = hubMap[p.slug];
      const activeCamps = (cfg?.campaigns ?? []).filter((c) => c.active);
      list.push({
        ...p,
        name: cfg?.customName || p.name,
        category: cfg?.customCategory || p.category,
        area: cfg?.customArea || p.area,
        address: cfg?.customAddress || p.address,
        photo: cfg?.logoKey || p.photo,
        coverKey: cfg?.coverKey,
        verified: cfg?.verified !== undefined ? cfg.verified : p.verified,
        featured: cfg?.featured,
        supervisorName: cfg?.supervisorName,
        productsCount: cfg?.products?.length ?? 0,
        offerBadge: activeCamps[0]?.discountBadge,
        offerTitle: activeCamps[0]?.title,
      });
    }

    for (const [slug, cfg] of Object.entries(hubMap)) {
      if (seen.has(slug) || !cfg.isCustomShop || !cfg.customName) continue;
      const activeCamps = (cfg.campaigns ?? []).filter((c) => c.active);
      list.push({
        slug,
        name: cfg.customName,
        category: cfg.customCategory || "خدمات",
        source: "owner",
        verified: cfg.verified !== false,
        area: cfg.customArea,
        address: cfg.customAddress,
        photo: cfg.logoKey,
        coverKey: cfg.coverKey,
        featured: cfg.featured,
        supervisorName: cfg.supervisorName,
        productsCount: cfg.products?.length ?? 0,
        offerBadge: activeCamps[0]?.discountBadge,
        offerTitle: activeCamps[0]?.title,
      });
    }

    return list.sort((a, b) => {
      const score = (x: (typeof list)[number]) =>
        (x.featured ? 100 : 0) +
        (x.offerBadge ? 50 : 0) +
        (x.productsCount > 0 ? 30 : 0) +
        (x.photo ? 15 : 0) +
        (x.verified ? 10 : 0);
      return score(b) - score(a);
    });
  }, [places, hubMap]);

  const categories = useMemo(() => {
    const base = ["الكل", "مطاعم ومقاهي", "بقالات", "صحة", "ملابس", "خدمات"];
    return base.filter((c) => c === "الكل" || enriched.some((p) => p.category === c));
  }, [enriched]);

  const visiblePlaces = useMemo(() => {
    const filtered =
      activeCat === "الكل"
        ? enriched
        : activeCat === "__offers__"
          ? enriched.filter((p) => Boolean(p.offerBadge) || p.productsCount > 0)
          : enriched.filter((p) => p.category === activeCat);
    return filtered.slice(0, globalCfg.homeItemsCount || 6);
  }, [enriched, activeCat, globalCfg.homeItemsCount]);

  const hasAnyOffers = enriched.some((p) => Boolean(p.offerBadge) || p.productsCount > 0);
  const resolveImg = (v?: string) => {
    if (!v) return "";
    if (v.startsWith("data:image/") || v.startsWith("http") || v.startsWith("/")) return v;
    return mediaUrl(v);
  };

  const styleMode = globalCfg.directoryStyle || "cards";
  const isDarkGold = styleMode === "dark_gold";

  return (
    <div className="space-y-5">
      {/* Optional Official Store Section — Hidden by Default unless enabled in Admin */}
      {globalCfg.showOfficialStoreOnHome && storeProducts.length > 0 ? (
        <section>
          <SectionTitle title={tr("من المتجر الرسمي")} to="/store" more={tr("كل المتجر")} />
          <ul className="scroll-row -mx-4 px-4 pb-2 sm:mx-0 sm:px-0">
            {storeProducts.slice(0, 8).map((p) => (
              <li key={p.id} className="w-48 shrink-0">
                <ProductCard p={p} currency={storeCurrency} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <SectionTitle title={tr("دليل محلات وخدمات رهط")} to="/directory" more={tr("كل الدليل")} />

        <div
          className={`stamp overflow-hidden p-3.5 sm:p-4 shadow-xs space-y-3.5 ${
            isDarkGold
              ? "border-2 border-[#f2c94c] bg-gradient-to-b from-[#111827] via-[#1e293b] to-[#111827] text-white"
              : "border-2 border-primary/70 bg-gradient-to-b from-primary-soft/50 via-paper to-paper"
          }`}
        >
          {/* Category & Offers Filter Bar */}
          {globalCfg.showCategoryFilterOnHome ? (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-wrap items-center gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCat(cat)}
                    className={`press rounded-full px-3 py-1 text-xs font-extrabold transition ${
                      activeCat === cat
                        ? isDarkGold
                          ? "bg-[#f2c94c] text-[#111827] shadow-2xs"
                          : "bg-ink text-paper shadow-2xs"
                        : isDarkGold
                          ? "border border-white/20 bg-white/10 text-white hover:border-[#f2c94c]"
                          : "border border-line bg-paper text-ink hover:border-primary"
                    }`}
                  >
                    {trv(cat)}
                  </button>
                ))}
                {hasAnyOffers ? (
                  <button
                    type="button"
                    onClick={() => setActiveCat("__offers__")}
                    className={`press rounded-full px-3 py-1 text-xs font-extrabold transition ${
                      activeCat === "__offers__"
                        ? "bg-alert text-white shadow-2xs"
                        : "border border-alert/40 bg-alert/15 text-alert hover:bg-alert/25"
                    }`}
                  >
                    🔥 {tr("عروض ومنتجات")}
                  </button>
                ) : null}
              </div>

              <Link
                to="/submit"
                search={{ mode: "نشاط" }}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-extrabold text-ink shadow-2xs hover:opacity-90"
              >
                <Plus className="size-3.5" aria-hidden />
                {tr("أضف محلك")}
              </Link>
            </div>
          ) : null}

          {/* STYLE 1: SHOWCASE (Large Cover Banner + Overlapping Logo + Offer Callout) */}
          {styleMode === "showcase" ? (
            <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {visiblePlaces.map((place) => (
                <li key={place.slug}>
                  <Link
                    to="/directory/$slug"
                    params={{ slug: place.slug }}
                    className="press group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-paper shadow-2xs transition hover:border-primary"
                  >
                    <div className="relative h-24 w-full bg-gradient-to-l from-ink via-[#1e293b] to-ink overflow-hidden">
                      {place.coverKey ? (
                        <img
                          src={resolveImg(place.coverKey)}
                          alt={trv(place.name)}
                          className="size-full object-cover opacity-85 transition group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="size-full bg-[radial-gradient(circle_at_80%_20%,#f2c94c40,transparent_65%)]" />
                      )}
                      {place.offerBadge ? (
                        <span className="absolute top-2.5 end-2.5 rounded-full bg-alert px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-xs">
                          🔥 {trv(place.offerBadge)}
                        </span>
                      ) : null}
                      {place.verified ? (
                        <span className="absolute top-2.5 start-2.5 rounded-full bg-ink/85 px-2 py-0.5 text-[10px] font-extrabold text-primary backdrop-blur-xs">
                          ✓ {tr("موثّق")}
                        </span>
                      ) : null}
                    </div>
                    <div className="relative flex flex-1 flex-col justify-between p-3.5 pt-2">
                      <div className="flex items-start gap-2.5">
                        <div className="-mt-7 shrink-0">
                          {place.photo ? (
                            <img
                              src={resolveImg(place.photo)}
                              alt={trv(place.name)}
                              className="size-14 rounded-2xl border-2 border-paper bg-paper object-cover shadow-md"
                              loading="lazy"
                            />
                          ) : (
                            <span className="grid size-14 place-items-center rounded-2xl border-2 border-paper bg-primary text-ink shadow-md">
                              <Store className="size-6" />
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-extrabold text-ink sm:text-base">
                            {trv(place.name)}
                          </h3>
                          <p className="truncate text-xs font-bold text-muted">
                            {trv(place.category)}
                            {place.address || place.area ? ` · ${trv(place.address ?? place.area ?? "")}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-2 text-[11px] font-extrabold">
                        <span className="text-muted">
                          {place.productsCount > 0
                            ? `🛍️ ${trv(place.productsCount)} ${tr("منتجات بالمتجر")}`
                            : place.offerTitle
                              ? `🔥 ${trv(place.offerTitle)}`
                              : tr("صفحة المحل والخدمات")}
                        </span>
                        <span className="text-primary-ink">{tr("زيارة المحل ←")}</span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : styleMode === "grid" ? (
            /* STYLE 2: GRID (App-Style Centered Square Shop Tiles) */
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              {visiblePlaces.map((place) => (
                <li key={place.slug}>
                  <Link
                    to="/directory/$slug"
                    params={{ slug: place.slug }}
                    className={`press flex h-full flex-col items-center justify-between rounded-2xl border p-3 text-center transition ${
                      place.featured || place.offerBadge
                        ? "border-2 border-primary bg-primary-soft/35"
                        : "border-line bg-paper hover:border-primary"
                    }`}
                  >
                    <div className="relative">
                      {place.photo ? (
                        <img
                          src={resolveImg(place.photo)}
                          alt={trv(place.name)}
                          className="size-16 rounded-2xl border-2 border-primary/60 bg-paper object-cover shadow-2xs"
                          loading="lazy"
                        />
                      ) : (
                        <span className="grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary-ink">
                          <Store className="size-7" />
                        </span>
                      )}
                      {place.verified ? (
                        <span className="absolute -bottom-1 -end-1 grid size-5 place-items-center rounded-full bg-ink text-[10px] font-extrabold text-primary shadow-2xs">
                          ✓
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 w-full space-y-0.5">
                      <p className="truncate text-xs font-extrabold text-ink sm:text-sm">
                        {trv(place.name)}
                      </p>
                      <p className="truncate text-[11px] font-bold text-muted">{trv(place.category)}</p>
                    </div>
                    {place.offerBadge ? (
                      <span className="mt-1.5 inline-block rounded-full bg-alert px-2 py-0.5 text-[10px] font-extrabold text-white">
                        🔥 {trv(place.offerBadge)}
                      </span>
                    ) : place.productsCount > 0 ? (
                      <span className="mt-1.5 inline-block rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-extrabold text-primary-ink">
                        🛍️ {trv(place.productsCount)} {tr("منتج")}
                      </span>
                    ) : (
                      <span className="mt-1.5 inline-block rounded-full bg-surface px-2.5 py-0.5 text-[10px] font-bold text-muted">
                        {tr("عرض المحل")}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : styleMode === "carousel" ? (
            /* STYLE 3: CAROUSEL (Stories Circle Strip + Horizontal Sliding Cards) */
            <div className="space-y-3">
              {/* Top Story Circles */}
              <div className="scroll-row -mx-2 px-2 pb-1">
                {enriched.slice(0, 10).map((place) => (
                  <Link
                    key={`story-${place.slug}`}
                    to="/directory/$slug"
                    params={{ slug: place.slug }}
                    className="flex w-18 shrink-0 flex-col items-center gap-1 text-center"
                  >
                    <span
                      className={`grid size-14 place-items-center rounded-full p-0.5 ${
                        place.offerBadge
                          ? "bg-gradient-to-tr from-alert via-primary to-primary-deep"
                          : "bg-gradient-to-tr from-primary to-primary-deep"
                      }`}
                    >
                      {place.photo ? (
                        <img
                          src={resolveImg(place.photo)}
                          alt={trv(place.name)}
                          className="size-full rounded-full border-2 border-paper bg-paper object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="grid size-full place-items-center rounded-full border-2 border-paper bg-paper text-primary-ink">
                          <Store className="size-5" />
                        </span>
                      )}
                    </span>
                    <span className="w-full truncate text-[10.5px] font-extrabold text-ink">
                      {trv(place.name)}
                    </span>
                  </Link>
                ))}
              </div>

              {/* Horizontal Cards */}
              <ul className="scroll-row -mx-2 px-2 pb-1">
                {visiblePlaces.map((place) => (
                  <li key={place.slug} className="w-64 shrink-0">
                    <Link
                      to="/directory/$slug"
                      params={{ slug: place.slug }}
                      className="press flex h-full flex-col justify-between rounded-2xl border border-line bg-paper p-3 shadow-2xs transition hover:border-primary"
                    >
                      <div className="flex items-center gap-2.5">
                        {place.photo ? (
                          <img
                            src={resolveImg(place.photo)}
                            alt={trv(place.name)}
                            className="size-12 shrink-0 rounded-xl border border-primary/50 object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-ink">
                            <Store className="size-5" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold text-ink">{trv(place.name)}</p>
                          <p className="truncate text-xs font-bold text-muted">
                            {trv(place.category)}
                            {place.area ? ` · ${trv(place.area)}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center justify-between border-t border-line/60 pt-2 text-[11px] font-extrabold">
                        {place.offerBadge ? (
                          <span className="rounded-full bg-alert px-2 py-0.5 text-[10px] text-white">
                            🔥 {trv(place.offerBadge)}
                          </span>
                        ) : place.productsCount > 0 ? (
                          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] text-primary-ink">
                            🛍️ {trv(place.productsCount)} {tr("منتج")}
                          </span>
                        ) : (
                          <span className="text-muted">{tr("معلومات وتواصل")}</span>
                        )}
                        <span className="text-primary-ink">{tr("فتح ←")}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : styleMode === "compact" ? (
            /* STYLE 4: COMPACT (Sleek High-Density List) */
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper">
              {visiblePlaces.map((place) => (
                <li key={place.slug}>
                  <Link
                    to="/directory/$slug"
                    params={{ slug: place.slug }}
                    className="flex items-center justify-between gap-2.5 px-3.5 py-2.5 transition hover:bg-surface/70"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {place.photo ? (
                        <img
                          src={resolveImg(place.photo)}
                          alt={trv(place.name)}
                          className="size-10 shrink-0 rounded-xl border border-line object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-ink">
                          <Store className="size-4" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-extrabold text-ink">{trv(place.name)}</span>
                          {place.verified ? (
                            <span className="rounded-full bg-ink px-1.5 py-0.2 text-[9px] font-extrabold text-paper">
                              ✓
                            </span>
                          ) : null}
                        </div>
                        <p className="truncate text-[11px] font-bold text-muted">
                          {trv(place.category)}
                          {place.address || place.area ? ` · ${trv(place.address ?? place.area ?? "")}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      {place.offerBadge ? (
                        <span className="rounded-full bg-alert px-2 py-0.5 text-[10px] font-extrabold text-white">
                          🔥 {trv(place.offerBadge)}
                        </span>
                      ) : null}
                      {place.productsCount > 0 ? (
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-extrabold text-primary-ink">
                          🛍️ {trv(place.productsCount)}
                        </span>
                      ) : null}
                      <ChevronLeft className="size-4 text-muted" aria-hidden />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            /* STYLE 5 & 6: CARDS (Default Modern Cards) & DARK_GOLD (Luxury Dark & Gold Cards) */
            <ul className="grid gap-3 sm:grid-cols-2">
              {visiblePlaces.map((place) => (
                <li key={place.slug}>
                  <Link
                    to="/directory/$slug"
                    params={{ slug: place.slug }}
                    className={`press flex items-center gap-3 rounded-2xl border p-3 transition ${
                      isDarkGold
                        ? "border-[#f2c94c]/45 bg-[#1e293b]/95 text-white hover:border-[#f2c94c]"
                        : place.featured || place.offerBadge
                          ? "border-2 border-primary bg-primary-soft/35"
                          : "border-line bg-paper hover:border-primary"
                    }`}
                  >
                    {place.photo ? (
                      <img
                        src={resolveImg(place.photo)}
                        alt={trv(place.name)}
                        className="size-14 shrink-0 rounded-2xl border-2 border-primary/60 bg-paper object-cover shadow-2xs"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="icon-badge size-14 shrink-0 rounded-2xl bg-primary-soft text-primary-ink">
                        <Store className="size-6" aria-hidden />
                      </span>
                    )}

                    <span className="min-w-0 flex-1 space-y-0.5">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`truncate text-sm font-extrabold leading-snug sm:text-base ${
                            isDarkGold ? "text-white" : "text-ink"
                          }`}
                        >
                          {trv(place.name)}
                        </span>
                        {place.verified ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                              isDarkGold ? "bg-[#f2c94c] text-[#111827]" : "bg-ink text-paper"
                            }`}
                          >
                            ✓ {tr("موثّق")}
                          </span>
                        ) : null}
                      </span>

                      <span
                        className={`flex flex-wrap items-center gap-1.5 text-xs font-bold ${
                          isDarkGold ? "text-slate-300" : "text-muted"
                        }`}
                      >
                        <span>{trv(place.category)}</span>
                        {place.address || place.area ? (
                          <span className="truncate">· {trv(place.address ?? place.area ?? "")}</span>
                        ) : null}
                      </span>

                      {place.offerBadge || place.productsCount > 0 || place.supervisorName ? (
                        <span className="flex flex-wrap items-center gap-1 pt-0.5">
                          {place.offerBadge ? (
                            <span className="rounded-full bg-alert px-2 py-0.5 text-[10px] font-extrabold text-white">
                              🔥 {trv(place.offerBadge)}
                            </span>
                          ) : null}
                          {place.productsCount > 0 ? (
                            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-extrabold text-primary-ink">
                              🛍️ {trv(place.productsCount)} {tr("منتج")}
                            </span>
                          ) : null}
                          {place.supervisorName ? (
                            <span className="rounded-full bg-[#16A34A]/20 px-2 py-0.5 text-[10px] font-extrabold text-[#22c55e]">
                              👤 {tr("إشراف معتمد")}
                            </span>
                          ) : null}
                        </span>
                      ) : null}
                    </span>

                    <ChevronLeft
                      className={`size-5 shrink-0 ${isDarkGold ? "text-[#f2c94c]" : "text-muted"}`}
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div
            className={`flex items-center justify-between border-t pt-2.5 text-xs font-extrabold ${
              isDarkGold ? "border-white/15 text-slate-300" : "border-line/70 text-muted"
            }`}
          >
            <span>
              {tr("يمكن لأصحاب المحلات إضافة لوجو المحل والمنتجات وحملات العروض داخل صفحة المحل")}
            </span>
            <Link
              to="/directory"
              className={`underline ${isDarkGold ? "text-[#f2c94c]" : "text-primary-ink"}`}
            >
              {tr("تصفح كل المحلات ←")}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}



/* -------------------------------------------------------------------------- */
/* Modern Interactive Galim Buses & Rahat Emergency Homepage Sections         */
/* -------------------------------------------------------------------------- */

export type BusesHomeStyleKey =
  | "modern_cards"
  | "live_board"
  | "compact_pills"
  | "dark_gold"
  | "split_showcase"
  | "collapsible";

export type EmergencyHomeStyleKey =
  | "modern_grid"
  | "compact_strip"
  | "color_coded"
  | "dark_gold"
  | "list_rows"
  | "collapsible";

function parseBusesAndEmergencyHomeCfg(quickLinks: { id: string; title: string; subtitle: string; url: string }[]) {
  const item = (quickLinks ?? []).find((q) => q.id === "busemergcfg");
  let busesStyle: BusesHomeStyleKey = "modern_cards";
  let emergencyStyle: EmergencyHomeStyleKey = "modern_grid";
  let includeEmergencyInBuses = true;
  let showAllEmergency = true;

  if (item && item.url.startsWith("/__bemg?")) {
    const sp = new URLSearchParams(item.url.slice(8));
    const bs = sp.get("bs") as BusesHomeStyleKey | null;
    if (
      bs === "modern_cards" ||
      bs === "live_board" ||
      bs === "compact_pills" ||
      bs === "dark_gold" ||
      bs === "split_showcase" ||
      bs === "collapsible"
    ) {
      busesStyle = bs;
    }
    const es = sp.get("es") as EmergencyHomeStyleKey | null;
    if (
      es === "modern_grid" ||
      es === "compact_strip" ||
      es === "color_coded" ||
      es === "dark_gold" ||
      es === "list_rows" ||
      es === "collapsible"
    ) {
      emergencyStyle = es;
    }
    if (sp.get("ieb") === "0") includeEmergencyInBuses = false;
    if (sp.get("sae") === "0") showAllEmergency = false;
  }
  return { busesStyle, emergencyStyle, includeEmergencyInBuses, showAllEmergency };
}

const GALIM_HOME_CITY_LINES = [
  { line: "1", from: "حي السلام", to: "الخزان / حطين", freq: "كل 20 د" },
  { line: "2", from: "حي السلام (الدفيئات)", to: "الخضر / حي 31", freq: "كل 20 د" },
  { line: "3", from: "محطة تافوح / السلام", to: "رفح / البوئي", freq: "كل 25 د" },
  { line: "4 / 4أ", from: "المدينة المنورة", to: "الحديقة العامة", freq: "كل 20 د" },
  { line: "5", from: "حي صلاح الدين", to: "مدرسة الهدى (دائري)", freq: "كل 30 د" },
  { line: "6", from: "المدينة المنورة", to: "حي صلاح الدين", freq: "كل 30 د" },
];

const GALIM_HOME_INTERCITY_LINES = [
  { line: "450–455", from: "رهط (الأحياء)", to: "بئر السبع / سوروكا", freq: "كل 15 د" },
  { line: "471", from: "رهط (مباشر)", to: "بئر السبع المركزية", freq: "سريع" },
  { line: "425", from: "رهط", to: "تل السبع", freq: "منتظم" },
  { line: "40 / 423", from: "رهط", to: "كسيفة / حورة", freq: "منتظم" },
  { line: "427", from: "رهط", to: "عرعرة النقب", freq: "منتظم" },
  { line: "462 / 467", from: "رهط", to: "سديروت / عسقلان", freq: "منتظم" },
];

const RAHAT_EMERGENCY_FULL = [
  { name: "الشرطة", sub: "طوارئ الأمن", phone: "100", icon: "🚔", tone: "blue" },
  { name: "الإسعاف (نجمة داود)", sub: "طوارئ طبية", phone: "101", icon: "🚑", tone: "red" },
  { name: "الإطفاء والإنقاذ", sub: "حرائق وإنقاذ", phone: "102", icon: "🚒", tone: "orange" },
  { name: "طوارئ بلدية رهط", sub: "الموكيد البلدي 24/7", phone: "106", icon: "🏛️", tone: "gold" },
  { name: "طوارئ الكهرباء", sub: "أعطال الكهرباء", phone: "103", icon: "⚡", tone: "gold" },
  { name: "الجبهة الداخلية", sub: "تعليمات الطوارئ", phone: "104", icon: "🛡️", tone: "blue" },
  { name: "اتحاد الإنقاذ", sub: "איחוד הצלה", phone: "1221", icon: "🩺", tone: "green" },
  { name: "الطوارئ الموحّد", sub: "خط الطوارئ العام", phone: "112", icon: "🆘", tone: "red" },
  { name: "بدالة بلدية رهط", sub: "مكاتب البلدية", phone: "08-9914800", icon: "📞", tone: "neutral" },
  { name: "استعلامات باصات غاليم", sub: "شركة גלים", phone: "08-6688700", icon: "🚌", tone: "neutral" },
] as const;

function InteractiveGalimBusesHomeSection() {
  const settings = useSiteSettings();
  const cfg = useMemo(() => parseBusesAndEmergencyHomeCfg(settings.quickLinks ?? []), [settings.quickLinks]);
  const [tab, setTab] = useState<"city" | "intercity" | "emergency">("city");
  const [expanded, setExpanded] = useState(cfg.busesStyle !== "collapsible");

  useEffect(() => {
    setExpanded(cfg.busesStyle !== "collapsible");
  }, [cfg.busesStyle]);

  const activeLines = tab === "intercity" ? GALIM_HOME_INTERCITY_LINES : GALIM_HOME_CITY_LINES;
  const isDark = cfg.busesStyle === "dark_gold";

  return (
    <section>
      <SectionTitle title={tr("باصات غاليم في رهط والنقب")} to="/buses" more={tr("الخريطة وكل المواعيد")} />

      <div
        className={`stamp overflow-hidden transition-all ${
          isDark
            ? "border-[#F2C94C]/50 bg-[#14120E] text-white shadow-md"
            : cfg.busesStyle === "live_board"
              ? "border-2 border-ink/80 bg-gradient-to-b from-surface via-paper to-paper"
              : "border-2 border-primary/75 bg-gradient-to-b from-primary-soft/50 via-paper to-paper"
        } p-3.5 sm:p-4`}
      >
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span
              className={`grid size-11 shrink-0 place-items-center rounded-2xl text-xl shadow-2xs ${
                isDark ? "bg-[#F2C94C] text-[#14120E]" : "bg-primary text-ink"
              }`}
              aria-hidden
            >
              <Bus className="size-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={`text-sm font-extrabold sm:text-base ${isDark ? "text-white" : "text-ink"}`}>
                  {tr("خطوط باصات غاليم (גלים) — رهط والنقب")}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#16A34A]/15 px-2.5 py-0.5 text-[11px] font-extrabold text-[#15803D]">
                  <span className="size-1.5 rounded-full bg-[#16A34A] animate-ping" />
                  {tr("مباشر · جدول اليوم")}
                </span>
              </div>
              <p className={`text-xs font-semibold ${isDark ? "text-white/70" : "text-muted"}`}>
                {tr("خطوط داخل أحياء رهط (1–6)، بئر السبع، سوروكا وبلدات النقب مع التتبع الحي")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {cfg.busesStyle === "collapsible" ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="btn btn-ghost px-3 py-1.5 text-xs font-extrabold"
              >
                {expanded ? tr("طي القائمة ▲") : tr("عرض الخطوط والمواعيد ▼")}
              </button>
            ) : null}
            <Link
              to="/buses"
              className={`press inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold shadow-2xs transition ${
                isDark
                  ? "bg-[#F2C94C] text-[#14120E]"
                  : "bg-ink text-paper hover:opacity-90"
              }`}
            >
              <span>🗺️ {tr("تتبع مباشر")}</span>
              <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" aria-hidden />
            </Link>
          </div>
        </div>

        {expanded ? (
          <div className="mt-3.5 space-y-3">
            {/* Interactive Category Switcher */}
            <div
              className={`flex flex-wrap items-center gap-1.5 rounded-2xl p-1.5 ${
                isDark ? "bg-white/10" : "bg-surface/90"
              }`}
            >
              <button
                type="button"
                onClick={() => setTab("city")}
                className={`press flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                  tab === "city"
                    ? isDark
                      ? "bg-[#F2C94C] text-[#14120E]"
                      : "bg-primary text-ink shadow-2xs"
                    : isDark
                      ? "text-white/75 hover:text-white"
                      : "text-muted hover:text-ink"
                }`}
              >
                🚌 {tr("خطوط داخل رهط (1–6)")}
              </button>
              <button
                type="button"
                onClick={() => setTab("intercity")}
                className={`press flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                  tab === "intercity"
                    ? isDark
                      ? "bg-[#F2C94C] text-[#14120E]"
                      : "bg-primary text-ink shadow-2xs"
                    : isDark
                      ? "text-white/75 hover:text-white"
                      : "text-muted hover:text-ink"
                }`}
              >
                🛣️ {tr("بئر السبع والنقب")}
              </button>
              {cfg.includeEmergencyInBuses ? (
                <button
                  type="button"
                  onClick={() => setTab("emergency")}
                  className={`press flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-extrabold transition ${
                    tab === "emergency"
                      ? "bg-alert text-white shadow-2xs"
                      : isDark
                        ? "text-white/75 hover:text-white"
                        : "text-muted hover:text-ink"
                  }`}
                >
                  🚨 {tr("أرقام الطوارئ في رهط")}
                </button>
              ) : null}
            </div>

            {tab === "emergency" ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {RAHAT_EMERGENCY_FULL.map((em) => (
                  <a
                    key={em.phone}
                    href={`tel:${em.phone}`}
                    className={`press flex items-center justify-between gap-2 rounded-2xl border p-2.5 transition ${
                      isDark
                        ? "border-white/15 bg-white/5 text-white hover:border-[#F2C94C]"
                        : "border-line bg-paper text-ink hover:border-primary"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-extrabold">
                        {em.icon} {trv(em.name)}
                      </span>
                      <span className={`block truncate text-[10px] font-semibold ${isDark ? "text-white/60" : "text-muted"}`}>
                        {trv(em.sub)}
                      </span>
                    </span>
                    <span
                      dir="ltr"
                      className={`shrink-0 rounded-xl px-2 py-1 font-mono text-xs font-extrabold ${
                        isDark ? "bg-[#F2C94C] text-[#14120E]" : "bg-primary-soft text-primary-ink"
                      }`}
                    >
                      {em.phone}
                    </span>
                  </a>
                ))}
              </div>
            ) : cfg.busesStyle === "compact_pills" ? (
              <div className="flex flex-wrap gap-2">
                {activeLines.map((b) => (
                  <Link
                    key={b.line}
                    to="/buses"
                    className={`press inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${
                      isDark
                        ? "border-white/20 bg-white/5 text-white hover:border-[#F2C94C]"
                        : "border-line bg-paper text-ink hover:border-primary"
                    }`}
                  >
                    <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-[11px] font-extrabold text-ink">
                      {b.line}
                    </span>
                    <span>{trv(b.from)} ↔ {trv(b.to)}</span>
                  </Link>
                ))}
              </div>
            ) : cfg.busesStyle === "live_board" ? (
              <div className="overflow-hidden rounded-2xl border border-ink/20 bg-[#111827] text-white">
                <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-3.5 py-2 text-[11px] font-extrabold text-[#F2C94C]">
                  <span>🚌 {tr("رقم الخط")}</span>
                  <span>📍 {tr("المسار والمحطات")}</span>
                  <span>⏱️ {tr("التردد")}</span>
                </div>
                <div className="divide-y divide-white/10">
                  {activeLines.map((b) => (
                    <Link
                      key={b.line}
                      to="/buses"
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs transition hover:bg-white/5"
                    >
                      <span className="rounded-lg bg-[#F2C94C] px-2.5 py-1 font-mono text-xs font-extrabold text-[#111827]">
                        {b.line}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-bold text-white">
                        {trv(b.from)} ↔ {trv(b.to)}
                      </span>
                      <span className="shrink-0 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-300">
                        {trv(b.freq)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : cfg.busesStyle === "split_showcase" ? (
              <div className="grid gap-3 lg:grid-cols-12">
                <div className="flex flex-col justify-between rounded-2xl bg-ink p-4 text-paper lg:col-span-4">
                  <div>
                    <span className="inline-block rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-extrabold text-ink">
                      🗺️ {tr("خريطة الباصات المباشرة")}
                    </span>
                    <h4 className="mt-2 text-base font-extrabold">
                      {tr("شاهد موقع الباص الآن في شوارع رهط")}
                    </h4>
                    <p className="mt-1 text-xs font-semibold text-paper/75">
                      {tr("اختر رقم الخط لمعرفة أقرب محطة إليك وموعد وصول الحافلة القادمة بالثواني.")}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link to="/buses" className="btn flex-1 py-2 text-xs font-extrabold">
                      {tr("افتح الخريطة الحية")}
                    </Link>
                    <a href="tel:086688700" className="btn btn-ghost border-white/25 text-paper py-2 text-xs font-extrabold">
                      📞 08-6688700
                    </a>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:col-span-8">
                  {activeLines.map((b) => (
                    <Link
                      key={b.line}
                      to="/buses"
                      className="press flex flex-col justify-between rounded-2xl border border-line bg-paper p-2.5 hover:border-primary"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="rounded-lg bg-primary px-2 py-0.5 font-mono text-xs font-extrabold text-ink">
                          {tr("خط")} {b.line}
                        </span>
                        <span className="text-[10px] font-bold text-muted">{trv(b.freq)}</span>
                      </div>
                      <p className="mt-1.5 text-xs font-extrabold text-ink">
                        {trv(b.from)} ↔ {trv(b.to)}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              /* modern_cards & dark_gold */
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {activeLines.map((b) => (
                  <Link
                    key={b.line}
                    to="/buses"
                    className={`press flex items-center gap-2.5 rounded-2xl border p-2.5 transition ${
                      isDark
                        ? "border-white/15 bg-white/5 text-white hover:border-[#F2C94C]"
                        : "border-line bg-paper text-ink hover:border-primary shadow-2xs"
                    }`}
                  >
                    <span
                      className={`grid min-w-11 shrink-0 place-items-center rounded-xl px-2 py-2 font-mono text-xs font-extrabold ${
                        isDark ? "bg-[#F2C94C] text-[#14120E]" : "bg-primary text-ink"
                      }`}
                    >
                      {b.line}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-extrabold">
                        {trv(b.from)} ↔ {trv(b.to)}
                      </span>
                      <span
                        className={`mt-0.5 block truncate text-[11px] font-semibold ${
                          isDark ? "text-white/65" : "text-muted"
                        }`}
                      >
                        🕒 {trv(b.freq)} · {tr("شركة غاليم")}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Quick Emergency Strip inside Buses Card when enabled and on city/intercity tab */}
            {cfg.includeEmergencyInBuses && tab !== "emergency" ? (
              <div
                className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-xs ${
                  isDark
                    ? "border-white/15 bg-white/5 text-white"
                    : "border-line/80 bg-surface/80 text-ink"
                }`}
              >
                <span className="font-extrabold">
                  🚨 {tr("طوارئ رهط السريعة:")}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { label: "الشرطة", phone: "100" },
                    { label: "الإسعاف", phone: "101" },
                    { label: "الإطفاء", phone: "102" },
                    { label: "بلدية رهط", phone: "106" },
                    { label: "الكهرباء", phone: "103" },
                    { label: "إنقاذ", phone: "1221" },
                  ].map((em) => (
                    <a
                      key={em.phone}
                      href={`tel:${em.phone}`}
                      className={`press inline-flex items-center gap-1 rounded-xl border px-2 py-1 text-[11px] font-extrabold transition ${
                        isDark
                          ? "border-white/20 bg-white/10 text-white hover:border-[#F2C94C]"
                          : "border-line bg-paper text-ink hover:border-primary"
                      }`}
                    >
                      <span>{trv(em.label)}</span>
                      <span dir="ltr" className={isDark ? "text-[#F2C94C]" : "text-primary-ink"}>
                        {em.phone}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function InteractiveEmergencyHomeSection() {
  const settings = useSiteSettings();
  const cfg = useMemo(() => parseBusesAndEmergencyHomeCfg(settings.quickLinks ?? []), [settings.quickLinks]);
  const [showAll, setShowAll] = useState(cfg.showAllEmergency && cfg.emergencyStyle !== "collapsible");

  useEffect(() => {
    setShowAll(cfg.showAllEmergency && cfg.emergencyStyle !== "collapsible");
  }, [cfg.showAllEmergency, cfg.emergencyStyle]);

  const list = showAll ? RAHAT_EMERGENCY_FULL : RAHAT_EMERGENCY_FULL.slice(0, 4);
  const isDark = cfg.emergencyStyle === "dark_gold";

  const toneCls = (tone: string) => {
    if (cfg.emergencyStyle !== "color_coded") {
      return isDark
        ? "border-white/15 bg-white/5 text-white hover:border-[#F2C94C]"
        : "border-line bg-paper text-ink hover:border-primary";
    }
    if (tone === "red") return "border-red-500/30 bg-red-500/10 text-ink hover:border-red-500";
    if (tone === "orange") return "border-amber-500/35 bg-amber-500/10 text-ink hover:border-amber-500";
    if (tone === "blue") return "border-sky-500/30 bg-sky-500/10 text-ink hover:border-sky-500";
    if (tone === "green") return "border-emerald-500/30 bg-emerald-500/10 text-ink hover:border-emerald-500";
    return "border-primary/60 bg-primary-soft/60 text-ink hover:border-primary";
  };

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">{tr("أرقام الطوارئ والخدمات في رهط")}</h2>
        <div className="flex items-center gap-2">
          {RAHAT_EMERGENCY_FULL.length > 4 ? (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="chip text-xs font-extrabold"
            >
              {showAll
                ? tr("عرض أهم 4 أرقام فقط ▲")
                : `${tr("عرض كل أرقام الطوارئ")} (${RAHAT_EMERGENCY_FULL.length}) ▼`}
            </button>
          ) : null}
          <Link to="/today" className="text-sm font-bold text-primary-ink">
            {tr("لوحة اليوم")} ‹
          </Link>
        </div>
      </div>

      <div
        className={
          isDark
            ? "stamp border-[#F2C94C]/50 bg-[#14120E] p-3.5 text-white shadow-md"
            : ""
        }
      >
        {cfg.emergencyStyle === "compact_strip" ? (
          <div className="flex flex-wrap gap-2">
            {list.map((item) => (
              <a
                key={item.phone}
                href={`tel:${item.phone}`}
                className="stamp press inline-flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-extrabold hover:border-primary"
              >
                <span className="text-base" aria-hidden>{item.icon}</span>
                <span>{trv(item.name)}</span>
                <span dir="ltr" className="rounded-lg bg-primary px-2 py-0.5 font-mono text-xs font-extrabold text-ink">
                  {item.phone}
                </span>
              </a>
            ))}
          </div>
        ) : cfg.emergencyStyle === "list_rows" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {list.map((item) => (
              <a
                key={item.phone}
                href={`tel:${item.phone}`}
                className="stamp press flex items-center justify-between gap-3 px-3.5 py-3 hover:border-primary"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-lg" aria-hidden>
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-ink">{trv(item.name)}</p>
                    <p className="truncate text-xs font-semibold text-muted">{trv(item.sub)}</p>
                  </div>
                </div>
                <span
                  dir="ltr"
                  className="shrink-0 rounded-xl bg-primary px-3 py-1.5 font-mono text-sm font-extrabold text-ink shadow-2xs"
                >
                  📞 {item.phone}
                </span>
              </a>
            ))}
          </div>
        ) : (
          /* modern_grid, color_coded, dark_gold, collapsible */
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {list.map((item) => (
              <a
                key={item.phone}
                href={`tel:${item.phone}`}
                className={`stamp press flex flex-col items-center justify-between rounded-2xl border px-3 py-3 text-center transition ${toneCls(
                  item.tone,
                )}`}
              >
                <span className="text-xl" aria-hidden>{item.icon}</span>
                <span
                  dir="ltr"
                  className={`mt-1 font-mono text-xl font-extrabold leading-none ${
                    isDark ? "text-[#F2C94C]" : "text-primary-ink"
                  }`}
                >
                  {trv(item.phone)}
                </span>
                <span className="mt-1.5 line-clamp-1 text-xs font-extrabold">
                  {trv(item.name)}
                </span>
                <span className={`text-[10px] font-semibold ${isDark ? "text-white/65" : "text-muted"}`}>
                  {trv(item.sub)}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}


function HomeAppAndNotifySection() {
  const [dismissedInApp, setDismissedInApp] = useState(false);

  return (
    <div className="space-y-2.5">
      <InstallBanner />
      <NotifyPrompt />
      {!dismissedInApp ? (
        <section
          className="stamp border-2 border-primary/80 bg-gradient-to-l from-primary-soft/75 via-paper to-paper p-3.5 shadow-2xs"
          aria-label={tr("تثبيت التطبيق والإشعارات")}
        >
          {/* Row 1: Icon + Full-Width Title/Description + Dismiss Button */}
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <img
                src="/icons/icon-192.png"
                alt=""
                width={46}
                height={46}
                className="size-11 shrink-0 rounded-2xl border border-primary/50 shadow-2xs"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-extrabold leading-snug text-ink sm:text-base">
                    📲 {tr("تطبيق رهط بوست والإشعارات الفورية")}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#16A34A]/15 px-2 py-0.5 text-[10px] font-extrabold text-[#15803D]">
                    ● {tr("متصل ومحدّث")}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-muted">
                  {tr("احصل على تنبيهات الأخبار العاجلة، مواعيد باصات غاليم، وأرقام الطوارئ في رهط مباشرة على هاتفك.")}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setDismissedInApp(true)}
              aria-label={tr("إخفاء")}
              className="grid size-8 shrink-0 place-items-center rounded-xl text-xs font-extrabold text-muted hover:bg-surface hover:text-ink"
            >
              ✕
            </button>
          </div>

          {/* Row 2: Action Buttons side-by-side */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
            <Link
              to="/app"
              className="press inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3.5 py-2.5 text-xs font-extrabold text-ink shadow-2xs hover:bg-primary-hover"
            >
              🔔 {tr("التطبيق والإشعارات")}
            </Link>
            <Link
              to="/today"
              className="press inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs font-extrabold text-ink hover:border-primary"
            >
              🚨 {tr("طوارئ رهط")}
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
