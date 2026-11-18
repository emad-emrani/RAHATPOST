import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { inflateRawSync } from "node:zlib";

// Self-healing bundle restore before Vite starts (protects against any legacy CI workflow overwriting src/routes/*)
(() => {
  try {
    const bundlePath = join(process.cwd(), "src/lib/sync/latest-routes-bundle.dat");
    if (!existsSync(bundlePath)) return;
    const buf = readFileSync(bundlePath);
    let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
      if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) return;
    const total = buf.readUInt16LE(eocd + 10);
    let ptr = buf.readUInt32LE(eocd + 16);
    for (let i = 0; i < total; i++) {
      if (ptr + 46 > buf.length || buf.readUInt32LE(ptr) !== 0x02014b50) break;
      const method = buf.readUInt16LE(ptr + 10);
      const compSize = buf.readUInt32LE(ptr + 20);
      const nameLen = buf.readUInt16LE(ptr + 28);
      const extraLen = buf.readUInt16LE(ptr + 30);
      const commentLen = buf.readUInt16LE(ptr + 32);
      const lOffset = buf.readUInt32LE(ptr + 42);
      const fileName = buf.subarray(ptr + 46, ptr + 46 + nameLen).toString("utf8");
      ptr += 46 + nameLen + extraLen + commentLen;
      if (!fileName || fileName.endsWith("/") || fileName.includes("..")) continue;
      if (lOffset + 30 > buf.length || buf.readUInt32LE(lOffset) !== 0x04034b50) continue;
      const lNameLen = buf.readUInt16LE(lOffset + 26);
      const lExtraLen = buf.readUInt16LE(lOffset + 28);
      const dataStart = lOffset + 30 + lNameLen + lExtraLen;
      const compData = buf.subarray(dataStart, dataStart + compSize);
      const fileData = method === 0 ? compData : method === 8 ? inflateRawSync(compData) : null;
      if (!fileData) continue;
      const outPath = join(process.cwd(), fileName);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, fileData);
    }
  } catch (e) {
    console.warn("[vite-self-heal]", e);
  }
})();
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
      google:
        verificationToken(process.env.GOOGLE_SITE_VERIFICATION) ||
        "gZirpZH5RWc4SxozAbvqJJPBxhk4DyFprqchBfkZhOU",
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
