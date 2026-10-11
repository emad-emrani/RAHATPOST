/** Shape of the generated src/data/bus-schedule.ts (see scripts/update-bus-schedule.py). */
export type BusSchedule = {
  source: string;
  generatedAt: string;
  agency: string;
  lines: {
    number: string;
    dirs: {
      dir: string;
      from: string; // stop code
      to: string; // stop code
      /** [stop code, minutes after departure from the first stop] */
      stops: [string, number][];
    }[];
  }[];
  /** ISO date (Israel time) → line → direction → index into `patterns` */
  days: Record<string, Record<string, Record<string, number>>>;
  /** Departure times from the first stop, "HH:MM" */
  patterns: string[][];
  stops: Record<string, { he: string; ar: string; city: string; lat: number; lon: number }>;
};
