import { isNativeApp, isIosNativeApp } from "@/lib/auth/native";

export type MapPoint = { lat: number; lon: number };

export type MapTarget = {
  lat?: number;
  lon?: number;
  query?: string;
  origin?: MapPoint;
};

type CapacitorPlugins = {
  AppLauncher?: { openUrl: (opts: { url: string }) => Promise<{ completed?: boolean }> };
};

function plugins(): CapacitorPlugins | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { Capacitor?: { Plugins?: CapacitorPlugins } }).Capacitor?.Plugins;
}

function coord(value: string | null): MapPoint | undefined {
  if (!value) return undefined;
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return undefined;
  return { lat: Number(match[1]), lon: Number(match[2]) };
}

/** Pull a destination (and optional origin) out of a Google Maps link. */
export function targetFromGoogleUrl(url: string): MapTarget {
  try {
    const parsed = new URL(url);
    const destination = coord(parsed.searchParams.get("destination"));
    const query = parsed.searchParams.get("query") ?? "";
    const queryPoint = coord(query);
    const origin = coord(parsed.searchParams.get("origin"));
    if (destination) return { ...destination, origin };
    if (queryPoint) return { ...queryPoint, query, origin };
    if (query) return { query: decodeURIComponent(query), origin };
  } catch {
    /* keep the raw link as the Google option */
  }
  return {};
}

export function appleMapsUrl(target: MapTarget): string {
  const params = new URLSearchParams();
  if (target.lat !== undefined && target.lon !== undefined) {
    params.set("daddr", `${target.lat},${target.lon}`);
    params.set("ll", `${target.lat},${target.lon}`);
    if (target.query) params.set("q", target.query);
  } else if (target.query) {
    params.set("q", target.query);
  }
  if (target.origin) params.set("saddr", `${target.origin.lat},${target.origin.lon}`);
  return `https://maps.apple.com/?${params.toString()}`;
}

/** maps:// opens the Apple Maps app directly from a WebView. */
export function appleMapsScheme(target: MapTarget): string {
  const params = new URLSearchParams();
  if (target.lat !== undefined && target.lon !== undefined) params.set("daddr", `${target.lat},${target.lon}`);
  else if (target.query) params.set("q", target.query);
  if (target.origin) params.set("saddr", `${target.origin.lat},${target.origin.lon}`);
  return `maps://?${params.toString()}`;
}

export function wazeUrl(target: MapTarget): string {
  if (target.lat !== undefined && target.lon !== undefined) {
    return `https://waze.com/ul?ll=${target.lat},${target.lon}&navigate=yes`;
  }
  return `https://waze.com/ul?q=${encodeURIComponent(target.query || "رهط")}&navigate=yes`;
}

export function googleMapsUrl(target: MapTarget, fallback: string): string {
  if (fallback.startsWith("https://www.google.com/maps") || fallback.startsWith("https://maps.google.com")) {
    return fallback;
  }
  if (target.lat !== undefined && target.lon !== undefined) {
    return `https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lon}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target.query || "رهط")}`;
}

/**
 * Leave the Capacitor WebView. AppLauncher (next iOS build) opens maps:// in Apple Maps.
 * Until that plugin is in the binary, a new window to maps.apple.com is outside allowNavigation,
 * so Capacitor hands it to the system.
 */
export async function openExternalUrl(httpsUrl: string, iosScheme?: string): Promise<void> {
  const launcher = plugins()?.AppLauncher;
  if (isIosNativeApp() && iosScheme && launcher?.openUrl) {
    try {
      await launcher.openUrl({ url: iosScheme });
      return;
    } catch {
      /* https link below */
    }
  }
  if (isNativeApp() && launcher?.openUrl) {
    try {
      await launcher.openUrl({ url: httpsUrl });
      return;
    } catch {
      /* window.open below */
    }
  }
  const opened = window.open(httpsUrl, "_blank", "noopener,noreferrer");
  if (!opened) window.location.assign(httpsUrl);
}
