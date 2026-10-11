import { createServerFn } from "@tanstack/react-start";
import type { Weather } from "./types";

export const getWeather = createServerFn({ method: "GET" }).handler(
  async (): Promise<Weather | null> => {
    try {
      const { getRahatWeather } = await import("./weather.server");
      return await getRahatWeather();
    } catch (error) {
      console.error("[weather] failed", error);
      return null;
    }
  },
);

/** For pages where weather is secondary: give up after `ms` and hide the card instead of waiting. */
export async function weatherWithin(ms: number): Promise<Weather | null> {
  try {
    return await Promise.race([
      getWeather(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);
  } catch {
    return null;
  }
}
