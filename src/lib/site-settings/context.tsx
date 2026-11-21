import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_SETTINGS, type SiteSettings } from "./types";

const Ctx = createContext<SiteSettings>(DEFAULT_SETTINGS);

export function SiteSettingsProvider({
  value,
  children,
}: {
  value: SiteSettings;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSiteSettings = () => useContext(Ctx);

/** Immediately propagate Admin settings updates to Web, PWA, Android & iOS WebViews. */
export function broadcastSiteSettingsUpdate(settings: SiteSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("rp_latest_site_settings", JSON.stringify(settings));
  } catch {
    // ignore storage quota / private mode
  }
  try {
    window.dispatchEvent(new CustomEvent("rp-site-settings-updated", { detail: settings }));
  } catch {
    // ignore
  }
}
