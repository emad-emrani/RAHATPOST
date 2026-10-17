import { createFileRoute, Link } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { RevealPhone } from "@/components/phone";
import { Shell } from "@/components/shell";
import { getClassified } from "@/data/content";
import { getPublicAd, getPublicAds } from "@/lib/ads/api";
import { AD_ID_RE } from "@/lib/ads/types";
import { mediaUrl } from "@/lib/media/types";
import { AdGallery } from "@/components/ad-gallery";
import { breadcrumbLd, seo, SITE_URL, snippet } from "@/lib/seo";
import { ReportButton } from "@/components/report";
import { tr, trv } from "@/lib/i18n/core";

type ViewAd = {
  id: string;
  type: string;
  title: string;
  body: string;
  neighborhood: string;
  price?: string | null;
  phone: string;
  quiet?: boolean;
  sample?: boolean;
  posterName?: string;
  createdAt?: string;
  photos?: string[];
};

export const Route = createFileRoute("/ads/$id")({
  loader: async ({ params }): Promise<{ ad: ViewAd | null }> => {
    if (AD_ID_RE.test(params.id)) {
      const ad = await getPublicAd({ data: { id: params.id } });
      return { ad: ad ? { ...ad, body: ad.description } : null };
    }
    const sample = getClassified(params.id);
    if (!sample) return { ad: null };
    // Samples are only shown while there are no real approved ads.
    const { showSamples } = await getPublicAds();
    return { ad: showSamples ? sample : null };
  },
  head: ({ loaderData, params }) => {
    const ad = loaderData?.ad;
    const path = `/ads/${params.id}`;
    return seo({
      title: tr("{0} · إعلانات رهط | رهط بوست", ad?.title ?? "الإعلان غير متوفر"),
      description: ad
        ? snippet(tr("{0} في رهط{1}: {2}", ad.type, ad.neighborhood ? ` (${ad.neighborhood})` : "", ad.body))
        : tr("هذا الإعلان غير متوفر."),
      path,
      // Real approved ads are indexed; placeholder samples and missing ads are not.
      robots: ad && !ad.sample ? "index" : "noindex",
      image: ad?.photos?.[0] ? `${SITE_URL}${mediaUrl(ad.photos[0])}` : undefined,
      imageAlt: ad?.photos?.[0] ? ad.title : undefined,
      jsonLd: ad
        ? [
            breadcrumbLd([
              { name: tr("إعلانات رهط"), path: "/ads" },
              { name: snippet(ad.title, 80), path },
            ]),
          ]
        : [],
    });
  },
  component: AdPage,
});

function AdPage() {
  const { ad } = Route.useLoaderData();

  if (!ad) {
    return (
      <Shell>
        <p className="stamp p-4 font-semibold">{tr("هذا الإعلان غير موجود أو انتهت مدته.")}</p>
        <Link to="/ads" className="btn mt-4">
          {tr("رجوع للإعلانات")}
        </Link>
      </Shell>
    );
  }

  const digits = ad.phone.replaceAll("-", "");
  const intl = digits.startsWith("+972") ? digits.slice(1) : `972${digits.replace(/^0/, "")}`;

  return (
    <Shell>
      <article className={ad.quiet ? "stamp-flat p-4" : "stamp p-4"}>
        {ad.photos?.length ? <AdGallery keys={ad.photos} title={trv(ad.title)} /> : null}
        <span className={ad.quiet ? "chip" : "chip chip-deep"}>{trv(ad.type)}</span>
        {ad.sample ? <span className="chip ms-1">{tr("نموذج")}</span> : null}
        <h1 className="mt-3 text-2xl font-bold">{trv(ad.title)}</h1>
        <p className="font-semibold text-muted">{trv(ad.neighborhood)}</p>
        {ad.price ? <p className="mt-2 text-xl font-bold">{trv(ad.price)}</p> : null}
        <p className="mt-3 text-lg whitespace-pre-line">{trv(ad.body)}</p>
        {ad.posterName ? (
          <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-muted">
            <UserRound className="size-4" aria-hidden />
            {tr("نشره:")} {trv(ad.posterName)}
            {ad.createdAt
              ? ` · ${new Date(ad.createdAt).toLocaleDateString("ar-u-nu-latn", { timeZone: "Asia/Jerusalem" })}`
              : ""}
          </p>
        ) : null}
        {ad.sample ? (
          <p className="mt-4 rounded-xl bg-surface p-3 text-sm font-semibold text-muted">
            {tr("هذا إعلان نموذجي لعرض الشكل فقط، وليس إعلاناً حقيقياً، لذلك لا يوجد رقم للتواصل.")}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <RevealPhone phone={ad.phone} />
            <a
              className="btn btn-ghost"
              href={`https://wa.me/${intl}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {tr("واتساب")}
            </a>
          </div>
        )}
      </article>
      {ad.sample ? null : (
        <>
          <p className="mt-4 text-sm font-semibold text-muted">
            {tr("إعلان من مستخدم وليس من رهط بوست. لا تدفع مسبقاً قبل أن ترى الشيء أو تلتقي بصاحبه.")}
          </p>
          {AD_ID_RE.test(ad.id) ? <ReportButton type="ad" id={ad.id} /> : null}
        </>
      )}
    </Shell>
  );
}
