import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/shell";
import { adTypes } from "@/data/content";
import { getPublicAds } from "@/lib/ads/api";
import { listAds } from "@/lib/ads/display";

export const Route = createFileRoute("/ads/")({
  head: () => ({ meta: [{ title: "الإعلانات · رهط بوست" }] }),
  loader: () => getPublicAds(),
  staleTime: 30_000,
  component: AdsPage,
});

function AdsPage() {
  const data = Route.useLoaderData();
  const all = listAds(data);
  const [type, setType] = useState("الكل");
  const list = all.filter((item) => type === "الكل" || item.type === type);

  return (
    <Shell>
      <div className="mb-1 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">الإعلانات</h1>
        <Link to="/submit" search={{ mode: "إعلان" }} className="btn px-4">
          أضف إعلانك
        </Link>
      </div>
      {data.showSamples ? (
        <p className="mb-3 font-semibold text-muted">
          الإعلانات المعروضة الآن نماذج لعرض الشكل فقط، وليست إعلانات حقيقية. تختفي عند نشر أول
          إعلان حقيقي.
        </p>
      ) : (
        <p className="mb-3 font-semibold text-muted">إعلانات أهل رهط، تُنشر بعد المراجعة.</p>
      )}
      <div className="scroll-row -mx-4 mb-4 px-4">
        {adTypes.map((item) => (
          <button
            key={item}
            type="button"
            className={item === type ? "chip chip-ink shrink-0" : "chip shrink-0"}
            onClick={() => setType(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="stamp p-4 font-semibold">لا إعلانات من هذا النوع الآن.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {list.map((item) => (
            <li key={item.id}>
              <Link
                to="/ads/$id"
                params={{ id: item.id }}
                className={item.quiet ? "stamp-flat press block p-4" : "stamp press block p-4"}
              >
                <span className={item.quiet ? "chip" : "chip chip-deep"}>{item.type}</span>
                {item.sample ? <span className="chip ms-1">نموذج</span> : null}
                <span className="mt-2 block text-lg font-bold">{item.title}</span>
                <span className="font-semibold text-muted">
                  {item.neighborhood}
                  {item.posterName ? ` · ${item.posterName}` : ""}
                </span>
                {item.price ? <span className="mt-1 block font-bold">{item.price}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
