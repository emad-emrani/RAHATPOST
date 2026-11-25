import { Shell } from "@/components/shell";
import { useNativeShell } from "@/components/native-shell";
import { tr } from "@/lib/i18n/core";
import type { ReactNode } from "react";

/** Shown inside the apps. No link and no button toward an external checkout. */
export function StoreOnWebsiteNotice() {
  return (
    <Shell>
      <section className="stamp mx-auto mt-6 max-w-lg p-6 text-center">
        <h1 className="text-xl font-extrabold">{tr("المتجر الرقمي على الموقع")}</h1>
        <p className="mt-2 font-semibold text-muted">
          {tr("الاشتراكات والمنتجات الرقمية متاحة على موقع رهط بوست في المتصفح، وليست داخل التطبيق.")}
        </p>
      </section>
    </Shell>
  );
}

/** Keeps the website store. Inside the iOS/Android wrapper, replaces the purchase screen. */
export function HideDigitalStore({ children }: { children: ReactNode }) {
  const native = useNativeShell();
  if (native) return <StoreOnWebsiteNotice />;
  return children;
}
