import { createServerFn } from "@tanstack/react-start";
import type { BusLine } from "@/data/buses";

/** Admin overrides layered over the GTFS data. Never contains times: schedules stay GTFS-only. */
export type BusOverride = {
  number: string; // line number, or "*" for the page notice
  hidden: boolean;
  labelFrom: string;
  labelTo: string;
  note: string;
  shape: Record<string, [number, number][]> | null;
  hiddenStops: string[];
};

let cache: { at: number; rows: BusOverride[] } | null = null;

async function load(): Promise<BusOverride[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.rows;
  try {
    const { getSql } = await import("@/lib/db");
    const rows = await (await getSql()).query<{
      number: string;
      hidden: boolean;
      label_from: string;
      label_to: string;
      note: string;
      shape: BusOverride["shape"];
      hidden_stops: string[];
    }>(`select number, hidden, label_from, label_to, note, shape, hidden_stops from bus_line_overrides`);
    const out = rows.map((r) => ({
      number: r.number,
      hidden: r.hidden,
      labelFrom: r.label_from,
      labelTo: r.label_to,
      note: r.note,
      shape: r.shape ?? null,
      hiddenStops: r.hidden_stops ?? [],
    }));
    cache = { at: Date.now(), rows: out };
    return out;
  } catch (e) {
    console.error("[buses] overrides failed", e);
    return cache?.rows ?? [];
  }
}

export const getBusOverrides = createServerFn({ method: "GET" }).handler(load);

const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);
const LINE_RE = /^(\*|[0-9]{1,3}[أب]?)$/;

function validShape(v: unknown): BusOverride["shape"] {
  if (!v || typeof v !== "object") return null;
  const out: Record<string, [number, number][]> = {};
  for (const [dir, pts] of Object.entries(v as Record<string, unknown>)) {
    if (!/^\d{1,2}$/.test(dir) || !Array.isArray(pts)) continue;
    const clean = pts
      .slice(0, 2000)
      .filter((p): p is [number, number] => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number" && Number.isFinite(n)))
      .filter(([lat, lon]) => lat > 29 && lat < 34 && lon > 33 && lon < 36)
      .map(([lat, lon]) => [Math.round(lat * 1e5) / 1e5, Math.round(lon * 1e5) / 1e5] as [number, number]);
    if (clean.length >= 2) out[dir] = clean;
  }
  return Object.keys(out).length ? out : null;
}

export const adminSaveBusOverride = createServerFn({ method: "POST" })
  .inputValidator((i: BusOverride) => {
    if (!LINE_RE.test(String(i?.number))) throw new Error("bad line");
    return {
      number: String(i.number),
      hidden: i.hidden === true,
      labelFrom: clip(i.labelFrom, 120),
      labelTo: clip(i.labelTo, 120),
      note: clip(i.note, 500),
      shape: validShape(i.shape),
      hiddenStops: (Array.isArray(i.hiddenStops) ? i.hiddenStops : []).filter((s) => /^\d{3,6}$/.test(String(s))).slice(0, 300),
    };
  })
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/admin-auth");
    await requireAdmin();
    const { getSql } = await import("@/lib/db");
    await (await getSql()).query(
      `insert into bus_line_overrides (number, hidden, label_from, label_to, note, shape, hidden_stops, updated_at)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7::text[],now())
       on conflict (number) do update set hidden=excluded.hidden, label_from=excluded.label_from, label_to=excluded.label_to,
         note=excluded.note, shape=excluded.shape, hidden_stops=excluded.hidden_stops, updated_at=now()`,
      [data.number, data.hidden, data.labelFrom, data.labelTo, data.note, data.shape ? JSON.stringify(data.shape) : null, data.hiddenStops],
    );
    cache = null;
    return { ok: true };
  });

export const adminListBusOverrides = createServerFn({ method: "POST" }).handler(async () => {
  const { requireAdmin } = await import("@/lib/admin-auth");
  await requireAdmin();
  cache = null;
  return load();
});

/** GTFS-backed lines with admin overrides (hide / labels / note) applied. */
export function applyOverrides(list: BusLine[], ov: BusOverride[]): BusLine[] {
  return list
    .map((l) => {
      const o = ov.find((x) => x.number === l.number);
      return o ? { ...l, hidden: o.hidden, from: o.labelFrom || l.from, to: o.labelTo || l.to, note: o.note || l.note } : l;
    })
    .filter((l) => !(l as { hidden?: boolean }).hidden);
}

