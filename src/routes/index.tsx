import { createFileRoute, Link } from "@tanstack/react-router";
import { Bus, ChevronLeft, MapPin, Search } from "lucide-react";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { useSiteSettings } from "@/lib/site-settings/context";
import type { HomeSectionId } from "@/lib/site-settings/types";
import { AdSlots } from "@/components/google-services";
import { NewsImage } from "@/components/news-image";
import { HomeGuidesGrid } from "@/components/guide";
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
import { getAutoSectionFlags, getCustomSectionsNews, getNews, getSportsNews, getTechNews } from "@/lib/news/api";
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
    const [news, approved, ads, israel, weather, board, store, tech, flags, sports, customSections] = await Promise.all([
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
      getCustomSectionsNews().catch(() => []),
    ]);
    const [lNews, lIsrael, lStore, lTech, lSports] = await Promise.all([
      localized(news, (d) => [{ items: d.items, fields: ["title", "summary", "body"] }], "auto"),
      localizedIsrael(israel, (d) => d?.items ?? []),
      localized(store, (d) => [{ items: d.products, fields: ["name", "shortDesc", "description"] }, { items: d.categories, fields: ["name", "description"] }]),
      tech ? localized(tech, (d) => [{ items: d.items.slice(0, 5), fields: ["title", "summary"] }], "auto") : null,
      sports ? localized(sports, (d) => [{ items: d.items.slice(0, 5), fields: ["title", "summary"] }], "auto") : null,
    ]);
    return { news: lNews, approved: approved.entries, ads, israel: lIsrael, weather, board, store: lStore, tech: lTech, sports: lSports, flags, customSections };
  },
  // New items must show up within a minute or two: short CDN cache, revalidated in the background.
  headers: () => ({ "Cache-Control": HOME_CACHE }),
  staleTime: 60_000,
  component: Home,
});

const HOME_CACHE = "public, max-age=0, s-maxage=60, stale-while-revalidate=180";

/**
 * Israel news is a secondary section: never let a slow or failing Hebrew feed hold up the home
 * page. On a cold cache we give up after a short wait (the server keeps warming its cache for the
 * next visit) and simply hide the section.
 */
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

function Home() {
  const { news, approved, ads: adsData, israel, weather, board, store, tech, sports, flags, customSections } = Route.useLoaderData();
  const showSec = (id: string) => flags[id] !== false;
  const techTop = tech?.home ? tech.items.slice(0, 5) : [];
  const sportsTop = sports?.home ? sports.items.slice(0, 5) : [];
  const visibleCustomSections = (customSections ?? []).filter((s) => s.home && s.items.length > 0);
  const settings = useSiteSettings();
  const israelItems = useMemo(() => israel?.items ?? [], [israel]);
  // Translated headlines first (each group stays newest first), then Hebrew-only ones.
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
    ...visibleCustomSections.map((cs) => newsSlide(`custom-${cs.id}`, cs.name, cs.items[0])),
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

  const blocks: Record<HomeSectionId, ReactNode> = {
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
    tiles: <HomeTiles />,
    quicklinks: <QuickLinks />,
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
          </section>
        ))}
        <AdSlots placement="home" />
      </>
    ),
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
    post: (
      <section>
        <SectionTitle title={tr("أدلة خدمات رهط (البريد، البلدية، الصحة، والباصات)")} to="/directory" more={tr("كل الأدلة")} />
        <HomeGuidesGrid />
      </section>
    ),
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
  const order: HomeSectionId[] = [
    ...rawOrder.filter((id) => id !== "install"),
    ...(rawOrder.includes("install") ? (["install"] as HomeSectionId[]) : []),
  ];
  const TOP: HomeSectionId[] = ["weather", "slider", "search"];

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
          <span className="chip">{trv(item.category)}</span>
          <span className="mt-1 block font-bold">{trv(item.title)}</span>
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
          <IsraelTitle item={item} className="mt-1 block font-bold" />
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
          <span className="mt-1 block font-bold">{trv(item.name)}</span>
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
          {item.sample ? <span className="chip ms-1">{tr("نموذج")}</span> : null}
          <span className="mt-1 block font-bold">{trv(item.title)}</span>
        </Link>
      ))}
    </div>
  );
}
