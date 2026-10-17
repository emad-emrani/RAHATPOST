import { useCallback, useEffect, useState } from "react";
import {
  adminBlockCommenter,
  adminCommentAction,
  adminListComments,
  adminSetPremod,
} from "@/lib/comments/api";
import { STATUS_LABEL, type AdminComment, type AdminCommentFilter } from "@/lib/comments/types";
import { tr, trv } from "@/lib/i18n/core";

const FILTERS: [AdminCommentFilter, string][] = [
  ["all", "الكل"],
  ["reported", "مُبلّغ عنها"],
  ["hidden", "مخفية"],
  ["pending", "بانتظار الموافقة"],
];

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("ar", {
    timeZone: "Asia/Jerusalem",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

type Data = Awaited<ReturnType<typeof adminListComments>>;

/** «التعليقات» admin tab: latest comments, filters, hide/restore/delete, block, pre-moderation. */
export function CommentsAdmin() {
  const [filter, setFilter] = useState<AdminCommentFilter>("all");
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setData(await adminListComments({ data: { filter } }).catch(() => null));
  }, [filter]);
  useEffect(() => {
    void load();
  }, [load]);

  if (!data) return <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>;
  if (!data.authed)
    return <p className="stamp p-4 font-bold">{tr("انتهت الجلسة. سجّل الدخول من جديد.")}</p>;

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
      await load();
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="stamp flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="font-bold">{tr("المراجعة المسبقة")}</p>
          <p className="text-sm font-semibold text-muted">
            {data.premod
              ? tr("مفعّلة: التعليقات الجديدة لا تظهر إلا بعد موافقتك.")
              : tr("متوقفة: التعليقات تُنشر فوراً (مع الفلتر والبلاغات).")}
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 font-bold">
          <input
            type="checkbox"
            role="switch"
            className="size-6 accent-[var(--color-ink)]"
            checked={data.premod}
            disabled={busy === "premod"}
            onChange={(e) =>
              act("premod", () => adminSetPremod({ data: { on: e.target.checked } }))
            }
          />
          {data.premod ? tr("مفعّلة") : tr("متوقفة")}
        </label>
      </section>

      <div className="scroll-row flex gap-2" role="group" aria-label={tr("تصفية")}>
        {FILTERS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={filter === key}
            className={`chip min-h-10 shrink-0 ${filter === key ? "chip-ink" : ""}`}
            onClick={() => setFilter(key)}
          >
            {trv(label)} ({data.counts?.[key] ?? 0})
          </button>
        ))}
      </div>

      {!data.ok ? (
        <p className="stamp p-4 font-bold">{tr("تعذّر تحميل التعليقات.")}</p>
      ) : data.items.length === 0 ? (
        <p className="stamp p-4 font-semibold">{tr("لا تعليقات هنا.")}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.items.map((c: AdminComment) => (
            <li key={c.id} className="stamp p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={
                    c.status === "approved"
                      ? "chip"
                      : c.status === "hidden"
                        ? "chip chip-alert"
                        : "chip chip-deep"
                  }
                >
                  {trv(STATUS_LABEL[c.status])}
                </span>
                {c.reports > 0 ? (
                  <span className="chip chip-alert">{tr("بلاغات:")} {trv(c.reports)}</span>
                ) : null}
                {c.parentId ? <span className="chip">{tr("رد")}</span> : null}
                {c.userBlocked ? <span className="chip chip-ink">{tr("محظور")}</span> : null}
              </div>
              <p className="mt-2 whitespace-pre-line break-words text-lg" dir="auto">
                {trv(c.body)}
              </p>
              <p className="mt-1 text-sm font-semibold text-muted">
                {trv(c.userName)}
                {c.userEmail ? (
                  <>
                    {" "}
                    · <span dir="ltr">{trv(c.userEmail)}</span>
                  </>
                ) : null}{" "}
                · {fmt(c.createdAt)}
              </p>
              <a
                href={`/${c.articleKey}#c-${c.id}`}
                className="text-sm font-bold underline"
                target="_blank"
                rel="noopener"
              >
                {tr("فتح الخبر")}
              </a>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {c.status === "approved" ? (
                  <button
                    type="button"
                    className="btn"
                    disabled={busy === c.id}
                    onClick={() =>
                      act(c.id, () => adminCommentAction({ data: { id: c.id, action: "hide" } }))
                    }
                  >
                    {tr("إخفاء")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn"
                    disabled={busy === c.id}
                    onClick={() =>
                      act(c.id, () => adminCommentAction({ data: { id: c.id, action: "restore" } }))
                    }
                  >
                    {c.status === "pending" ? tr("موافقة ونشر") : tr("استعادة")}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy === c.id}
                  onClick={() => {
                    if (!confirm(tr("حذف التعليق نهائياً (مع الردود عليه)؟"))) return;
                    void act(c.id, () =>
                      adminCommentAction({ data: { id: c.id, action: "delete" } }),
                    );
                  }}
                >
                  {tr("حذف")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost col-span-2"
                  disabled={busy === c.id}
                  onClick={() => {
                    const block = !c.userBlocked;
                    if (
                      block &&
                      !confirm(tr("منع {0} من التعليق؟ تبقى تعليقاته السابقة كما هي.", c.userName))
                    )
                      return;
                    void act(c.id, () =>
                      adminBlockCommenter({ data: { userId: c.userId, blocked: block } }),
                    );
                  }}
                >
                  {c.userBlocked ? tr("إلغاء حظر التعليق") : tr("حظر المستخدم من التعليق")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
