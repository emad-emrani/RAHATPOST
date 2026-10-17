import { createFileRoute } from "@tanstack/react-router";

/**
 * Branded image for news items without a photo (headline + section + logo), or a cached AI
 * illustration (?ai=<key>). Same query → same bytes, so the CDN keeps it for a year.
 */
const IMMUTABLE = "public, max-age=31536000, s-maxage=31536000, immutable";

export const Route = createFileRoute("/api/news-image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const q = new URL(request.url).searchParams;
        const ai = q.get("ai");
        if (ai) {
          if (!/^[a-f0-9]{32}\.(jpg|png|webp)$/.test(ai)) return new Response("Not found", { status: 404 });
          try {
            const { getMedia } = await import("@/lib/media/storage.server");
            const file = await getMedia(`ai/${ai}`);
            if (file)
              return new Response(file.body as BodyInit, {
                headers: { "content-type": ai.endsWith(".png") ? "image/png" : ai.endsWith(".webp") ? "image/webp" : "image/jpeg", "cache-control": IMMUTABLE },
              });
          } catch (error) {
            console.error("[news-image] ai", error);
          }
          return new Response("Not found", { status: 404, headers: { "cache-control": "public, s-maxage=300" } });
        }
        const title = (q.get("t") ?? "").slice(0, 220);
        const section = (q.get("s") ?? "news").slice(0, 12);
        const source = (q.get("src") ?? "").slice(0, 40);
        try {
          const { renderNewsCard } = await import("@/lib/news/card-image.server");
          const png = await renderNewsCard({ title, section, source });
          return new Response(new Uint8Array(png), { headers: { "content-type": "image/png", "cache-control": IMMUTABLE } });
        } catch (error) {
          console.error("[news-image] render", error);
          return new Response("Error", { status: 500, headers: { "cache-control": "no-store" } });
        }
      },
    },
  },
});
