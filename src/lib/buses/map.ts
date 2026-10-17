/** ASCII file name of a line's shape file (mirrors shape_file() in scripts/update-bus-schedule.py). */
export const shapeFile = (line: string) => line.replace("أ", "a").replace("ب", "b");

export type LineShapes = { source: string; line: string; dirs: Record<string, [number, number][]> };
