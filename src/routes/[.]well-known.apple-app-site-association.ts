import { createFileRoute } from "@tanstack/react-router";
import { appleAppSiteAssociation, wellKnownHeaders } from "@/lib/app-links.server";

/** iOS Universal Links for com.rahatpost.app; needs APPLE_TEAM_ID (see src/lib/app-links.server.ts). */
export const Route = createFileRoute("/.well-known/apple-app-site-association")({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify(appleAppSiteAssociation(), null, 2), {
          headers: wellKnownHeaders,
        }),
    },
  },
});
