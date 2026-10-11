import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/shell";
import { adTypes, classifieds } from "@/data/content";

export const Route = createFileRoute("/ads")({
  head: () => ({ meta: [{ title: "الإعلانات · رهط بوست" }] }),
  component: AdsPage,
});

function AdsPage() {
  const [type, setType] = useState("الكل");
  const list = classifieds.filter((item) => type === "الكل" || item.type === type);

  return (
    <Shell>
      <h1 className="mb-3 text-3xl font-bold">الإعلانات</h1>
      <div className="scroll-row mb-4">
        {adTypes.map((item) => (
          <button
            key={item}
            type="button"
            className={item === type ? "chip chip-ink shrink-0" : "chip shrink-0 bg-paper"}
            onClick={() => setType(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <ul className="flex flex-col gap-3">
        {list.map((item) => (
          <li key={item.id}>
            <Link
              to="/ads/$id"
              params={{ id: item.id }}
              className={item.quiet ? "stamp-flat press block p-4" : "stamp press block p-4"}
            >
              <span className={item.quiet ? "chip" : "chip chip-deep"}>{item.type}</span>
              <span className="mt-2 block text-xl font-bold">{item.title}</span>
              <span className="font-semibold text-muted">{item.neighborhood}</span>
              {item.price ? <span className="mt-1 block font-bold">{item.price}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </Shell>
  );
}
