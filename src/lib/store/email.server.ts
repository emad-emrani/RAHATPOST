/**
 * Delivery e-mail hook. The site has no mail sender yet; when RESEND_API_KEY and STORE_EMAIL_FROM
 * are set this sends through Resend's HTTP API, otherwise it does nothing (the buyer still sees
 * everything in «طلباتي»). Swap the body of `sendMail` to use another provider.
 */
export const emailConfigured = () =>
  Boolean(process.env.RESEND_API_KEY?.trim() && process.env.STORE_EMAIL_FROM?.trim());

export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  if (!emailConfigured()) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from: process.env.STORE_EMAIL_FROM!.trim(), to: [to], subject, text }),
    signal: AbortSignal.timeout(10_000),
  });
  return res.ok;
}

export async function sendDeliveryEmail(
  to: string,
  orderId: string,
  items: { name: string; delivery: string }[],
): Promise<boolean> {
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return false;
  const body = [
    "شكراً لشرائك من متجر رهط بوست.",
    `رقم الطلب: ${orderId}`,
    "",
    ...items.flatMap((i) => [`• ${i.name}`, i.delivery, ""]),
    "يمكنك رؤية طلباتك دائماً في: https://rahatpost.com/my-orders",
  ].join("\n");
  try {
    return await sendMail(to, "طلبك من متجر رهط بوست جاهز", body);
  } catch (error) {
    console.error("[store] delivery email failed", error);
    return false;
  }
}
