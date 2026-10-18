import type { RavKavPoint } from "@/lib/site-settings/types";

/**
 * Rav-Kav points found in open data (not invented). Source: OpenStreetMap (ODbL), searched
 * 2026-10-19 in the Rahat area for vending=public_transport_tickets / payment:ravkav / Rav-Kav names.
 * Admin-entered points (site settings) are shown alongside these.
 */
export const OSM_RAVKAV_POINTS: (RavKavPoint & { source: string })[] = [
  {
    id: "osm5594994359",
    name: "مكينة تذاكر وشحن — محطة قطار لهافيم/رهط",
    address: "محطة قطار لهافيم–رهط (מחלף עידן הנגב)",
    hours: "حسب ساعات تشغيل المحطة",
    lat: 31.3698842,
    lon: 34.7983139,
    source: "OpenStreetMap node 5594994359",
  },
];
