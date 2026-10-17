import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { clean, cleanUrl, friendly, looksLikeBot, rateLimited } from "@/lib/submit-guard";
import { READER_NEWS_ID_RE, type OwnReaderNews, type ReaderNewsInput } from "./types";

type FormInput = ReaderNewsInput & { website?: string; startedAt?: number };

const MAX_PENDING_PER_USER = 5;

function validateNews(input: FormInput): ReaderNewsInput {
  const data: ReaderNewsInput = {
    title: clean(input?.title, 120),
    body: clean(input?.body, 4000, true),
    sourceUrl: cleanUrl(input?.sourceUrl),
    neighborhood: clean(input?.neighborhood, 60),
  };
  if (data.title.length < 5) throw new Error("اكتب عنواناً للخبر (5 أحرف على الأقل).");
  if (data.body.length < 20) throw new Error("اكتب نص الخبر (20 حرفاً على الأقل).");
  if (data.neighborhood.length < 2) throw new Error("اكتب الحي أو المكان.");
  return data;
}

/** Signed-in users only; saved as pending under the session user's id. */
export const createMyNews = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((input: FormInput) => input)
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    if (looksLikeBot(data)) return { ok: true };
    let news: ReaderNewsInput;
    try {
      news = validateNews(data);
    } catch (error) {
      return { ok: false, message: friendly(error, "تحقق من الحقول.") };
    }
    if (await rateLimited("news", context.user.id))
      return { ok: false, message: "أرسلت عدة أخبار للتو. حاول بعد قليل." };
    try {
      const { countPendingByUser, createNews } = await import("./store.server");
      if ((await countPendingByUser(context.user.id)) >= MAX_PENDING_PER_USER)
        return { ok: false, message: "لديك عدة أخبار بانتظار المراجعة. انتظر مراجعتها أولاً." };
      await createNews(context.user.id, news);
      return { ok: true };
    } catch (error) {
      console.error("[reader-news] create failed", error);
      return { ok: false, message: "تعذّر الحفظ الآن. حاول مرة أخرى." };
    }
  });

export const listMyNews = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<OwnReaderNews[]> => {
    const { listByUser } = await import("./store.server");
    return listByUser(context.user.id);
  });

export const deleteMyNews = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    if (!READER_NEWS_ID_RE.test(data.id)) return { ok: false };
    const { deleteOwnNews } = await import("./store.server");
    return { ok: await deleteOwnNews(context.user.id, data.id) };
  });

/* ------------------------------------------------------------- admin */

async function requireAdmin() {
  const { requireAdmin: check } = await import("@/lib/admin-auth");
  await check();
}

export const adminListNews = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ authed: boolean; ok: boolean; items: OwnReaderNews[] }> => {
    try {
      await requireAdmin();
    } catch {
      return { authed: false, ok: true, items: [] };
    }
    try {
      const { listAll } = await import("./store.server");
      return { authed: true, ok: true, items: await listAll() };
    } catch (error) {
      console.error("[admin] reader news list failed", error);
      return { authed: true, ok: false, items: [] };
    }
  },
);

export const adminDecideNews = createServerFn({ method: "POST" })
  .inputValidator(
    (input: { id: string; action: "approved" | "rejected" | "pending" | "delete" }) => {
      const id = String(input?.id ?? "");
      const action = input?.action;
      if (!READER_NEWS_ID_RE.test(id)) throw new Error("bad id");
      if (!["approved", "rejected", "pending", "delete"].includes(action))
        throw new Error("bad action");
      return { id, action };
    },
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const { adminSetStatus, getMeta } = await import("./store.server");
    const before = data.action === "approved" ? await getMeta(data.id) : null;
    await adminSetStatus(data.id, data.action);
    // First approval → «أخبار القراء الجديدة» push to subscribers of that topic.
    if (before && before.status !== "approved") {
      const { sendToTopic } = await import("@/lib/push/send.server");
      await sendToTopic("news", {
        title: "خبر جديد من القراء",
        body: before.title,
        url: `/news/reader-${data.id}`,
        tag: `news-${data.id}`,
      });
    }
    return { ok: true };
  });
