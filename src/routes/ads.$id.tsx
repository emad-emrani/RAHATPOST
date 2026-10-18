import { createFileRoute, redirect } from "@tanstack/react-router";

/** Old ad links keep working: same id, new address. */
export const Route = createFileRoute("/ads/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/haraj/$id", params: { id: params.id }, statusCode: 301 });
  },
});
