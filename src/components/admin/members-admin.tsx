import { useCallback, useEffect, useState } from "react";
import { adminListMembers, adminSetRole, type Member, type TeamRole } from "@/lib/team/api";

const ROLES: Record<TeamRole, string> = { moderator: "مشرف", writer: "كاتب" };

/** «الأعضاء والصلاحيات» (owner only): give signed-in members a team role. */
export function MembersAdmin() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Member[] | null>(null);
  const [msg, setMsg] = useState("");
  const [busyId, setBusyId] = useState("");

  const refresh = useCallback(async (query: string) => {
    const res = await adminListMembers({ data: { q: query } });
    setItems(res.items);
    setMsg(!res.authed ? "هذا القسم لمالك الموقع فقط." : res.ok ? "" : "تعذّر تحميل الأعضاء.");
  }, []);

  useEffect(() => {
    void refresh("");
  }, [refresh]);

  const setRole = async (m: Member, role: TeamRole | "") => {
    if (!role && !confirm(`إزالة صلاحية ${m.name}؟`)) return;
    setBusyId(m.id);
    try {
      const res = await adminSetRole({ data: { userId: m.id, role } });
      if (!res.ok) setMsg("تعذّر حفظ الصلاحية.");
      await refresh(q);
    } finally {
      setBusyId("");
    }
  };

  return (
    <>
      <div className="stamp mb-4 p-4 text-sm font-semibold text-muted">
        <p>
          <b className="text-ink">مشرف:</b> يدخل لوحة الإدارة بحساب Google ويراجع كل الأقسام وينشر
          الأخبار.
        </p>
        <p className="mt-1">
          <b className="text-ink">كاتب:</b> يدخل بحساب Google ويرى قسم «نشر خبر» فقط، ويعدّل ويحذف
          أخباره هو.
        </p>
        <p className="mt-1">العضو يجب أن يسجّل دخوله في الموقع مرة واحدة على الأقل ليظهر هنا.</p>
      </div>
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void refresh(q);
        }}
      >
        <input
          className="field"
          placeholder="ابحث بالاسم أو البريد"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="btn px-4">
          بحث
        </button>
      </form>
      {msg ? <p className="stamp mb-3 p-3 font-bold">{msg}</p> : null}
      {!items ? (
        <p className="stamp p-4 font-semibold">جاري التحميل…</p>
      ) : items.length === 0 ? (
        <p className="stamp p-4 font-semibold">لا أعضاء.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((m) => (
            <li key={m.id} className="stamp p-4">
              <div className="flex items-center gap-3">
                {m.image ? (
                  <img
                    src={m.image}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="size-10 shrink-0 rounded-full object-cover"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{m.name}</p>
                  <p className="truncate text-sm font-semibold text-muted" dir="ltr">
                    {m.email}
                  </p>
                </div>
                <span className={m.role ? "chip chip-ink" : "chip"}>
                  {m.role ? ROLES[m.role] : "عضو"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(Object.keys(ROLES) as TeamRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={m.role === r ? "btn" : "btn btn-ghost"}
                    disabled={busyId === m.id || m.role === r}
                    onClick={() => setRole(m, r)}
                  >
                    {ROLES[r]}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busyId === m.id || !m.role}
                  onClick={() => setRole(m, "")}
                >
                  إزالة
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
