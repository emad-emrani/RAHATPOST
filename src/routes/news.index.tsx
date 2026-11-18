import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdSlots } from "@/components/google-services";
import { Shell } from "@/components/shell";
import { NewsCredit, NewsLead, NewsUnavailable } from "@/components/news";
import { NewsImage } from "@/components/news-image";
import { CommentCount } from "@/components/comment-count";
import { getCustomSectionsNews, getNews, type CustomSectionResult } from "@/lib/news/api";
import { newsByline, relativeTimeAr, useNow } from "@/lib/news/format";
import { newsCategories, type NewsItem } from "@/lib/news/types";
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

function trSecLabel(raw: string, overrideLang?: string): string {
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

export const Route = createFileRoute("/news/")({
  head: ({ loaderData }) => {
    const items = (loaderData?.items ?? []).slice(0, 15);
    const listLd = items.length
      ? {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: tr("أخبار رهط والنقب اليوم · رهط بوست"),
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
      title: tr("أخبار رهط والنقب اليوم · رهط بوست"),
      description:
        tr("آخر أخبار رهط والنقب على مدار اليوم: بلدية رهط، التعليم، الصحة، الرياضة، فن وموضة والمجتمع من المواقع العربية المحلية، وأخبار يكتبها أهالي رهط في «من القراء»."),
      path: "/news",
      keywords: [
        "أخبار رهط",
        "أخبار النقب",
        "رهط بوست",
        "فن و موضة",
        "بلدية رهط",
        "أخبار رهط اليوم",
        "عاجل رهط",
      ],
      jsonLd: [
        breadcrumbLd([{ name: tr("أخبار رهط"), path: "/news" }]),
        ...(listLd ? [listLd] : []),
      ],
    });
  },
  loader: async () => {
    const [rawNews, rawCustomSecs] = await Promise.all([
      getNews(),
      getCustomSectionsNews().catch(() => [] as CustomSectionResult[]),
    ]);
    const seen = new Set(rawNews.items.map((i) => i.slug));
    const mergedItems: NewsItem[] = [...rawNews.items];
    const customCatNames: string[] = ["فن و موضة"];
    for (const cs of rawCustomSecs) {
      const cleanName = cs.name.trim();
      if (cleanName && !customCatNames.includes(cleanName)) {
        customCatNames.push(cleanName);
      }
      for (const it of cs.items) {
        if (!seen.has(it.slug)) {
          seen.add(it.slug);
          mergedItems.push(it);
        }
      }
    }
    const localizedData = await localized(
      { ...rawNews, items: mergedItems, customCatNames },
      (d) => [{ items: d.items, fields: ["title", "summary", "body"] }],
      "auto",
    );
    return localizedData;
  },
  staleTime: 5 * 60_000,
  component: NewsPage,
});

const LOCAL = "رهط والنقب";

function NewsPage() {
  const data = Route.useLoaderData();
  const now = useNow(data.now);
  const [cat, setCat] = useState("الكل");
  const siteLang = getLang();
  const [txLang, setTxLang] = useState<"ar" | "he" | "en" | "orig">(
    siteLang === "he" ? "he" : siteLang === "en" ? "en" : "ar",
  );
  const [txMap, setTxMap] = useState<Record<string, { title: string; summary: string }>>({});
  const [translating, setTranslating] = useState(false);

  useEffect(() => {
    setTxLang(siteLang === "he" ? "he" : siteLang === "en" ? "en" : "ar");
  }, [siteLang]);

  const allCategories = useMemo(() => {
    const extra = (data as { customCatNames?: string[] }).customCatNames ?? ["فن و موضة"];
    const base = [...newsCategories];
    for (const c of extra) {
      if (c && !base.includes(c as any)) base.push(c as any);
    }
    return base;
  }, [data]);

  const rawFiltered = useMemo(
    () =>
      data.items.filter((item) => {
        if (cat === "الكل") return true;
        if (cat === LOCAL) return item.local;
        if (cat === item.category) return true;
        if (/فن|موضة/.test(cat)) {
          return /فن|موضة|ثقافة|أزياء|مشاهير|جمال/.test(`${item.category} ${item.title} ${item.summary}`);
        }
        return false;
      }),
    [data.items, cat],
  );

  useEffect(() => {
    if (txLang === "orig" || rawFiltered.length === 0) return;
    let active = true;
    const subset = rawFiltered.slice(0, 12).filter((it) => {
      const k = `${it.slug}_${txLang}`;
      return !txMap[k] && detectSourceLang(it.title) !== txLang;
    });
    if (subset.length === 0) return;
    setTranslating(true);
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
        setTranslating(false);
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

  return (
    <Shell>
      <h1 className="mb-1 text-2xl font-bold">{tr("أخبار رهط والنقب")}</h1>
      <p className="mb-3 font-semibold text-muted">
        {tr("تغطية مستمرة لأخبار مدينة رهط وبلدات النقب والمجتمع المحلي على مدار الساعة.")}
      </p>

      {data.items.length === 0 ? (
        <NewsUnavailable />
      ) : (
        <>
          <div className="scroll-row -mx-4 mb-4 px-4">
            {["الكل", LOCAL, ...allCategories].map((item) => (
              <button
                key={item}
                type="button"
                className={item === cat ? "chip chip-ink shrink-0" : "chip shrink-0"}
                onClick={() => setCat(item)}
              >
                {trSecLabel(item, txLang === "orig" ? undefined : txLang)}
              </button>
            ))}
          </div>
          {list.length === 0 ? (
            <p className="stamp p-4 font-semibold">{tr("لا خبر في هذا التصنيف الآن.")}</p>
          ) : (
            <>
              <NewsLead item={list[0]} now={now} />
              <ul className="flex flex-col gap-3">
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
        </>
      )}
      <NewsCredit />
    </Shell>
  );
}
