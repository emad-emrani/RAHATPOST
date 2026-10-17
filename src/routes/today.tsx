import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone } from "lucide-react";
import { AlertsBanner, DutyCard } from "@/components/duty";
import { getBoard } from "@/lib/board/api";
import {
  IsraelNewsCredit,
  IsraelNewsLead,
  IsraelNewsRow,
  IsraelNewsUnavailable,
} from "@/components/israel-news";
import { SectionTitle, Shell } from "@/components/shell";
import { PrayerCard, WeatherCard } from "@/components/today-cards";
import { emergency } from "@/data/content";
import { useNow } from "@/lib/news/format";
import { getIsraelNews } from "@/lib/news/israel-api";
import { weatherWithin } from "@/lib/weather/api";
import { breadcrumbLd, seo } from "@/lib/seo";
import { tr, trv } from "@/lib/i18n/core";
import { localized, localizedIsrael } from "@/lib/i18n/localize";

export const Route = createFileRoute("/today")({
  head: () =>
    seo({
      title: tr("لوحة اليوم في رهط: الطقس، أوقات الصلاة، الطوارئ والصيدلية المناوبة · رهط بوست"),
      description:
        tr("لوحة اليوم في رهط والنقب: الطقس الآن، أوقات الصلاة، صيدلية الحراسة اليوم، أرقام الطوارئ والإسعاف والشرطة، التنبيهات، وأهم أخبار إسرائيل مترجمة إلى العربية."),
      path: "/today",
      jsonLd: [breadcrumbLd([{ name: tr("لوحة اليوم"), path: "/today" }])],
    }),
  loader: async () => {
    const [israel, weather, board] = await Promise.all([
      getIsraelNews(),
      weatherWithin(4_000),
      getBoard(),
    ]);
    return { israel: await localizedIsrael(israel, (d) => d.items), weather, board, now: Date.now() };
  },
  // Alerts and the duty pharmacy change during the day: keep the CDN copy short.
  headers: () => ({
    "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=180",
  }),
  staleTime: 60_000,
  component: TodayPage,
});

const TODAY_ISRAEL_ITEMS = 7;

function TodayPage() {
  const { israel, weather, board, now: loadedAt } = Route.useLoaderData();
  const now = useNow(israel.now);
  const [lead, ...rest] = israel.items.slice(0, TODAY_ISRAEL_ITEMS);
  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold">{tr("لوحة اليوم")}</h1>
      <div className="flex flex-col gap-4">
        <AlertsBanner alerts={board.alerts} />

        <WeatherCard weather={weather} />
        <PrayerCard serverNow={loadedAt} />

        <section>
          <SectionTitle title={tr("أخبار إسرائيل")} to="/israel-news" more={tr("كل الأخبار")} />
          {lead ? (
            <>
              <IsraelNewsLead item={lead} now={now} />
              <ul className="stack-list">
                {rest.map((item) => (
                  <li key={item.slug}>
                    <IsraelNewsRow item={item} now={now} />
                  </li>
                ))}
              </ul>
              <IsraelNewsCredit data={israel} />
            </>
          ) : (
            <IsraelNewsUnavailable />
          )}
        </section>

        <DutyCard duty={board.duty} label={tr("صيدلية الحراسة")} />

        <Link to="/buses" className="stamp press block p-4">
          <p className="text-sm font-bold text-muted">{tr("شركة גלים")}</p>
          <h2 className="text-xl font-bold">{tr("مواعيد باصات رهط")}</h2>
          <p className="font-semibold">{tr("داخل المدينة، وبئر السبع وكسيفة وتل السبع وعسقلان")}</p>
        </Link>

        <section>
          <h2 className="mb-3 text-xl font-bold">{tr("أرقام الطوارئ")}</h2>
          <ul className="flex flex-col gap-2">
            {emergency.map((item) => (
              <li key={item.phone}>
                <a
                  href={`tel:${item.phone}`}
                  className="stamp press flex items-center gap-3 px-3 py-3"
                >
                  <span className="icon-badge">
                    <Phone className="size-5" aria-hidden />
                  </span>
                  <span className="flex-1 font-bold">{trv(item.name)}</span>
                  <span className="text-2xl font-bold leading-none">{trv(item.phone)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Shell>
  );
}
