import { createServerFn } from "@tanstack/react-start";
import { POPUP_ID_RE, sanitizePopup, type AdminPopup, type Popup } from "./types";

async function sql() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}
async function owner() {
  const { getAdminAccess } = await import("@/lib/admin-auth");
  return (await getAdminAccess())?.level === "owner";
}
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });

/** Public: enabled popups inside their date window (page/frequency filtering happens in the browser). */
export const getActivePopups = createServerFn({ method: "GET" }).handler(async (): Promise<Popup[]> => {
  try {
    const rows = await (await sql()).query<{ id: string; data: unknown }>(`select id, data from popups order by created_at`);
    const d = today();
    return rows
      .map((r) => ({ id: r.id, ...sanitizePopup(typeof r.data === "string" ? JSON.parse(r.data) : r.data) }))
      .filter((p) => p.enabled && (!p.start || p.start <= d) && (!p.end || p.end >= d) && (p.kind === "text" ? p.text : p.image));
  } catch {
    return [];
  }
});

export const trackPopup = createServerFn({ method: "POST" })
  .inputValidator((i: { id: string; ev: "view" | "click" }) => ({ id: String(i?.id ?? ""), ev: i?.ev === "click" ? ("click" as const) : ("view" as const) }))
  .handler(async ({ data }) => {
    if (!POPUP_ID_RE.test(data.id)) return { ok: false };
    const col = data.ev === "click" ? "clicks" : "views";
    await (await sql()).query(`update popups set ${col} = ${col} + 1 where id = $1`, [data.id]);
    return { ok: true };
  });

export const adminListPopups = createServerFn({ method: "POST" }).handler(async (): Promise<{ authed: boolean; items: AdminPopup[] }> => {
  if (!(await owner())) return { authed: false, items: [] };
  const rows = await (await sql()).query<{ id: string; data: unknown; views: number; clicks: number }>(`select id, data, views, clicks from popups order by created_at desc`);
  return { authed: true, items: rows.map((r) => ({ id: r.id, ...sanitizePopup(typeof r.data === "string" ? JSON.parse(r.data) : r.data), views: Number(r.views), clicks: Number(r.clicks) })) };
});

export const adminSavePopup = createServerFn({ method: "POST" })
  .inputValidator((i: { id?: string; data: unknown }) => ({ id: String(i?.id ?? ""), data: sanitizePopup(i?.data) }))
  .handler(async ({ data }): Promise<{ ok: boolean; id?: string }> => {
    if (!(await owner())) return { ok: false };
    const id = POPUP_ID_RE.test(data.id) ? data.id : Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => b.toString(16).padStart(2, "0")).join("");
    await (await sql()).query(
      `insert into popups (id, data) values ($1, $2::jsonb) on conflict (id) do update set data = excluded.data, updated_at = now()`,
      [id, JSON.stringify(data.data)],
    );
    return { ok: true, id };
  });

export const adminDeletePopup = createServerFn({ method: "POST" })
  .inputValidator((i: { id: string }) => ({ id: String(i?.id ?? "") }))
  .handler(async ({ data }) => {
    if (!(await owner()) || !POPUP_ID_RE.test(data.id)) return { ok: false };
    await (await sql()).query(`delete from popups where id = $1`, [data.id]);
    return { ok: true };
  });

export const adminResetPopupStats = createServerFn({ method: "POST" })
  .inputValidator((i: { id: string }) => ({ id: String(i?.id ?? "") }))
  .handler(async ({ data }) => {
    if (!(await owner()) || !POPUP_ID_RE.test(data.id)) return { ok: false };
    await (await sql()).query(`update popups set views = 0, clicks = 0 where id = $1`, [data.id]);
    return { ok: true };
  });
