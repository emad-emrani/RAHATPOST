import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PushCta, ShareWhatsApp } from "@/components/growth";
import { Shell } from "@/components/shell";
import {
  Badges,
  Breadcrumbs,
  BuyButtons,
  Price,
  ProductImage,
  WhatsAppCashButton,
} from "@/components/store-parts";
import { getStoreProduct } from "@/lib/store/api";
import { absoluteUrl, breadcrumbLd, seo, SITE_NAME, snippet } from "@/lib/seo";
import { mediaUrl } from "@/lib/media/types";
import { effectivePrice } from "@/lib/store/types";
import { tr, trv } from "@/lib/i18n/core";
import { localized, localizedIsrael } from "@/lib/i18n/localize";

export const Route = createFileRoute("/store/$slug")({
  loader: async ({ params }) => {
    const r = await getStoreProduct({ data: { slug: params.slug } });
    if (!r.product) throw notFound();
    return localized(r, (d) => [
      { items: [d.product], fields: ["name", "shortDesc", "description"] },
      { items: d.categories, fields: ["name", "description"] },
    ]);
  },
  head: ({ loaderData, params }) => {
    const p = loaderData?.product;
    if (!p) return { meta: [{ title: tr("غير موجود · رهط بوست") }] };
    const path = `/store/${params.slug}`;
    const image = p.imageKey ? absoluteUrl(mediaUrl(p.imageKey)) : undefined;
    const description = snippet(p.shortDesc || p.description || p.name);
    return seo({
      title: tr("{0} | متجر رهط بوست", p.name),
      description,
      path,
      image,
      imageAlt: p.name,
      // «مثال» products are display-only samples: keep them out of search.
      robots: p.isSample ? "noindex" : "index",
      jsonLd: p.isSample
        ? []
        : [
            {
              "@context": "https://schema.org",
              "@type": "Product",
              name: p.name,
              description,
              ...(image ? { image: [image] } : {}),
              url: absoluteUrl(path),
              brand: { "@type": "Brand", name: SITE_NAME },
              offers: {
                "@type": "Offer",
                url: absoluteUrl(path),
                priceCurrency: "ILS",
                price: (effectivePrice(p) / 100).toFixed(2),
                availability: p.inStock
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
                seller: { "@id": "https://rahatpost.com/#organization" },
              },
            },
            breadcrumbLd([
              { name: tr("المتجر"), path: "/store" },
              { name: p.name, path },
            ]),
          ],
    });
  },
  component: ProductPage,
  notFoundComponent: () => (
    <Shell>
      <p className="stamp p-4 font-bold">{tr("هذا المنتج غير متوفر.")}</p>
      <Link to="/store" className="btn mt-3">
        {tr("إلى المتجر")}
      </Link>
    </Shell>
  ),
});

function ProductPage() {
  const { product: p, categories, settings } = Route.useLoaderData();
  if (!p) return null;
  const cat = categories.find((c) => c.id === p.categoryId);
  const parentCat = cat?.parentId ? categories.find((c) => c.id === cat.parentId) : undefined;
  return (
    <Shell>
      <Breadcrumbs
        items={[
          ...(parentCat ? [{ label: parentCat.name, slug: parentCat.slug }] : []),
          ...(cat ? [{ label: cat.name, slug: cat.slug }] : []),
          { label: p.name },
        ]}
      />
      <article className="stamp overflow-hidden">
        <ProductImage p={p} className="aspect-[16/10] w-full" />
        <div className="flex flex-col gap-3 p-4">
          <Badges p={p} />
          <h1 className="text-2xl font-bold">{trv(p.name)}</h1>
          <Price p={p} currency={settings.currency} big />
          {p.shortDesc ? <p className="font-semibold">{trv(p.shortDesc)}</p> : null}
          <ShareWhatsApp title={p.name} path={`/store/${p.slug}`} />
          <BuyButtons p={p} />
          {p.inStock && !p.isSample ? (
            <WhatsAppCashButton items={[{ id: p.id, qty: 1 }]} redirect={`/store/${p.slug}`} />
          ) : null}
          {p.description ? <p className="whitespace-pre-line">{trv(p.description)}</p> : null}
          <p className="text-sm font-semibold text-muted">
            {tr("منتج رقمي: يظهر لك محتواه (الكود أو الرابط) في «طلباتي» فور تأكيد الدفع.")}
          </p>
        </div>
      </article>
    </Shell>
  );
}
