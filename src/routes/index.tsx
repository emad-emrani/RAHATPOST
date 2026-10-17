import { createFileRoute, Link } from "@tanstack/react-router";
import { Bus, ChevronLeft, Search } from "lucide-react";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { useSiteSettings } from "@/lib/site-settings/context";
import type { HomeSectionId } from "@/lib/site-settings/types";
import { AdSlots } from "@/components/google-services";
import { NewsImage } from "@/components/news-image";
import { HomePostCard } from "@/components/guide";
import { getGuide } from "@/data/guides";
import { CommentCount } from "@/components/comment-count";
import { HomeCarousel, HomeTiles, QuickLinks } from "@/components/home-parts";
import { SectionTitle, Shell } from "@/components/shell";
import { AlertsBanner, DutyCard } from "@/components/duty";
import { getBoard } from "@/lib/board/api";
import { InstallBanner } from "@/components/install-app";
import { HomeTodayChips } from "@/components/today-cards";
import { weatherWithin } from "@/lib/weather/api";
import { mediaUrl } from "@/lib/media/types";
import { NotifyPrompt } from "@/components/notify";
import { NewsUnavailable, newestFirst } from "@/components/news";
import { getApprovedEntries } from "@/lib/directory/api";
import { osmEntries, type DirectoryEntry } from "@/lib/directory/types";
import { getNews } from "@/lib/news/api";
import { newsByline, relativeTimeAr, useNow } from "@/lib/news/format";
import type { IsraelNewsItem, IsraelNewsResult, NewsItem } from "@/lib/news/types";
import { getIsraelNews } from "@/lib/news/israel-api";
import { IsraelNewsCredit, IsraelNewsRow, IsraelTitle } from "@/components/israel-news";
import { emergency } from "@/data/content";
import { getPublicAds } from "@/lib/ads/api";
import { getStore } from "@/lib/store/api";
import { ProductCard } from "@/components/store-parts";
import { listAds, type ListAd } from "@/lib/ads/display";
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
    const [news, approved, ads, israel, weather, board, store] = await Promise.all([
      getNews(),
      getApprovedEntries(),
      getPublicAds(),
      israelNewsForHome(),
      weatherWithin(2_000),
      getBoard(),
      getStore(),
    ]);
    const [lNews, lIsrael, lStore] = await Promise.all([
      localized(news, (d) => [{ items: d.items, fields: ["title", "summary", "body"] }], "auto"),
      localizedIsrael(israel, (d) => d?.items ?? []),
      localized(store, (d) => [{ items: d.products, fields: ["name", "shortDesc", "description"] }, { items: d.categories, fields: ["name", "description"] }]),
    ]);
    return { news: lNews, approved: approved.entries, ads, israel: lIsrael, weather, board, store: lStore };
  },
  // New items must show up within a minute or two: short CDN cache, revalidated in the background.
  headers: () => ({ "Cache-Control": HOME_CACHE }),
  staleTime: 60_000,
  component: Home,
});

const postGuide = getGuide("post");

const HOME_CACHE = "public, max-age=0, s-maxage=60, stale-while-revalidate=300";

/**
 * Israel news is a secondary section: never let a slow or failing Hebrew feed hold up the home
 * page. On a cold cache we give up after a short wait (the server keeps warming its cache for the
 * next visit) and simply hide the section.
 */
const ISRAEL_HOME_WAIT_MS = 4_000;
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
  const { news, approved, ads: adsData, israel, weather, board, store } = Route.useLoaderData();
  const settings = useSiteSettings();
  const israelItems = useMemo(() => israel?.items ?? [], [israel]);
  // Translated headlines first (each group stays newest first), then Hebrew-only ones.
  const israelTop = [
    ...israelItems.filter((item) => item.pinned),
    ...israelItems.filter((item) => item.titleAr && !item.pinned),
    ...israelItems.filter((item) => !item.titleAr && !item.pinned),
  ].slice(0, 5);
  const classifieds = listAds(adsData);
  const places = useMemo(() => [...approved, ...osmEntries()], [approved]);
  const now = useNow(news.now);
  const search = Route.useSearch();
  const [q, setQ] = useState(search.q ?? "");
  const query = q.trim();
  // Strictly newest first (feeds + reader posts) — no local-first or has-photo ranking. The banner
  // carousel at the top shows the very latest story (a story without a photo gets the yellow
  // banner); the news section continues with the next ones.
  const ranked = newestFirst(news.items);
  const breaking = news.items.find((item) => item.breaking);
  const israelBreaking = israelItems.find((item) => item.breaking);
  const top = ranked[0];
  const remaining = ranked.slice(1);
  const lead = remaining[0] ?? top;
  const rest = remaining.slice(1, 5);

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

  const blocks: Record<HomeSectionId, ReactNode> = {
    weather: <HomeTodayChips weather={weather} serverNow={news.now} />,
    slider: <HomeCarousel lead={top} leadTime={top ? relativeTimeAr(top.publishedAt, now) : ""} />,
    search: (
      <label className="search-field block">
        <span className="sr-only">{tr("بحث")}</span>
        <Search className="size-5" aria-hidden />
        <input
          type="search"
          className="field"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder={tr("ابحث في الأخبار والدليل والإعلانات")}
        />
      </label>
    ),
    tiles: <HomeTiles />,
    quicklinks: <QuickLinks />,
    news: (
      <>
        <section>
          <SectionTitle title={tr("آخر الأخبار")} to="/news" more={tr("كل الأخبار")} />
          {lead ? (
            <>
              <Link
                to="/news/$slug"
                params={{ slug: lead.slug }}
                className="stamp press mb-3 block overflow-hidden"
              >
                {lead.image ? (
                  <NewsImage
                    item={lead}
                    size="full"
                    className="aspect-[16/9] w-full"
                    iconClassName="size-10"
                  />
                ) : null}
                <span className="block p-4">
                  <span className="chip chip-deep">
                    {lead.reader ? tr("من القراء") : lead.category}
                  </span>
                  <span className="mt-2 block text-xl font-bold">{trv(lead.title)}</span>
                  <span className="text-sm font-semibold text-muted">
                    {relativeTimeAr(lead.publishedAt, now)} · {newsByline(lead)}
                    <CommentCount n={lead.comments} className="ms-2" />
                  </span>
                </span>
              </Link>
              <ul className="stack-list">
                {rest.map((item) => (
                  <li key={item.slug}>
                    <Link
                      to="/news/$slug"
                      params={{ slug: item.slug }}
                      className="flex items-center gap-3 px-4 py-3"
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
            </>
          ) : (
            <NewsUnavailable />
          )}
        </section>
        <AdSlots placement="home" />
      </>
    ),
    israel:
      israelTop.length > 0 && israel ? (
        <section>
          <SectionTitle title={tr("أخبار إسرائيل")} to="/israel-news" more={tr("عرض الكل")} />
          <IsraelLead item={israelTop[0]} now={now} />
          <ul className="stack-list">
            {israelTop.slice(1).map((item) => (
              <li key={item.slug}>
                <IsraelNewsRow item={item} now={now} />
              </li>
            ))}
          </ul>
          <IsraelNewsCredit data={israel} />
        </section>
      ) : null,
    post: postGuide ? (
      <section>
        <SectionTitle title={tr("خدمة البريد")} />
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
        <SectionTitle title={tr("باصات غاليم")} to="/buses" more={tr("كل المواعيد")} />
        <Link to="/buses" className="stamp press flex items-center gap-3 p-4">
          <span className="icon-badge">
            <Bus className="size-6" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-bold">{tr("خطوط المدينة 1 حتى 6، وبئر السبع وما حولها")}</span>
            <span className="text-sm font-semibold text-muted">
              {tr("شركة גלים · أوقات مباشرة وجدول اليوم")}
            </span>
          </span>
          <ChevronLeft className="size-5 text-muted" aria-hidden />
        </Link>
      </section>
    ),
    // «من المتجر»: hidden until there are real products.
    directory: store.products.length ? (
      <section>
        <SectionTitle title={tr("من المتجر")} to="/store" more={tr("كل المتجر")} />
        <ul className="scroll-row -mx-4 px-4 pb-2">
          {store.products.slice(0, 8).map((p) => (
            <li key={p.id} className="w-48 shrink-0">
              <ProductCard p={p} currency={store.settings.currency} />
            </li>
          ))}
        </ul>
      </section>
    ) : null,
    ads: (
      <section>
        <SectionTitle title={tr("آخر الإعلانات")} to="/ads" more={tr("كل الإعلانات")} />
        {adsData.showSamples ? (
          <p className="mb-2 text-sm font-semibold text-muted">
            {tr("إعلانات نموذجية لعرض الشكل فقط، وليست إعلانات حقيقية.")}
          </p>
        ) : null}
        <ul className="flex flex-col gap-3">
          {classifieds.slice(0, 4).map((item) => (
            <li key={item.id}>
              <Link
                to="/ads/$id"
                params={{ id: item.id }}
                className="stamp press flex items-center justify-between gap-3 px-4 py-3"
              >
                {item.photo ? (
                  <img
                    src={mediaUrl(item.photo)}
                    alt=""
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
    duty: <DutyCard duty={board.duty} />,
    emergency: (
      <section>
        <SectionTitle title={tr("أرقام تُحفظ")} to="/today" more={tr("كل الأرقام")} />
        <div className="scroll-row">
          {emergency.slice(0, 4).map((item) => (
            <a
              key={item.phone}
              href={`tel:${item.phone}`}
              className="stamp press flex w-28 shrink-0 flex-col items-center px-3 py-3 text-center"
            >
              <span className="text-2xl font-bold leading-none">{trv(item.phone)}</span>
              <span className="mt-1 text-sm font-bold">{trv(item.name)}</span>
            </a>
          ))}
        </div>
      </section>
    ),
  };
  const TOP: HomeSectionId[] = ["weather", "slider", "search"];
  const order = settings.home.filter((h) => h.visible).map((h) => h.id);

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <h1 className="sr-only">{tr("رهط بوست: أخبار وخدمات رهط والنقب")}</h1>
        {/* Top: alerts (only when active), weather + prayer, banner slider, then search. */}
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
          order.map((id) => <Fragment key={id}>{trv(blocks[id])}</Fragment>)
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
          to="/ads/$id"
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

/** First Israel headline as a big card (same look as the latest-news lead). */
function IsraelLead({ item, now }: { item: IsraelNewsItem; now: number }) {
  const title = item.titleAr ?? item.titleHe;
  return (
    <Link
      to="/israel-news/$slug"
      params={{ slug: item.slug }}
      className="stamp press mb-3 block overflow-hidden"
    >
      {item.image ? (
        <NewsImage
          item={{ image: item.image, thumb: item.thumb, title, category: item.category }}
          size="full"
          className="aspect-[16/9] w-full"
          iconClassName="size-10"
        />
      ) : null}
      <span className="block p-4">
        <span className="flex flex-wrap gap-2">
          {item.breaking ? <span className="chip chip-alert">{tr("عاجل")}</span> : null}
          <span className="chip chip-deep">{trv(item.category)}</span>
        </span>
        <span
          className="mt-2 block text-xl font-bold"
          {...(item.titleAr ? {} : { dir: "rtl", lang: "he" })}
        >
          {trv(title)}
        </span>
        <span className="text-sm font-semibold text-muted">
          {relativeTimeAr(item.publishedAt, now)} · {trv(item.source)}
          <CommentCount n={item.comments} className="ms-2" />
        </span>
      </span>
    </Link>
  );
}
