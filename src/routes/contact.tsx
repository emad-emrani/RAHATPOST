import { createFileRoute, redirect } from "@tanstack/react-router";

/** Store listings and old links use /contact. Support lives at /support. */
export const Route = createFileRoute("/contact")({
  beforeLoad: () => {
    throw redirect({ to: "/support", statusCode: 301 });
  },
});
