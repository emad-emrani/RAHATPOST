import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import {
  IsraelNewsCredit,
  IsraelNewsLead,
  IsraelNewsRow,
  IsraelNewsUnavailable,
} from "@/components/israel-news";
import { getIsraelNews } from "@/lib/news/israel-api";
import { useNow } from "@/lib/news/format";
import { breadcrumbLd, seo } from "@/lib/seo";
import { tr } from "@/lib/i18n/core";
import { localized, localizedIsrael } from "@/lib/i18n/localize";

export const Route = createFileRoute("/israel-news/")({
  head: () =>
    seo({
      title: tr("أخبار إسرائيل بالعربية اليوم · رهط بوست"),
      description:
        tr("أهم عناوين أخبار إسرائيل من واي نت والقناة 12 ومعاريف وغلوبس، مترجمة آلياً إلى العربية لأهالي رهط والنقب، مع رابط الخبر الأصلي بالعبرية."),
      path: "/israel-news",
      jsonLd: [breadcrumbLd([{ name: tr("أخبار إسرائيل"), path: "/israel-news" }])],
    }),
  loader: async () => localizedIsrael(await getIsraelNews(), (d) => d.items),
  staleTime: 4 * 60_000,
  component: IsraelNewsPage,
});

function IsraelNewsPage() {
  const data = Route.useLoaderData();
  const now = useNow(data.now);
  const [lead, ...rest] = data.items;
  return (
    <Shell>
      <h1 className="mb-1 text-2xl font-bold">{tr("أخبار إسرائيل")}</h1>
      <p className="mb-4 font-semibold text-muted">
        {tr("من المواقع الإخبارية العبرية، مترجمة آلياً إلى العربية")}
      </p>
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
        </>
      ) : (
        <IsraelNewsUnavailable />
      )}
      <IsraelNewsCredit data={data} />
    </Shell>
  );
}
