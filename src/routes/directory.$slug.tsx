import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { useState } from "react";
import { RevealPhone } from "@/components/phone";
import { Shell } from "@/components/shell";
import { getBusiness } from "@/data/content";

export const Route = createFileRoute("/directory/$slug")({
  head: ({ params }) => ({
    meta: [{ title: `${getBusiness(params.slug)?.name ?? "النشاط"} · رهط بوست` }],
  }),
  component: BusinessPage,
});

function BusinessPage() {
  const { slug } = Route.useParams();
  const place = getBusiness(slug);
  const [claimed, setClaimed] = useState(false);

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

  const digits = place.phone.replaceAll("-", "");

  return (
    <Shell>
      <article className="stamp p-4">
        <span className="chip">{place.category}</span>
        {place.verified ? <span className="chip chip-ink ms-2">موثّق</span> : <span className="chip ms-2">بانتظار التوثيق</span>}
        <h1 className="mt-3 text-3xl font-bold">{place.name}</h1>
        <p className="font-semibold text-muted">{place.neighborhood}</p>
        <p className="mt-3 text-lg">{place.description}</p>
        <p className="mt-3 font-bold">
          {place.open ? "مفتوح" : "مغلق الآن"} · {place.hours}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <RevealPhone phone={place.phone} />
          <a className="btn btn-ghost" href={`https://wa.me/972${digits.replace(/^0/, "")}`} target="_blank" rel="noreferrer">
            واتساب
          </a>
        </div>
        <a
          className="btn btn-ghost mt-2 w-full"
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name} رهط`)}`}
          target="_blank"
          rel="noreferrer"
        >
          <MapPin className="size-4" aria-hidden />
          الاتجاهات
        </a>
      </article>
      <button type="button" className="btn mt-4 w-full" onClick={() => setClaimed(true)}>
        {claimed ? "وصل طلب المطالبة، بانتظار اتصال التوثيق" : "هذا نشاطي"}
      </button>
    </Shell>
  );
}
