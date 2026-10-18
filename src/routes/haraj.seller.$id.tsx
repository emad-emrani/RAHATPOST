import { createFileRoute, Link } from "@tanstack/react-router";
import { ListingCard, memberSince, SellerAvatar } from "@/components/haraj";
import { Shell } from "@/components/shell";
import { tr } from "@/lib/i18n/core";
import { getSeller } from "@/lib/market/api";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/haraj/seller/$id")({
  loader: ({ params }) => getSeller({ data: { id: params.id } }),
  head: ({ loaderData, params }) =>
    seo({
      title: tr("إعلانات {0} · حراج رهط", loaderData?.seller?.name ?? "عضو"),
      description: tr("كل الأغراض التي يعرضها هذا العضو للبيع في حراج رهط."),
      path: `/haraj/seller/${params.id}`,
      robots: loaderData?.items.length ? "index" : "noindex",
    }),
  component: SellerPage,
});

function SellerPage() {
  const { seller, items } = Route.useLoaderData();
  if (!seller)
    return (
      <Shell>
        <p className="stamp p-4 font-semibold">{tr("هذا العضو غير موجود.")}</p>
        <Link to="/haraj" className="btn mt-4">{tr("رجوع للحراج")}</Link>
      </Shell>
    );
  return (
    <Shell wide>
      <div className="stamp mb-4 flex items-center gap-3 p-4">
        <SellerAvatar seller={seller} size={16} />
        <div>
          <h1 className="text-xl font-bold">{seller.name}</h1>
          <p className="font-semibold text-muted">
            {tr("عضو منذ {0}", memberSince(seller.since))} · {tr("{0} إعلان", items.length)}
          </p>
        </div>
      </div>
      {items.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((i) => <li key={i.id}><ListingCard item={i} /></li>)}
        </ul>
      ) : (
        <p className="stamp p-4 font-semibold">{tr("لا إعلانات منشورة لهذا العضو الآن.")}</p>
      )}
    </Shell>
  );
}
