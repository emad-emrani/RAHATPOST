import { createServerFn } from "@tanstack/react-start";
import { clean } from "@/lib/submit-guard";
import { PUSH_TOPICS, type PushTopic, type PushTopics, type SendResult } from "./types";

type SubInput = { endpoint: string; keys: { p256dh: string; auth: string } };

const B64URL = /^[A-Za-z0-9_-]+={0,2}$/;

function validSub(input: unknown): SubInput {
  const s = input as SubInput;
  const endpoint = String(s?.endpoint ?? "");
  const p256dh = String(s?.keys?.p256dh ?? "");
  const auth = String(s?.keys?.auth ?? "");
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("bad endpoint");
  }
  if (url.protocol !== "https:" || endpoint.length > 1000) throw new Error("bad endpoint");
  if (!B64URL.test(p256dh) || p256dh.length > 200 || !B64URL.test(auth) || auth.length > 100)
    throw new Error("bad keys");
  return { endpoint, keys: { p256dh, auth } };
}

function validTopics(input: unknown): PushTopics {
  const t = (input ?? {}) as Partial<Record<PushTopic, unknown>>;
  return {
    alerts: t.alerts !== false,
    news: t.news === true,
    pharmacy: t.pharmacy === true,
    replies: t.replies !== false,
  };
}

/** Per-IP limit for subscription writes (toggling topics is cheap but shouldn't be abusable). */
const hits = new Map<string, number[]>();
async function ipLimited(max = 30): Promise<boolean> {
  const { getRequestIP } = await import("@tanstack/react-start/server");
  const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > max;
}

export const getPushConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ publicKey: string }> => {
    const { vapid } = await import("./send.server");
    return { publicKey: vapid()?.publicKey ?? "" };
  },
);

export const savePushSubscription = createServerFn({ method: "POST" })
  .inputValidator((input: { subscription: SubInput; topics: PushTopics }) => ({
    subscription: validSub(input?.subscription),
    topics: validTopics(input?.topics),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
    assertSameSiteRequest();
    if (await ipLimited()) return { ok: false, message: "محاولات كثيرة. حاول بعد قليل." };
    try {
      const { getSessionUser } = await import("@/lib/auth/verify.server");
      const user = await getSessionUser().catch(() => null);
      const { upsertSubscription } = await import("./store.server");
      await upsertSubscription(
        { endpoint: data.subscription.endpoint, ...data.subscription.keys },
        data.topics,
        user?.id ?? null,
      );
      return { ok: true };
    } catch (error) {
      console.error("[push] save failed", error);
      return { ok: false, message: "تعذّر حفظ الاشتراك الآن." };
    }
  });

export const getPushTopics = createServerFn({ method: "POST" })
  .inputValidator((input: { endpoint: string }) => ({
    endpoint: String(input?.endpoint ?? "").slice(0, 1000),
  }))
  .handler(async ({ data }): Promise<PushTopics | null> => {
    try {
      const { getTopics } = await import("./store.server");
      return await getTopics(data.endpoint);
    } catch {
      return null;
    }
  });

export const deletePushSubscription = createServerFn({ method: "POST" })
  .inputValidator((input: { endpoint: string }) => ({
    endpoint: String(input?.endpoint ?? "").slice(0, 1000),
  }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { assertSameSiteRequest } = await import("@/lib/auth/isolation.server");
    assertSameSiteRequest();
    if (await ipLimited()) return { ok: false };
    const { deleteSubscription } = await import("./store.server");
    await deleteSubscription(data.endpoint);
    return { ok: true };
  });

/* ------------------------------------------------------------- admin */

export const adminPushStats = createServerFn({ method: "POST" }).handler(async () => {
  const { isAdmin } = await import("@/lib/admin-auth");
  if (!(await isAdmin())) return { authed: false, configured: false, counts: null };
  const { vapid } = await import("./send.server");
  const { countByTopic } = await import("./store.server");
  return {
    authed: true,
    configured: Boolean(vapid()),
    counts: await countByTopic().catch(() => null),
  };
});

export const adminSendPush = createServerFn({ method: "POST" })
  .inputValidator((input: { topic: PushTopic; title: string; body: string; url: string }) => {
    const topic = input?.topic;
    if (!PUSH_TOPICS.some((t) => t.key === topic && !t.personal)) throw new Error("bad topic");
    const title = clean(input?.title, 80);
    const body = clean(input?.body, 200);
    if (title.length < 2 || body.length < 2) throw new Error("اكتب عنواناً ونصاً للإشعار.");
    return { topic, title, body, url: String(input?.url ?? "/").slice(0, 300) };
  })
  .handler(async ({ data }): Promise<SendResult> => {
    const { requireAdmin } = await import("@/lib/admin-auth");
    await requireAdmin();
    const { sendToTopic } = await import("./send.server");
    return sendToTopic(data.topic, {
      title: data.title,
      body: data.body,
      url: data.url,
      tag: `manual-${Date.now()}`,
    });
  });
