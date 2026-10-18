import { Link } from "@tanstack/react-router";
import { Pencil, Reply, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ReportButton } from "@/components/report";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { deleteComment, editComment, getComments, postComment } from "@/lib/comments/api";
import {
  COMMENT_MAX,
  EDIT_WINDOW_MS,
  type CommentOrder,
  type CommentThread,
  type CommentView,
} from "@/lib/comments/types";
import { relativeTimeAr } from "@/lib/news/format";
import { tr, trv } from "@/lib/i18n/core";

/** Comments under a news article. `articleKey` = page path without the leading "/". */
export function Comments({ articleKey }: { articleKey: string }) {
  const { user, isPending } = useCurrentUserState();
  const [order, setOrder] = useState<CommentOrder>("newest");
  const [thread, setThread] = useState<CommentThread | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      setThread(await getComments({ data: { key: articleKey, order } }));
    } catch {
      setThread({ ok: false, comments: [], total: 0, premod: false, blocked: false });
    }
    setNow(Date.now());
  }, [articleKey, order]);

  useEffect(() => {
    void load();
  }, [load, user?.id]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const posted = async (status?: string) => {
    setReplyTo(null);
    setNotice(status === "pending" ? tr("وصل تعليقك وسيظهر للجميع بعد موافقة الإدارة.") : "");
    await load();
    void linkPushToAccount();
  };

  const redirect = `/${articleKey}#comments`;
  return (
    <section id="comments" className="mt-8 scroll-mt-24" aria-labelledby="comments-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="comments-title" className="text-xl font-bold">
          {tr("التعليقات")}{thread?.total ? ` (${thread.total})` : ""}
        </h2>
        <div className="flex gap-1" role="group" aria-label={tr("ترتيب التعليقات")}>
          {(
            [
              ["newest", tr("الأحدث")],
              ["oldest", tr("الأقدم")],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={order === key}
              className={`chip min-h-10 ${order === key ? "chip-ink" : ""}`}
              onClick={() => setOrder(key)}
            >
              {trv(label)}
            </button>
          ))}
        </div>
      </div>

      {isPending ? null : !user ? (
        <div className="stamp flex flex-col gap-3 p-4">
          <p className="font-bold">{tr("سجّل الدخول بحساب Google لتكتب تعليقاً أو ترد على الآخرين.")}</p>
          <p className="text-sm font-semibold text-muted">
            {tr("قراءة التعليقات متاحة للجميع. يظهر اسمك وصورتك مع تعليقك.")}
          </p>
          <Link to="/login" search={{ redirect }} className="btn">
            {tr("سجّل الدخول للتعليق")}
          </Link>
        </div>
      ) : thread?.blocked ? (
        <p className="stamp p-4 font-semibold">{tr("تم إيقاف إمكانية التعليق لحسابك.")}</p>
      ) : (
        <Composer articleKey={articleKey} premod={thread?.premod ?? false} onPosted={posted} />
      )}

      {notice ? (
        <p className="stamp mt-3 p-3 font-bold" role="status">
          {trv(notice)}
        </p>
      ) : null}

      {!thread ? (
        <p className="mt-4 font-semibold text-muted">{tr("جاري تحميل التعليقات…")}</p>
      ) : !thread.ok ? (
        <p className="stamp mt-4 p-4 font-semibold">{tr("تعذّر تحميل التعليقات الآن.")}</p>
      ) : thread.comments.length === 0 ? (
        <p className="mt-4 font-semibold text-muted">{tr("لا تعليقات بعد. كن أول من يعلّق.")}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {thread.comments.map((c) => (
            <li key={c.id} className="stamp p-4">
              <CommentItem
                c={c}
                now={now}
                canReply={Boolean(user) && !thread.blocked && c.status === "approved"}
                onReply={() => setReplyTo(replyTo === c.id ? null : c.id)}
                onChanged={load}
              />
              {c.replies.length > 0 || replyTo === c.id ? (
                <ul className="ms-3 mt-3 flex flex-col gap-3 border-s-4 border-line ps-3">
                  {c.replies.map((r) => (
                    <li key={r.id}>
                      <CommentItem c={r} now={now} canReply={false} onChanged={load} />
                    </li>
                  ))}
                  {replyTo === c.id ? (
                    <li>
                      <Composer
                        articleKey={articleKey}
                        parentId={c.id}
                        premod={thread.premod}
                        onPosted={posted}
                        onCancel={() => setReplyTo(null)}
                        placeholder={tr("ردّ على {0}", c.author.name)}
                      />
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-sm font-semibold text-muted">
        {tr("التعليقات تعبّر عن أصحابها. يمنع السب والإساءة والإعلانات؛ أبلغ عن أي تعليق مخالف.")}
      </p>
    </section>
  );
}

function Avatar({ name, image }: { name: string; image: string | null }) {
  const [broken, setBroken] = useState(false);
  if (image && !broken)
    return (
      <img
        src={image}
        alt=""
        width={40}
        height={40}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="size-10 shrink-0 rounded-full border border-line object-cover"
      />
    );
  return (
    <span
      aria-hidden
      className="grid size-10 shrink-0 place-items-center rounded-full bg-primary font-bold text-ink"
    >
      {name.trim().charAt(0) || tr("؟")}
    </span>
  );
}

function CommentItem({
  c,
  now,
  canReply,
  onReply,
  onChanged,
}: {
  c: CommentView;
  now: number;
  canReply: boolean;
  onReply?: () => void;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const canEdit = c.mine && now - Date.parse(c.createdAt) < EDIT_WINDOW_MS;
  return (
    <article id={`c-${c.id}`} className="scroll-mt-24">
      <header className="flex items-center gap-3">
        <Avatar name={c.author.name} image={c.author.image} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">
            {trv(c.author.name)}
            {c.author.badge ? <span className="chip chip-deep ms-1 align-middle text-xs">{trv(c.author.badge)}</span> : null}
          </p>
          <p className="text-sm font-semibold text-muted">
            <time dateTime={c.createdAt}>{relativeTimeAr(c.createdAt, now)}</time>
            {c.editedAt ? tr(" · معدّل") : ""}
          </p>
        </div>
        {c.status === "pending" ? <span className="chip">{tr("بانتظار الموافقة")}</span> : null}
      </header>
      {editing ? (
        <Composer
          editId={c.id}
          initial={c.body}
          onPosted={async () => {
            setEditing(false);
            await onChanged();
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <p className="mt-2 whitespace-pre-line break-words text-lg leading-relaxed" dir="auto">
          {trv(c.body)}
        </p>
      )}
      {!editing ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-4">
          {canReply ? (
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-1 text-sm font-bold"
              onClick={onReply}
            >
              <Reply className="size-4" aria-hidden />
              {tr("ردّ")}
            </button>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-1 text-sm font-bold text-muted"
              onClick={() => setEditing(true)}
            >
              <Pencil className="size-4" aria-hidden />
              {tr("تعديل")}
            </button>
          ) : null}
          {c.mine ? (
            <button
              type="button"
              className="inline-flex min-h-10 items-center gap-1 text-sm font-bold text-muted"
              disabled={busy}
              onClick={async () => {
                if (!confirm(tr("حذف تعليقك؟ تُحذف الردود عليه أيضاً."))) return;
                setBusy(true);
                await deleteComment({ data: { id: c.id } }).catch(() => {});
                await onChanged();
                setBusy(false);
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              {tr("حذف")}
            </button>
          ) : c.status === "approved" ? (
            <ReportButton type="comment" id={c.id} label={tr("إبلاغ")} compact />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function Composer({
  articleKey,
  parentId,
  editId,
  initial = "",
  premod = false,
  placeholder,
  onPosted,
  onCancel,
}: {
  articleKey?: string;
  parentId?: string;
  editId?: string;
  initial?: string;
  premod?: boolean;
  placeholder?: string;
  onPosted: (status?: string) => Promise<void> | void;
  onCancel?: () => void;
}) {
  const startedAt = useRef(Date.now());
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const len = [...text.trim()].length;
  return (
    <form
      className={editId || parentId ? "mt-2 flex flex-col gap-2" : "stamp flex flex-col gap-2 p-4"}
      onSubmit={async (event) => {
        event.preventDefault();
        const f = new FormData(event.currentTarget);
        setBusy(true);
        setError("");
        try {
          const res = editId
            ? await editComment({ data: { id: editId, body: text } })
            : await postComment({
                data: {
                  key: articleKey ?? "",
                  parentId: parentId ?? null,
                  body: text,
                  website: String(f.get("website") ?? ""),
                  startedAt: startedAt.current,
                },
              });
          if (res.ok) {
            setText("");
            startedAt.current = Date.now();
            await onPosted("status" in res ? String(res.status ?? "") : undefined);
          } else setError(res.message ?? tr("تعذّر النشر."));
        } catch {
          setError(tr("تعذّر النشر. تحقق من الاتصال أو سجّل الدخول من جديد."));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="sr-only" htmlFor={`cm-${editId ?? parentId ?? "new"}`}>
        {editId ? tr("تعديل التعليق") : parentId ? tr("اكتب رداً") : tr("اكتب تعليقاً")}
      </label>
      <textarea
        id={`cm-${editId ?? parentId ?? "new"}`}
        name="body"
        className="field min-h-24"
        dir="auto"
        rows={parentId || editId ? 2 : 3}
        maxLength={COMMENT_MAX}
        required
        value={text}
        placeholder={placeholder ?? tr("اكتب تعليقك…")}
        onChange={(e) => setText(e.target.value)}
      />
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="flex items-center justify-between gap-2 text-sm font-semibold text-muted">
        <span>
          {trv(len)}/{trv(COMMENT_MAX)}
          {premod && !editId ? tr(" · يظهر بعد موافقة الإدارة") : ""}
        </span>
        <span>{tr("رابط واحد كحد أقصى")}</span>
      </div>
      {error ? (
        <p role="alert" className="font-bold text-alert">
          {trv(error)}
        </p>
      ) : null}
      <div className={onCancel ? "grid grid-cols-2 gap-2" : ""}>
        <button type="submit" className="btn w-full" disabled={busy || len < 2}>
          {busy ? tr("جاري النشر…") : editId ? tr("حفظ") : parentId ? tr("أرسل الرد") : tr("انشر التعليق")}
        </button>
        {onCancel ? (
          <button type="button" className="btn btn-ghost w-full" onClick={onCancel}>
            {tr("إلغاء")}
          </button>
        ) : null}
      </div>
    </form>
  );
}

/** A browser push subscription made while signed out gets linked to the account (reply alerts). */
async function linkPushToAccount() {
  try {
    const { currentSubscription, loadTopics, saveTopics } = await import("@/lib/push/client");
    const sub = await currentSubscription();
    if (!sub) return;
    const topics = await loadTopics();
    if (topics) await saveTopics(sub, topics);
  } catch {
    // optional
  }
}
