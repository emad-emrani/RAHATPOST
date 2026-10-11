import { createFileRoute, Link } from "@tanstack/react-router";
import { UserRound } from "lucide-react";
import { RevealPhone } from "@/components/phone";
import { Shell } from "@/components/shell";
import { getClassified } from "@/data/content";
import { getPublicAd, getPublicAds } from "@/lib/ads/api";
import { AD_ID_RE } from "@/lib/ads/types";
import { breadcrumbLd, seo, snippet } from "@/lib/seo";

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
      title: `${ad?.title ?? "الإعلان غير متوفر"} · إعلانات رهط | رهط بوست`,
      description: ad
        ? snippet(`${ad.type} في رهط${ad.neighborhood ? ` (${ad.neighborhood})` : ""}: ${ad.body}`)
        : "هذا الإعلان غير متوفر.",
      path,
      // Real approved ads are indexed; placeholder samples and missing ads are not.
      robots: ad && !ad.sample ? "index" : "noindex",
      jsonLd: ad
        ? [
            breadcrumbLd([
              { name: "إعلانات رهط", path: "/ads" },
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
        <p className="stamp p-4 font-semibold">هذا الإعلان غير موجود أو انتهت مدته.</p>
        <Link to="/ads" className="btn mt-4">
          رجوع للإعلانات
        </Link>
      </Shell>
    );
  }

  const digits = ad.phone.replaceAll("-", "");
  const intl = digits.startsWith("+972") ? digits.slice(1) : `972${digits.replace(/^0/, "")}`;

  return (
    <Shell>
      <article className={ad.quiet ? "stamp-flat p-4" : "stamp p-4"}>
        <span className={ad.quiet ? "chip" : "chip chip-deep"}>{ad.type}</span>
        {ad.sample ? <span className="chip ms-1">نموذج</span> : null}
        <h1 className="mt-3 text-2xl font-bold">{ad.title}</h1>
        <p className="font-semibold text-muted">{ad.neighborhood}</p>
        {ad.price ? <p className="mt-2 text-xl font-bold">{ad.price}</p> : null}
        <p className="mt-3 text-lg whitespace-pre-line">{ad.body}</p>
        {ad.posterName ? (
          <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-muted">
            <UserRound className="size-4" aria-hidden />
            نشره: {ad.posterName}
            {ad.createdAt
              ? ` · ${new Date(ad.createdAt).toLocaleDateString("ar-u-nu-latn", { timeZone: "Asia/Jerusalem" })}`
              : ""}
          </p>
        ) : null}
        {ad.sample ? (
          <p className="mt-4 rounded-xl bg-surface p-3 text-sm font-semibold text-muted">
            هذا إعلان نموذجي لعرض الشكل فقط، وليس إعلاناً حقيقياً، لذلك لا يوجد رقم للتواصل.
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
              واتساب
            </a>
          </div>
        )}
      </article>
      {ad.sample ? null : (
        <p className="mt-4 text-sm font-semibold text-muted">
          إعلان من مستخدم وليس من رهط بوست. لا تدفع مسبقاً قبل أن ترى الشيء أو تلتقي بصاحبه.
        </p>
      )}
    </Shell>
  );
}
