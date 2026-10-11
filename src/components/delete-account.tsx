import { Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/sheet";
import { deleteMyAccount } from "@/lib/account/api";

/** «حذف حسابي»: confirm sheet (type «حذف») → deletes the account and everything posted. */
export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (window.location.hash === "#delete-account")
      ref.current?.scrollIntoView({ block: "center" });
  }, []);
  return (
    <section ref={ref} id="delete-account" className="stamp mt-8 p-4">
      <h2 className="text-lg font-bold">حذف حسابي</h2>
      <p className="mt-1 font-semibold text-muted">
        يحذف حسابك وكل ما نشرته: الإعلانات، أخبار القراء، طلبات الدليل (حتى الموافَق عليها)
        واشتراكات الإشعارات. لا يمكن التراجع.{" "}
        <Link to="/privacy" className="font-bold underline">
          سياسة الخصوصية
        </Link>
      </p>
      <button type="button" className="btn btn-ghost mt-3 w-full" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" aria-hidden />
        حذف حسابي
      </button>
      {open ? (
        <Sheet title="حذف الحساب نهائياً؟" onClose={() => setOpen(false)}>
          <form
            className="flex flex-col gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError("");
              try {
                const res = await deleteMyAccount({ data: { confirm: text.trim() } });
                if (res.ok) window.location.href = "/?account=deleted";
                else setError(res.message ?? "تعذّر حذف الحساب.");
              } catch {
                setError("تعذّر حذف الحساب. حاول مرة أخرى.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="font-semibold">
              سيُحذف حسابك وجميع منشوراتك فوراً، وتُسجَّل خارجاً من كل الأجهزة. للتأكيد اكتب كلمة{" "}
              <b>حذف</b>:
            </p>
            <input
              className="field"
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="اكتب حذف للتأكيد"
              autoComplete="off"
            />
            {error ? (
              <p role="alert" className="font-bold">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              className="btn alert-card w-full"
              disabled={busy || text.trim() !== "حذف"}
            >
              {busy ? "جاري الحذف…" : "احذف حسابي نهائياً"}
            </button>
            <button type="button" className="btn btn-ghost w-full" onClick={() => setOpen(false)}>
              إلغاء
            </button>
          </form>
        </Sheet>
      ) : null}
    </section>
  );
}
