import { createServerFn } from "@tanstack/react-start";
import { clean, cleanPhone, cleanUrl, PHONE_RE } from "@/lib/submit-guard";
import {
  DATE_RE,
  ID_RE,
  israelToday,
  type AlertInput,
  type Board,
  type CivicAlert,
  type DutyInput,
  type DutyShift,
  type SavedPharmacy,
} from "./types";

/** Today's duty pharmacy + active alerts for the home page and /today. Never throws. */
export const getBoard = createServerFn({ method: "GET" }).handler(async (): Promise<Board> => {
  const today = israelToday();
  const { dutyFor, activeAlerts } = await import("./store.server");
  const [duty, alerts] = await Promise.all([
    dutyFor(today).catch((error) => {
      console.error("[board] duty failed", error);
      return null;
    }),
    activeAlerts().catch((error) => {
      console.error("[board] alerts failed", error);
      return [] as CivicAlert[];
    }),
  ]);
  return { duty, alerts, today };
});

/* ------------------------------------------------------------- admin */

export const adminBoard = createServerFn({ method: "POST" }).handler(
  async (): Promise<{
    authed: boolean;
    ok: boolean;
    today: string;
    shifts: DutyShift[];
    saved: SavedPharmacy[];
    alerts: CivicAlert[];
  }> => {
    const today = israelToday();
    const { isAdmin } = await import("@/lib/admin-auth");
    if (!(await isAdmin()))
      return { authed: false, ok: true, today, shifts: [], saved: [], alerts: [] };
    try {
      const { listShifts, savedPharmacies, listAlerts } = await import("./store.server");
      const [shifts, saved, alerts] = await Promise.all([
        listShifts(today),
        savedPharmacies(),
        listAlerts(),
      ]);
      return { authed: true, ok: true, today, shifts, saved, alerts };
    } catch (error) {
      console.error("[admin] board failed", error);
      return { authed: true, ok: false, today, shifts: [], saved: [], alerts: [] };
    }
  },
);

function validDuty(input: DutyInput): DutyInput {
  const d: DutyInput = {
    startDate: String(input?.startDate ?? ""),
    endDate: String(input?.endDate ?? input?.startDate ?? ""),
    name: clean(input?.name, 80),
    address: clean(input?.address, 120),
    phone: cleanPhone(input?.phone),
    hours: clean(input?.hours, 60),
    mapUrl: cleanUrl(input?.mapUrl),
  };
  if (!DATE_RE.test(d.startDate) || !DATE_RE.test(d.endDate)) throw new Error("اختر التاريخ.");
  if (d.endDate < d.startDate) throw new Error("تاريخ النهاية قبل تاريخ البداية.");
  if (d.name.length < 2) throw new Error("اكتب اسم الصيدلية.");
  if (d.address.length < 2) throw new Error("اكتب الحي أو العنوان.");
  if (!PHONE_RE.test(d.phone)) throw new Error("رقم الهاتف غير صحيح.");
  if (d.hours.length < 2) throw new Error("اكتب ساعات المناوبة.");
  return d;
}

export const adminSaveShift = createServerFn({ method: "POST" })
  .inputValidator((input: { duty: DutyInput; notify?: boolean }) => input)
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string; push?: string }> => {
    const { requireAdmin } = await import("@/lib/admin-auth");
    await requireAdmin();
    let duty: DutyInput;
    try {
      duty = validDuty(data.duty);
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "تحقق من الحقول." };
    }
    const { createShift } = await import("./store.server");
    await createShift(duty);
    let push: string | undefined;
    if (data.notify && duty.startDate <= israelToday() && duty.endDate >= israelToday()) {
      const { sendToTopic } = await import("@/lib/push/send.server");
      const r = await sendToTopic("pharmacy", {
        title: `صيدلية المناوبة اليوم: ${duty.name}`,
        body: `${duty.address} · ${duty.hours}`,
        url: "/today",
        tag: "pharmacy",
      });
      push = r.ok ? `أُرسل إلى ${r.sent} جهاز` : r.message;
    }
    return { ok: true, push };
  });

export const adminDeleteShift = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string }) => {
    if (!ID_RE.test(String(input?.id))) throw new Error("bad id");
    return { id: String(input.id) };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/admin-auth");
    await requireAdmin();
    const { deleteShift } = await import("./store.server");
    await deleteShift(data.id);
    return { ok: true };
  });

function validAlert(input: AlertInput): AlertInput {
  const startsAt = Date.parse(String(input?.startsAt ?? ""));
  const endsAt = Date.parse(String(input?.endsAt ?? ""));
  const a: AlertInput = {
    title: clean(input?.title, 100),
    body: clean(input?.body, 600, true),
    severity: input?.severity === "urgent" ? "urgent" : "civic",
    link: cleanUrl(input?.link),
    startsAt: Number.isFinite(startsAt) ? new Date(startsAt).toISOString() : "",
    endsAt: Number.isFinite(endsAt) ? new Date(endsAt).toISOString() : "",
  };
  if (a.title.length < 3) throw new Error("اكتب عنوان التنبيه.");
  if (a.body.length < 3) throw new Error("اكتب نص التنبيه.");
  if (!a.startsAt || !a.endsAt) throw new Error("حدّد وقت البداية والانتهاء.");
  if (endsAt <= startsAt) throw new Error("وقت الانتهاء يجب أن يكون بعد البداية.");
  if (endsAt <= Date.now()) throw new Error("وقت الانتهاء مرّ بالفعل.");
  return a;
}

export const adminCreateAlert = createServerFn({ method: "POST" })
  .inputValidator((input: { alert: AlertInput; push?: boolean }) => input)
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string; push?: string }> => {
    const { requireAdmin } = await import("@/lib/admin-auth");
    await requireAdmin();
    let alert: AlertInput;
    try {
      alert = validAlert(data.alert);
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "تحقق من الحقول." };
    }
    const { createAlert, markAlertPushed } = await import("./store.server");
    const id = await createAlert(alert);
    let push: string | undefined;
    if (data.push) {
      const { sendToTopic } = await import("@/lib/push/send.server");
      const r = await sendToTopic("alerts", {
        title: `${alert.severity === "urgent" ? "عاجل: " : ""}${alert.title}`,
        body: alert.body.slice(0, 180),
        url: "/today",
        tag: `alert-${id}`,
      });
      if (r.ok) await markAlertPushed(id);
      push = r.ok ? `أُرسل إلى ${r.sent} جهاز` : r.message;
    }
    return { ok: true, push };
  });

export const adminAlertAction = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; action: "end" | "delete" }) => {
    if (!ID_RE.test(String(input?.id))) throw new Error("bad id");
    if (input.action !== "end" && input.action !== "delete") throw new Error("bad action");
    return { id: String(input.id), action: input.action };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/admin-auth");
    await requireAdmin();
    const { endAlert, deleteAlert } = await import("./store.server");
    await (data.action === "end" ? endAlert(data.id) : deleteAlert(data.id));
    return { ok: true };
  });
