import { MapChoices } from "@/components/map-links";
import { gmapsPlace, gmapsTransitTo } from "@/lib/buses/map";

/** Apple Maps, Google Maps, and Waze for a bus stop. */
export function GmapsStopButtons({ lat, lon }: { lat: number; lon: number }) {
  return (
    <div className="mt-2 flex flex-col gap-2">
      <MapChoices target={{ lat, lon }} googleUrl={gmapsPlace(lat, lon)} />
      <MapChoices target={{ lat, lon }} googleUrl={gmapsTransitTo(lat, lon)} />
    </div>
  );
}
