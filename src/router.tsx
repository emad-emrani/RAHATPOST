import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent, AppNotFoundComponent } from "@/lib/error-component";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: "intent",
    defaultPreloadDelay: 35,
    defaultPreloadStaleTime: 30_000,
    defaultPendingMs: 0,
    defaultPendingMinMs: 160,
    scrollRestoration: true,
    defaultErrorComponent: AppErrorComponent,
    defaultNotFoundComponent: AppNotFoundComponent,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
