import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SectionTitle, Shell } from "@/components/shell";
import { DutyCard } from "@/components/duty";
import { NewsUnavailable, prioritizeLocal } from "@/components/news";
import { getApprovedEntries } from "@/lib/directory/api";
import { osmEntries, type DirectoryEntry } from "@/lib/directory/types";
import { getNews } from "@/lib/news/api";
import { relativeTimeAr, useNow } from "@/lib/news/format";
import type { NewsItem } from "@/lib/news/types";
import { alert, classifieds, emergency } from "@/data/content";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [news, approved] = await Promise.all([getNews(), getApprovedEntries()]);
    return { news, approved: approved.entries };
  },
  staleTime: 5 * 60_000,
  component: Home,
});

function Home() {
  const { news, approved } = Route.useLoaderData();
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
  const lead = ranked[0];
  const rest = ranked.slice(1, 5);

  const results = useMemo(() => {
    if (!query) return null;
    const hay = (value: string) => value.includes(query);
    return {
      news: news.items.filter(
        (item) => hay(item.title) || hay(item.category) || hay(item.source) || hay(item.summary),
      ),
      places: places.filter(
        (item) => hay(item.name) || hay(item.category) || hay(item.altName ?? "") || hay(item.address ?? item.area ?? ""),
      ),
      ads: classifieds.filter((item) => hay(item.title) || hay(item.type)),
    };
  }, [query, news.items, places]);

  return (
    <Shell>
      <label className="mb-4 block">
        <span className="sr-only">بحث</span>
        <input
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
          {breaking ? (
            <Link to="/news/$slug" params={{ slug: breaking.slug }} className="stamp press block bg-brand-deep px-4 py-3">
              <span className="chip-ink chip">عاجل</span>
              <span className="mt-2 block text-lg font-bold">{breaking.title}</span>
              <span className="text-sm font-semibold">
                {relativeTimeAr(breaking.publishedAt, now)} · {breaking.source}
              </span>
            </Link>
          ) : null}

          <DutyCard heading="h1" />

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

          <section>
            <SectionTitle title="باصات غاليم" to="/buses" more="كل المواعيد" />
            <Link to="/buses" className="stamp press block p-4">
              <span className="chip">شركة גלים</span>
              <span className="mt-2 block text-xl font-bold">خطوط المدينة 1 حتى 6، وبئر السبع وما حولها</span>
              <span className="font-semibold">أحد–خميس: خط 1 من 05:30 حتى 22:00</span>
            </Link>
          </section>

          <section>
            <SectionTitle title="آخر الأخبار" to="/news" more="كل الأخبار" />
            {lead ? (
              <>
                <Link to="/news/$slug" params={{ slug: lead.slug }} className="stamp press mb-3 block p-4">
                  <span className="chip">{lead.category}</span>
                  <span className="mt-2 block text-2xl font-bold">{lead.title}</span>
                  <span className="text-sm font-semibold text-muted">
                    {relativeTimeAr(lead.publishedAt, now)} · {lead.source}
                  </span>
                </Link>
                <ul className="stack-list">
                  {rest.map((item) => (
                    <li key={item.slug}>
                      <Link to="/news/$slug" params={{ slug: item.slug }} className="block px-4 py-3">
                        <span className="text-sm font-bold text-muted">
                          {item.category} · {relativeTimeAr(item.publishedAt, now)} · {item.source}
                        </span>
                        <span className="block font-bold">{item.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <NewsUnavailable />
            )}
          </section>

          <section className="stamp bg-brand-deep p-4">
            <p className="chip">تنبيه بلدي</p>
            <h2 className="mt-2 text-xl font-bold">{alert.title}</h2>
            <p className="font-semibold">{alert.body}</p>
            <p className="mt-1 text-sm font-bold">{alert.until}</p>
          </section>

          <section>
            <SectionTitle title="من الدليل" to="/directory" more="كل الدليل" />
            <ul className="grid gap-3 sm:grid-cols-2">
              {featured.map((item) => (
                <li key={item.slug}>
                  <Link to="/directory/$slug" params={{ slug: item.slug }} className="stamp press block h-full p-4">
                    <span className="chip">{item.category}</span>
                    {item.verified ? <span className="chip chip-ink ms-2">موثّق</span> : null}
                    <span className="mt-2 block text-lg font-bold">{item.name}</span>
                    {item.address || item.area ? (
                      <span className="text-sm font-semibold text-muted">{item.address || item.area}</span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <SectionTitle title="آخر الإعلانات" to="/ads" more="كل الإعلانات" />
            <ul className="flex flex-col gap-3">
              {classifieds.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <Link to="/ads/$id" params={{ id: item.id }} className="stamp press flex items-center justify-between gap-3 px-4 py-3">
                    <span>
                      <span className={item.quiet ? "chip" : "chip chip-deep"}>{item.type}</span>
                      <span className="mt-1 block font-bold">{item.title}</span>
                      <span className="text-sm font-semibold text-muted">{item.neighborhood}</span>
                    </span>
                    {item.price ? <span className="shrink-0 font-bold">{item.price}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <p className="text-sm font-semibold text-ink/70 md:hidden">
            نسخة عرض بألوان الشعار. أرقام الطوارئ الوطنية حقيقية، وبقية الأرقام نماذج.
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
    ads: typeof classifieds;
  };
}) {
  const empty = results.news.length + results.places.length + results.ads.length === 0;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">نتائج «{query}»</h1>
      {empty ? <p className="stamp p-4 font-semibold">لا توجد نتيجة. جرّب اسماً أو حياً أو تصنيفاً.</p> : null}
      {results.news.map((item) => (
        <Link key={item.slug} to="/news/$slug" params={{ slug: item.slug }} className="stamp press block p-4">
          <span className="chip">{item.category}</span>
          <span className="mt-1 block font-bold">{item.title}</span>
        </Link>
      ))}
      {results.places.map((item) => (
        <Link key={item.slug} to="/directory/$slug" params={{ slug: item.slug }} className="stamp press block p-4">
          <span className="chip">{item.category}</span>
          <span className="mt-1 block font-bold">{item.name}</span>
        </Link>
      ))}
      {results.ads.map((item) => (
        <Link key={item.id} to="/ads/$id" params={{ id: item.id }} className="stamp press block p-4">
          <span className="chip">{item.type}</span>
          <span className="mt-1 block font-bold">{item.title}</span>
        </Link>
      ))}
    </div>
  );
}
