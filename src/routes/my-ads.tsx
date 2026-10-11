import { createFileRoute, redirect } from "@tanstack/react-router";

/** Old name of «منشوراتي». */
export const Route = createFileRoute("/my-ads")({
  beforeLoad: () => {
    throw redirect({ to: "/my-posts", replace: true });
  },
});
