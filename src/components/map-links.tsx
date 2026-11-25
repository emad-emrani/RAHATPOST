import { tr } from "@/lib/i18n/core";
import {
  appleMapsScheme,
  appleMapsUrl,
  googleMapsUrl,
  openExternalUrl,
  targetFromGoogleUrl,
  wazeUrl,
  type MapTarget,
} from "@/lib/maps/links";

type Choice = { id: string; label: string; https: string; scheme?: string };

function choicesFor(target: MapTarget, googleFallback: string): Choice[] {
  return [
    { id: "apple", label: tr("خرائط آبل"), https: appleMapsUrl(target), scheme: appleMapsScheme(target) },
    { id: "google", label: tr("خرائط جوجل"), https: googleMapsUrl(target, googleFallback) },
    { id: "waze", label: tr("ويز"), https: wazeUrl(target) },
  ];
}

/** Apple Maps, Google Maps, and Waze. On the iOS app, Apple Maps is first and opens the Maps app. */
export function MapChoices({
  googleUrl,
  target,
  className = "",
}: {
  googleUrl?: string;
  target?: MapTarget;
  className?: string;
}) {
  const resolved = target ?? (googleUrl ? targetFromGoogleUrl(googleUrl) : {});
  const items = choicesFor(resolved, googleUrl || "");
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {items.map((item) => (
        <a
          key={item.id}
          href={item.https}
          target="_blank"
          rel="noopener noreferrer"
          className={`chip text-xs font-extrabold ${item.id === "apple" ? "chip-ink" : ""}`}
          onClick={(event) => {
            event.preventDefault();
            void openExternalUrl(item.https, item.scheme);
          }}
        >
          {item.label}
        </a>
      ))}
    </div>
  );
}
