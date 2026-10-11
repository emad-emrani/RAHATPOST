import { deletePushSubscription, getPushConfig, getPushTopics, savePushSubscription } from "./api";
import type { PushTopics } from "./types";

export const DEFAULT_TOPICS: PushTopics = {
  alerts: true,
  news: false,
  pharmacy: false,
  replies: true,
};

export type PushSupport = "supported" | "ios-needs-install" | "unsupported";

export function pushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported";
  const ok = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (ok) return "supported";
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  return ios ? "ios-needs-install" : "unsupported";
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  return navigator.serviceWorker.ready;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== "supported") return null;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return (await reg?.pushManager.getSubscription()) ?? null;
}

/** Topics saved on the server for this browser, or null when not subscribed. */
export async function loadTopics(): Promise<PushTopics | null> {
  const sub = await currentSubscription();
  if (!sub) return null;
  return (await getPushTopics({ data: { endpoint: sub.endpoint } })) ?? DEFAULT_TOPICS;
}

/** Asks permission (if needed), subscribes and saves the topics. Returns an Arabic error or "". */
export async function enablePush(topics: PushTopics = DEFAULT_TOPICS): Promise<string> {
  if (pushSupport() !== "supported") return "هذا المتصفح لا يدعم الإشعارات.";
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    return "لم يُسمح بالإشعارات. يمكنك تفعيلها من إعدادات المتصفح لموقع رهط بوست.";
  const { publicKey } = await getPushConfig();
  if (!publicKey) return "الإشعارات غير متاحة حالياً.";
  const reg = await registration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }
  return saveTopics(sub, topics);
}

export async function saveTopics(sub: PushSubscription, topics: PushTopics): Promise<string> {
  const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  const res = await savePushSubscription({ data: { subscription: json, topics } });
  return res.ok ? "" : (res.message ?? "تعذّر حفظ الاشتراك.");
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await deletePushSubscription({ data: { endpoint: sub.endpoint } }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}
