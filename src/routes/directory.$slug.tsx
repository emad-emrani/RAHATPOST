import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Globe, MapPin } from "lucide-react";
import { OsmCredit } from "@/components/osm-credit";
import { RevealPhone } from "@/components/phone";
import { Shell } from "@/components/shell";
import { getApprovedEntries } from "@/lib/directory/api";
import { mapsUrl, osmEntries, type DirectoryEntry } from "@/lib/directory/types";

export const Route = createFileRoute("/directory/$slug")({
  loader: async ({ params }) => {
    let place: DirectoryEntry | undefined;
    if (params.slug.startsWith("biz-")) {
      const approved = await getApprovedEntries();
      place = approved.entries.find((e) => e.slug === params.slug);
    } else {
      place = osmEntries().find((e) => e.slug === params.slug);
    }
    return { place: place ?? null };
  },
  staleTime: 60_000,
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.place?.name ?? "النشاط"} · رهط بوست` }],
  }),
  component: BusinessPage,
});

function BusinessPage() {
  const { place } = Route.useLoaderData();

  if (!place) {
    return (
      <Shell>
        <p className="stamp p-4 font-semibold">هذا النشاط غير موجود في الدليل.</p>
        <Link to="/directory" className="btn mt-4">
          رجوع للدليل
        </Link>
      </Shell>
    );
  }

  const digits = place.phone?.replace(/[^\d+]/g, "") ?? "";
  const isMobile = /^(05|\+9725)/.test(digits);

  return (
    <Shell>
      <article className="stamp p-4">
        <span className="chip">{place.category}</span>
        {place.verified ? <span className="chip chip-ink ms-2">موثّق</span> : null}
        <h1 className="mt-3 text-3xl font-bold">{place.name}</h1>
        {place.altName ? <p className="font-semibold text-muted">{place.altName}</p> : null}
        {place.address || place.area ? <p className="mt-1 font-semibold">{place.address || place.area}</p> : null}
        {place.description ? <p className="mt-3 text-lg">{place.description}</p> : null}
        {place.openingHours ? (
          <p className="mt-3 font-bold">
            ساعات العمل: <span dir="ltr">{place.openingHours}</span>
          </p>
        ) : null}

        {place.phone ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <RevealPhone phone={place.phone} />
            {isMobile ? (
              <a
                className="btn btn-ghost"
                href={`https://wa.me/${digits.startsWith("+") ? digits.slice(1) : `972${digits.slice(1)}`}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                واتساب
              </a>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 font-semibold text-muted">لا يوجد رقم هاتف مسجّل لهذا المكان.</p>
        )}

        <a className="btn btn-ghost mt-2 w-full" href={mapsUrl(place)} target="_blank" rel="noopener noreferrer">
          <MapPin className="size-4" aria-hidden />
          الاتجاهات
        </a>
        {place.website ? (
          <a className="btn btn-ghost mt-2 w-full" href={place.website} target="_blank" rel="noopener noreferrer">
            <Globe className="size-4" aria-hidden />
            الموقع الإلكتروني
          </a>
        ) : null}
        {place.osm ? (
          <a
            className="mt-3 inline-flex items-center gap-1 text-sm font-bold underline decoration-2 underline-offset-4"
            href={place.osm}
            target="_blank"
            rel="noopener noreferrer"
          >
            عرض أو تصحيح في OpenStreetMap
            <ExternalLink className="size-3" aria-hidden />
          </a>
        ) : null}
      </article>
      {place.source === "osm" ? (
        <Link to="/submit" search={{ mode: "نشاط", name: place.name }} className="btn mt-4 w-full">
          هذا نشاطي
        </Link>
      ) : null}
      {place.source === "osm" ? <OsmCredit /> : null}
    </Shell>
  );
}
