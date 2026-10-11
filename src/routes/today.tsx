import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone } from "lucide-react";
import { DutyCard } from "@/components/duty";
import {
  IsraelNewsCredit,
  IsraelNewsLead,
  IsraelNewsRow,
  IsraelNewsUnavailable,
} from "@/components/israel-news";
import { SectionTitle, Shell } from "@/components/shell";
import { alert, emergency } from "@/data/content";
import { useNow } from "@/lib/news/format";
import { getIsraelNews } from "@/lib/news/israel-api";
import { breadcrumbLd, seo } from "@/lib/seo";

export const Route = createFileRoute("/today")({
  head: () =>
    seo({
      title: "لوحة اليوم في رهط: الطوارئ والصيدلية المناوبة · رهط بوست",
      description:
        "لوحة اليوم في رهط والنقب: صيدلية الحراسة اليوم، أرقام الطوارئ والإسعاف والشرطة، التنبيهات، وأهم أخبار إسرائيل مترجمة إلى العربية.",
      path: "/today",
      jsonLd: [breadcrumbLd([{ name: "لوحة اليوم", path: "/today" }])],
    }),
  loader: () => getIsraelNews(),
  staleTime: 5 * 60_000,
  component: TodayPage,
});

const TODAY_ISRAEL_ITEMS = 7;

function TodayPage() {
  const israel = Route.useLoaderData();
  const now = useNow(israel.now);
  const [lead, ...rest] = israel.items.slice(0, TODAY_ISRAEL_ITEMS);
  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold">لوحة اليوم</h1>
      <div className="flex flex-col gap-4">
        {alert ? (
          <section className="alert-card p-4">
            <p className="chip">تنبيه</p>
            <h2 className="mt-2 text-xl font-bold">{alert.title}</h2>
            <p className="font-semibold">{alert.body}</p>
            <p className="mt-1 text-sm font-bold">{alert.until}</p>
          </section>
        ) : null}

        <section>
          <SectionTitle title="أخبار إسرائيل" to="/israel-news" more="كل الأخبار" />
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

        <DutyCard label="صيدلية الحراسة" />

        <Link to="/buses" className="stamp press block p-4">
          <p className="text-sm font-bold text-muted">شركة גלים</p>
          <h2 className="text-xl font-bold">مواعيد باصات رهط</h2>
          <p className="font-semibold">داخل المدينة، وبئر السبع وكسيفة وتل السبع وعسقلان</p>
        </Link>

        <section>
          <h2 className="mb-3 text-xl font-bold">أرقام الطوارئ</h2>
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
                  <span className="flex-1 font-bold">{item.name}</span>
                  <span className="text-2xl font-bold leading-none">{item.phone}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Shell>
  );
}
