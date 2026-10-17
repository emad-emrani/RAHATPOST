import { MessageCircle } from "lucide-react";
import { tr, trv } from "@/lib/i18n/core";

/** Small «💬 3» badge for news rows (renders nothing for 0). */
export function CommentCount({ n, className = "" }: { n?: number; className?: string }) {
  if (!n) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap ${className}`}
      aria-label={tr("{0} تعليق", n)}
    >
      <MessageCircle className="size-3.5" aria-hidden />
      {trv(n)}
    </span>
  );
}
