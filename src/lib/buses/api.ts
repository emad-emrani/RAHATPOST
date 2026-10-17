import { createServerFn } from "@tanstack/react-start";
import type { ArrivalsResult } from "./types";

export const getArrivals = createServerFn({ method: "GET" })
  .inputValidator((input: { stop: string }) => {
    const stop = String(input?.stop ?? "");
    if (!/^\d{3,6}$/.test(stop)) throw new Error("invalid stop code");
    return { stop };
  })
  .handler(async ({ data }): Promise<ArrivalsResult> => {
    const { loadArrivals } = await import("./live.server");
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    const result = await loadArrivals(data.stop);
    try {
      setResponseHeader("Cache-Control", result.ok ? "public, max-age=0, s-maxage=20" : "no-store");
    } catch {
      // outside a request
    }
    return result;
  });

/** Live positions of one line's buses (real SIRI data via curlbus; never estimated). */
export const getLineVehicles = createServerFn({ method: "GET" })
  .inputValidator((input: { line: string }) => {
    const line = String(input?.line ?? "");
    if (!/^[0-9]{1,4}[أب]?$/.test(line)) throw new Error("invalid line");
    return { line };
  })
  .handler(async ({ data }) => {
    const { lineInfo } = await import("./schedule");
    const { loadVehicles } = await import("./live.server");
    const info = lineInfo(data.line);
    // ~6 stops per direction, spread along the route (buses report at the stops ahead of them).
    const stops = new Set<string>();
    for (const d of info?.dirs ?? []) {
      const codes = d.stops.map(([c]) => c);
      const step = Math.max(1, Math.floor(codes.length / 6));
      for (let i = 0; i < codes.length; i += step) stops.add(codes[i]);
      if (codes.length) stops.add(codes[codes.length - 1]);
    }
    const res = await loadVehicles(data.line, [...stops].slice(0, 16));
    try {
      const { setResponseHeader } = await import("@tanstack/react-start/server");
      setResponseHeader("Cache-Control", "public, max-age=0, s-maxage=15");
    } catch {
      // outside a request
    }
    return { ...res, now: Date.now() };
  });
