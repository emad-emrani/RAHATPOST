import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  adminAlertAction,
  adminBoard,
  adminCreateAlert,
  adminDeleteShift,
  adminSaveShift,
  adminGetDutyVisible,
  adminSetDutyVisible,
} from "@/lib/board/api";
import type { CivicAlert, DutyShift, SavedPharmacy } from "@/lib/board/types";
import { adminPushStats, adminSendPush } from "@/lib/push/api";
import { PUSH_TOPICS, type PushTopic } from "@/lib/push/types";
import { adminListReports, adminResolveReport } from "@/lib/reports/api";
import { TARGET_LABEL, type ReportGroup } from "@/lib/reports/types";
import { tr, trv } from "@/lib/i18n/core";
import { adminGetSiteSettings, adminSaveSiteSettings } from "@/lib/site-settings/api";
import type { Announcement } from "@/lib/site-settings/types";

const DATETIME = new Intl.DateTimeFormat("ar-u-nu-latn", {
  timeZone: "Asia/Jerusalem",
  dateStyle: "medium",
  timeStyle: "short",
});
const fmt = (iso: string) => DATETIME.format(new Date(iso));

/** `datetime-local` value (browser local time) for a Date. */
function localInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function Field({
  label,
  name,
  ...rest
}: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block font-bold">
      {trv(label)}
      <input name={name} className="field mt-1" {...rest} />
    </label>
  );
}

function useBoard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof adminBoard>> | null>(null);
  const refresh = useCallback(async () => setData(await adminBoard()), []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { data, refresh };
}

/* ------------------------------------------------------------- duty pharmacy */

function DutyVisibleToggle() {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => {
    adminGetDutyVisible().then((r) => setOn(r.visible)).catch(() => setOn(true));
  }, []);
  return (
    <label className="stamp flex items-center justify-between gap-3 p-4 font-bold">
      <span>
        {tr("إظهار الصيدلية المناوبة في الموقع")}
        <span className="block text-xs font-semibold text-muted">{tr("في الصفحة الرئيسية وصفحة «اليوم».")}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        className="size-6 accent-[#FDB700]"
        disabled={on === null}
        checked={on ?? true}
        onChange={async (e) => {
          const v = e.target.checked;
          setOn(v);
          await adminSetDutyVisible({ data: { visible: v } });
        }}
      />
    </label>
  );
}

export function DutyAdmin() {
  const { data, refresh } = useBoard();
  const [form, setForm] = useState<SavedPharmacy>({
    name: "",
    address: "",
    phone: "",
    hours: "",
    mapUrl: "",
  });
  const [range, setRange] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (!data) return <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>;
  if (!data.authed)
    return <p className="stamp p-4 font-bold">{tr("انتهت الجلسة. سجّل الدخول من جديد.")}</p>;
  const set = (k: keyof SavedPharmacy) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const today = data.shifts.find((s) => s.startDate <= data.today && s.endDate >= data.today);

  return (
    <div className="flex flex-col gap-4">
      <DutyVisibleToggle />
      <section className="stamp p-4">
        <p className="text-sm font-bold text-muted">{tr("اليوم (")}{trv(data.today)})</p>
        <p className="text-xl font-bold">{today ? today.name : tr("لم يُحدَّث جدول اليوم")}</p>
        {today ? (
          <p className="font-semibold">
            {trv(today.address)} · {trv(today.hours)}
          </p>
        ) : null}
      </section>

      <form
        className="stamp flex flex-col gap-3 p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const f = new FormData(event.currentTarget);
          const startDate = String(f.get("startDate") ?? "");
          setBusy(true);
          setMessage("");
          try {
            const res = await adminSaveShift({
              data: {
                duty: {
                  ...form,
                  startDate,
                  endDate: range ? String(f.get("endDate") ?? startDate) : startDate,
                },
                notify: f.get("notify") === "on",
              },
            });
            if (res.ok) {
              setMessage(tr("حُفظت المناوبة.{0}", res.push ? ` الإشعار: ${res.push}` : ""));
              setForm({ name: "", address: "", phone: "", hours: "", mapUrl: "" });
              await refresh();
            } else setMessage(res.message ?? tr("تعذّر الحفظ."));
          } catch {
            setMessage(tr("تعذّر الحفظ."));
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 className="text-xl font-bold">{tr("إضافة مناوبة")}</h2>
        {data.saved.length > 0 ? (
          <div>
            <p className="mb-1 font-bold">{tr("صيدليات سابقة")}</p>
            <div className="flex flex-wrap gap-2">
              {data.saved.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  className="chip min-h-10"
                  onClick={() => setForm(p)}
                >
                  {trv(p.name)}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Field
            label={range ? tr("من تاريخ") : tr("التاريخ")}
            name="startDate"
            type="date"
            required
            defaultValue={data.today}
          />
          {range ? (
            <Field
              label={tr("إلى تاريخ")}
              name="endDate"
              type="date"
              required
              defaultValue={data.today}
            />
          ) : (
            <span />
          )}
        </div>
        <label className="flex items-center gap-2 font-semibold">
          <input
            type="checkbox"
            className="size-5"
            checked={range}
            onChange={(e) => setRange(e.target.checked)}
          />
          {tr("عدة أيام (نطاق تواريخ)")}
        </label>
        <Field
          label={tr("اسم الصيدلية")}
          name="name"
          required
          maxLength={80}
          value={form.name}
          onChange={set("name")}
        />
        <Field
          label={tr("الحي أو العنوان")}
          name="address"
          required
          maxLength={120}
          value={form.address}
          onChange={set("address")}
        />
        <div className="grid grid-cols-2 gap-2">
          <Field
            label={tr("الهاتف")}
            name="phone"
            required
            inputMode="tel"
            dir="ltr"
            maxLength={16}
            value={form.phone}
            onChange={set("phone")}
          />
          <Field
            label={tr("الساعات")}
            name="hours"
            required
            maxLength={60}
            placeholder={tr("حتى 23:00")}
            value={form.hours}
            onChange={set("hours")}
          />
        </div>
        <Field
          label={tr("رابط الخريطة (اختياري)")}
          name="mapUrl"
          type="url"
          dir="ltr"
          maxLength={500}
          placeholder="https://maps.google.com/…"
          value={form.mapUrl}
          onChange={set("mapUrl")}
        />
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" name="notify" className="size-5" />
          {tr("أرسل إشعار «صيدلية المناوبة» (إذا كانت تشمل اليوم)")}
        </label>
        {message ? (
          <p className="font-bold" role="status">
            {trv(message)}
          </p>
        ) : null}
        <button type="submit" className="btn" disabled={busy}>
          {tr("حفظ المناوبة")}
        </button>
      </form>

      <section>
        <h2 className="mb-2 text-lg font-bold">{tr("المناوبات")}</h2>
        {data.shifts.length === 0 ? (
          <p className="stamp p-4 font-semibold">{tr("لا مناوبات مسجلة.")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.shifts.map((s: DutyShift) => (
              <li key={s.id} className="stamp flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="font-bold">{trv(s.name)}</p>
                  <p className="text-sm font-semibold text-muted" dir="ltr">
                    {s.startDate === s.endDate ? s.startDate : `${s.startDate} → ${s.endDate}`}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost px-4"
                  onClick={async () => {
                    if (!confirm(tr("حذف هذه المناوبة؟"))) return;
                    await adminDeleteShift({ data: { id: s.id } });
                    await refresh();
                  }}
                >
                  {tr("حذف")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------- site announcement */

export function AnnounceBarAdmin() {
  const [bar, setBar] = useState<Announcement | null>(null);
  const [base, setBase] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    adminGetSiteSettings()
      .then((r) => {
        if (!r.authed || !r.settings) {
          setMsg(tr("هذا القسم لمالك الموقع فقط."));
          return;
        }
        setBase(r.settings);
        setBar(r.settings.announce);
      })
      .catch(() => setMsg(tr("تعذّر التحميل.")));
  }, []);
  if (!bar || !base) return <p className="stamp p-4 font-semibold">{msg || tr("جاري التحميل…")}</p>;
  const save = async (next: Announcement) => {
    setBusy(true);
    setMsg("");
    try {
      const res = await adminSaveSiteSettings({
        data: { ...base, announce: { ...next, rev: String(Date.now()) } },
      });
      if (res.ok && res.settings) {
        setBase(res.settings);
        setBar(res.settings.announce);
        setMsg(tr("تم الحفظ. الشريط يظهر تحت ترويسة الموقع."));
      } else setMsg(res.message ?? tr("تعذّر الحفظ."));
    } catch {
      setMsg(tr("تعذّر الحفظ."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      className="stamp flex flex-col gap-3 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void save(bar);
      }}
    >
      <h2 className="text-xl font-bold">{tr("شريط أعلى الموقع")}</h2>
      <p className="text-sm font-semibold text-muted">{tr("يظهر تحت الشعار في كل الصفحات، أو في صفحات الباصات فقط. الزائر يستطيع إغلاقه إلى أن تغيّر النص.")}</p>
      <label className="flex items-center justify-between gap-3 font-bold">
        {tr("إظهار الشريط")}
        <input type="checkbox" className="size-6 accent-[#FDB700]" checked={bar.enabled} onChange={(e) => setBar({ ...bar, enabled: e.target.checked })} />
      </label>
      <label className="text-sm font-bold">
        {tr("النص")}
        <input className="field mt-1" maxLength={180} value={bar.text} onChange={(e) => setBar({ ...bar, text: e.target.value })} />
      </label>
      <label className="text-sm font-bold">
        {tr("رابط اختياري")}
        <input className="field mt-1" dir="ltr" placeholder="/today أو https://" value={bar.link} onChange={(e) => setBar({ ...bar, link: e.target.value })} />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm font-bold">
          {tr("الأسلوب")}
          <select className="field mt-1" value={bar.kind} onChange={(e) => setBar({ ...bar, kind: e.target.value as Announcement["kind"] })}>
            <option value="info">{tr("عادي")}</option>
            <option value="warning">{tr("تنبيه")}</option>
            <option value="urgent">{tr("عاجل")}</option>
          </select>
        </label>
        <label className="text-sm font-bold">
          {tr("أين يظهر")}
          <select className="field mt-1" value={bar.scope} onChange={(e) => setBar({ ...bar, scope: e.target.value as Announcement["scope"] })}>
            <option value="all">{tr("كل الصفحات")}</option>
            <option value="buses">{tr("صفحات الباصات فقط")}</option>
          </select>
        </label>
      </div>
      <button type="submit" className="btn" disabled={busy}>{tr("حفظ الشريط")}</button>
      {msg ? <p className="text-sm font-semibold">{msg}</p> : null}
    </form>
  );
}

/* ------------------------------------------------------------- alerts */

export function AlertsAdmin() {
  const { data, refresh } = useBoard();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (!data) return <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>;
  if (!data.authed)
    return <p className="stamp p-4 font-bold">{tr("انتهت الجلسة. سجّل الدخول من جديد.")}</p>;
  const now = new Date();
  const later = new Date(now.getTime() + 6 * 60 * 60_000);
  const isActive = (a: CivicAlert) =>
    Date.parse(a.startsAt) <= Date.now() && Date.parse(a.endsAt) > Date.now();

  return (
    <div className="flex flex-col gap-4">
      <form
        className="stamp flex flex-col gap-3 p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const formEl = event.currentTarget;
          const f = new FormData(formEl);
          const toIso = (v: FormDataEntryValue | null) => {
            const t = new Date(String(v ?? ""));
            return Number.isNaN(t.getTime()) ? "" : t.toISOString();
          };
          setBusy(true);
          setMessage("");
          try {
            const res = await adminCreateAlert({
              data: {
                alert: {
                  title: String(f.get("title") ?? ""),
                  body: String(f.get("body") ?? ""),
                  severity: f.get("severity") === "urgent" ? "urgent" : "civic",
                  link: String(f.get("link") ?? ""),
                  startsAt: toIso(f.get("startsAt")),
                  endsAt: toIso(f.get("endsAt")),
                },
                push: f.get("push") === "on",
              },
            });
            if (res.ok) {
              setMessage(tr("نُشر التنبيه.{0}", res.push ? ` الإشعار: ${res.push}` : ""));
              formEl.reset();
              await refresh();
            } else setMessage(res.message ?? tr("تعذّر النشر."));
          } catch {
            setMessage(tr("تعذّر النشر."));
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 className="text-xl font-bold">{tr("تنبيه جديد")}</h2>
        <Field
          label={tr("العنوان")}
          name="title"
          required
          maxLength={100}
          placeholder={tr("انقطاع المياه في حي 10")}
        />
        <label className="block font-bold">
          {tr("النص")}
          <textarea name="body" required maxLength={600} rows={3} className="field mt-1" />
        </label>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-1 font-bold">{tr("النوع")}</legend>
          <label className="chip min-h-12 justify-center gap-2">
            <input type="radio" name="severity" value="civic" defaultChecked className="size-5" />
            {tr("تنبيه بلدي")}
          </label>
          <label className="chip min-h-12 justify-center gap-2">
            <input type="radio" name="severity" value="urgent" className="size-5" />
            {tr("عاجل")}
          </label>
        </fieldset>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field
            label={tr("يبدأ")}
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={localInput(now)}
          />
          <Field
            label={tr("ينتهي")}
            name="endsAt"
            type="datetime-local"
            required
            defaultValue={localInput(later)}
          />
        </div>
        <Field
          label={tr("رابط (اختياري)")}
          name="link"
          type="url"
          dir="ltr"
          maxLength={500}
          placeholder="https://…"
        />
        <label className="flex items-center gap-2 font-semibold">
          <input type="checkbox" name="push" defaultChecked className="size-5" />
          {tr("أرسل إشعار «تنبيهات عاجلة» للمشتركين")}
        </label>
        {message ? (
          <p className="font-bold" role="status">
            {trv(message)}
          </p>
        ) : null}
        <button type="submit" className="btn" disabled={busy}>
          {tr("نشر التنبيه")}
        </button>
      </form>

      <section>
        <h2 className="mb-2 text-lg font-bold">{tr("التنبيهات")}</h2>
        {data.alerts.length === 0 ? (
          <p className="stamp p-4 font-semibold">{tr("لا تنبيهات.")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.alerts.map((a) => (
              <li
                key={a.id}
                className={a.severity === "urgent" ? "alert-card p-4" : "alert-card-civic p-4"}
              >
                <p className="chip w-fit">
                  {isActive(a) ? tr("نشط") : Date.parse(a.endsAt) <= Date.now() ? tr("منتهٍ") : tr("مجدول")}
                  {a.pushedAt ? tr(" · أُرسل إشعار") : ""}
                </p>
                <p className="mt-1 text-lg font-bold">{trv(a.title)}</p>
                <p className="text-sm font-semibold">
                  {fmt(a.startsAt)} ← {fmt(a.endsAt)}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {Date.parse(a.endsAt) > Date.now() ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={async () => {
                        await adminAlertAction({ data: { id: a.id, action: "end" } });
                        await refresh();
                      }}
                    >
                      {tr("إنهاء الآن")}
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={async () => {
                      if (!confirm(tr("حذف التنبيه نهائياً؟"))) return;
                      await adminAlertAction({ data: { id: a.id, action: "delete" } });
                      await refresh();
                    }}
                  >
                    {tr("حذف")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------- reports */

const TARGET_STATUS: Record<string, string> = {
  approved: "منشور",
  pending: "مخفي (بانتظار المراجعة)",
  rejected: "مرفوض",
};

export function ReportsAdmin() {
  const [data, setData] = useState<{ authed: boolean; ok: boolean; groups: ReportGroup[] } | null>(
    null,
  );
  const [busy, setBusy] = useState("");
  const refresh = useCallback(async () => setData(await adminListReports()), []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  if (!data) return <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>;
  if (!data.authed)
    return <p className="stamp p-4 font-bold">{tr("انتهت الجلسة. سجّل الدخول من جديد.")}</p>;
  if (!data.ok) return <p className="stamp p-4 font-bold">{tr("تعذّر تحميل البلاغات.")}</p>;
  if (data.groups.length === 0)
    return <p className="stamp p-4 font-semibold">{tr("لا بلاغات بانتظار المراجعة.")}</p>;

  const act = async (g: ReportGroup, action: "hide" | "delete" | "dismiss") => {
    if (action === "delete" && !confirm(tr("حذف المنشور نهائياً؟"))) return;
    const key = `${g.targetType}:${g.targetId}`;
    setBusy(key);
    try {
      await adminResolveReport({ data: { type: g.targetType, id: g.targetId, action } });
      await refresh();
    } finally {
      setBusy("");
    }
  };

  return (
    <ul className="flex flex-col gap-3">
      {data.groups.map((g) => {
        const key = `${g.targetType}:${g.targetId}`;
        return (
          <li key={key} className="stamp p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip">{trv(TARGET_LABEL[g.targetType])}</span>
              <span className="chip chip-alert">{trv(g.count)} {tr("بلاغ")}</span>
              {g.target ? (
                <span className="chip">{TARGET_STATUS[g.target.status] ?? g.target.status}</span>
              ) : null}
            </div>
            {g.target ? (
              <>
                <h2 className="mt-2 text-xl font-bold">{trv(g.target.title)}</h2>
                <p className="mt-1 line-clamp-3">{trv(g.target.excerpt)}</p>
                {g.target.status === "approved" ? (
                  <a href={g.target.url} className="mt-1 inline-block text-sm font-bold underline">
                    {tr("فتح المنشور")}
                  </a>
                ) : null}
              </>
            ) : (
              <p className="mt-2 font-semibold text-muted">{tr("المنشور لم يعد موجوداً.")}</p>
            )}
            <ul className="mt-3 flex flex-col gap-1 rounded-xl bg-surface p-3 text-sm">
              {g.reports.map((r) => (
                <li key={r.id}>
                  <b>{trv(r.reason)}</b>
                  {r.note ? ` — ${r.note}` : ""}
                  <span className="text-muted"> · {fmt(r.createdAt)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                type="button"
                className="btn"
                disabled={busy === key || !g.target}
                onClick={() => act(g, "hide")}
              >
                {tr("إخفاء")}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy === key || !g.target}
                onClick={() => act(g, "delete")}
              >
                {tr("حذف")}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={busy === key}
                onClick={() => act(g, "dismiss")}
              >
                {tr("تجاهل")}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------- push */

export function PushAdmin() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminPushStats>> | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => setStats(await adminPushStats()), []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  if (!stats) return <p className="stamp p-4 font-semibold">{tr("جاري التحميل…")}</p>;
  if (!stats.authed)
    return <p className="stamp p-4 font-bold">{tr("انتهت الجلسة. سجّل الدخول من جديد.")}</p>;

  return (
    <div className="flex flex-col gap-4">
      <section className="stamp p-4">
        <h2 className="text-xl font-bold">{tr("المشتركون")}</h2>
        {!stats.configured ? (
          <p className="mt-1 font-bold">
            {tr("مفاتيح VAPID غير مضبوطة على الخادم، لذلك لا يمكن الإرسال.")}
          </p>
        ) : null}
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <p className="rounded-xl bg-surface p-3 text-center font-bold">
            {tr("الكل")}
            <span className="block text-2xl">{stats.counts?.total ?? 0}</span>
          </p>
          {PUSH_TOPICS.map((t) => (
            <p key={t.key} className="rounded-xl bg-surface p-3 text-center font-bold">
              {trv(t.label)}
              <span className="block text-2xl">{stats.counts?.[t.key] ?? 0}</span>
            </p>
          ))}
        </div>
      </section>
      <form
        className="stamp flex flex-col gap-3 p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const formEl = event.currentTarget;
          const f = new FormData(formEl);
          if (!confirm(tr("إرسال الإشعار الآن لكل المشتركين في هذا الموضوع؟"))) return;
          setBusy(true);
          setMessage("");
          try {
            const res = await adminSendPush({
              data: {
                topic: String(f.get("topic")) as PushTopic,
                title: String(f.get("title") ?? ""),
                body: String(f.get("body") ?? ""),
                url: String(f.get("url") ?? "/"),
              },
            });
            setMessage(
              res.ok
                ? tr("أُرسل إلى {0} جهاز{1}{2}.", res.sent, res.removed ? `، وحُذف ${res.removed} اشتراك منتهٍ` : "", res.failed ? `، وفشل ${res.failed}` : "")
                : (res.message ?? tr("تعذّر الإرسال.")),
            );
            if (res.ok) formEl.reset();
            await refresh();
          } catch (error) {
            setMessage(
              error instanceof Error && /[\u0600-\u06ff]/.test(error.message)
                ? error.message
                : tr("تعذّر الإرسال."),
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 className="text-xl font-bold">{tr("إرسال إشعار")}</h2>
        <label className="block font-bold">
          {tr("الموضوع")}
          <select name="topic" className="field mt-1" defaultValue="alerts">
            {PUSH_TOPICS.filter((t) => !t.personal).map((t) => (
              <option key={t.key} value={t.key}>
                {trv(t.label)}
              </option>
            ))}
          </select>
        </label>
        <Field label={tr("العنوان")} name="title" required maxLength={80} />
        <label className="block font-bold">
          {tr("النص")}
          <textarea name="body" required maxLength={200} rows={2} className="field mt-1" />
        </label>
        <Field label={tr("يفتح الصفحة")} name="url" dir="ltr" maxLength={300} defaultValue="/today" />
        {message ? (
          <p className="font-bold" role="status">
            {trv(message)}
          </p>
        ) : null}
        <button type="submit" className="btn" disabled={busy || !stats.configured}>
          {tr("إرسال")}
        </button>
      </form>
    </div>
  );
}
