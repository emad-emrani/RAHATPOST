import type { PushPayload, PushTopic, SendResult } from "./types";

/** VAPID config from env (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT). */
export function vapid(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
  if (!publicKey || !privateKey) return null;
  const subject = process.env.VAPID_SUBJECT?.trim() || "https://rahatpost.com";
  return { publicKey, privateKey, subject };
}

/** Same-site path only for the click-through URL. */
export function safePushUrl(url: string | undefined): string {
  const u = String(url ?? "").trim();
  if (u.startsWith("/") && !u.startsWith("//")) return u.slice(0, 300);
  try {
    const parsed = new URL(u);
    if (parsed.origin === "https://rahatpost.com") return `${parsed.pathname}${parsed.search}`;
  } catch {
    // fall through
  }
  return "/";
}

/**
 * Sends `payload` to every subscription opted into `topic`. Endpoints the push service reports as
 * gone (404/410) are deleted. Never throws.
 */
export async function sendToTopic(topic: PushTopic, payload: PushPayload): Promise<SendResult> {
  const keys = vapid();
  if (!keys)
    return { ok: false, sent: 0, removed: 0, failed: 0, message: "مفاتيح VAPID غير مضبوطة." };
  try {
    const webpush = (await import("web-push")).default;
    const { subscribersFor, deleteSubscription } = await import("./store.server");
    const subs = await subscribersFor(topic);
    const body = JSON.stringify({ ...payload, url: safePushUrl(payload.url) });
    let sent = 0;
    let removed = 0;
    let failed = 0;
    // Small batches keep a serverless invocation well within its time limit.
    for (let i = 0; i < subs.length; i += 50) {
      await Promise.all(
        subs.slice(i, i + 50).map(async (s) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              body,
              {
                vapidDetails: keys,
                TTL: 6 * 60 * 60,
                urgency: topic === "alerts" ? "high" : "normal",
                timeout: 10_000,
              },
            );
            sent++;
          } catch (error) {
            const status = (error as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410) {
              await deleteSubscription(s.endpoint).catch(() => {});
              removed++;
            } else {
              failed++;
              console.error("[push] send failed", status, (error as Error).message);
            }
          }
        }),
      );
    }
    return { ok: true, sent, removed, failed };
  } catch (error) {
    console.error("[push] topic send failed", error);
    return { ok: false, sent: 0, removed: 0, failed: 0, message: "تعذّر الإرسال الآن." };
  }
}
