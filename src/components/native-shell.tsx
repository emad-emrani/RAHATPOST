import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isNativeApp } from "@/lib/auth/native";

const NativeShellContext = createContext(false);

/** True only inside the iOS/Android wrapper. The public website stays false. */
export function NativeShellProvider({
  value,
  children,
}: {
  value: boolean;
  children: ReactNode;
}) {
  const [on, setOn] = useState(value);
  useEffect(() => {
    if (value || isNativeApp()) setOn(true);
  }, [value]);
  return <NativeShellContext.Provider value={on}>{children}</NativeShellContext.Provider>;
}

export function useNativeShell(): boolean {
  return useContext(NativeShellContext);
}

/** Digital purchases (subscriptions, VIP, paid digital items). Physical classifieds are not this. */
export function isDigitalStoreHref(href: string): boolean {
  const path = href.split("?")[0]?.split("#")[0] ?? href;
  return path === "/store" || path.startsWith("/store/") || path === "/cart" || path.startsWith("/cart/");
}
