import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";

// Better Auth endpoints: /api/auth/sign-in/social, /api/auth/callback/<provider>, /api/auth/get-session, …
export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => auth.handler(request),
    },
  },
});
