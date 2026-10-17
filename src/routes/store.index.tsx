import { createFileRoute, Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { Shell } from "@/components/shell";
import { ProductCard, StoreFooterLinks } from "@/components/store-parts";
import { getStore } from "@/lib/store/api";
import { HomePostCard } from "@/components/guide";
import { getGuide } from "@/data/guides";

const postGuide = getGuide("post");
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/store/")({
  validateSearch: (s: Record<string, unknown>): { cat?: string } => ({
    cat: typeof s.cat === "string" && /^[a-z0-9-]{2,60}$/.test(s.cat) ? s.cat : undefined,
  }),
  head: () =>
    seo({
      title: "المتجر | رهط بوست",
      description: "متجر رهط بوست: اشتراكات ومنتجات رقمية تصلك مباشرة في حسابك.",
      path: "/store",
    }),
  loader: () => getStore(),
  headers: () => ({
    "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
  }),
  component: StorePage,
});

function StorePage() {
  const { products, categories, settings, ok } = Route.useLoaderData();
  const { cat } = Route.useSearch();
  const category = categories.find((c) => c.slug === cat);
  const used = categories.filter((c) => products.some((p) => p.categoryId === c.id));
  const list = category ? products.filter((p) => p.categoryId === category.id) : products;

  return (
    <Shell>
      <h1 className="text-2xl font-bold">المتجر</h1>
      <p className="mb-4 font-semibold text-muted">
        اشتراكات ومنتجات رقمية تصلك في «طلباتي» بعد الدفع.
      </p>
      {postGuide ? (
        <section className="mb-5" aria-label="خدمة البريد">
          <h2 className="mb-2 text-lg font-bold">خدمة البريد</h2>
          <HomePostCard guide={postGuide} />
        </section>
      ) : null}
      {used.length ? (
        <div className="scroll-row -mx-4 mb-4 px-4">
          <Link
            to="/store"
            search={{}}
            className={!category ? "chip chip-ink shrink-0" : "chip shrink-0 bg-paper"}
          >
            الكل
          </Link>
          {used.map((c) => (
            <Link
              key={c.id}
              to="/store"
              search={{ cat: c.slug }}
              className={
                category?.id === c.id ? "chip chip-ink shrink-0" : "chip shrink-0 bg-paper"
              }
            >
              {c.name}
            </Link>
          ))}
        </div>
      ) : null}
      {!ok ? <p className="stamp mb-3 p-3 font-bold">تعذّر تحميل المتجر الآن.</p> : null}
      {list.length === 0 ? (
        <div className="stamp flex flex-col items-center gap-2 p-8 text-center">
          <ShoppingBag className="size-10 text-primary-ink" aria-hidden />
          <p className="text-lg font-bold">لا توجد منتجات بعد</p>
          <p className="font-semibold text-muted">نجهّز المتجر الآن. عُد قريباً.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {list.map((p) => (
            <li key={p.id}>
              <ProductCard p={p} currency={settings.currency} />
            </li>
          ))}
        </ul>
      )}
      <StoreFooterLinks />
    </Shell>
  );
}
