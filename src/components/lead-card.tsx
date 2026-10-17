import { Link, type LinkProps } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { NewsImage } from "@/components/news-image";
import { CommentCount } from "@/components/comment-count";
import { trv } from "@/lib/i18n/core";

/**
 * The big first card of every news section and list: large image (omitted when the story has
 * none), chips, title, a short excerpt and the meta line. Shared by all news sections.
 */
export function LeadCard({
  link,
  image,
  chips,
  title,
  excerpt,
  meta,
  comments,
}: {
  link: Pick<LinkProps, "to" | "params">;
  image: { image?: string; thumb?: string; title: string; category: string };
  chips?: ReactNode;
  /** Plain text (translated with trv) or a ready element (e.g. a Hebrew title). */
  title: ReactNode;
  excerpt?: string;
  meta: ReactNode;
  comments?: number;
}) {
  return (
    <Link {...(link as LinkProps)} className="stamp press mb-3 block overflow-hidden">
      {image.image ? (
        <NewsImage item={image} size="full" className="aspect-[16/9] w-full" iconClassName="size-10" />
      ) : (
        <span aria-hidden className="block h-1.5 w-full bg-primary" />
      )}
      <span className="block p-4">
        {chips ? <span className="flex flex-wrap gap-2">{chips}</span> : null}
        <span className="mt-2 block text-xl font-bold leading-snug">
          {typeof title === "string" ? trv(title) : title}
        </span>
        {excerpt ? (
          <span className="mt-1 line-clamp-3 block font-semibold text-muted">{trv(excerpt)}</span>
        ) : null}
        <span className="mt-1 block text-sm font-semibold text-muted">
          {meta}
          <CommentCount n={comments} className="ms-2" />
        </span>
      </span>
    </Link>
  );
}
