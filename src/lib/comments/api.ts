import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { clean, looksLikeBot } from "@/lib/submit-guard";
import { checkComment } from "./filter";
import {
  ARTICLE_KEY_RE,
  COMMENT_ID_RE,
  COMMENT_MAX,
  COMMENTS_PER_10_MIN,
  COMMENTS_PER_DAY,
  EDIT_WINDOW_MS,
  type AdminComment,
  type AdminCommentFilter,
  type CommentOrder,
  type CommentStatus,
  type CommentThread,
} from "./types";

function validKey(v: unknown): string {
  const key = String(v ?? "");
  if (!ARTICLE_KEY_RE.test(key)) throw new Error("bad article");
  return key;
}
function validId(v: unknown): string {
  const id = String(v ?? "");
  if (!COMMENT_ID_RE.test(id)) throw new Error("bad id");
  return id;
}
const body = (v: unknown) => clean(v, COMMENT_MAX + 50, true);

/** Public thread (approved comments; the viewer's own pending ones too). Never cached. */
export const getComments = createServerFn({ method: "POST" })
  .inputValidator((input: { key: string; order?: CommentOrder }) => ({
    key: validKey(input?.key),
    order: (input?.order === "oldest" ? "oldest" : "newest") as CommentOrder,
  }))
  .handler(async ({ data }): Promise<CommentThread> => {
    try {
      const { getSessionUser } = await import("@/lib/auth/verify.server");
      const user = await getSessionUser().catch(() => null);
      const { listForArticle, premodOn, isBlocked } = await import("./store.server");
      const [thread, premod, blocked] = await Promise.all([
        listForArticle(data.key, user?.id ?? null, data.order),
        premodOn(),
        user ? isBlocked(user.id) : Promise.resolve(false),
      ]);
      return { ok: true, ...thread, premod, blocked };
    } catch (error) {
      console.error("[comments] list failed", error);
      return { ok: false, comments: [], total: 0, premod: false, blocked: false };
    }
  });

type PostInput = {
  key: string;
  parentId?: string | null;
  body: string;
  website?: string;
  startedAt?: number;
};

/** Signed-in users only (session checked server-side by authMiddleware). */
export const postComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((input: PostInput) => ({
    key: validKey(input?.key),
    parentId: input?.parentId ? validId(input.parentId) : null,
    body: body(input?.body),
    website: input?.website,
    startedAt: input?.startedAt,
  }))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ ok: boolean; status?: CommentStatus; message?: string }> => {
      // Bots: filled honeypot or submitted < 3 s after the form opened → pretend success.
      if (looksLikeBot(data)) return { ok: true, status: "approved" };
      const problem = checkComment(data.body);
      if (problem) return { ok: false, message: problem };
      const userId = context.user.id;
      try {
        const store = await import("./store.server");
        if (await store.isBlocked(userId))
          return { ok: false, message: "تم إيقاف إمكانية التعليق لحسابك." };
        const recent = await store.recentCounts(userId);
        if (recent.tenMin >= COMMENTS_PER_10_MIN)
          return { ok: false, message: "كتبت عدة تعليقات للتو. انتظر قليلاً ثم حاول." };
        if (recent.day >= COMMENTS_PER_DAY)
          return { ok: false, message: "وصلت للحد اليومي من التعليقات. حاول غداً." };
        const { articleExists } = await import("./counts.server");
        if (!(await articleExists(data.key)))
          return { ok: false, message: "هذا الخبر لم يعد متاحاً للتعليق." };
        let parentAuthor: string | null = null;
        if (data.parentId) {
          parentAuthor = await store.replyTarget(data.key, data.parentId);
          if (!parentAuthor) return { ok: false, message: "التعليق الذي ترد عليه لم يعد متاحاً." };
        }
        const status: CommentStatus = (await store.premodOn()) ? "pending" : "approved";
        await store.createComment({
          key: data.key,
          parentId: data.parentId,
          userId,
          body: data.body,
          status,
        });
        if (status === "approved" && parentAuthor && parentAuthor !== userId)
          await notifyReply(parentAuthor, context.user.name, data.body, data.key);
        return { ok: true, status };
      } catch (error) {
        console.error("[comments] post failed", error);
        return { ok: false, message: "تعذّر نشر التعليق الآن. حاول مرة أخرى." };
      }
    },
  );

async function notifyReply(toUserId: string, fromName: string, text: string, key: string) {
  try {
    const { sendToUser } = await import("@/lib/push/send.server");
    await sendToUser(toUserId, "replies", {
      title: `${(fromName || "قارئ").slice(0, 40)} ردّ على تعليقك`,
      body: text.length > 120 ? `${text.slice(0, 117)}…` : text,
      url: `/${key}#comments`,
      tag: `reply-${key}`,
    });
  } catch (error) {
    console.error("[comments] reply push failed", error);
  }
}

export const editComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((input: { id: string; body: string }) => ({
    id: validId(input?.id),
    body: body(input?.body),
  }))
  .handler(async ({ data, context }): Promise<{ ok: boolean; message?: string }> => {
    const problem = checkComment(data.body);
    if (problem) return { ok: false, message: problem };
    const { editOwn } = await import("./store.server");
    const ok = await editOwn(context.user.id, data.id, data.body, EDIT_WINDOW_MS);
    return ok
      ? { ok }
      : { ok, message: "لا يمكن تعديل هذا التعليق (التعديل متاح لصاحبه خلال 10 دقائق)." };
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((input: { id: string }) => ({ id: validId(input?.id) }))
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    const { deleteOwn } = await import("./store.server");
    return { ok: await deleteOwn(context.user.id, data.id) };
  });

/* ------------------------------------------------------------- admin */

const FILTERS: AdminCommentFilter[] = ["all", "reported", "hidden", "pending"];

export const adminListComments = createServerFn({ method: "POST" })
  .inputValidator((input: { filter?: AdminCommentFilter }) => ({
    filter: FILTERS.includes(input?.filter as AdminCommentFilter)
      ? (input.filter as AdminCommentFilter)
      : "all",
  }))
  .handler(
    async ({
      data,
    }): Promise<{
      authed: boolean;
      ok: boolean;
      items: AdminComment[];
      counts: Record<AdminCommentFilter, number> | null;
      premod: boolean;
    }> => {
      const { isAdmin } = await import("@/lib/admin-auth");
      if (!(await isAdmin()))
        return { authed: false, ok: true, items: [], counts: null, premod: false };
      try {
        const store = await import("./store.server");
        const [items, counts, premod] = await Promise.all([
          store.adminList(data.filter),
          store.adminCounts(),
          store.premodOn(),
        ]);
        return { authed: true, ok: true, items, counts, premod };
      } catch (error) {
        console.error("[admin] comments failed", error);
        return { authed: true, ok: false, items: [], counts: null, premod: false };
      }
    },
  );

export const adminCommentAction = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; action: "hide" | "restore" | "delete" }) => {
    if (!["hide", "restore", "delete"].includes(input?.action)) throw new Error("bad action");
    return { id: validId(input?.id), action: input.action };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/admin-auth");
    await requireAdmin();
    const { adminAct } = await import("./store.server");
    await adminAct(data.id, data.action);
    return { ok: true };
  });

export const adminBlockCommenter = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string; blocked: boolean }) => {
    const userId = String(input?.userId ?? "");
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(userId)) throw new Error("bad user");
    return { userId, blocked: input?.blocked === true };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/admin-auth");
    await requireAdmin();
    const { setBlocked } = await import("./store.server");
    await setBlocked(data.userId, data.blocked);
    return { ok: true };
  });

export const adminSetPremod = createServerFn({ method: "POST" })
  .inputValidator((input: { on: boolean }) => ({ on: input?.on === true }))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/admin-auth");
    await requireAdmin();
    const { setSetting } = await import("./store.server");
    await setSetting("comments_premod", data.on ? "on" : "off");
    return { ok: true, premod: data.on };
  });
