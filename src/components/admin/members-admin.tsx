import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getLang, tr, trv } from "@/lib/i18n/core";
import {
  adminBlockMember,
  adminCancelInvite,
  adminGetAuthAdmin,
  adminInviteByEmail,
  adminListAllMembers,
  adminListInvites,
  adminSaveRoles,
  adminSetAuthMethods,
  adminSetRole,
  type AuthAdminData,
  type Invite,
} from "@/lib/team/api";
import { isPrivileged, PERMISSIONS, type MemberRole, type Permission } from "@/lib/team/roles";
import type { Member } from "@/lib/auth/settings.server";

const METHOD_LABEL: Record<string, string> = { google: "Google", facebook: "Facebook", credential: "بريد وكلمة مرور", apple: "Apple" };
const roleName = (r: MemberRole | undefined) => {
  if (!r) return "";
  const l = getLang();
  return l === "he" && r.nameHe ? r.nameHe : l === "en" && r.nameEn ? r.nameEn : trv(r.name);
};

/** «الأعضاء والصلاحيات» (owner only): sign-in methods, roles & permissions, members (role, block). */
export function MembersAdmin() {
  const [data, setData] = useState<AuthAdminData | null>(null);
  const [msg, setMsg] = useState("");
  const load = useCallback(async () => {
    const d = await adminGetAuthAdmin();
    if (!d.authed) setMsg(tr("هذا القسم لمالك الموقع فقط."));
    setData(d);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  if (!data) return <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>;
  if (!data.authed) return <p className="stamp p-4 font-bold">{msg}</p>;
  return (
    <div className="flex flex-col gap-5">
      <MethodsCard data={data} onSaved={load} />
      <p className="stamp p-3 text-sm font-semibold">
        {data.master
          ? tr("أنت adminmaster: وحدك تعدّل الأدوار والصلاحيات وتمنح دور المدير.")
          : data.canManageRoles
            ? tr("يمكنك تعيين الأدوار للأعضاء، عدا دور المدير وadminmaster.")
            : tr("تعديل الأدوار لـ adminmaster فقط. دخول كلمة مرور الإدارة له صلاحيات المدير دون تعديل الأدوار.")}
      </p>
      <RolesCard roles={data.roles} editable={data.master} onSaved={(roles) => setData({ ...data, roles })} />
      {data.canManageRoles ? <InviteByEmail roles={data.roles} master={data.master} /> : null}
      <MembersList roles={data.roles} canManage={data.canManageRoles} master={data.master} />
    </div>
  );
}

function MethodsCard({ data, onSaved }: { data: AuthAdminData; onSaved: () => void }) {
  const [m, setM] = useState(data.methods);
  const [msg, setMsg] = useState("");
  const row = (key: "google" | "facebook" | "email", label: string, note: string) => (
    <label className="flex items-start gap-3 rounded-xl bg-surface p-3">
      <input type="checkbox" className="mt-1 size-5" checked={m[key]} onChange={(e) => setM({ ...m, [key]: e.target.checked })} />
      <span>
        <span className="block font-bold">{label}</span>
        <span className="block text-sm font-semibold text-muted">{note}</span>
      </span>
    </label>
  );
  return (
    <section className="stamp flex flex-col gap-2 p-4">
      <h2 className="text-lg font-bold">{tr("طرق تسجيل الدخول للأعضاء")}</h2>
      <p className="text-sm font-semibold text-muted">{tr("دخولك أنت للوحة الإدارة يبقى بكلمة مرور الإدارة.")}</p>
      {row("google", "Google", data.configured.google ? tr("مفعّل في الخادم") : tr("غير مضبوط في الخادم (مفاتيح Google ناقصة)"))}
      {row("facebook", "Facebook", data.configured.facebook ? tr("مفعّل في الخادم") : tr("غير مضبوط في الخادم (مفاتيح Facebook ناقصة)"))}
      {row("email", tr("البريد وكلمة المرور"), data.configured.resetEmail ? tr("استعادة كلمة المرور بالبريد متاحة") : tr("بدون «نسيت كلمة المرور» حتى يُضبط مزوّد بريد (RESEND_API_KEY و STORE_EMAIL_FROM)"))}
      <button
        type="button"
        className="btn"
        onClick={async () => {
          const r = await adminSetAuthMethods({ data: m });
          setMsg(r.ok ? tr("تم الحفظ.") : tr("تعذّر الحفظ."));
          onSaved();
        }}
      >
        {tr("حفظ طرق الدخول")}
      </button>
      {msg ? <p className="text-sm font-bold" role="status">{msg}</p> : null}
    </section>
  );
}

function RolesCard({ roles: initial, editable, onSaved }: { roles: MemberRole[]; editable: boolean; onSaved: (r: MemberRole[]) => void }) {
  const [roles, setRoles] = useState(initial);
  const [open, setOpen] = useState("");
  const [msg, setMsg] = useState("");
  const patch = (key: string, p: Partial<MemberRole>) => setRoles(roles.map((r) => (r.key === key ? { ...r, ...p } : r)));
  return (
    <section className="stamp flex flex-col gap-2 p-4">
      <h2 className="text-lg font-bold">{tr("الأدوار والصلاحيات")}</h2>
      <p className="text-sm font-semibold text-muted">{tr("الموثّق تُنشر إعلاناته بلا مراجعة مع شارة. المشرف يدخل /admin بحسابه ويرى أقسام المراجعة فقط. المدير له كل الصلاحيات.")}</p>
      {roles.map((r) => (
        <div key={r.key} className="rounded-xl bg-surface p-3">
          <button type="button" className="flex w-full items-center gap-2 text-start" onClick={() => setOpen(open === r.key ? "" : r.key)} aria-expanded={open === r.key}>
            <span className="flex-1 font-bold">
              {roleName(r)} {r.badge ? <span className="chip chip-deep ms-1 text-xs">{trv(r.badge)}</span> : null}
            </span>
            <span className="text-xs font-semibold text-muted">{tr("{0} صلاحيات", r.perms.length)}</span>
            <ChevronDown className={`size-5 ${open === r.key ? "rotate-180" : ""}`} aria-hidden />
          </button>
          {open === r.key ? (
            <fieldset disabled={!editable} className="mt-3 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                {(["name", "nameHe", "nameEn", "badge"] as const).map((k) => (
                  <label key={k} className="block text-sm font-bold">
                    {k === "name" ? tr("الاسم (عربي)") : k === "nameHe" ? tr("الاسم (עברית)") : k === "nameEn" ? tr("الاسم (English)") : tr("نص الشارة (فارغ = بلا شارة)")}
                    <input className="field mt-1" value={r[k]} maxLength={k === "badge" ? 16 : 30} onChange={(e) => patch(r.key, { [k]: e.target.value })} />
                  </label>
                ))}
              </div>
              {r.key === "member" ? (
                <p className="text-sm font-semibold text-muted">{tr("الدور الافتراضي لكل عضو، بلا صلاحيات إضافية.")}</p>
              ) : (
                <div className="grid gap-1 sm:grid-cols-2">
                  {(Object.keys(PERMISSIONS) as Permission[]).map((p) => (
                    <label key={p} className="flex items-center gap-2 text-sm font-semibold">
                      <input
                        type="checkbox"
                        className="size-5"
                        checked={r.perms.includes(p)}
                        onChange={(e) => patch(r.key, { perms: e.target.checked ? [...r.perms, p] : r.perms.filter((x) => x !== p) })}
                      />
                      {trv(PERMISSIONS[p])}
                    </label>
                  ))}
                </div>
              )}
              {!r.builtin ? (
                <button type="button" className="btn btn-ghost text-red-700" onClick={() => confirm(tr("حذف الدور؟ أصحابه يعودون «عضو».")) && setRoles(roles.filter((x) => x.key !== r.key))}>
                  <Trash2 className="size-4" aria-hidden /> {tr("حذف الدور")}
                </button>
              ) : null}
            </fieldset>
          ) : null}
        </div>
      ))}
      <div className={editable ? "flex gap-2" : "hidden"}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            const name = prompt(tr("اسم الدور الجديد"))?.trim();
            if (!name) return;
            const key = `r${Date.now().toString(36)}`;
            setRoles([...roles, { key, name, nameHe: "", nameEn: "", badge: "", perms: [], builtin: false }]);
            setOpen(key);
          }}
        >
          <Plus className="size-4" aria-hidden /> {tr("دور جديد")}
        </button>
        <button
          type="button"
          className="btn flex-1"
          onClick={async () => {
            const r = await adminSaveRoles({ data: { roles } });
            if (r.ok) {
              setRoles(r.roles);
              onSaved(r.roles);
            }
            setMsg(r.ok ? tr("تم الحفظ.") : tr("تعذّر الحفظ."));
          }}
        >
          {tr("حفظ الأدوار")}
        </button>
      </div>
      {msg ? <p className="text-sm font-bold" role="status">{msg}</p> : null}
    </section>
  );
}

function MembersList({ roles, canManage, master }: { roles: MemberRole[]; canManage: boolean; master: boolean }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Member[] | null>(null);
  const [busy, setBusy] = useState("");
  const refresh = useCallback(async (query: string) => setItems((await adminListAllMembers({ data: { q: query } })).items), []);
  useEffect(() => {
    void refresh("");
  }, [refresh]);
  const run = async (id: string, fn: () => Promise<unknown>) => {
    setBusy(id);
    try {
      await fn();
      await refresh(q);
    } finally {
      setBusy("");
    }
  };
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-bold">{tr("الأعضاء")}</h2>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void refresh(q); }}>
        <input className="field flex-1" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("ابحث بالاسم أو البريد")} />
        <button className="btn">{tr("بحث")}</button>
      </form>
      {items === null ? (
        <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>
      ) : !items.length ? (
        <p className="stamp p-4 font-semibold">{tr("لا أعضاء.")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((m) => (
            <li key={m.id} className={`stamp p-3 ${m.blocked ? "opacity-70" : ""}`}>
              <div className="flex items-center gap-3">
                {m.image ? <img src={m.image} alt="" className="size-10 rounded-full object-cover" referrerPolicy="no-referrer" /> : <span className="grid size-10 place-items-center rounded-full bg-surface font-bold">{m.name.slice(0, 1)}</span>}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">
                    {m.name} {m.blocked ? <span className="chip ms-1 text-xs text-red-700">{tr("محظور")}</span> : null}
                  </p>
                  <p className="truncate text-sm font-semibold text-muted" dir="ltr">{m.email}</p>
                  <p className="text-xs font-semibold text-muted">
                    {m.methods.map((x) => trv(METHOD_LABEL[x] ?? x)).join("، ") || "—"} · {tr("انضم {0}", new Date(m.joined).toLocaleDateString("en-GB"))}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <select
                  className="field flex-1"
                  value={m.role}
                  disabled={busy === m.id || !canManage || m.role === "adminmaster" || (!master && isPrivileged(roles.find((r) => r.key === m.role)))}
                  aria-label={tr("الدور")}
                  onChange={(e) => run(m.id, () => adminSetRole({ data: { userId: m.id, role: e.target.value === "member" ? "" : e.target.value } }))}
                >
                  {m.role === "adminmaster" ? <option value="adminmaster">adminmaster</option> : null}
                  {roles.map((r) => <option key={r.key} value={r.key} disabled={!master && isPrivileged(r)}>{roleName(r)}</option>)}
                </select>
                <button
                  type="button"
                  className={m.blocked ? "btn" : "btn btn-ghost text-red-700"}
                  disabled={busy === m.id || m.role === "adminmaster"}
                  onClick={() => (m.blocked || confirm(tr("حظر {0}؟ يُسجَّل خروجه فوراً ولا يستطيع الدخول.", m.name))) && run(m.id, () => adminBlockMember({ data: { userId: m.id, blocked: !m.blocked } }))}
                >
                  {m.blocked ? tr("إلغاء الحظر") : tr("حظر")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function InviteByEmail({ roles, master }: { roles: MemberRole[]; master: boolean }) {
  const choices = roles.filter((r) => r.key !== "member" && (master || !isPrivileged(r)));
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(choices[0]?.key ?? "moderator");
  const [msg, setMsg] = useState("");
  const [invites, setInvites] = useState<Invite[]>([]);
  const load = useCallback(async () => setInvites((await adminListInvites()).items), []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <section className="stamp flex flex-col gap-2 p-4">
      <h2 className="text-lg font-bold">{tr("إضافة عضو بالبريد")}</h2>
      <p className="text-sm font-semibold text-muted">{tr("إن لم يكن مسجّلاً بعد، تُحفظ الدعوة وتُفعَّل عند دخوله بـ Google أو Facebook بنفس البريد (البريد يجب أن يكون موثّقاً).")}</p>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await adminInviteByEmail({ data: { email, role } });
          setMsg(r.ok ? (r.result === "assigned" ? tr("تم منح الدور للعضو الموجود.") : tr("حُفظت الدعوة.")) : trv(r.error ?? "تعذّر الحفظ."));
          if (r.ok) setEmail("");
          void load();
        }}
      >
        <input className="field min-w-48 flex-1" type="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
        <select className="field w-auto" value={role} onChange={(e) => setRole(e.target.value)} aria-label={tr("الدور")}>
          {choices.map((r) => <option key={r.key} value={r.key}>{roleName(r)}</option>)}
        </select>
        <button className="btn">{tr("إضافة")}</button>
      </form>
      {msg ? <p className="text-sm font-bold" role="status">{msg}</p> : null}
      {invites.length ? (
        <ul className="flex flex-col gap-1 text-sm">
          {invites.map((i) => (
            <li key={i.email} className="flex items-center gap-2">
              <span className="flex-1 truncate" dir="ltr">{i.email}</span>
              <span className="chip">{roleName(roles.find((r) => r.key === i.role))}</span>
              <button type="button" className="btn btn-ghost px-2" aria-label={tr("إلغاء الدعوة")} onClick={async () => { await adminCancelInvite({ data: { email: i.email } }); void load(); }}>
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
