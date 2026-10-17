import { readdirSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
// @ts-expect-error JS plugin alongside the TS vite config
import { grokPwaPlugin } from "./scripts/grok-pwa-plugin.mjs";
// @ts-expect-error JS plugin alongside the TS vite config
import { appEnvPlugin } from "./scripts/app-env-plugin.mjs";
import { isMigrationFile } from "./scripts/migration-plan.mjs";

/** Search-engine site verification tokens (build-time env), sanitized to token characters. */
function verificationToken(value: string | undefined): string {
  return /^[A-Za-z0-9_-]{8,100}$/.test(value?.trim() ?? "") ? value!.trim() : "";
}

/** The files `src/lib/db.ts` globs — same directory, same non-recursive scope. */
function hasGlobbedMigrations(root: string): boolean {
  try {
    return readdirSync(join(root, "migrations")).some(isMigrationFile);
  } catch {
    return false;
  }
}

/**
 * Finish PGLite bootstrap during dev-server setup (before traffic). Vite awaits
 * async `configureServer` hooks. Production: `src/lib/db` kicks `ensureDbReady`
 * on import.
 *
 * Vite awaiting the hook puts this on time-to-first-render, so an app with no
 * migrations — no schema to apply — skips it entirely rather than paying for a
 * PGLite instance it never queries.
 */
function pgliteBootstrapPlugin(): Plugin {
  return {
    name: "app-builder:pglite-bootstrap",
    apply: "serve",
    async configureServer(server) {
      if (!hasGlobbedMigrations(server.config.root)) return;
      try {
        const mod = (await server.ssrLoadModule("/src/lib/db.ts")) as {
          ensureDbReady?: () => Promise<void>;
        };
        if (typeof mod.ensureDbReady === "function") {
          await mod.ensureDbReady();
        }
      } catch (err) {
        console.error("[app-builder] DB bootstrap failed:", err);
        throw err;
      }
    },
  };
}

// `0.0.0.0:8080` is the live-preview contract — don't change host/port.
// The dev server starts once `src/router.tsx` and `src/routes/` exist — see
// AGENTS.md § "First scaffold".
export default defineConfig(({ command, isPreview }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  // Google Search Console / Bing Webmaster HTML-tag verification: set GOOGLE_SITE_VERIFICATION /
  // BING_SITE_VERIFICATION in the Vercel env and redeploy (see SEO.md).
  define: {
    __SITE_VERIFICATION__: JSON.stringify({
      google: verificationToken(process.env.GOOGLE_SITE_VERIFICATION),
      bing: verificationToken(process.env.BING_SITE_VERIFICATION),
    }),
  },
  // Native binary (news fallback images): never pre-bundle it.
  optimizeDeps: { exclude: ["@resvg/resvg-js"] },
  ssr: { external: ["@resvg/resvg-js"] },
  plugins: [
    pgliteBootstrapPlugin(),
    // Dev-only /__app-env, read by scripts/check-auth-invariant.mjs.
    appEnvPlugin(),
    // PWA head + ?install=1 tutorial page; runs before Start/Nitro.
    grokPwaPlugin(),
    tailwindcss(),
    tanstackStart(),
    ...(command === "build" || isPreview
      ? [
          nitro({
            preset: "vercel",
            // Auto-registers server/middleware/* (the PWA install page +
            // manifest + head-tag middleware). Nitro v3 defaults serverDir to
            // false, so removing this silently unwires /?install=1 on deploys.
            serverDir: "./server",
            // rahatpost.com is self-hosted: the platform's generic /__grok/ manifest ("Grok App",
            // black) and placeholder icon would win over ours if anything still links them, so
            // point those URLs at our own manifest/icon. The service worker must never be cached.
            routeRules: {
              "/__grok/manifest.webmanifest": {
                redirect: { to: "/manifest.webmanifest", status: 307 },
              },
              "/__grok/manifest.json": { redirect: { to: "/manifest.webmanifest", status: 307 } },
              "/__grok/icon-180.png": { redirect: { to: "/apple-touch-icon.png", status: 307 } },
              "/sw.js": {
                headers: {
                  "cache-control": "no-cache, no-store, must-revalidate",
                  "service-worker-allowed": "/",
                },
              },
              "/manifest.webmanifest": {
                headers: {
                  "content-type": "application/manifest+json; charset=utf-8",
                  "cache-control": "public, max-age=3600",
                },
              },
            },
          }),
        ]
      : []),
    viteReact(),
  ],
}));
