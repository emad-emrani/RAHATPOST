import { useRef, useState } from "react";
import { mediaUrl } from "@/lib/media/types";
import { tr } from "@/lib/i18n/core";

/** Swipeable photo gallery for an ad (snap per photo, dots, tap opens the full photo). */
export function AdGallery({ keys, title }: { keys: string[]; title: string }) {
  const row = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const go = (i: number) => {
    const el = row.current?.children[i] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };
  return (
    <div className="-mx-4 -mt-4 mb-4">
      <ul
        ref={row}
        className="gallery rounded-t-[var(--radius-card)]"
        aria-label={tr("صور الإعلان")}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(Math.abs(el.scrollLeft) / Math.max(1, el.clientWidth));
          if (i !== index) setIndex(Math.min(keys.length - 1, i));
        }}
      >
        {keys.map((key, i) => (
          <li key={key}>
            <a href={mediaUrl(key)} target="_blank" rel="noopener noreferrer">
              <img
                src={mediaUrl(key)}
                alt={tr("{0} — صورة {1} من {2}", title, i + 1, keys.length)}
                className="aspect-[4/3] w-full bg-surface object-cover"
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
              />
            </a>
          </li>
        ))}
      </ul>
      {keys.length > 1 ? (
        <div className="mt-2 flex justify-center gap-2">
          {keys.map((key, i) => (
            <button
              key={key}
              type="button"
              className={
                i === index ? "size-3 rounded-full bg-primary-deep" : "size-3 rounded-full bg-line"
              }
              aria-label={tr("الصورة {0}", i + 1)}
              aria-current={i === index ? "true" : undefined}
              onClick={() => go(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
