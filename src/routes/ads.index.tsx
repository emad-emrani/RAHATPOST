import { createFileRoute, redirect } from "@tanstack/react-router";

/** «الإعلانات» became «حراج رهط». */
export const Route = createFileRoute("/ads/")({
  beforeLoad: () => {
    throw redirect({ to: "/haraj", statusCode: 301 });
  },
});
