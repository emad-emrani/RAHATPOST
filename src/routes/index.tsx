import { createFileRoute, Link } from "@tanstack/react-router";
import { Bus, ChevronLeft, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { NewsImage } from "@/components/news-image";
import { HomeCarousel, HomeTiles } from "@/components/home-parts";
import { SectionTitle, Shell } from "@/components/shell";
import { DutyCard } from "@/components/duty";
import { NewsUnavailable, prioritizeLocal } from "@/components/news";
import { getApprovedEntries } from "@/lib/directory/api";
import { osmEntries, type DirectoryEntry } from "@/lib/directory/types";
import { getNews } from "@/lib/news/api";
import { relativeTimeAr, useNow } from "@/lib/news/format";
import type { IsraelNewsItem, IsraelNewsResult, NewsItem } from "@/lib/news/types";
import { getIsraelNews } from "@/lib/news/israel-api";
import { IsraelNewsCredit, IsraelNewsRow, IsraelTitle } from "@/components/israel-news";
import { alert, emergency } from "@/data/content";
import { getPublicAds } from "@/lib/ads/api";
import { listAds, type ListAd } from "@/lib/ads/display";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [news, approved, ads, israel] = await Promise.all([
      getNews(),
      getApprovedEntries(),
      getPublicAds(),
      israelNewsForHome(),
    ]);
    return { news, approved: approved.entries, ads, israel };
  },
  staleTime: 5 * 60_000,
  component: Home,
});

/**
 * Israel news is a secondary section: never let a slow or failing Hebrew feed hold up the home
 * page. On a cold cache we give up after a short wait (the server keeps warming its cache for the
 * next visit) and simply hide the section.
 */
const ISRAEL_HOME_WAIT_MS = 2_500;
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
  const { news, approved, ads: adsData, israel } = Route.useLoaderData();
  const israelItems = useMemo(() => israel?.items ?? [], [israel]);
  // Translated headlines first (each group stays newest first), then Hebrew-only ones.
  const israelTop = [
    ...israelItems.filter((item) => item.titleAr),
    ...israelItems.filter((item) => !item.titleAr),
  ].slice(0, 4);
  const classifieds = listAds(adsData);
  const places = useMemo(() => [...approved, ...osmEntries()], [approved]);
  // Verified (owner-approved) first; until there are any, a few real places with details from OSM.
  const featured = [
    ...approved,
    ...osmEntries().filter((p) => p.phone || p.openingHours || p.address),
  ].slice(0, 4);
  const now = useNow(news.now);
  const [q, setQ] = useState("");
  const query = q.trim();
  const ranked = prioritizeLocal(news.items);
  const breaking = news.items.find((item) => item.breaking);
  // The banner shows the newest local (Rahat/Negev) story that has a publisher photo, else the top
  // story; the news section continues with the others.
  const top = ranked.find((item) => item.local && item.image) ?? ranked[0];
  const remaining = ranked.filter((item) => item !== top);
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

  return (
    <Shell>
      <label className="search-field mb-4 block">
        <span className="sr-only">بحث</span>
        <Search className="size-5" aria-hidden />
        <input
          type="search"
          className="field"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="ابحث في الأخبار والدليل والإعلانات"
        />
      </label>

      {results ? (
        <SearchResults query={query} results={results} />
      ) : (
        <div className="flex flex-col gap-6">
          <h1 className="sr-only">رهط بوست: أخبار وخدمات رهط والنقب</h1>
          <HomeTiles />
          <HomeCarousel lead={top} leadTime={top ? relativeTimeAr(top.publishedAt, now) : ""} />
          {breaking ? (
            <Link
              to="/news/$slug"
              params={{ slug: breaking.slug }}
              className="alert-card press block px-4 py-3"
            >
              <span className="chip bg-white/20 text-white">عاجل</span>
              <span className="mt-2 block text-lg font-bold">{breaking.title}</span>
              <span className="text-sm font-semibold">
                {relativeTimeAr(breaking.publishedAt, now)} · {breaking.source}
              </span>
            </Link>
          ) : null}

          {alert ? (
            <section className="alert-card p-4">
              <p className="chip">تنبيه بلدي</p>
              <h2 className="mt-2 text-xl font-bold">{alert.title}</h2>
              <p className="font-semibold">{alert.body}</p>
              <p className="mt-1 text-sm font-bold">{alert.until}</p>
            </section>
          ) : null}

          <section>
            <SectionTitle title="آخر الأخبار" to="/news" more="كل الأخبار" />
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
                    <span className="chip chip-deep">{lead.category}</span>
                    <span className="mt-2 block text-xl font-bold">{lead.title}</span>
                    <span className="text-sm font-semibold text-muted">
                      {relativeTimeAr(lead.publishedAt, now)} · {lead.source}
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
                          <span className="block font-bold leading-snug">{item.title}</span>
                          <span className="text-sm font-semibold text-muted">
                            {item.category} · {relativeTimeAr(item.publishedAt, now)} ·{" "}
                            {item.source}
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

          {israelTop.length > 0 && israel ? (
            <section>
              <SectionTitle title="أخبار إسرائيل" to="/israel-news" more="عرض الكل" />
              <ul className="stack-list">
                {israelTop.map((item) => (
                  <li key={item.slug}>
                    <IsraelNewsRow item={item} now={now} />
                  </li>
                ))}
              </ul>
              <IsraelNewsCredit data={israel} />
            </section>
          ) : null}

          <section>
            <SectionTitle title="باصات غاليم" to="/buses" more="كل المواعيد" />
            <Link to="/buses" className="stamp press flex items-center gap-3 p-4">
              <span className="icon-badge">
                <Bus className="size-6" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">خطوط المدينة 1 حتى 6، وبئر السبع وما حولها</span>
                <span className="text-sm font-semibold text-muted">
                  شركة גלים · أوقات مباشرة وجدول اليوم
                </span>
              </span>
              <ChevronLeft className="size-5 text-muted" aria-hidden />
            </Link>
          </section>

          <section>
            <SectionTitle title="من الدليل" to="/directory" more="كل الدليل" />
            <ul className="scroll-row -mx-4 px-4 pb-2">
              {featured.map((item) => (
                <li key={item.slug} className="w-44 shrink-0">
                  <Link
                    to="/directory/$slug"
                    params={{ slug: item.slug }}
                    className="stamp press flex h-full flex-col p-3"
                  >
                    <span className="icon-badge size-14 rounded-2xl">
                      <CategoryIcon category={item.category} className="size-7" />
                    </span>
                    <span className="mt-2 block font-bold leading-snug">{item.name}</span>
                    <span className="text-xs font-semibold text-muted">{item.category}</span>
                    {item.verified ? <span className="chip chip-ink mt-1 w-fit">موثّق</span> : null}
                    {item.address || item.area ? (
                      <span className="text-sm font-semibold text-muted">
                        {item.address || item.area}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <SectionTitle title="آخر الإعلانات" to="/ads" more="كل الإعلانات" />
            {adsData.showSamples ? (
              <p className="mb-2 text-sm font-semibold text-muted">
                إعلانات نموذجية لعرض الشكل فقط، وليست إعلانات حقيقية.
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
                    <span>
                      <span className={item.quiet ? "chip" : "chip chip-deep"}>{item.type}</span>
                      {item.sample ? <span className="chip ms-1">نموذج</span> : null}
                      <span className="mt-1 block font-bold">{item.title}</span>
                      <span className="text-sm font-semibold text-muted">{item.neighborhood}</span>
                    </span>
                    {item.price ? <span className="shrink-0 font-bold">{item.price}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <DutyCard />

          <section>
            <SectionTitle title="أرقام تُحفظ" to="/today" more="كل الأرقام" />
            <div className="scroll-row">
              {emergency.slice(0, 4).map((item) => (
                <a
                  key={item.phone}
                  href={`tel:${item.phone}`}
                  className="stamp press flex w-28 shrink-0 flex-col items-center px-3 py-3 text-center"
                >
                  <span className="text-2xl font-bold leading-none">{item.phone}</span>
                  <span className="mt-1 text-sm font-bold">{item.name}</span>
                </a>
              ))}
            </div>
          </section>

          <p className="text-sm font-semibold text-muted md:hidden">
            أرقام الطوارئ الوطنية حقيقية. الأخبار والدليل والباصات من مصادر حقيقية، وبقية الإعلانات
            نماذج.
          </p>
        </div>
      )}
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
      <h1 className="text-2xl font-bold">نتائج «{query}»</h1>
      {empty ? (
        <p className="stamp p-4 font-semibold">لا توجد نتيجة. جرّب اسماً أو حياً أو تصنيفاً.</p>
      ) : null}
      {results.news.map((item) => (
        <Link
          key={item.slug}
          to="/news/$slug"
          params={{ slug: item.slug }}
          className="stamp press block p-4"
        >
          <span className="chip">{item.category}</span>
          <span className="mt-1 block font-bold">{item.title}</span>
        </Link>
      ))}
      {results.israel.map((item) => (
        <Link
          key={item.slug}
          to="/israel-news/$slug"
          params={{ slug: item.slug }}
          className="stamp press block p-4"
        >
          <span className="chip">أخبار إسرائيل</span>
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
          <span className="chip">{item.category}</span>
          <span className="mt-1 block font-bold">{item.name}</span>
        </Link>
      ))}
      {results.ads.map((item) => (
        <Link
          key={item.id}
          to="/ads/$id"
          params={{ id: item.id }}
          className="stamp press block p-4"
        >
          <span className="chip">{item.type}</span>
          {item.sample ? <span className="chip ms-1">نموذج</span> : null}
          <span className="mt-1 block font-bold">{item.title}</span>
        </Link>
      ))}
    </div>
  );
}
