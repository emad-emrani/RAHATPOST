import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useSiteSettings } from "@/lib/site-settings/context";
import type { AdPlacement } from "@/lib/site-settings/types";
import { tr } from "@/lib/i18n/core";

/** Pages that never get ads or third-party tracking. */
export const NO_THIRD_PARTY = /^\/(admin|login|app-auth|my-)/;

function usePublicPage() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return !NO_THIRD_PARTY.test(path);
}

/**
 * GA4 / GTM / AdSense loaders. Every value is a validated ID (see sanitizeSettings), so the small
 * inline snippets below only ever contain JSON-encoded IDs — no owner-supplied HTML.
 */
export function GoogleServices() {
  const { google: g } = useSiteSettings();
  const isPublic = usePublicPage();
  if (!isPublic) return null;
  const adsense = g.adsenseEnabled && g.adsensePub && (g.autoAds || g.slots.length > 0);
  return (
    <>
      {g.gaEnabled && g.gaId ? (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${g.gaId}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config',${JSON.stringify(g.gaId)});`,
            }}
          />
        </>
      ) : null}
      {g.gtmId ? (
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(g.gtmId)});`,
          }}
        />
      ) : null}
      {adsense ? (
        <script
          async
          crossOrigin="anonymous"
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${g.adsensePub}`}
        />
      ) : null}
    </>
  );
}

/** Manual AdSense units configured for one placement (nothing when AdSense is off). */
export function AdSlots({ placement }: { placement: AdPlacement }) {
  const { google: g } = useSiteSettings();
  const isPublic = usePublicPage();
  if (!isPublic || !g.adsenseEnabled || !g.adsensePub) return null;
  const slots = g.slots.filter((s) => s.placement === placement);
  if (!slots.length) return null;
  return (
    <>
      {slots.map((s) => (
        <AdUnit key={s.id} client={g.adsensePub} slot={s.slot} />
      ))}
    </>
  );
}

function AdUnit({ client, slot }: { client: string; slot: string }) {
  const pushed = useRef(false);
  useEffect(() => {
    if (pushed.current) return;
    pushed.current = true;
    try {
      ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ||= []).push({});
    } catch {
      /* blocked by an ad blocker */
    }
  }, []);
  return (
    <div className="overflow-hidden" aria-label={tr("إعلان")}>
      <p className="mb-1 text-xs font-semibold text-muted">{tr("إعلان")}</p>
      <ins
        className="adsbygoogle block"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
