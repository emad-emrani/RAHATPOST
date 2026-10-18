export type DutyShift = {
  id: string;
  startDate: string; // YYYY-MM-DD (Israel local date)
  endDate: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  mapUrl: string;
};

export type DutyInput = Omit<DutyShift, "id">;

/** A pharmacy entered before, offered for quick re-use in the admin form. */
export type SavedPharmacy = Pick<DutyShift, "name" | "address" | "phone" | "hours" | "mapUrl">;

export type AlertSeverity = "civic" | "urgent";

export type CivicAlert = {
  id: string;
  title: string;
  body: string;
  severity: AlertSeverity;
  link: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  pushedAt?: string;
};

export type AlertInput = Omit<CivicAlert, "id" | "pushedAt">;

export type Board = { duty: DutyShift | null; alerts: CivicAlert[]; today: string; dutyVisible: boolean };

export const ID_RE = /^[a-f0-9]{16}$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in Israel (YYYY-MM-DD). */
export function israelToday(ms = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

/** Google Maps directions link (explicit map link wins). */
export function directionsUrl(d: Pick<DutyShift, "name" | "address" | "mapUrl">): string {
  if (d.mapUrl) return d.mapUrl;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${d.name} ${d.address} رهط`)}`;
}
