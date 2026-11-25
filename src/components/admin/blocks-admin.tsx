import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { adminListBlocks, adminRemoveBlock, type ListingBlockRow } from "@/lib/admin/blocks";
import { tr } from "@/lib/i18n/core";

/** Personal seller hides. Removing a row shows that seller's ads to the member again. */
export function BlocksAdmin() {
  const [items, setItems] = useState<ListingBlockRow[] | null>(null);
  const [q, setQ] = useState("");
  const [pending, setPending] = useState<ListingBlockRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminListBlocks()
      .then((r) => setItems(r.authed ? r.items : []))
      .catch(() => setItems([]));
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (!items) return <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>;
  const needle = q.trim();
  const shown = needle
    ? items.filter((r) => `${r.blockerName} ${r.blockedName}`.includes(needle))
    : items;

  const remove = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      const res = await adminRemoveBlock({ data: { blockerId: pending.blockerId, blockedId: pending.blockedId } });
      if (!res.ok) {
        toast.error(tr("تعذّر إلغاء الحظر."));
        return;
      }
      toast.success(tr("أُلغي الحظر. إعلانات البائع ستظهر لهذا العضو من جديد."));
      setPending(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-line bg-paper p-4">
        <h2 className="text-base font-extrabold">{tr("حظر البائعين في الحراج")}</h2>
        <p className="mt-1 text-sm font-semibold text-muted">
          {tr("عندما يخفي عضو إعلانات بائع، لا يراها هو فقط. هنا يمكنك إلغاء ذلك الحظر.")}
        </p>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tr("ابحث باسم العضو أو البائع…")}
          className="field mt-3 max-w-sm"
        />
      </div>
      {shown.length === 0 ? (
        <p className="stamp p-4 font-semibold">{tr("لا يوجد حظر مسجّل.")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {shown.map((row) => (
            <li key={`${row.blockerId}:${row.blockedId}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper p-3">
              <div className="min-w-0">
                <p className="font-bold">
                  {row.blockerName} <span className="font-semibold text-muted">{tr("أخفى إعلانات")}</span> {row.blockedName}
                </p>
                <p className="text-xs font-semibold text-muted">
                  {new Date(row.createdAt).toLocaleString("ar-u-nu-latn", { timeZone: "Asia/Jerusalem" })}
                </p>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setPending(row)}>
                {tr("إلغاء الحظر")}
              </button>
            </li>
          ))}
        </ul>
      )}
      {pending ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-paper p-4 shadow-xl">
            <p className="font-extrabold">{tr("إلغاء هذا الحظر؟")}</p>
            <p className="mt-1 text-sm font-semibold text-muted">
              {pending.blockerName} {tr("سيرى إعلانات")} {pending.blockedName} {tr("من جديد.")}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setPending(null)}>
                {tr("تراجع")}
              </button>
              <button type="button" className="btn" disabled={busy} onClick={() => void remove()}>
                {tr("تأكيد")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
