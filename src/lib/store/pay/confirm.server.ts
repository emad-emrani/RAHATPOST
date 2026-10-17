import { payConfig } from "../settings.server";
import { getOrderRow, logPaymentEvent, markPaid, orderDescription } from "../store.server";
import type { ProviderId } from "../types";
import { PROVIDER_IMPL } from "./providers.server";

/** Server-side verification with the order's provider; marks paid + auto-delivers on success. */
export async function verifyAndMark(orderId: string, via: string): Promise<boolean> {
  const o = await getOrderRow(orderId);
  if (!o) return false;
  if (o.status !== "pending") return o.status === "paid" || o.status === "delivered";
  const provider = PROVIDER_IMPL[o.provider as ProviderId];
  if (!provider || provider.id === "manual" || !o.provider_ref) return false;
  const cfg = await payConfig();
  const r = await provider.verify(
    cfg,
    {
      id: o.id,
      totalAgorot: Number(o.total_agorot),
      currency: o.currency,
      description: await orderDescription(o.id),
      email: o.user_email,
      name: o.user_name,
    },
    o.provider_ref,
  );
  await logPaymentEvent(o.id, provider.id, r.paid, `${via}: ${r.detail}`);
  if (!r.paid) return false;
  await markPaid(o.id, cfg.testMode ? `[${provider.id} تجريبي]` : `[${provider.id}]`, r.ref ?? "");
  return true;
}
