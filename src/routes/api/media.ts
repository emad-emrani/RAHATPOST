import { createFileRoute } from "@tanstack/react-router";
import { MAX_MEDIA_BYTES, MAX_MEDIA_SIDE, MEDIA_KEY_RE, mediaUrl } from "@/lib/media/types";

/**
 * Photo upload for signed-in users (same session + same-site checks as the create functions).
 *   POST   /api/media?kind=ad|business   body: the image bytes (JPEG/WebP, ≤ 3 MB)
 *   DELETE /api/media?key=<key>          remove an upload that was not saved with a post
 * The body is sniffed, size-checked and stripped of EXIF/XMP before it is stored.
 */

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const hits = new Map<string, number[]>();
function tooMany(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(userId, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 15;
}

async function sessionUser() {
  const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  try {
    assertSameSiteRequest();
  } catch {
    return null;
  }
  return getSessionUser();
}

export const Route = createFileRoute("/api/media")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await sessionUser();
        if (!user) return json(401, { ok: false, message: "سجّل الدخول أولاً." });
        const kind = new URL(request.url).searchParams.get("kind");
        if (kind !== "ad" && kind !== "business")
          return json(400, { ok: false, message: "طلب غير صحيح." });
        const declared = Number(request.headers.get("content-length") ?? 0);
        if (declared > MAX_MEDIA_BYTES)
          return json(413, { ok: false, message: "الصورة كبيرة جداً (الحد 3 ميغابايت)." });
        if (tooMany(user.id))
          return json(429, { ok: false, message: "رفعت صوراً كثيرة للتو. حاول بعد قليل." });

        const raw = new Uint8Array(await request.arrayBuffer());
        if (raw.length === 0) return json(400, { ok: false, message: "الصورة فارغة." });
        if (raw.length > MAX_MEDIA_BYTES)
          return json(413, { ok: false, message: "الصورة كبيرة جداً (الحد 3 ميغابايت)." });

        const { checkImage } = await import("@/lib/media/image-check");
        let image: ReturnType<typeof checkImage>;
        try {
          image = checkImage(raw);
        } catch {
          return json(415, { ok: false, message: "نقبل صور JPG أو WebP فقط." });
        }
        if (image.width > MAX_MEDIA_SIDE || image.height > MAX_MEDIA_SIDE)
          return json(400, { ok: false, message: "أبعاد الصورة كبيرة جداً." });

        try {
          const { randomBytes } = await import("node:crypto");
          const store = await import("@/lib/media/store.server");
          const { putMedia } = await import("@/lib/media/storage.server");
          void store.cleanupOrphans().catch((e) => console.error("[media] cleanup failed", e));
          if ((await store.countUnsaved(user.id)) >= store.MAX_UNSAVED_PER_USER)
            return json(429, {
              ok: false,
              message: "لديك صور كثيرة لم تُحفظ بعد. أرسل منشورك أو احذف بعضها.",
            });
          const key = `${randomBytes(16).toString("hex")}.${image.ext}`;
          await putMedia(key, image.bytes, image.contentType);
          await store.recordUpload({
            key,
            userId: user.id,
            kind,
            contentType: image.contentType,
            size: image.bytes.length,
            width: image.width,
            height: image.height,
          });
          return json(200, { ok: true, key, url: mediaUrl(key) });
        } catch (error) {
          console.error("[media] upload failed", error);
          return json(500, { ok: false, message: "تعذّر رفع الصورة الآن. حاول مرة أخرى." });
        }
      },
      DELETE: async ({ request }) => {
        const user = await sessionUser();
        if (!user) return json(401, { ok: false });
        const key = new URL(request.url).searchParams.get("key") ?? "";
        if (!MEDIA_KEY_RE.test(key)) return json(400, { ok: false });
        try {
          const { deleteUnsaved } = await import("@/lib/media/store.server");
          return json(200, { ok: await deleteUnsaved(user.id, key) });
        } catch (error) {
          console.error("[media] delete failed", error);
          return json(500, { ok: false });
        }
      },
    },
  },
});
