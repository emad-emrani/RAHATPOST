import { useEffect, useRef, useState } from "react";
import { CategoryIcon } from "@/components/category-icon";
import type { NewsItem } from "@/lib/news/types";
import { trv } from "@/lib/i18n/core";

type Props = {
  item: Pick<NewsItem, "image" | "thumb" | "title" | "category">;
  /** "thumb" uses the small rendition when there is one. */
  size?: "thumb" | "full";
  /** Sizing/shape classes for the frame; the frame fixes the box so nothing shifts while loading. */
  className?: string;
  iconClassName?: string;
  /** Eager for above-the-fold images (article hero). */
  eager?: boolean;
};

/**
 * Publisher image (hotlinked, no referrer). Falls back to a neutral category icon on the pale
 * tint when the item has no image or the host refuses it — including errors that happen
 * before hydration.
 */
export function NewsImage({
  item,
  size = "thumb",
  className = "",
  iconClassName = "size-6",
  eager = false,
}: Props) {
  const src = size === "thumb" ? (item.thumb ?? item.image) : item.image;
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setFailed(false);
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);

  return (
    <span className={`relative block shrink-0 overflow-hidden bg-primary-soft ${className}`}>
      {src && !failed ? (
        <img
          ref={ref}
          src={src}
          alt={trv(item.title)}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="absolute inset-0 grid place-items-center text-primary-ink" aria-hidden>
          <CategoryIcon category={item.category} className={iconClassName} />
        </span>
      )}
    </span>
  );
}
