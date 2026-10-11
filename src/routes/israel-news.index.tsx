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

export const Route = createFileRoute("/israel-news/")({
  head: () => ({ meta: [{ title: "أخبار إسرائيل · رهط بوست" }] }),
  loader: () => getIsraelNews(),
  staleTime: 5 * 60_000,
  component: IsraelNewsPage,
});

function IsraelNewsPage() {
  const data = Route.useLoaderData();
  const now = useNow(data.now);
  const [lead, ...rest] = data.items;
  return (
    <Shell>
      <h1 className="mb-1 text-2xl font-bold">أخبار إسرائيل</h1>
      <p className="mb-4 font-semibold text-muted">
        من المواقع الإخبارية العبرية، مترجمة آلياً إلى العربية
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
