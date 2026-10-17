import { ExternalLink, Navigation } from "lucide-react";
import { gmapsPlace, gmapsTransitTo } from "@/lib/buses/map";

/** «افتح في خرائط جوجل» + transit directions to a stop. */
export function GmapsStopButtons({ lat, lon }: { lat: number; lon: number }) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-2">
      <a
        href={gmapsPlace(lat, lon)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-ghost px-2 text-sm"
      >
        <ExternalLink className="size-4" aria-hidden />
        افتح في خرائط جوجل
      </a>
      <a
        href={gmapsTransitTo(lat, lon)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-ghost px-2 text-sm"
      >
        <Navigation className="size-4" aria-hidden />
        الاتجاهات إلى المحطة
      </a>
    </div>
  );
}
