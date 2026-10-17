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
