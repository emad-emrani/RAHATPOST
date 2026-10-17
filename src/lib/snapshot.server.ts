/** Persist/read the last good copy of an auto-updating section in Neon (best effort). */
export async function readSnapshot<T>(key: string): Promise<T | null> {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const rows = await sql<{ data: T }>`select data from feed_snapshots where key = ${key}`;
    return rows[0]?.data ?? null;
  } catch (error) {
    console.error(`[snapshot] read ${key}`, error);
    return null;
  }
}

export async function writeSnapshot(key: string, data: unknown): Promise<void> {
  try {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`insert into feed_snapshots (key, data, updated_at)
      values (${key}, ${JSON.stringify(data)}::jsonb, now())
      on conflict (key) do update set data = excluded.data, updated_at = now()`;
  } catch (error) {
    console.error(`[snapshot] write ${key}`, error);
  }
}
