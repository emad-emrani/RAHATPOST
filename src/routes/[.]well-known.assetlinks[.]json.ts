import { createFileRoute } from "@tanstack/react-router";
import { assetLinks, wellKnownHeaders } from "@/lib/app-links.server";

/** Android App Links verification for com.rahatpost.app (see src/lib/app-links.server.ts). */
export const Route = createFileRoute("/.well-known/assetlinks.json")({
  server: {
    handlers: {
      GET: () => new Response(JSON.stringify(assetLinks(), null, 2), { headers: wellKnownHeaders }),
    },
  },
});
