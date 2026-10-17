import { getSql } from "@/lib/db";
import { DEFAULT_SETTINGS, sanitizeSettings, type SiteSettings } from "./types";

const TTL_MS = 15_000;
let cache: { at: number; value: SiteSettings } | null = null;

export async function loadSettings(): Promise<SiteSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  try {
    const sql = await getSql();
    const rows = await sql<{ data: unknown }>`select data from site_settings where id = 1`;
    const raw = rows[0]?.data;
    const value = raw
      ? sanitizeSettings(typeof raw === "string" ? JSON.parse(raw) : raw)
      : DEFAULT_SETTINGS;
    cache = { at: Date.now(), value };
    return value;
  } catch (error) {
    console.error("[settings] load failed", error);
    return cache?.value ?? DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: SiteSettings): Promise<void> {
  const sql = await getSql();
  await sql`insert into site_settings (id, data) values (1, ${JSON.stringify(s)}::jsonb)
    on conflict (id) do update set data = excluded.data, updated_at = now()`;
  cache = null;
}

export async function resetSettings(): Promise<void> {
  const sql = await getSql();
  await sql`delete from site_settings where id = 1`;
  cache = null;
}
