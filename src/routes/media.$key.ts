import { createFileRoute } from "@tanstack/react-router";
import { MEDIA_KEY_RE } from "@/lib/media/types";

/**
 * Serves user photos from the private Blob store. Photos of approved ads/businesses are public
 * (CDN-cacheable); photos of pending/rejected posts only for their uploader or a signed-in admin.
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
          const { mediaAccess } = await import("@/lib/media/store.server");
          let access = await mediaAccess(key);
          if (!access) {
            // Photos of articles the team published from /admin are always public.
            const { staffImageType } = await import("@/lib/staff-news/store.server");
            const type = await staffImageType(key);
            if (type) access = { contentType: type, isPublic: true, userId: "" };
          }
          if (!access) {
            // Logo, favicon and slider photos set in «إعدادات الموقع» are public too.
            const { loadSettings } = await import("@/lib/site-settings/store.server");
            const { settingsImageKeys } = await import("@/lib/site-settings/types");
            if (settingsImageKeys(await loadSettings()).includes(key))
              access = {
                contentType: key.endsWith(".jpg") ? "image/jpeg" : "image/webp",
                isPublic: true,
                userId: "",
              };
          }
          if (!access) {
            // Store product photos are public.
            const { isProductImage } = await import("@/lib/store/store.server");
            if (await isProductImage(key))
              access = {
                contentType: key.endsWith(".jpg") ? "image/jpeg" : "image/webp",
                isPublic: true,
                userId: "",
              };
          }
          if (!access) return notFound();
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
            // Keys are random and never reused; a deleted photo disappears from the CDN within an hour.
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
