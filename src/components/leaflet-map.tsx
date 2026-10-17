import { useEffect, useRef, useState, type RefObject } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap } from "leaflet";

type Leaflet = typeof import("leaflet");

/** Client-only Leaflet map with OpenStreetMap tiles (attribution included). */
export function useLeafletMap(
  el: RefObject<HTMLDivElement | null>,
  center: [number, number],
  zoom = 15,
) {
  const map = useRef<LeafletMap | null>(null);
  const [L, setL] = useState<Leaflet | null>(null);
  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((mod) => {
      if (cancelled || !el.current || map.current) return;
      const Lf = ((mod as unknown as { default?: Leaflet }).default ?? mod) as Leaflet;
      const m = Lf.map(el.current, { zoomControl: false }).setView(center, zoom);
      Lf.control.zoom({ position: "bottomleft" }).addTo(m);
      Lf.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      }).addTo(m);
      map.current = m;
      setL(Lf);
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { L, map: map.current };
}
