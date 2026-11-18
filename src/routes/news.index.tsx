import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdSlots } from "@/components/google-services";
import { Shell } from "@/components/shell";
import { NewsCredit, NewsLead, NewsUnavailable } from "@/components/news";
import { NewsImage } from "@/components/news-image";
import { CommentCount } from "@/components/comment-count";
import { getCustomSectionsNews, getNews, type CustomSectionResult } from "@/lib/news/api";
import { newsByline, relativeTimeAr, useNow } from "@/lib/news/format";
import type { NewsItem } from "@/lib/news/types";
import { useSiteSettings } from "@/lib/site-settings/context";
import { absoluteUrl, breadcrumbLd, seo } from "@/lib/seo";
import { getLang, tr, trv } from "@/lib/i18n/core";
import { localizeTexts } from "@/lib/i18n/api";
import { localized } from "@/lib/i18n/localize";

const SECTION_DICT_NEWS: Record<string, { ar: string; he: string; en: string }> = {
  "فن و موضة": { ar: "فن و موضة", he: "אמנות ואופנה", en: "Art & Fashion" },
  "فن وموضة": { ar: "فن وموضة", he: "אמנות ואופנה", en: "Art & Fashion" },
  "ثقافة وفن": { ar: "ثقافة وفن", he: "תרבות ואמנות", en: "Culture & Art" },
  "فن وثقافة": { ar: "فن وثقافة", he: "אמנות ותרבות", en: "Art & Culture" },
  "موضة": { ar: "موضة", he: "אופנה", en: "Fashion" },
  "فن": { ar: "فن", he: "אמנות", en: "Art" },
  "مشاهير": { ar: "مشاهير", he: "סלבס ובידור", en: "Celebrities" },
};

export function trSecLabel(raw: string, overrideLang?: string): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const emojiMatch = trimmed.match(/^([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\s]+)(.+)$/u);
  const prefix = emojiMatch ? emojiMatch[1] : "";
  const core = (emojiMatch ? emojiMatch[2] : trimmed).trim();
  const lang = overrideLang || getLang() || "ar";
  const entry = SECTION_DICT_NEWS[core];
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

const newsTxMemCache = new Map<string, string>();

async function translateSingleTextClient(text: string, targetLang: "ar" | "he" | "en"): Promise<string> {
  const clean = text.trim();
  if (!clean) return "";
  const srcLang = detectSourceLang(clean);
  if (srcLang === targetLang) return clean;
  const cacheKey = `rp_tx_${srcLang}_${targetLang}_${clean.slice(0, 120)}`;
  const mem = newsTxMemCache.get(cacheKey);
  if (mem) return mem;
  if (typeof window !== "undefined") {
    try {
      const saved = window.localStorage.getItem(cacheKey);
      if (saved) {
        newsTxMemCache.set(cacheKey, saved);
        return saved;
      }
    } catch {}
  }
  if (srcLang === "ar" && targetLang !== "ar") {
    try {
      const srvOut = await localizeTexts({ data: { lang: targetLang, texts: [clean], kind: "auto" } });
      if (Array.isArray(srvOut) && srvOut[0] && srvOut[0].trim() !== clean) {
        const resText = srvOut[0].trim();
        newsTxMemCache.set(cacheKey, resText);
        if (typeof window !== "undefined") {
          try { window.localStorage.setItem(cacheKey, resText); } catch {}
        }
        return resText;
      }
    } catch {}
  }
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
        newsTxMemCache.set(cacheKey, out);
        if (typeof window !== "undefined") {
          try { window.localStorage.setItem(cacheKey, out); } catch {}
        }
        return out;
      }
    }
  } catch {}
  return clean;
}

export function normalizeSecKey(s: string): string {
  return s.replace(/\s+/g, "").replace(/[✨🎨👗📰]/g, "").trim();
}

/**
 * Shared Navigation Bar showing ONLY the News Sections displayed on the Homepage:
 * آخر الأخبار | أخبار إسرائيل | رياضة | أخبار تقنية | + Custom Homepage Sections (فن و موضة, etc.)
 */
export function HomepageNewsSectionsBar({
  activeKey,
  customSectionNames = [],
}: {
  activeKey: string;
  customSectionNames?: string[];
}) {
  const settings = useSiteSettings();
  const homeVis = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const h of settings.home ?? []) {
      map.set(h.id, h.visible !== false);
    }
    return map;
  }, [settings.home]);

  // Discover custom sections from DB + quickLinks that are visible on Homepage
  const customTabs = useMemo(() => {
    const names = new Set<string>(customSectionNames);
    names.add("فن و موضة");
    for (const q of settings.quickLinks ?? []) {
      if (q.id.startsWith("sec") && q.title.trim() && !q.subtitle?.includes("مَخفي_رئيسية")) {
        names.add(q.title.trim());
      }
    }
    return Array.from(names).filter(Boolean);
  }, [customSectionNames, settings.quickLinks]);

  const sections: {
    key: string;
    label: string;
    to: "/news" | "/israel-news" | "/sports-news" | "/tech-news";
    search?: { cat: string };
  }[] = [
    ...(homeVis.get("news") !== false
      ? [{ key: "news", label: tr("آخر الأخبار"), to: "/news" as const }]
      : []),
    ...(homeVis.get("israel") !== false
      ? [{ key: "israel", label: tr("أخبار إسرائيل"), to: "/israel-news" as const }]
      : []),
    ...customTabs.map((cName) => ({
      key: `cat:${normalizeSecKey(cName)}`,
      label: trSecLabel(cName),
      to: "/news" as const,
      search: { cat: cName },
    })),
    { key: "sports", label: tr("رياضة"), to: "/sports-news" as const },
    ...(homeVis.get("tech") !== false
      ? [{ key: "tech", label: tr("أخبار تقنية"), to: "/tech-news" as const }]
      : []),
  ];

  return (
    <nav
      aria-label={tr("أقسام الأخبار في الصفحة الرئيسية")}
      className="scroll-row -mx-4 mb-4 px-4 py-0.5"
    >
      {sections.map((sec) => {
        const isActive = sec.key === activeKey;
        return (
          <Link
            key={sec.key}
            to={sec.to}
            search={sec.search as never}
            className={
              isActive
                ? "chip chip-ink shrink-0 font-extrabold shadow-2xs"
                : "chip shrink-0 bg-paper hover:border-primary"
            }
          >
            {sec.label}
          </Link>
        );
      })}
    </nav>
  );
}

export const Route = createFileRoute("/news/")({
  validateSearch: (search: Record<string, unknown>): { cat?: string; q?: string } => ({
    cat: typeof search.cat === "string" && search.cat.trim() ? search.cat.trim() : undefined,
    q: typeof search.q === "string" && search.q.trim() ? search.q.trim() : undefined,
  }),
  head: ({ loaderData }) => {
    const items = (loaderData?.generalItems ?? []).slice(0, 15);
    const listLd = items.length
      ? {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: tr("آخر الأخبار · رهط بوست"),
          url: absoluteUrl("/news"),
          inLanguage: "ar",
          mainEntity: {
            "@type": "ItemList",
            itemListElement: items.map((item, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: item.title,
              url: absoluteUrl(`/news/${item.slug}`),
            })),
          },
        }
      : null;
    return seo({
      title: tr("آخر الأخبار · أخبار رهط والنقب اليوم · رهط بوست"),
      description:
        tr("آخر أخبار رهط والنقب على مدار اليوم: تغطية إخبارية فورية ومصوّرة لأهم أخبار المجتمع والأقسام في رهط والنقب."),
      path: "/news",
      keywords: [
        "آخر الأخبار",
        "أخبار رهط",
        "أخبار النقب",
        "رهط بوست",
        "أخبار رهط اليوم",
        "عاجل رهط",
      ],
      jsonLd: [
        breadcrumbLd([{ name: tr("آخر الأخبار"), path: "/news" }]),
        ...(listLd ? [listLd] : []),
      ],
    });
  },
  loader: async () => {
    const [rawNews, rawCustomSecs] = await Promise.all([
      getNews(),
      getCustomSectionsNews().catch(() => [] as CustomSectionResult[]),
    ]);

    const customCatNames: string[] = [];
    const customSectionsMap: Record<string, NewsItem[]> = {};
    const customSlugs = new Set<string>();

    for (const cs of rawCustomSecs) {
      const cleanName = cs.name.trim();
      if (!cleanName) continue;
      if (!customCatNames.includes(cleanName)) {
        customCatNames.push(cleanName);
      }
      customSectionsMap[cleanName] = cs.items;
      for (const it of cs.items) {
        customSlugs.add(it.slug);
      }
    }

    // Ensure "فن و موضة" is always populated if selected
    if (!customCatNames.some((n) => normalizeSecKey(n) === normalizeSecKey("فن و موضة"))) {
      customCatNames.push("فن و موضة");
    }

    // General "آخر الأخبار" items: strictly rawNews.items that are not exclusive to another custom section
    const generalItems = rawNews.items.filter(
      (i) =>
        !customCatNames.some(
          (cName) => normalizeSecKey(i.category) === normalizeSecKey(cName),
        ),
    );

    const localizedData = await localized(
      {
        ...rawNews,
        generalItems: generalItems.length > 0 ? generalItems : rawNews.items,
        allItems: rawNews.items,
        customCatNames,
        customSectionsMap,
      },
      (d) => [{ items: d.generalItems, fields: ["title", "summary", "body"] }],
      "auto",
    );
    return localizedData;
  },
  staleTime: 5 * 60_000,
  component: NewsPage,
});

function NewsPage() {
  const data = Route.useLoaderData();
  const searchParams = Route.useSearch();
  const now = useNow(data.now);

  const activeCat = (searchParams.cat || searchParams.q || "").trim();
  const isSpecificSection = Boolean(activeCat && activeCat !== "الكل" && activeCat !== "آخر الأخبار");

  const siteLang = getLang();
  const [txLang, setTxLang] = useState<"ar" | "he" | "en" | "orig">(
    siteLang === "he" ? "he" : siteLang === "en" ? "en" : "ar",
  );
  const [txMap, setTxMap] = useState<Record<string, { title: string; summary: string }>>({});

  useEffect(() => {
    setTxLang(siteLang === "he" ? "he" : siteLang === "en" ? "en" : "ar");
  }, [siteLang]);

  // Strictly return ONLY the items belonging to the clicked section!
  const rawFiltered = useMemo(() => {
    if (!isSpecificSection) {
      // Clicked "آخر الأخبار" -> Show ONLY "آخر الأخبار" items!
      return data.generalItems ?? data.items ?? [];
    }

    const normTarget = normalizeSecKey(activeCat);
    const map = (data as { customSectionsMap?: Record<string, NewsItem[]> }).customSectionsMap ?? {};
    for (const [secName, secItems] of Object.entries(map)) {
      if (normalizeSecKey(secName) === normTarget && secItems.length > 0) {
        return secItems;
      }
    }

    const pool = data.allItems ?? data.items ?? [];
    const matched = pool.filter((item) => {
      if (normalizeSecKey(item.category) === normTarget) return true;
      if (item.title.includes(activeCat) || item.summary.includes(activeCat)) return true;
      if (/فن|موضة/.test(activeCat)) {
        return /فن|موضة|ثقافة|أزياء|مشاهير|جمال|مهرجان|سينما|فنان/.test(
          `${item.category} ${item.title} ${item.summary}`,
        );
      }
      return false;
    });

    return matched.length > 0 ? matched : pool.slice(0, 8);
  }, [data, activeCat, isSpecificSection]);

  useEffect(() => {
    if (txLang === "orig" || rawFiltered.length === 0) return;
    let active = true;
    const subset = rawFiltered.slice(0, 12).filter((it) => {
      const k = `${it.slug}_${txLang}`;
      return !txMap[k] && detectSourceLang(it.title) !== txLang;
    });
    if (subset.length === 0) return;
    void (async () => {
      const next: Record<string, { title: string; summary: string }> = {};
      await Promise.all(
        subset.map(async (it) => {
          const [tTitle, tSum] = await Promise.all([
            translateSingleTextClient(it.title, txLang),
            it.summary ? translateSingleTextClient(it.summary, txLang) : Promise.resolve(""),
          ]);
          next[`${it.slug}_${txLang}`] = {
            title: tTitle || it.title,
            summary: tSum || it.summary,
          };
        }),
      );
      if (active) {
        setTxMap((prev) => ({ ...prev, ...next }));
      }
    })();
    return () => {
      active = false;
    };
  }, [rawFiltered, txLang]);

  const list = useMemo(() => {
    if (txLang === "orig") return rawFiltered;
    return rawFiltered.map((it) => {
      const hit = txMap[`${it.slug}_${txLang}`];
      if (!hit) return it;
      return {
        ...it,
        title: hit.title,
        summary: hit.summary,
      };
    });
  }, [rawFiltered, txMap, txLang]);

  const pageHeading = isSpecificSection
    ? trSecLabel(activeCat, txLang === "orig" ? undefined : txLang)
    : tr("آخر الأخبار");

  const activeBarKey = isSpecificSection ? `cat:${normalizeSecKey(activeCat)}` : "news";

  return (
    <Shell>
      <h1 className="mb-1 text-2xl font-extrabold">{pageHeading}</h1>
      <p className="mb-3 text-sm font-semibold text-muted">
        {isSpecificSection
          ? `${tr("جميع الأخبار والمقالات الخاصة بقسم")} «${pageHeading}»`
          : tr("آخر أخبار رهط والنقب والمجتمع المحلي على مدار الساعة.")}
      </p>

      {/* Homepage Sections Switcher Bar (بدلاً من القائمة القديمة) */}
      <HomepageNewsSectionsBar
        activeKey={activeBarKey}
        customSectionNames={(data as { customCatNames?: string[] }).customCatNames ?? []}
      />

      {list.length === 0 ? (
        <NewsUnavailable />
      ) : (
        <>
          <NewsLead item={list[0]} now={now} />
          <ul className="mt-3 flex flex-col gap-3">
            {list.slice(1).map((item, i) => (
              <li key={item.slug}>
                {i === 4 ? (
                  <div className="mb-3">
                    <AdSlots placement="newsList" />
                  </div>
                ) : null}
                <Link
                  to="/news/$slug"
                  params={{ slug: item.slug }}
                  className="stamp press flex items-start gap-3 p-3"
                >
                  <NewsImage item={item} className="size-22 rounded-xl" iconClassName="size-7" />
                  <span className="min-w-0 flex-1">
                    <span className={item.breaking ? "chip chip-alert" : "chip chip-deep"}>
                      {item.breaking
                        ? tr("عاجل")
                        : item.reader
                          ? tr("من القراء")
                          : isSpecificSection
                            ? pageHeading
                            : trSecLabel(item.category, txLang === "orig" ? undefined : txLang)}
                    </span>
                    <span dir="auto" className="mt-1 line-clamp-3 block font-bold leading-snug">
                      {trv(item.title)}
                    </span>
                    <span className="text-sm font-semibold text-muted">
                      {relativeTimeAr(item.publishedAt, now)} · {newsByline(item)}
                      <CommentCount n={item.comments} className="ms-2" />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      <NewsCredit />
    </Shell>
  );
}
