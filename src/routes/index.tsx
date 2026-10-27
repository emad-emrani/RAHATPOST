```react
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bus, ChevronLeft, MapPin, Megaphone, Newspaper, Plus, RefreshCw, Search, Siren, Store, Trophy, Tv, type LucideIcon } from "lucide-react";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
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
import { mediaUrl } from "@/lib/media/types";
import { NotifyPrompt } from "@/components/notify";
import { NewsLead, NewsUnavailable, newestFirst } from "@/components/news";
import { getApprovedEntries } from "@/lib/directory/api";
import { osmEntries, type DirectoryEntry } from "@/lib/directory/types";
import { getAutoSectionFlags, getNews, getSportsNews, getTechNews } from "@/lib/news/api";
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
import { tr, trv } from "@/lib/i18n/core";
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
    const [news, approved, ads, israel, weather, board, store, tech, flags, sports, matches] = await Promise.all([
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
    ]);
    const [lNews, lIsrael, lStore, lTech, lSports] = await Promise.all([
      localized(news, (d) => [{ items: d.items, fields: ["title", "summary", "body"] }], "auto"),
      localizedIsrael(israel, (d) => d?.items ?? []),
      localized(store, (d) => [{ items: d.products, fields: ["name", "shortDesc", "description"] }, { items: d.categories, fields: ["name", "description"] }]),
      tech ? localized(tech, (d) => [{ items: d.items.slice(0, 5), fields: ["title", "summary"] }], "auto") : null,
      sports ? localized(sports, (d) => [{ items: d.items.slice(0, 5), fields: ["title", "summary"] }], "auto") : null,
    ]);
    return { news: lNews, approved: approved.entries, ads, israel: lIsrael, weather, board, store: lStore, tech: lTech, sports: lSports, flags, matches };
  },
  // New items must show up within a minute or two: short CDN cache, revalidated in the background.
  headers: () => ({ "Cache-Control": HOME_CACHE }),
  staleTime: 60_000,
  component: Home,
});

const HOME_CACHE = "public, max-age=0, s-maxage=60, stale-while-revalidate=180";

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

function Home() {
  const { news, approved, ads: adsData, israel, weather, board, store, tech, sports, flags, matches } = Route.useLoaderData();
  const showSec = (id: string) => flags[id] !== false;
  const techTop = tech?.home ? tech.items.slice(0, 5) : [];
  const sportsTop = sports?.home ? sports.items.slice(0, 5) : [];
  const settings = useSiteSettings();
  const visibleCustomSections = useMemo(() => {
    return (settings.quickLinks ?? [])
      .filter((q) => q.id.startsWith("sec") && q.subtitle !== " مَخفي")
      .map((q) => {
        const cat = q.url.includes("q=") ? decodeURIComponent(q.url.split("q=")[1] ?? "") : "";
        const matched = news.items.filter(
          (i) =>
            (cat && (i.category === cat || i.title.includes(cat) || i.summary.includes(cat))) ||
            i.category === q.title,
        );
        return {
          id: q.id,
          name: `${q.emoji ? q.emoji + " " : ""}${q.title}`,
          home: true,
          items: matched.length > 0 ? matched : news.items.slice(0, 5),
        };
      });
  }, [settings.quickLinks, news.items]);
  const israelItems = useMemo(() => israel?.items ?? [], [israel]);
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
  const query = q.trim();
  const ranked = newestFirst(news.items);
  const breaking = news.items.find((item) => item.breaking);
  const israelBreaking = israelItems.find((item) => item.breaking);
  const top = ranked[0];
  const remaining = ranked.slice(1);
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
  const israelFirst = israelTop[0];
  const sectionSlides: SectionSlide[] = [
    ...(showSec("news") && latestFeed ? [newsSlide("news", "آخر الأخبار", latestFeed)] : []),
    ...visibleCustomSections.filter((cs) => cs.items.length > 0).map((cs) => newsSlide(`custom-${cs.id}`, cs.name, cs.items[0])),
    ...(showSec("israel") && israelFirst
      ? [
          {
            key: "israel",
            label: "أخبار إسرائيل",
            link: { to: "/israel-news/$slug" as const, params: { slug: israelFirst.slug } },
            item: { image: israelFirst.image, title: israelFirst.titleAr ?? israelFirst.titleHe, category: israelFirst.category, source: israelFirst.source },
            title: <IsraelTitle item={israelFirst} />,
            meta: `${relativeTimeAr(israelFirst.publishedAt, now)} · ${trv(israelFirst.source)}`,
          },
        ]
      : []),
    ...(sportsTop[0] ? [newsSlide("sports", "رياضة", sportsTop[0])] : []),
    ...(tech?.items[0] && showSec("tech") ? [newsSlide("tech", "أخبار تقنية", tech.items[0])] : []),
    ...(latestReader ? [newsSlide("reader", "من القراء", latestReader)] : []),
  ];

  const results = useMemo(() => {
    if (!query) return null;
    const hay = (value: string) => value.includes(query);
    return {
      news: news.items.filter(
        (item) => hay(item.title) || hay(item.category) || hay(item.source) || hay(item.summary),
      ),
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

  const directoryPreview = places.length ? (
    <section>
      <SectionTitle title={tr("دليل محلات وخدمات رهط")} to="/directory" more={tr("كل الدليل")} />
      <ul className="grid gap-3 sm:grid-cols-2">
        {places.slice(0, 6).map((place) => (
          <li key={place.slug}>
            <Link
              to="/directory/$slug"
              params={{ slug: place.slug }}
              className="stamp press flex items-center gap-3 px-4 py-3"
            >
              <span className="icon-badge shrink-0">
                <MapPin className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold leading-snug">{trv(place.name)}</span>
                <span className="text-sm font-semibold text-muted">
                  {trv(place.category)}
                  {place.address || place.area ? ` · ${trv(place.address ?? place.area ?? "")}` : ""}
                </span>
              </span>
              <ChevronLeft className="size-5 shrink-0 text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  ) : null;

  type ExtendedHomeSectionId = HomeSectionId | "matches";
  const blocks: Record<ExtendedHomeSectionId, ReactNode> = {
    weather: !showSec("weather") ? null : <HomeTodayChips weather={weather} serverNow={news.now} />,
    slider: <HomeCarousel lead={top} leadTime={top ? relativeTimeAr(top.publishedAt, now) : ""} sections={sectionSlides} />,
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
    tiles: <HomeTilesBar hasLiveMatch={Boolean(matches?.matches?.some((m) => m.status === "in" || (m as { streamUrl?: string }).streamUrl || (m.note && /https?:\/\//i.test(m.note))))} />,
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
        {visibleCustomSections.map((cs) => (
          <section key={cs.id} className="mt-6">
            <SectionTitle title={trv(cs.name)} to="/news" more={tr("كل الأخبار")} />
            {cs.items.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-6">
                  <NewsLead item={cs.items[0]} now={now} />
                </div>
                {cs.items.length > 1 ? (
                  <ul className="stack-list lg:col-span-6">
                    {cs.items.slice(1, 6).map((item) => (
                      <li key={item.slug}>
                        <Link to="/news/$slug" params={{ slug: item.slug }} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface/60">
                          <NewsImage item={item} className="size-16 rounded-xl" />
                          <span className="min-w-0 flex-1">
                            <span className="block font-bold leading-snug">{trv(item.title)}</span>
                            <span className="text-sm font-semibold text-muted">
                              {trv(item.category)} · {relativeTimeAr(item.publishedAt, now)} · {newsByline(item)}
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
                {tr("قسم جديد — يمكنك نشر أخبار في هذا القسم من لوحة التحكم ← نشر خبر جديد.")}
              </p>
            )}
          </section>
        ))}
        <AdSlots placement="home" />
      </>
    ),
    matches: <HomeMatchesWidget initial={matches} />,
    sports:
      sportsTop.length > 0 ? (
        <section>
          <SectionTitle title={tr("رياضة")} to="/sports-news" more={tr("عرض الكل")} />
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <NewsLead item={sportsTop[0]} now={now} />
            </div>
            <ul className="stack-list lg:col-span-6">
              {sportsTop.slice(1).map((item) => (
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
      techTop.length > 0 ? (
        <section>
          <SectionTitle title={tr("أخبار تقنية")} to="/tech-news" more={tr("عرض الكل")} />
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <NewsLead item={techTop[0]} now={now} />
            </div>
            <ul className="stack-list lg:col-span-6">
              {techTop.slice(1).map((item) => (
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
        <HomePostCard guide={postGuide} />
      </section>
    ) : null,
    install: (
      <>
        <InstallBanner />
        <NotifyPrompt />
      </>
    ),
    buses: (
      <section>
        <SectionTitle title={tr("باصات غاليم في رهط والنقب")} to="/buses" more={tr("كل المواعيد")} />
        <Link to="/buses" className="stamp press flex items-center gap-3 p-4">
          <span className="icon-badge">
            <Bus className="size-6" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{tr("خطوط المدينة 1 حتى 6، وبئر السبع والبلدات المجاورة")}</span>
            <span className="text-sm font-semibold text-muted">
              {tr("شركة גלים · تتبع مباشر على الخريطة وجدول أوقات اليوم")}
            </span>
          </span>
          <ChevronLeft className="size-5 text-muted" aria-hidden />
        </Link>
      </section>
    ),
    directory: (
      <>
        {store.products.length ? (
          <section>
            <SectionTitle title={tr("من المتجر")} to="/store" more={tr("كل المتجر")} />
            <ul className="scroll-row -mx-4 px-4 pb-2 sm:mx-0 sm:px-0">
              {store.products.slice(0, 8).map((p) => (
                <li key={p.id} className="w-48 shrink-0">
                  <ProductCard p={p} currency={store.settings.currency} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {directoryPreview}
      </>
    ),
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
                  {item.sample ? <span className="chip ms-1">{tr("نموذج")}</span> : null}
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
    emergency: (
      <section>
        <SectionTitle title={tr("أرقام الطوارئ في رهط")} to="/today" more={tr("كل الأرقام")} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {emergency.slice(0, 4).map((item) => (
            <a
              key={item.phone}
              href={`tel:${item.phone}`}
              className="stamp press flex flex-col items-center px-3 py-3.5 text-center"
            >
              <span className="text-2xl font-extrabold leading-none text-primary-ink">{trv(item.phone)}</span>
              <span className="mt-1.5 text-sm font-bold">{trv(item.name)}</span>
            </a>
          ))}
        </div>
      </section>
    ),
  };

  // Ensure the install banner never blocks above-the-fold news even if an older DB order had it at #2
  const rawOrder = settings.home.filter((h) => h.visible).map((h) => h.id);
  const baseOrder: ExtendedHomeSectionId[] = [
    ...rawOrder.filter((id) => id !== "install"),
    ...(rawOrder.includes("install") ? (["install"] as HomeSectionId[]) : []),
  ];
  const order: ExtendedHomeSectionId[] = (() => {
    if (baseOrder.includes("matches")) return baseOrder;
    const newsIdx = baseOrder.indexOf("news");
    if (newsIdx !== -1) {
      const copy = [...baseOrder];
      // Place matches right above news when a live match is active, or right after news
      const hasLive = Boolean(matches?.matches?.some((m) => m.status === "in" || (m as { streamUrl?: string }).streamUrl || (m.note && /https?:\/\//i.test(m.note))));
      copy.splice(hasLive ? newsIdx : newsIdx + 1, 0, "matches");
      return copy;
    }
    return ["matches", ...baseOrder];
  })();
  const TOP: ExtendedHomeSectionId[] = ["weather", "slider", "search"];

  return (
    <Shell>
      <div className="flex flex-col gap-6">
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
            {!order.includes("matches") ? blocks.matches : null}
            {!order.includes("directory") ? directoryPreview : null}
          </>
        )}
      </div>
    </Shell>
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
  const empty =
    results.news.length + results.places.length + results.ads.length + results.israel.length === 0;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{tr("نتائج «")}{trv(query)}»</h1>
      {empty ? (
        <p className="stamp p-4 font-semibold">{tr("لا توجد نتيجة. جرّب اسماً أو حياً أو تصنيفاً.")}</p>
      ) : null}
      {results.news.map((item) => (
        <Link
          key={item.slug}
          to="/news/$slug"
          params={{ slug: item.slug }}
          className="stamp press block p-4"
        >
          <span className="chip chip-deep">{trv(item.category)}</span>
          <span className="mt-2 block font-bold">{trv(item.title)}</span>
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
} {
  const rawStream = (m as { streamUrl?: string }).streamUrl?.trim();
  const rawChannel = (m as { channel?: string }).channel?.trim();
  let note = (m.note ?? "").trim();
  let urlFromNote: string | undefined;
  let chanFromNote: string | undefined;

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

function MatchRowCard({ m, showLeagueBadge }: { m: MatchItem; showLeagueBadge?: boolean }) {
  const isLive = m.status === "in";
  const isDone = m.status === "post";
  const { streamUrl, channel, cleanNote } = extractMatchStream(m);
  const [watchOpen, setWatchOpen] = useState(false);
  const embed = streamUrl ? toEmbedStreamUrl(streamUrl) : null;

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

      {channel || cleanNote || streamUrl ? (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-muted">
            {channel ? (
              <span className="rounded-lg bg-surface px-2 py-0.5 font-extrabold text-ink">
                📡 {trv(channel)}
              </span>
            ) : null}
            {cleanNote ? <span>{trv(cleanNote)}</span> : null}
          </div>

          {streamUrl ? (
            <button
              type="button"
              onClick={() => setWatchOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-extrabold text-white shadow-2xs transition ${
                watchOpen ? "bg-ink" : "bg-[#DC2626] hover:bg-[#B91C1C]"
              }`}
            >
              <span className="size-2 animate-ping rounded-full bg-white" />
              {watchOpen ? tr("إغلاق البث ✕") : tr("📺 مشاهدة البث المباشر")}
            </button>
          ) : null}
        </div>
      ) : null}

      {watchOpen && streamUrl && embed ? (
        <div className="mt-2 overflow-hidden rounded-2xl border border-line bg-black text-white shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-ink px-3 py-2 text-xs font-extrabold text-paper">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 animate-ping rounded-full bg-[#DC2626]" />
              {tr("بث مباشر:")} {trv(m.homeTeam)} × {trv(m.awayTeam)}
            </span>
            <a
              href={streamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/25"
            >
              {tr("فتح البث في نافذة مستقلة ↗")}
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
  "Hapoel Be'er Sheva": "هبوعيل بئر السبع",
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

function trTeamClient(raw: string): string {
  const clean = raw.trim();
  if (!clean) return "";
  if (CLIENT_TEAM_AR[clean]) return CLIENT_TEAM_AR[clean];
  for (const [en, ar] of Object.entries(CLIENT_TEAM_AR)) {
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

function buildCuratedRoundFallback(): MatchItem[] {
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

async function fetchClientEspnLeague(league: {
  id: string;
  shortAr: string;
  badge: string;
}): Promise<MatchItem[]> {
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

      const out: MatchItem[] = [];
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

        out.push({
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
        });
      }
      if (out.length > 0) return out;
    } catch {
      // try next url
    }
  }
  return [];
}

async function fetchClientSportsDbLeague(league: {
  id: string;
  shortAr: string;
  badge: string;
}): Promise<MatchItem[]> {
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
    const out: MatchItem[] = [];
    for (const ev of rawEvents.slice(0, 14)) {
      if (!ev?.strHomeTeam || !ev?.strAwayTeam || !ev?.dateEvent) continue;
      const timeStr = String(ev.strTime ?? "18:00:00").slice(0, 8);
      const kickoffIso = `${ev.dateEvent}T${timeStr.includes(":") ? timeStr : "18:00:00"}Z`;
      const hasScore = ev.intHomeScore !== null && ev.intHomeScore !== undefined && ev.intHomeScore !== "";
      const rawStatus = String(ev.strStatus ?? "").toUpperCase();
      const isLive = rawStatus === "LIVE" || rawStatus === "1H" || rawStatus === "2H" || rawStatus === "HT";
      const status: "pre" | "in" | "post" = isLive ? "in" : hasScore ? "post" : "pre";
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
          status === "in" ? "مباشر الآن" : status === "post" ? "انتهت" : clientTimeAr(kickoffIso),
        kickoffIso,
        kickoffTimeAr: clientTimeAr(kickoffIso),
        dayKey: clientDayKey(kickoffIso),
        dateLabelAr: clientShortDateAr(kickoffIso),
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
  const byId = new Map<string, MatchItem>();
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
    const id = setInterval(() => void sync(), 60_000);
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
    void (async () => {
      try {
        const srv = initial ?? (await getMatchesBoard().catch(() => null));
        if (srv) {
          const enriched = await enrichBoardClientSide(srv);
          if (active) setBoard(enriched);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
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

const BASE_TILES: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/news", label: "الأخبار", icon: Newspaper },
  { to: "/buses", label: "الباصات", icon: Bus },
  { to: "/directory", label: "الدليل", icon: MapPin },
  { to: "/haraj", label: "حراج", icon: Megaphone },
  { to: "/today", label: "اليوم", icon: Siren },
  { to: "/store", label: "المتجر", icon: Store },
  { to: "/submit", label: "أضف", icon: Plus },
];

function HomeTilesBar({ hasLiveMatch }: { hasLiveMatch?: boolean }) {
  const st = useSiteSettings();
  const order = st.tiles;
  const baseList = order
    .filter((o) => o.visible)
    .map((o) => BASE_TILES.find((t) => t.to === o.id))
    .filter((t): t is (typeof BASE_TILES)[number] => Boolean(t));

  // Check admin configuration for the "بث مباريات" tile (stored in quickLinks with id === "tilelive")
  const liveTileCfg = (st.quickLinks ?? []).find((q) => q.id === "tilelive");
  const showLiveTile = liveTileCfg ? liveTileCfg.subtitle !== " مَخفي" : true;
  const liveTileLabel = liveTileCfg?.title?.trim() || "بث مباريات";
  const liveTileTarget =
    liveTileCfg?.url?.trim() && liveTileCfg.url.startsWith("/")
      ? liveTileCfg.url.trim()
      : "/sports-news";

  // Also include any custom sections added in /admin
  const customSecTiles = (st.quickLinks ?? [])
    .filter((q) => q.id.startsWith("sec") && q.subtitle !== " مَخفي")
    .map((q) => ({
      to: q.url || "/news",
      label: q.title,
      icon: Newspaper as LucideIcon,
      isLiveTile: false,
    }));

  const combined: { to: string; label: string; icon: LucideIcon; isLiveTile?: boolean }[] = [
    ...baseList.map((b) => ({ ...b, isLiveTile: false })),
  ];

  if (showLiveTile) {
    // Insert "بث مباريات" right at the front of the visible tiles (index 1, right beside الأخبار / اليوم)
    const insertIdx = combined.length > 0 ? 1 : 0;
    combined.splice(insertIdx, 0, {
      to: liveTileTarget,
      label: liveTileLabel,
      icon: Tv,
      isLiveTile: true,
    });
  }

  for (const ct of customSecTiles) {
    if (!combined.some((c) => c.label === ct.label)) {
      combined.push(ct);
    }
  }

  if (!combined.length) return null;

  return (
    <nav
      className="scroll-row -mx-4 px-4 sm:mx-0 sm:flex sm:flex-wrap sm:justify-between sm:gap-3 sm:px-0"
      aria-label={tr("الأقسام")}
    >
      {combined.map((t, idx) => {
        const Icon = t.icon;
        return (
          <Link
            key={`${t.to}-${idx}`}
            to={t.to as "/"}
            className="tile relative sm:flex-1"
          >
            <span
              className={`tile-icon relative sm:w-full ${
                t.isLiveTile ? "ring-2 ring-[#DC2626]/40" : ""
              }`}
            >
              <Icon className="size-6 sm:size-7" aria-hidden />
              {t.isLiveTile ? (
                <span
                  className={`absolute top-1.5 start-1.5 size-2.5 rounded-full bg-[#DC2626] ${
                    hasLiveMatch ? "animate-ping" : ""
                  }`}
                />
              ) : null}
            </span>
            <span className={t.isLiveTile ? "font-extrabold text-[#DC2626]" : ""}>
              {t.to === "/haraj" ? trv(st.texts.harajNav) : trv(t.label)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function HomeQuickLinks() {
  const links = (useSiteSettings().quickLinks ?? []).filter(
    (l) => l.id !== "tilelive" && l.subtitle !== " مَخفي",
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
``````react
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bus, ChevronLeft, MapPin, Megaphone, Newspaper, Plus, RefreshCw, Search, Siren, Store, Trophy, Tv, type LucideIcon } from "lucide-react";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
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
import { mediaUrl } from "@/lib/media/types";
import { NotifyPrompt } from "@/components/notify";
import { NewsLead, NewsUnavailable, newestFirst } from "@/components/news";
import { getApprovedEntries } from "@/lib/directory/api";
import { osmEntries, type DirectoryEntry } from "@/lib/directory/types";
import { getAutoSectionFlags, getNews, getSportsNews, getTechNews } from "@/lib/news/api";
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
import { tr, trv } from "@/lib/i18n/core";
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
    const [news, approved, ads, israel, weather, board, store, tech, flags, sports, matches] = await Promise.all([
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
    ]);
    const [lNews, lIsrael, lStore, lTech, lSports] = await Promise.all([
      localized(news, (d) => [{ items: d.items, fields: ["title", "summary", "body"] }], "auto"),
      localizedIsrael(israel, (d) => d?.items ?? []),
      localized(store, (d) => [{ items: d.products, fields: ["name", "shortDesc", "description"] }, { items: d.categories, fields: ["name", "description"] }]),
      tech ? localized(tech, (d) => [{ items: d.items.slice(0, 5), fields: ["title", "summary"] }], "auto") : null,
      sports ? localized(sports, (d) => [{ items: d.items.slice(0, 5), fields: ["title", "summary"] }], "auto") : null,
    ]);
    return { news: lNews, approved: approved.entries, ads, israel: lIsrael, weather, board, store: lStore, tech: lTech, sports: lSports, flags, matches };
  },
  // New items must show up within a minute or two: short CDN cache, revalidated in the background.
  headers: () => ({ "Cache-Control": HOME_CACHE }),
  staleTime: 60_000,
  component: Home,
});

const HOME_CACHE = "public, max-age=0, s-maxage=60, stale-while-revalidate=180";

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

function Home() {
  const { news, approved, ads: adsData, israel, weather, board, store, tech, sports, flags, matches } = Route.useLoaderData();
  const showSec = (id: string) => flags[id] !== false;
  const techTop = tech?.home ? tech.items.slice(0, 5) : [];
  const sportsTop = sports?.home ? sports.items.slice(0, 5) : [];
  const settings = useSiteSettings();
  const visibleCustomSections = useMemo(() => {
    return (settings.quickLinks ?? [])
      .filter((q) => q.id.startsWith("sec") && q.subtitle !== " مَخفي")
      .map((q) => {
        const cat = q.url.includes("q=") ? decodeURIComponent(q.url.split("q=")[1] ?? "") : "";
        const matched = news.items.filter(
          (i) =>
            (cat && (i.category === cat || i.title.includes(cat) || i.summary.includes(cat))) ||
            i.category === q.title,
        );
        return {
          id: q.id,
          name: `${q.emoji ? q.emoji + " " : ""}${q.title}`,
          home: true,
          items: matched.length > 0 ? matched : news.items.slice(0, 5),
        };
      });
  }, [settings.quickLinks, news.items]);
  const israelItems = useMemo(() => israel?.items ?? [], [israel]);
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
  const query = q.trim();
  const ranked = newestFirst(news.items);
  const breaking = news.items.find((item) => item.breaking);
  const israelBreaking = israelItems.find((item) => item.breaking);
  const top = ranked[0];
  const remaining = ranked.slice(1);
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
  const israelFirst = israelTop[0];
  const sectionSlides: SectionSlide[] = [
    ...(showSec("news") && latestFeed ? [newsSlide("news", "آخر الأخبار", latestFeed)] : []),
    ...visibleCustomSections.filter((cs) => cs.items.length > 0).map((cs) => newsSlide(`custom-${cs.id}`, cs.name, cs.items[0])),
    ...(showSec("israel") && israelFirst
      ? [
          {
            key: "israel",
            label: "أخبار إسرائيل",
            link: { to: "/israel-news/$slug" as const, params: { slug: israelFirst.slug } },
            item: { image: israelFirst.image, title: israelFirst.titleAr ?? israelFirst.titleHe, category: israelFirst.category, source: israelFirst.source },
            title: <IsraelTitle item={israelFirst} />,
            meta: `${relativeTimeAr(israelFirst.publishedAt, now)} · ${trv(israelFirst.source)}`,
          },
        ]
      : []),
    ...(sportsTop[0] ? [newsSlide("sports", "رياضة", sportsTop[0])] : []),
    ...(tech?.items[0] && showSec("tech") ? [newsSlide("tech", "أخبار تقنية", tech.items[0])] : []),
    ...(latestReader ? [newsSlide("reader", "من القراء", latestReader)] : []),
  ];

  const results = useMemo(() => {
    if (!query) return null;
    const hay = (value: string) => value.includes(query);
    return {
      news: news.items.filter(
        (item) => hay(item.title) || hay(item.category) || hay(item.source) || hay(item.summary),
      ),
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

  const directoryPreview = places.length ? (
    <section>
      <SectionTitle title={tr("دليل محلات وخدمات رهط")} to="/directory" more={tr("كل الدليل")} />
      <ul className="grid gap-3 sm:grid-cols-2">
        {places.slice(0, 6).map((place) => (
          <li key={place.slug}>
            <Link
              to="/directory/$slug"
              params={{ slug: place.slug }}
              className="stamp press flex items-center gap-3 px-4 py-3"
            >
              <span className="icon-badge shrink-0">
                <MapPin className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold leading-snug">{trv(place.name)}</span>
                <span className="text-sm font-semibold text-muted">
                  {trv(place.category)}
                  {place.address || place.area ? ` · ${trv(place.address ?? place.area ?? "")}` : ""}
                </span>
              </span>
              <ChevronLeft className="size-5 shrink-0 text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  ) : null;

  type ExtendedHomeSectionId = HomeSectionId | "matches";
  const blocks: Record<ExtendedHomeSectionId, ReactNode> = {
    weather: !showSec("weather") ? null : <HomeTodayChips weather={weather} serverNow={news.now} />,
    slider: <HomeCarousel lead={top} leadTime={top ? relativeTimeAr(top.publishedAt, now) : ""} sections={sectionSlides} />,
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
    tiles: <HomeTilesBar hasLiveMatch={Boolean(matches?.matches?.some((m) => m.status === "in" || (m as { streamUrl?: string }).streamUrl || (m.note && /https?:\/\//i.test(m.note))))} />,
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
        {visibleCustomSections.map((cs) => (
          <section key={cs.id} className="mt-6">
            <SectionTitle title={trv(cs.name)} to="/news" more={tr("كل الأخبار")} />
            {cs.items.length > 0 ? (
              <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-6">
                  <NewsLead item={cs.items[0]} now={now} />
                </div>
                {cs.items.length > 1 ? (
                  <ul className="stack-list lg:col-span-6">
                    {cs.items.slice(1, 6).map((item) => (
                      <li key={item.slug}>
                        <Link to="/news/$slug" params={{ slug: item.slug }} className="flex items-center gap-3 px-4 py-3 transition hover:bg-surface/60">
                          <NewsImage item={item} className="size-16 rounded-xl" />
                          <span className="min-w-0 flex-1">
                            <span className="block font-bold leading-snug">{trv(item.title)}</span>
                            <span className="text-sm font-semibold text-muted">
                              {trv(item.category)} · {relativeTimeAr(item.publishedAt, now)} · {newsByline(item)}
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
                {tr("قسم جديد — يمكنك نشر أخبار في هذا القسم من لوحة التحكم ← نشر خبر جديد.")}
              </p>
            )}
          </section>
        ))}
        <AdSlots placement="home" />
      </>
    ),
    matches: <HomeMatchesWidget initial={matches} />,
    sports:
      sportsTop.length > 0 ? (
        <section>
          <SectionTitle title={tr("رياضة")} to="/sports-news" more={tr("عرض الكل")} />
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <NewsLead item={sportsTop[0]} now={now} />
            </div>
            <ul className="stack-list lg:col-span-6">
              {sportsTop.slice(1).map((item) => (
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
      techTop.length > 0 ? (
        <section>
          <SectionTitle title={tr("أخبار تقنية")} to="/tech-news" more={tr("عرض الكل")} />
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <NewsLead item={techTop[0]} now={now} />
            </div>
            <ul className="stack-list lg:col-span-6">
              {techTop.slice(1).map((item) => (
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
        <HomePostCard guide={postGuide} />
      </section>
    ) : null,
    install: (
      <>
        <InstallBanner />
        <NotifyPrompt />
      </>
    ),
    buses: (
      <section>
        <SectionTitle title={tr("باصات غاليم في رهط والنقب")} to="/buses" more={tr("كل المواعيد")} />
        <Link to="/buses" className="stamp press flex items-center gap-3 p-4">
          <span className="icon-badge">
            <Bus className="size-6" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{tr("خطوط المدينة 1 حتى 6، وبئر السبع والبلدات المجاورة")}</span>
            <span className="text-sm font-semibold text-muted">
              {tr("شركة גלים · تتبع مباشر على الخريطة وجدول أوقات اليوم")}
            </span>
          </span>
          <ChevronLeft className="size-5 text-muted" aria-hidden />
        </Link>
      </section>
    ),
    directory: (
      <>
        {store.products.length ? (
          <section>
            <SectionTitle title={tr("من المتجر")} to="/store" more={tr("كل المتجر")} />
            <ul className="scroll-row -mx-4 px-4 pb-2 sm:mx-0 sm:px-0">
              {store.products.slice(0, 8).map((p) => (
                <li key={p.id} className="w-48 shrink-0">
                  <ProductCard p={p} currency={store.settings.currency} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {directoryPreview}
      </>
    ),
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
                  {item.sample ? <span className="chip ms-1">{tr("نموذج")}</span> : null}
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
    emergency: (
      <section>
        <SectionTitle title={tr("أرقام الطوارئ في رهط")} to="/today" more={tr("كل الأرقام")} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {emergency.slice(0, 4).map((item) => (
            <a
              key={item.phone}
              href={`tel:${item.phone}`}
              className="stamp press flex flex-col items-center px-3 py-3.5 text-center"
            >
              <span className="text-2xl font-extrabold leading-none text-primary-ink">{trv(item.phone)}</span>
              <span className="mt-1.5 text-sm font-bold">{trv(item.name)}</span>
            </a>
          ))}
        </div>
      </section>
    ),
  };

  // Ensure the install banner never blocks above-the-fold news even if an older DB order had it at #2
  const rawOrder = settings.home.filter((h) => h.visible).map((h) => h.id);
  const baseOrder: ExtendedHomeSectionId[] = [
    ...rawOrder.filter((id) => id !== "install"),
    ...(rawOrder.includes("install") ? (["install"] as HomeSectionId[]) : []),
  ];
  const order: ExtendedHomeSectionId[] = (() => {
    if (baseOrder.includes("matches")) return baseOrder;
    const newsIdx = baseOrder.indexOf("news");
    if (newsIdx !== -1) {
      const copy = [...baseOrder];
      // Place matches right above news when a live match is active, or right after news
      const hasLive = Boolean(matches?.matches?.some((m) => m.status === "in" || (m as { streamUrl?: string }).streamUrl || (m.note && /https?:\/\//i.test(m.note))));
      copy.splice(hasLive ? newsIdx : newsIdx + 1, 0, "matches");
      return copy;
    }
    return ["matches", ...baseOrder];
  })();
  const TOP: ExtendedHomeSectionId[] = ["weather", "slider", "search"];

  return (
    <Shell>
      <div className="flex flex-col gap-6">
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
            {!order.includes("matches") ? blocks.matches : null}
            {!order.includes("directory") ? directoryPreview : null}
          </>
        )}
      </div>
    </Shell>
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
  const empty =
    results.news.length + results.places.length + results.ads.length + results.israel.length === 0;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{tr("نتائج «")}{trv(query)}»</h1>
      {empty ? (
        <p className="stamp p-4 font-semibold">{tr("لا توجد نتيجة. جرّب اسماً أو حياً أو تصنيفاً.")}</p>
      ) : null}
      {results.news.map((item) => (
        <Link
          key={item.slug}
          to="/news/$slug"
          params={{ slug: item.slug }}
          className="stamp press block p-4"
        >
          <span className="chip chip-deep">{trv(item.category)}</span>
          <span className="mt-2 block font-bold">{trv(item.title)}</span>
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
} {
  const rawStream = (m as { streamUrl?: string }).streamUrl?.trim();
  const rawChannel = (m as { channel?: string }).channel?.trim();
  let note = (m.note ?? "").trim();
  let urlFromNote: string | undefined;
  let chanFromNote: string | undefined;

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

function MatchRowCard({ m, showLeagueBadge }: { m: MatchItem; showLeagueBadge?: boolean }) {
  const isLive = m.status === "in";
  const isDone = m.status === "post";
  const { streamUrl, channel, cleanNote } = extractMatchStream(m);
  const [watchOpen, setWatchOpen] = useState(false);
  const embed = streamUrl ? toEmbedStreamUrl(streamUrl) : null;

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

      {channel || cleanNote || streamUrl ? (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-2">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-muted">
            {channel ? (
              <span className="rounded-lg bg-surface px-2 py-0.5 font-extrabold text-ink">
                📡 {trv(channel)}
              </span>
            ) : null}
            {cleanNote ? <span>{trv(cleanNote)}</span> : null}
          </div>

          {streamUrl ? (
            <button
              type="button"
              onClick={() => setWatchOpen((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-extrabold text-white shadow-2xs transition ${
                watchOpen ? "bg-ink" : "bg-[#DC2626] hover:bg-[#B91C1C]"
              }`}
            >
              <span className="size-2 animate-ping rounded-full bg-white" />
              {watchOpen ? tr("إغلاق البث ✕") : tr("📺 مشاهدة البث المباشر")}
            </button>
          ) : null}
        </div>
      ) : null}

      {watchOpen && streamUrl && embed ? (
        <div className="mt-2 overflow-hidden rounded-2xl border border-line bg-black text-white shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2 bg-ink px-3 py-2 text-xs font-extrabold text-paper">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 animate-ping rounded-full bg-[#DC2626]" />
              {tr("بث مباشر:")} {trv(m.homeTeam)} × {trv(m.awayTeam)}
            </span>
            <a
              href={streamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/25"
            >
              {tr("فتح البث في نافذة مستقلة ↗")}
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
  "Hapoel Be'er Sheva": "هبوعيل بئر السبع",
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

function trTeamClient(raw: string): string {
  const clean = raw.trim();
  if (!clean) return "";
  if (CLIENT_TEAM_AR[clean]) return CLIENT_TEAM_AR[clean];
  for (const [en, ar] of Object.entries(CLIENT_TEAM_AR)) {
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

function buildCuratedRoundFallback(): MatchItem[] {
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

async function fetchClientEspnLeague(league: {
  id: string;
  shortAr: string;
  badge: string;
}): Promise<MatchItem[]> {
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

      const out: MatchItem[] = [];
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

        out.push({
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
        });
      }
      if (out.length > 0) return out;
    } catch {
      // try next url
    }
  }
  return [];
}

async function fetchClientSportsDbLeague(league: {
  id: string;
  shortAr: string;
  badge: string;
}): Promise<MatchItem[]> {
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
    const out: MatchItem[] = [];
    for (const ev of rawEvents.slice(0, 14)) {
      if (!ev?.strHomeTeam || !ev?.strAwayTeam || !ev?.dateEvent) continue;
      const timeStr = String(ev.strTime ?? "18:00:00").slice(0, 8);
      const kickoffIso = `${ev.dateEvent}T${timeStr.includes(":") ? timeStr : "18:00:00"}Z`;
      const hasScore = ev.intHomeScore !== null && ev.intHomeScore !== undefined && ev.intHomeScore !== "";
      const rawStatus = String(ev.strStatus ?? "").toUpperCase();
      const isLive = rawStatus === "LIVE" || rawStatus === "1H" || rawStatus === "2H" || rawStatus === "HT";
      const status: "pre" | "in" | "post" = isLive ? "in" : hasScore ? "post" : "pre";
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
          status === "in" ? "مباشر الآن" : status === "post" ? "انتهت" : clientTimeAr(kickoffIso),
        kickoffIso,
        kickoffTimeAr: clientTimeAr(kickoffIso),
        dayKey: clientDayKey(kickoffIso),
        dateLabelAr: clientShortDateAr(kickoffIso),
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
  const byId = new Map<string, MatchItem>();
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
    const id = setInterval(() => void sync(), 60_000);
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
    void (async () => {
      try {
        const srv = initial ?? (await getMatchesBoard().catch(() => null));
        if (srv) {
          const enriched = await enrichBoardClientSide(srv);
          if (active) setBoard(enriched);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
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

const BASE_TILES: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/news", label: "الأخبار", icon: Newspaper },
  { to: "/buses", label: "الباصات", icon: Bus },
  { to: "/directory", label: "الدليل", icon: MapPin },
  { to: "/haraj", label: "حراج", icon: Megaphone },
  { to: "/today", label: "اليوم", icon: Siren },
  { to: "/store", label: "المتجر", icon: Store },
  { to: "/submit", label: "أضف", icon: Plus },
];

function HomeTilesBar({ hasLiveMatch }: { hasLiveMatch?: boolean }) {
  const st = useSiteSettings();
  const order = st.tiles;
  const baseList = order
    .filter((o) => o.visible)
    .map((o) => BASE_TILES.find((t) => t.to === o.id))
    .filter((t): t is (typeof BASE_TILES)[number] => Boolean(t));

  // Check admin configuration for the "بث مباريات" tile (stored in quickLinks with id === "tilelive")
  const liveTileCfg = (st.quickLinks ?? []).find((q) => q.id === "tilelive");
  const showLiveTile = liveTileCfg ? liveTileCfg.subtitle !== " مَخفي" : true;
  const liveTileLabel = liveTileCfg?.title?.trim() || "بث مباريات";
  const liveTileTarget =
    liveTileCfg?.url?.trim() && liveTileCfg.url.startsWith("/")
      ? liveTileCfg.url.trim()
      : "/sports-news";

  // Also include any custom sections added in /admin
  const customSecTiles = (st.quickLinks ?? [])
    .filter((q) => q.id.startsWith("sec") && q.subtitle !== " مَخفي")
    .map((q) => ({
      to: q.url || "/news",
      label: q.title,
      icon: Newspaper as LucideIcon,
      isLiveTile: false,
    }));

  const combined: { to: string; label: string; icon: LucideIcon; isLiveTile?: boolean }[] = [
    ...baseList.map((b) => ({ ...b, isLiveTile: false })),
  ];

  if (showLiveTile) {
    // Insert "بث مباريات" right at the front of the visible tiles (index 1, right beside الأخبار / اليوم)
    const insertIdx = combined.length > 0 ? 1 : 0;
    combined.splice(insertIdx, 0, {
      to: liveTileTarget,
      label: liveTileLabel,
      icon: Tv,
      isLiveTile: true,
    });
  }

  for (const ct of customSecTiles) {
    if (!combined.some((c) => c.label === ct.label)) {
      combined.push(ct);
    }
  }

  if (!combined.length) return null;

  return (
    <nav
      className="scroll-row -mx-4 px-4 sm:mx-0 sm:flex sm:flex-wrap sm:justify-between sm:gap-3 sm:px-0"
      aria-label={tr("الأقسام")}
    >
      {combined.map((t, idx) => {
        const Icon = t.icon;
        return (
          <Link
            key={`${t.to}-${idx}`}
            to={t.to as "/"}
            className="tile relative sm:flex-1"
          >
            <span
              className={`tile-icon relative sm:w-full ${
                t.isLiveTile ? "ring-2 ring-[#DC2626]/40" : ""
              }`}
            >
              <Icon className="size-6 sm:size-7" aria-hidden />
              {t.isLiveTile ? (
                <span
                  className={`absolute top-1.5 start-1.5 size-2.5 rounded-full bg-[#DC2626] ${
                    hasLiveMatch ? "animate-ping" : ""
                  }`}
                />
              ) : null}
            </span>
            <span className={t.isLiveTile ? "font-extrabold text-[#DC2626]" : ""}>
              {t.to === "/haraj" ? trv(st.texts.harajNav) : trv(t.label)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function HomeQuickLinks() {
  const links = (useSiteSettings().quickLinks ?? []).filter(
    (l) => l.id !== "tilelive" && l.subtitle !== " مَخفي",
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
```
