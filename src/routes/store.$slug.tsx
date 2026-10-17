import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { Shell } from "@/components/shell";
import {
  Badges,
  BuyButtons,
  Price,
  ProductImage,
  WhatsAppCashButton,
} from "@/components/store-parts";
import { getStoreProduct } from "@/lib/store/api";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/store/$slug")({
  loader: async ({ params }) => {
    const r = await getStoreProduct({ data: { slug: params.slug } });
    if (!r.product) throw notFound();
    return r;
  },
  head: ({ loaderData, params }) =>
    loaderData?.product
      ? seo({
          title: `${loaderData.product.name} | متجر رهط بوست`,
          description: loaderData.product.shortDesc || loaderData.product.name,
          path: `/store/${params.slug}`,
        })
      : { meta: [{ title: "غير موجود · رهط بوست" }] },
  component: ProductPage,
  notFoundComponent: () => (
    <Shell>
      <p className="stamp p-4 font-bold">هذا المنتج غير متوفر.</p>
      <Link to="/store" className="btn mt-3">
        إلى المتجر
      </Link>
    </Shell>
  ),
});

function ProductPage() {
  const { product: p, categories, settings } = Route.useLoaderData();
  if (!p) return null;
  const cat = categories.find((c) => c.id === p.categoryId);
  return (
    <Shell>
      <Link to="/store" className="mb-3 inline-flex min-h-10 items-center gap-1 font-bold">
        <ChevronRight className="size-4" aria-hidden />
        المتجر
      </Link>
      <article className="stamp overflow-hidden">
        <ProductImage p={p} className="aspect-[16/10] w-full" />
        <div className="flex flex-col gap-3 p-4">
          <Badges p={p} />
          {cat ? (
            <Link to="/store" search={{ cat: cat.slug }} className="text-sm font-bold text-muted">
              {cat.name}
            </Link>
          ) : null}
          <h1 className="text-2xl font-bold">{p.name}</h1>
          <Price p={p} currency={settings.currency} big />
          {p.shortDesc ? <p className="font-semibold">{p.shortDesc}</p> : null}
          <BuyButtons p={p} />
          {p.inStock ? (
            <WhatsAppCashButton items={[{ id: p.id, qty: 1 }]} redirect={`/store/${p.slug}`} />
          ) : null}
          {p.description ? <p className="whitespace-pre-line">{p.description}</p> : null}
          <p className="text-sm font-semibold text-muted">
            منتج رقمي: يظهر لك محتواه (الكود أو الرابط) في «طلباتي» فور تأكيد الدفع.
          </p>
        </div>
      </article>
    </Shell>
  );
}
