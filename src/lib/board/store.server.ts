import { randomBytes } from "node:crypto";
import { getSql } from "@/lib/db";
import type { AlertInput, CivicAlert, DutyInput, DutyShift, SavedPharmacy } from "./types";

const iso = (v: Date | string) => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());
/** `date` columns: PGLite returns a UTC Date, pg a string/local Date — normalise to YYYY-MM-DD. */
const ymd = (v: Date | string) =>
  typeof v === "string"
    ? v.slice(0, 10)
    : new Date(v.getTime() - v.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

type ShiftRow = {
  id: string;
  start_date: string | Date;
  end_date: string | Date;
  name: string;
  address: string;
  phone: string;
  hours: string;
  map_url: string | null;
};

const toShift = (r: ShiftRow): DutyShift => ({
  id: r.id,
  startDate: ymd(r.start_date),
  endDate: ymd(r.end_date),
  name: r.name,
  address: r.address,
  phone: r.phone,
  hours: r.hours,
  mapUrl: r.map_url ?? "",
});

const SHIFT_COLS = `id, start_date::text as start_date, end_date::text as end_date, name, address, phone, hours, map_url`;

/** The shift covering `date`; the most recently entered one wins when ranges overlap. */
export async function dutyFor(date: string): Promise<DutyShift | null> {
  const sql = await getSql();
  const rows = await sql.query<ShiftRow>(
    `select ${SHIFT_COLS} from duty_shifts where start_date <= $1::date and end_date >= $1::date
     order by created_at desc limit 1`,
    [date],
  );
  return rows[0] ? toShift(rows[0]) : null;
}

/** Current and upcoming shifts plus the last two weeks, for the admin list. */
export async function listShifts(fromDate: string): Promise<DutyShift[]> {
  const sql = await getSql();
  const rows = await sql.query<ShiftRow>(
    `select ${SHIFT_COLS} from duty_shifts where end_date >= ($1::date - 14)
     order by start_date desc, created_at desc limit 100`,
    [fromDate],
  );
  return rows.map(toShift);
}

export async function savedPharmacies(): Promise<SavedPharmacy[]> {
  const sql = await getSql();
  const rows = await sql.query<ShiftRow>(
    `select distinct on (name) ${SHIFT_COLS} from duty_shifts order by name, created_at desc limit 50`,
  );
  return rows.map((r) => {
    const { name, address, phone, hours, mapUrl } = toShift(r);
    return { name, address, phone, hours, mapUrl };
  });
}

export async function createShift(d: DutyInput): Promise<string> {
  const id = randomBytes(8).toString("hex");
  const sql = await getSql();
  await sql`insert into duty_shifts (id, start_date, end_date, name, address, phone, hours, map_url)
    values (${id}, ${d.startDate}, ${d.endDate}, ${d.name}, ${d.address}, ${d.phone}, ${d.hours}, ${d.mapUrl || null})`;
  return id;
}

export async function deleteShift(id: string): Promise<void> {
  const sql = await getSql();
  await sql`delete from duty_shifts where id = ${id}`;
}

type AlertRow = {
  id: string;
  title: string;
  body: string;
  severity: CivicAlert["severity"];
  link: string | null;
  starts_at: Date | string;
  ends_at: Date | string;
  pushed_at: Date | string | null;
};

const toAlert = (r: AlertRow): CivicAlert => ({
  id: r.id,
  title: r.title,
  body: r.body,
  severity: r.severity,
  link: r.link ?? "",
  startsAt: iso(r.starts_at),
  endsAt: iso(r.ends_at),
  ...(r.pushed_at ? { pushedAt: iso(r.pushed_at) } : {}),
});

/** Alerts active now, urgent first. */
export async function activeAlerts(): Promise<CivicAlert[]> {
  const sql = await getSql();
  const rows = await sql<AlertRow>`select * from civic_alerts
    where starts_at <= now() and ends_at > now()
    order by (severity = 'urgent') desc, starts_at desc limit 5`;
  return rows.map(toAlert);
}

export async function listAlerts(): Promise<CivicAlert[]> {
  const sql = await getSql();
  const rows = await sql<AlertRow>`select * from civic_alerts
    where ends_at > now() - interval '14 days' order by starts_at desc limit 100`;
  return rows.map(toAlert);
}

export async function createAlert(a: AlertInput): Promise<string> {
  const id = randomBytes(8).toString("hex");
  const sql = await getSql();
  await sql`insert into civic_alerts (id, title, body, severity, link, starts_at, ends_at)
    values (${id}, ${a.title}, ${a.body}, ${a.severity}, ${a.link || null}, ${a.startsAt}, ${a.endsAt})`;
  return id;
}

export async function markAlertPushed(id: string): Promise<void> {
  const sql = await getSql();
  await sql`update civic_alerts set pushed_at = now() where id = ${id}`;
}

/** Ends an alert now (keeps it in the admin history). */
export async function endAlert(id: string): Promise<void> {
  const sql = await getSql();
  await sql`update civic_alerts set ends_at = greatest(now(), starts_at + interval '1 second') where id = ${id}`;
}

export async function deleteAlert(id: string): Promise<void> {
  const sql = await getSql();
  await sql`delete from civic_alerts where id = ${id}`;
}
