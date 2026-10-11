export type Arrival = {
  line: string;
  operator: string;
  destination: string;
  /** ISO time of the expected arrival at the stop */
  eta: string;
  /** true only when the bus is actually reporting its position right now */
  live: boolean;
};

export type ArrivalsResult = {
  ok: boolean;
  now: number;
  stop: string;
  arrivals: Arrival[];
};
