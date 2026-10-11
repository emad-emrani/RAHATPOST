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
