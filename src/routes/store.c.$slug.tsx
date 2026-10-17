import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { Breadcrumbs, ProductCard, SectionCover, SectionTile } from "@/components/store-parts";
import { getStoreSection } from "@/lib/store/api";
import { seo } from "@/lib/seo";
import { tr, trv } from "@/lib/i18n/core";
import { localized, localizedIsrael } from "@/lib/i18n/localize";

export const Route = createFileRoute("/store/c/$slug")({
  loader: async ({ params }) => {
    const r = await getStoreSection({ data: { slug: params.slug } });
    if (!r.section) throw notFound();
    return localized(r, (d) => [
      { items: d.products, fields: ["name", "shortDesc", "description"] },
      { items: [d.section, d.parent, ...d.children], fields: ["name", "description"] },
    ]);
  },
  head: ({ loaderData, params }) =>
    loaderData?.section
      ? seo({
          title: tr("{0} | متجر رهط بوست", loaderData.section.name),
          description:
            loaderData.section.description || tr("{0} في متجر رهط بوست", loaderData.section.name),
          path: `/store/c/${params.slug}`,
        })
      : { meta: [{ title: tr("غير موجود · رهط بوست") }] },
  headers: () => ({
    "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  }),
  component: SectionPage,
  notFoundComponent: () => (
    <Shell>
      <p className="stamp p-4 font-bold">{tr("هذا القسم غير متوفر.")}</p>
      <Link to="/store" className="btn mt-3">
        {tr("إلى المتجر")}
      </Link>
    </Shell>
  ),
});

function SectionPage() {
  const { section, parent, children, products, settings } = Route.useLoaderData();
  if (!section) return null;
  return (
    <Shell>
      <Breadcrumbs
        items={[
          ...(parent ? [{ label: parent.name, slug: parent.slug }] : []),
          { label: section.name },
        ]}
      />
      <header className="stamp mb-4 flex items-center gap-3 overflow-hidden p-3">
        <SectionCover c={section} className="size-20 shrink-0 rounded-2xl" />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{trv(section.name)}</h1>
          {section.description ? (
            <p className="font-semibold text-muted">{trv(section.description)}</p>
          ) : null}
        </div>
      </header>
      {children.length ? (
        <ul className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {children.map((c) => (
            <li key={c.id}>
              <SectionTile c={c} />
            </li>
          ))}
        </ul>
      ) : null}
      {products.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {products.map((p) => (
            <li key={p.id}>
              <ProductCard p={p} currency={settings.currency} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="stamp p-6 text-center font-bold">
          {tr("قريباً: نجهّز الخيارات والأسعار لهذا القسم.")}
        </p>
      )}
    </Shell>
  );
}
