/** ASCII file name of a line's shape file (mirrors shape_file() in scripts/update-bus-schedule.py). */
export const shapeFile = (line: string) => line.replace("أ", "a").replace("ب", "b");

export type LineShapes = { source: string; line: string; dirs: Record<string, [number, number][]> };

/** Official Google Maps URLs (open the app on phones). */
export const gmapsPlace = (lat: number, lon: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
export const gmapsTransitTo = (lat: number, lon: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=transit`;
export const gmapsTransitRoute = (
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
) =>
  `https://www.google.com/maps/dir/?api=1&origin=${a.lat},${a.lon}&destination=${b.lat},${b.lon}&travelmode=transit`;
