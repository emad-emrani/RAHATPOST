import { useCallback, useEffect, useState } from "react";
import {
  adminCancelInvite,
  adminInviteByEmail,
  adminListInvites,
  adminListMembers,
  adminSetRole,
  type Invite,
  type Member,
  type TeamRole,
} from "@/lib/team/api";

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
        <p className="mt-1">
          يمكنك إضافة عضو ببريده مباشرة: إن لم يكن مسجّلاً بعد، تُحفظ الدعوة وتُفعَّل تلقائياً عند
          دخوله بحساب Google بنفس البريد.
        </p>
      </div>
      <InviteByEmail onDone={() => void refresh(q)} />
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

function InviteByEmail({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("writer");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await adminListInvites();
    setInvites(r.items);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setBusy(true);
    setMsg("");
    try {
      const r = await adminInviteByEmail({ data: { email, role } });
      if (!r.ok) setMsg(r.error ?? "تعذّر الحفظ.");
      else {
        setMsg(
          r.result === "assigned"
            ? `تم منح صلاحية «${ROLES[role]}» للعضو الموجود.`
            : `حُفظت الدعوة. ستُفعَّل «${ROLES[role]}» عند دخول ${email.trim()} بحساب Google.`,
        );
        setEmail("");
        onDone();
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stamp mb-4 p-4">
      <h3 className="mb-2 font-black">إضافة بالبريد الإلكتروني</h3>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <input
          className="field min-w-0 flex-1 basis-56"
          type="email"
          dir="ltr"
          required
          maxLength={254}
          placeholder="name@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select
          className="field w-auto"
          value={role}
          onChange={(e) => setRole(e.target.value as TeamRole)}
        >
          <option value="writer">كاتب</option>
          <option value="moderator">مشرف</option>
        </select>
        <button className="btn" disabled={busy}>
          {busy ? "…" : "إضافة"}
        </button>
      </form>
      {msg ? (
        <p className="mt-2 text-sm font-bold" role="status">
          {msg}
        </p>
      ) : null}
      {invites.length ? (
        <div className="mt-3">
          <p className="mb-1 text-sm font-bold text-muted">دعوات بانتظار تسجيل الدخول</p>
          <ul className="flex flex-col gap-1.5">
            {invites.map((i) => (
              <li
                key={i.email}
                className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm font-semibold"
              >
                <span className="min-w-0 flex-1 truncate" dir="ltr">
                  {i.email}
                </span>
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold">
                  {ROLES[i.role]}
                </span>
                <button
                  type="button"
                  className="text-xs font-bold text-red-700 underline"
                  onClick={async () => {
                    if (!confirm(`إلغاء دعوة ${i.email}؟`)) return;
                    await adminCancelInvite({ data: { email: i.email } });
                    await load();
                  }}
                >
                  إلغاء
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
