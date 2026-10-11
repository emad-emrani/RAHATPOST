import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

/** Pages never measured: the admin area and the sign-in / account flows. */
const PRIVATE = /^\/(admin|login|app-auth|my-)/;

const isPrivate = (url: string) => {
  try {
    return PRIVATE.test(new URL(url, "https://rahatpost.com").pathname);
  } catch {
    return false;
  }
};

/**
 * Vercel Web Analytics (cookieless page views) + Speed Insights (Core Web Vitals). Both load
 * /_vercel/* scripts that only exist on the Vercel deployment; locally they stay in debug mode.
 */
export function SiteAnalytics() {
  return (
    <>
      <Analytics
        framework="tanstack-start"
        beforeSend={(event) => (isPrivate(event.url) ? null : event)}
      />
      <SpeedInsights
        framework="tanstack-start"
        beforeSend={(event) => (isPrivate(event.url) ? null : event)}
      />
    </>
  );
}
