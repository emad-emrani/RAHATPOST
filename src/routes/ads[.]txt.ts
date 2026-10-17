import { createFileRoute } from "@tanstack/react-router";

/** /ads.txt from the AdSense publisher ID set in «إعدادات الموقع» (empty when not set). */
export const Route = createFileRoute("/ads.txt")({
  server: {
    handlers: {
      GET: async () => {
        const { loadSettings } = await import("@/lib/site-settings/store.server");
        const g = (await loadSettings()).google;
        const pub = g.adsensePub.replace(/^ca-/, "");
        const body = pub ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n` : "";
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
