import { createFileRoute } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { Shell } from "@/components/shell";
import { ProductCard, SectionTile, StoreFooterLinks } from "@/components/store-parts";
import { getStore } from "@/lib/store/api";
import { HomePostCard } from "@/components/guide";
import { getGuide } from "@/data/guides";

const postGuide = getGuide("post");
import { seo } from "@/lib/seo";
import { tr } from "@/lib/i18n/core";
import { localized, localizedIsrael } from "@/lib/i18n/localize";

export const Route = createFileRoute("/store/")({
  head: () =>
    seo({
      title: tr("المتجر | رهط بوست"),
      description: tr("متجر رهط بوست: اشتراكات ومنتجات رقمية تصلك مباشرة في حسابك."),
      path: "/store",
    }),
  loader: async () => localized(await getStore(), (d) => [{ items: d.products, fields: ["name", "shortDesc", "description"] }, { items: d.categories, fields: ["name", "description"] }]),
  headers: () => ({
    "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  }),
  component: StorePage,
});

function StorePage() {
  const { products, categories, settings, ok } = Route.useLoaderData();
  const top = categories.filter((c) => !c.parentId);

  return (
    <Shell>
      <h1 className="text-2xl font-bold">{tr("المتجر")}</h1>
      <p className="mb-4 font-semibold text-muted">
        {tr("اشتراكات ومنتجات رقمية تصلك في «طلباتي» بعد الدفع.")}
      </p>
      {postGuide ? (
        <section className="mb-5" aria-label={tr("خدمة البريد")}>
          <h2 className="mb-2 text-lg font-bold">{tr("خدمة البريد")}</h2>
          <HomePostCard guide={postGuide} />
        </section>
      ) : null}
      {!ok ? <p className="stamp mb-3 p-3 font-bold">{tr("تعذّر تحميل المتجر الآن.")}</p> : null}
      {top.length ? (
        <section className="mb-5" aria-label={tr("الأقسام")}>
          <h2 className="mb-2 text-lg font-bold">{tr("الأقسام")}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {top.map((c) => (
              <li key={c.id}>
                <SectionTile c={c} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {products.length === 0 ? (
        top.length ? null : (
          <div className="stamp flex flex-col items-center gap-2 p-8 text-center">
            <ShoppingBag className="size-10 text-primary-ink" aria-hidden />
            <p className="text-lg font-bold">{tr("لا توجد منتجات بعد")}</p>
            <p className="font-semibold text-muted">{tr("نجهّز المتجر الآن. عُد قريباً.")}</p>
          </div>
        )
      ) : (
        <section aria-label={tr("كل المنتجات")}>
          <h2 className="mb-2 text-lg font-bold">{tr("كل المنتجات")}</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map((p) => (
              <li key={p.id}>
                <ProductCard p={p} currency={settings.currency} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <StoreFooterLinks />
    </Shell>
  );
}
