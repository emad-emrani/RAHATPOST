import { createFileRoute } from "@tanstack/react-router";
import { MEDIA_KEY_RE } from "@/lib/media/types";

/**
 * Serves user and shop photos from Postgres (shop_media_blobs) or the Blob store.
 * Photos of approved ads/businesses, staff articles, site settings, store products,
 * popups, and directory shop logos/covers/products/campaigns are public (CDN-cacheable).
 */
const notFound = () =>
  new Response("Not found", { status: 404, headers: { "cache-control": "no-store" } });

export const Route = createFileRoute("/media/$key")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const key = params.key;
        if (!MEDIA_KEY_RE.test(key)) return notFound();
        try {
          // 1. Check Postgres shop_media_blobs first (stores shop logos, covers, products, campaigns & staff uploads reliably)
          const { getSql } = await import("@/lib/db");
          const sql = await getSql();
          const pgRows = await sql<{ content_type: string; bytes: Uint8Array | Buffer }>`
            SELECT content_type, bytes FROM shop_media_blobs WHERE key = ${key} LIMIT 1
          `.catch(() => []);
          if (pgRows.length > 0 && pgRows[0].bytes) {
            const rawBytes = new Uint8Array(pgRows[0].bytes);
            return new Response(rawBytes as unknown as BodyInit, {
              headers: {
                "content-type": pgRows[0].content_type || (key.endsWith(".jpg") ? "image/jpeg" : "image/webp"),
                "x-content-type-options": "nosniff",
                "content-security-policy": "default-src 'none'; sandbox",
                "cache-control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=600",
                "content-length": String(rawBytes.byteLength),
              },
            });
          }

          // 2. Check media_uploads access control (for user-submitted classifieds/businesses)
          const { mediaAccess } = await import("@/lib/media/store.server");
          let access = await mediaAccess(key);
          if (!access) {
            // Any key not restricted in media_uploads (staff articles, site settings, store products, popups, shop logos/covers) is public
            access = {
              contentType: key.endsWith(".jpg") ? "image/jpeg" : "image/webp",
              isPublic: true,
              userId: "",
            };
          }
          if (!access.isPublic) {
            const { isAdmin } = await import("@/lib/admin-auth");
            let allowed = await isAdmin();
            if (!allowed) {
              const { getSessionUser } = await import("@/lib/auth/verify.server");
              allowed = (await getSessionUser())?.id === access.userId;
            }
            if (!allowed) return notFound();
          }
          const { getMedia } = await import("@/lib/media/storage.server");
          const file = await getMedia(key);
          if (!file) return notFound();
          const headers: Record<string, string> = {
            "content-type": access.contentType,
            "x-content-type-options": "nosniff",
            "content-security-policy": "default-src 'none'; sandbox",
            "cache-control": access.isPublic
              ? "public, max-age=3600, s-maxage=3600, stale-while-revalidate=600"
              : "private, no-store",
          };
          if (file.size) headers["content-length"] = String(file.size);
          return new Response(file.body as BodyInit, { headers });
        } catch (error) {
          console.error("[media] serve failed", error);
          return new Response("Error", { status: 500, headers: { "cache-control": "no-store" } });
        }
      },
    },
  },
});
