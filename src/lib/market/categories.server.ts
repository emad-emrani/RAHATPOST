import { getSql } from "@/lib/db";
import { DEFAULT_CATEGORIES, sanitizeCategories, type HarajCategory } from "./categories";

let cache: { at: number; cats: HarajCategory[] } | null = null;

/** All categories in admin order (enabled + disabled). Seeds the table with defaults when empty. */
export async function loadCategories(): Promise<HarajCategory[]> {
  if (cache && Date.now() - cache.at < 30_000) return cache.cats;
  const sql = await getSql();
  const rows = await sql.query<{ data: unknown }>(`select data from haraj_categories order by sort, key`);
  let cats: HarajCategory[];
  if (!rows.length) {
    await saveCategories(DEFAULT_CATEGORIES);
    cats = DEFAULT_CATEGORIES;
  } else cats = sanitizeCategories(rows.map((r) => (typeof r.data === "string" ? JSON.parse(r.data) : r.data)));
  cache = { at: Date.now(), cats };
  return cats;
}

export async function saveCategories(input: HarajCategory[]): Promise<HarajCategory[]> {
  const cats = sanitizeCategories(input);
  if (!cats.length) throw new Error("empty");
  const sql = await getSql();
  await sql.query(`delete from haraj_categories where not (key = any($1::text[]))`, [cats.map((c) => c.key)]);
  for (const [i, c] of cats.entries())
    await sql.query(
      `insert into haraj_categories (key, sort, data, updated_at) values ($1, $2, $3::jsonb, now())
       on conflict (key) do update set sort = excluded.sort, data = excluded.data, updated_at = now()`,
      [c.key, i, JSON.stringify(c)],
    );
  cache = { at: Date.now(), cats };
  return cats;
}

export async function countByCategory(): Promise<Record<string, number>> {
  const sql = await getSql();
  const rows = await sql.query<{ category: string; n: number }>(`select category, count(*)::int as n from classifieds group by category`);
  return Object.fromEntries(rows.map((r) => [r.category, Number(r.n)]));
}
