import { createFileRoute } from "@tanstack/react-router";
import { DEFAULT_ADSENSE_PUB } from "@/lib/site-settings/types";

/** /ads.txt from the AdSense publisher ID set in «إعدادات الموقع» (plus default publisher ID). */
export const Route = createFileRoute("/ads.txt")({
  server: {
    handlers: {
      GET: async () => {
        const { loadSettings } = await import("@/lib/site-settings/store.server");
        const g = (await loadSettings()).google;
        const pubs = new Set<string>();
        const active = (g.adsensePub || DEFAULT_ADSENSE_PUB).replace(/^ca-/, "").trim();
        if (active) pubs.add(active);
        const def = DEFAULT_ADSENSE_PUB.replace(/^ca-/, "").trim();
        if (def) pubs.add(def);
        const body = [...pubs]
          .map((pub) => `google.com, ${pub}, DIRECT, f08c47fec0942fa0`)
          .join("\n") + "\n";
        return new Response(body, {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "public, max-age=0, s-maxage=300",
          },
        });
      },
    },
  },
});
