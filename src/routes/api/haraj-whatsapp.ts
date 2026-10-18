import { createFileRoute } from "@tanstack/react-router";
import { LISTING_ID_RE, whatsappUrl } from "@/lib/market/types";

/** WhatsApp link for sellers who hide their number: the number never reaches the page HTML. */
export const Route = createFileRoute("/api/haraj-whatsapp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const id = url.searchParams.get("id") ?? "";
        if (!LISTING_ID_RE.test(id)) return new Response("Not found", { status: 404 });
        const { getPhone } = await import("@/lib/market/store.server");
        const row = await getPhone(id);
        if (!row) return new Response("Not found", { status: 404 });
        const text = `مرحباً، بخصوص إعلانك «${row.title}» في حراج رهط: ${url.origin}/haraj/${id}`;
        return new Response(null, {
          status: 302,
          headers: { location: whatsappUrl(row.phone, text), "cache-control": "no-store", "x-robots-tag": "noindex" },
        });
      },
    },
  },
});
