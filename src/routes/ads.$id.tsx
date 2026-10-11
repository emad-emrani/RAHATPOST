import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { RevealPhone } from "@/components/phone";
import { Shell } from "@/components/shell";
import { getClassified } from "@/data/content";

export const Route = createFileRoute("/ads/$id")({
  head: ({ params }) => ({
    meta: [{ title: `${getClassified(params.id)?.title ?? "الإعلان"} · رهط بوست` }],
  }),
  component: AdPage,
});

function AdPage() {
  const { id } = Route.useParams();
  const ad = getClassified(id);
  const [reported, setReported] = useState(false);

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

  return (
    <Shell>
      <article className={ad.quiet ? "stamp-flat p-4" : "stamp p-4"}>
        <span className={ad.quiet ? "chip" : "chip chip-deep"}>{ad.type}</span>
        {ad.sample ? <span className="chip ms-1">نموذج</span> : null}
        <h1 className="mt-3 text-2xl font-bold">{ad.title}</h1>
        <p className="font-semibold text-muted">{ad.neighborhood}</p>
        {ad.price ? <p className="mt-2 text-xl font-bold">{ad.price}</p> : null}
        <p className="mt-3 text-lg">{ad.body}</p>
        {ad.sample ? (
          <p className="mt-4 rounded-xl bg-surface p-3 text-sm font-semibold text-muted">
            هذا إعلان نموذجي لعرض الشكل فقط، وليس إعلاناً حقيقياً، لذلك لا يوجد رقم للتواصل.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <RevealPhone phone={ad.phone} />
            <a className="btn btn-ghost" href={`https://wa.me/972${digits.replace(/^0/, "")}`} target="_blank" rel="noreferrer">
              واتساب
            </a>
          </div>
        )}
      </article>
      {ad.sample ? null : (
        <button type="button" className="btn btn-ghost mt-4" onClick={() => setReported(true)}>
          {reported ? "وصل البلاغ للمراقبة" : "إبلاغ"}
        </button>
      )}
    </Shell>
  );
}
