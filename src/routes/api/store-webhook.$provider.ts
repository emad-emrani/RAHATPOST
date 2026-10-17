import { createFileRoute } from "@tanstack/react-router";

/**
 * Payment provider callbacks (paste this URL in the provider dashboard):
 *   POST /api/store-webhook/cardcom   Cardcom LowProfile WebHookUrl (JSON or form)
 *   POST /api/store-webhook/tranzila  Tranzila notify_url_address (form)
 * The body is only a hint of WHICH order to check: payment is confirmed by asking the provider's
 * server (Cardcom GetLpResult). Tranzila notifies are logged only (no automatic verification yet).
 */
const ok = () => new Response("OK", { status: 200, headers: { "content-type": "text/plain" } });

async function readBody(request: Request): Promise<Record<string, string>> {
  const text = (await request.text()).slice(0, 20_000);
  try {
    const j = JSON.parse(text) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(j).map(([k, v]) => [
        k,
        typeof v === "string" || typeof v === "number" ? String(v) : "",
      ]),
    );
  } catch {
    return Object.fromEntries(new URLSearchParams(text));
  }
}

export const Route = createFileRoute("/api/store-webhook/$provider")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const provider = params.provider;
        if (provider !== "cardcom" && provider !== "tranzila")
          return new Response("not found", { status: 404 });
        const body = await readBody(request);
        const { ID_RE } = await import("@/lib/store/types");
        const s = await import("@/lib/store/store.server");
        const orderId = String((provider === "cardcom" ? body.ReturnValue : body.orderid) ?? "");
        if (!ID_RE.test(orderId)) {
          if (orderId !== "connection-test")
            await s.logPaymentEvent(
              null,
              provider,
              false,
              `unknown order "${orderId.slice(0, 40)}"`,
            );
          return ok();
        }
        try {
          const o = await s.getOrderRow(orderId);
          if (!o) return ok();
          if (provider === "cardcom") {
            if (body.LowProfileId && body.LowProfileId !== o.provider_ref) {
              await s.logPaymentEvent(
                orderId,
                provider,
                false,
                "webhook LowProfileId does not match order",
              );
              return ok();
            }
            const { verifyAndMark } = await import("@/lib/store/pay/confirm.server");
            await verifyAndMark(orderId, "webhook");
          } else {
            await s.logPaymentEvent(
              orderId,
              provider,
              false,
              `notify (unverified): Response=${String(body.Response ?? "").slice(0, 8)} sum=${String(body.sum ?? "").slice(0, 12)} index=${String(body.index ?? "").slice(0, 20)} — confirm in Tranzila, then mark paid`,
            );
          }
        } catch (error) {
          console.error("[store] webhook failed", error);
          return new Response("error", { status: 500 }); // provider retries
        }
        return ok();
      },
    },
  },
});
