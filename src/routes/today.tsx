import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone } from "lucide-react";
import { AlertsBanner, DutyCard } from "@/components/duty";
import { GuideCard } from "@/components/guide";
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
import { guides } from "@/data/guides";
import { useNow } from "@/lib/news/format";
import { getIsraelNews } from "@/lib/news/israel-api";
import { weatherWithin } from "@/lib/weather/api";
import { breadcrumbLd, seo } from "@/lib/seo";
import { tr, trv } from "@/lib/i18n/core";
import { localizedIsrael } from "@/lib/i18n/localize";

const todayFaqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "ما هي أرقام الطوارئ والبلدية في مدينة رهط؟",
      acceptedAnswer: {
        "@type": "Answer",
        text: "أرقام الطوارئ في رهط: الشرطة 100، الإسعاف (نجمة داود الحمراء) 101، الإطفاء والإنقاذ 102، شركة الكهرباء 103، الجبهة الداخلية 104، مركز بلدية رهط 106، الطوارئ الموحد 112، واتحاد الإنقاذ 1221.",
      },
    },
    {
      "@type": "Question",
      name: "كيف أعرف صيدلية الحراسة المناوبة وأوقات الصلاة والطقس في رهط اليوم؟",
      acceptedAnswer: {
        "@type": "Answer",
        text: "تعرض صفحة «لوحة اليوم» على موقع رهط بوست حالة الطقس المباشرة في رهط، وأوقات الصلوات الخمس حسب توقيت مدينة رهط، وبيانات صيدلية المناوبة اليومية مع رقم الهاتف والاتجاهات.",
      },
    },
  ],
};

export const Route = createFileRoute("/today")({
  head: () =>
    seo({
      title: tr("لوحة اليوم في رهط: الطقس، أوقات الصلاة، الطوارئ والصيدلية المناوبة · رهط بوست"),
      description:
        tr("لوحة اليوم في رهط والنقب: الطقس الآن، أوقات الصلاة، صيدلية الحراسة اليوم، أرقام الطوارئ والإسعاف والشرطة، التنبيهات، وأهم أخبار إسرائيل مترجمة إلى العربية."),
      path: "/today",
      keywords: [
        "طقس رهط اليوم",
        "أوقات الصلاة في رهط",
        "صيدلية المناوبة رهط",
        "أرقام الطوارئ رهط",
        "بلدية رهط 106",
      ],
      jsonLd: [breadcrumbLd([{ name: tr("لوحة اليوم"), path: "/today" }]), todayFaqLd],
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
      <h1 className="mb-1 text-2xl font-bold">{tr("لوحة اليوم في رهط")}</h1>
      <p className="mb-4 font-semibold text-muted">
        {tr("حالة الطقس، مواقيت الصلاة، صيدلية الحراسة، أرقام الطوارئ وأهم عناوين اليوم.")}
      </p>
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

        {board.dutyVisible === false ? null : <DutyCard duty={board.duty} label={tr("صيدلية الحراسة")} />}

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

        <section aria-label={tr("أدلة الخدمات في رهط")}>
          <SectionTitle title={tr("أدلة الخدمات في رهط")} to="/directory" more={tr("كل الدليل")} />
          <ul className="flex flex-col gap-3">
            {guides.map((g) => (
              <li key={g.slug}>
                <GuideCard guide={g} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Shell>
  );
}
