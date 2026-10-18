import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { AdGallery } from "@/components/ad-gallery";
import { SellerCard, SpecsTable } from "@/components/haraj";
import { catName, findCat } from "@/lib/market/categories";
import { RevealPhone } from "@/components/phone";
import { ReportButton } from "@/components/report";
import { Shell } from "@/components/shell";
import { tr, trv } from "@/lib/i18n/core";
import { getAllHarajCategories, getListing } from "@/lib/market/api";
import { priceLabel, whatsappUrl, type Listing } from "@/lib/market/types";
import { mediaUrl } from "@/lib/media/types";
import { breadcrumbLd, seo, SITE_URL, snippet } from "@/lib/seo";

const CONDITION_SCHEMA: Record<string, string> = {
  جديد: "https://schema.org/NewCondition",
  "شبه جديد": "https://schema.org/UsedCondition",
  مستعمل: "https://schema.org/UsedCondition",
};

function productLd(l: Listing, path: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: l.title,
    description: snippet(l.description, 300),
    category: l.category,
    image: l.photos.map((k) => `${SITE_URL}${mediaUrl(k)}`),
    url: `${SITE_URL}${path}`,
    itemCondition: CONDITION_SCHEMA[l.condition],
    ...(l.category === "سيارات" && l.specs.make ? { brand: { "@type": "Brand", name: String(l.specs.make) } } : {}),
    ...(l.category === "سيارات" && l.specs.year ? { productionDate: String(l.specs.year) } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "ILS",
      price: l.priceMode === "free" ? 0 : l.price ?? undefined,
      availability: l.sold ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      itemCondition: CONDITION_SCHEMA[l.condition],
      seller: { "@type": "Person", name: l.seller.name },
      areaServed: l.area,
    },
  };
}

export const Route = createFileRoute("/haraj/$id")({
  loader: async ({ params }) => {
    const [item, cats] = await Promise.all([getListing({ data: { id: params.id } }), getAllHarajCategories()]);
    return { item, cats };
  },
  head: ({ loaderData, params }) => {
    const l = loaderData?.item;
    const path = `/haraj/${params.id}`;
    return seo({
      title: l ? tr("{0} — {1} · حراج رهط", l.title, priceLabel(l)) : tr("الإعلان غير متوفر · حراج رهط"),
      description: l ? snippet(tr("{0} ({1}) في {2}: {3}", l.category, l.condition, l.area, l.description)) : tr("هذا الإعلان غير متوفر."),
      path,
      // Sold or expired items drop out of the index; the page stays for people with the link.
      robots: l && !l.sold && !l.expired ? "index" : "noindex",
      image: l?.photos[0] ? `${SITE_URL}${mediaUrl(l.photos[0])}` : undefined,
      imageAlt: l?.photos[0] ? l.title : undefined,
      jsonLd: l
        ? [breadcrumbLd([{ name: tr("حراج رهط"), path: "/haraj" }, { name: snippet(l.title, 80), path }]), ...(l.sold ? [] : [productLd(l, path)])]
        : [],
    });
  },
  component: ItemPage,
});

function ItemPage() {
  const { item: l, cats } = Route.useLoaderData();
  if (!l)
    return (
      <Shell>
        <p className="stamp p-4 font-semibold">{tr("هذا الإعلان غير موجود أو انتهت مدته.")}</p>
        <Link to="/haraj" className="btn mt-4">{tr("رجوع للحراج")}</Link>
      </Shell>
    );
  const url = typeof window === "undefined" ? `${SITE_URL}/haraj/${l.id}` : window.location.href;
  return (
    <Shell>
      <article className="stamp p-4">
        {l.photos.length ? <AdGallery keys={l.photos} title={l.title} /> : null}
        <div className="flex flex-wrap gap-1.5">
          <Link to="/haraj" search={{ cat: l.category }} className="chip chip-deep">{findCat(cats, l.category)?.icon} {catName(findCat(cats, l.category), l.category)}</Link>
          <span className="chip">{trv(l.condition)}</span>
          {l.sold ? <span className="chip chip-ink">{tr("انباع")}</span> : null}
          {l.expired ? <span className="chip">{tr("منتهي")}</span> : null}
        </div>
        <h1 className="mt-2 text-2xl font-bold leading-tight">{trv(l.title)}</h1>
        <p className="mt-1 text-2xl font-bold">{trv(priceLabel(l))}</p>
        <p className="mt-1 font-semibold text-muted">📍 {trv(l.area)} · {new Date(l.renewedAt).toLocaleDateString("en-GB")}</p>
        {l.sold ? (
          <p className="mt-3 rounded-xl bg-surface p-3 font-bold">{tr("هذا الغرض انباع. شاهد إعلانات أخرى للبائع.")}</p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            <a className="btn bg-[#25d366] text-white" href={l.phone ? whatsappUrl(l.phone, tr("مرحباً، بخصوص إعلانك «{0}» في حراج رهط: {1}", l.title, url)) : `/api/haraj-whatsapp?id=${l.id}`} target="_blank" rel="noopener noreferrer nofollow">
              <MessageCircle className="size-5" aria-hidden /> {tr("تواصل عبر واتساب")}
            </a>
            {l.phone ? <RevealPhone phone={l.phone} /> : <p className="text-sm font-semibold text-muted">{tr("البائع أخفى رقمه، التواصل عبر واتساب فقط.")}</p>}
          </div>
        )}
        <SpecsTable cat={findCat(cats, l.category)} specs={l.specs} />
        <h2 className="mt-5 font-bold">{tr("الوصف")}</h2>
        <p className="mt-1 whitespace-pre-line font-semibold leading-relaxed">{trv(l.description)}</p>
      </article>
      <h2 className="mb-2 mt-5 font-bold">{tr("البائع")}</h2>
      <SellerCard seller={l.seller} />
      <div className="mt-4 flex justify-center">
        <ReportButton type="ad" id={l.id} label={tr("إبلاغ عن الإعلان")} />
      </div>
    </Shell>
  );
}
