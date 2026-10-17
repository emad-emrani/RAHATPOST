/**
 * Auto-news sections and their feeds: Neon (migration 0020) over built-in defaults.
 * A section uses its built-in feed list until the admin edits it (custom_feeds = true).
 */
import { getSql } from "@/lib/db";

export type SectionId = "news" | "israel" | "tech" | "weather";
export const SECTION_IDS: SectionId[] = ["news", "israel", "tech", "weather"];
export type SectionCfg = { id: SectionId; name: string; enabled: boolean; home: boolean; position: number; customFeeds: boolean; refreshMin: number };
export type FeedCfg = {
  id: string;
  section: SectionId;
  sourceId: string;
  source: string;
  home: string;
  url: string;
  enabled: boolean;
  position: number;
};
export type FeedConfig = { sections: SectionCfg[]; feeds: FeedCfg[] };

export const DEFAULT_SECTIONS: SectionCfg[] = [
  { id: "news", name: "آخر الأخبار", enabled: true, home: true, position: 0, customFeeds: false, refreshMin: 4 },
  { id: "israel", name: "أخبار إسرائيل", enabled: true, home: true, position: 1, customFeeds: false, refreshMin: 4 },
  { id: "tech", name: "أخبار تقنية", enabled: true, home: true, position: 2, customFeeds: false, refreshMin: 4 },
  { id: "weather", name: "الطقس", enabled: true, home: true, position: 3, customFeeds: false, refreshMin: 4 },
];

export async function defaultFeeds(section: SectionId): Promise<FeedCfg[]> {
  if (section === "weather") return [];
  const list =
    section === "israel"
      ? (await import("./israel.server")).ISRAEL_BUILTIN
      : (await import("./feeds.server")).builtinSources(section);
  const out: FeedCfg[] = [];
  for (const s of list)
    s.urls.forEach((url, i) =>
      out.push({ id: `${section}:${s.id}:${i}`, section, sourceId: s.id, source: s.name, home: s.home, url, enabled: true, position: out.length }),
    );
  return out;
}

const TTL_MS = 20_000;
let cache: { at: number; value: FeedConfig } | null = null;
export function clearFeedConfigCache() {
  cache = null;
}

export async function loadFeedConfig(): Promise<FeedConfig> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  let srows: SectionCfg[] = [];
  let frows: FeedCfg[] = [];
  let ok = true;
  try {
    const sql = await getSql();
    [srows, frows] = await Promise.all([
      sql<SectionCfg>`select id, name, enabled, home, position, custom_feeds as "customFeeds", refresh_min as "refreshMin" from news_sections`,
      sql<FeedCfg>`select id, section, source_id as "sourceId", source, home, url, enabled, position from news_feeds order by position, id`,
    ]);
  } catch (error) {
    ok = false;
    console.error("[feeds] config unavailable", error);
    if (cache) return cache.value;
  }
  const sections = DEFAULT_SECTIONS.map((d) => srows.find((r) => r.id === d.id) ?? d).sort((a, b) => a.position - b.position);
  const feeds: FeedCfg[] = [];
  for (const s of sections)
    feeds.push(...(s.customFeeds ? frows.filter((f) => f.section === s.id) : await defaultFeeds(s.id)));
  const value = { sections, feeds };
  if (ok) cache = { at: Date.now(), value };
  return value;
}

export async function sectionConfig(id: SectionId): Promise<{ section: SectionCfg; feeds: FeedCfg[] }> {
  const c = await loadFeedConfig();
  return { section: c.sections.find((s) => s.id === id)!, feeds: c.feeds.filter((f) => f.section === id) };
}

/* ------------------------------------------------------------------ stats */

export type FeedStat = { url: string; lastFetch: string | null; lastOk: string | null; lastCount: number; lastError: string | null };

export function recordFeedStats(section: SectionId, stats: { url: string; count: number; error?: string }[]) {
  if (!stats.length) return;
  void (async () => {
    try {
      const sql = await getSql();
      for (const s of stats)
        await sql`insert into news_feed_stats (url, section, last_fetch, last_ok, last_count, last_error)
          values (${s.url}, ${section}, now(), ${s.error ? null : new Date().toISOString()}, ${s.count}, ${s.error ?? null})
          on conflict (url) do update set section = excluded.section, last_fetch = now(),
            last_ok = coalesce(excluded.last_ok, news_feed_stats.last_ok), last_count = excluded.last_count,
            last_error = excluded.last_error`;
    } catch (error) {
      console.error("[feeds] stats", error);
    }
  })();
}

export async function loadFeedStats(): Promise<FeedStat[]> {
  try {
    const sql = await getSql();
    return await sql<FeedStat>`select url, last_fetch as "lastFetch", last_ok as "lastOk", last_count as "lastCount", last_error as "lastError" from news_feed_stats`;
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ admin writes */

export async function saveSection(s: Pick<SectionCfg, "id" | "name" | "enabled" | "home" | "position" | "refreshMin">) {
  const sql = await getSql();
  const r = Math.min(1440, Math.max(1, Math.round(s.refreshMin) || 4));
  await sql`insert into news_sections (id, name, enabled, home, position, refresh_min)
    values (${s.id}, ${s.name}, ${s.enabled}, ${s.home}, ${s.position}, ${r})
    on conflict (id) do update set name = excluded.name, enabled = excluded.enabled, home = excluded.home,
      position = excluded.position, refresh_min = excluded.refresh_min, updated_at = now()`;
  clearFeedConfigCache();
}

/** Copy the built-in feeds into news_feeds the first time a section's feeds are edited. */
async function materialize(section: SectionId) {
  const sql = await getSql();
  const cfg = await loadFeedConfig();
  const s = cfg.sections.find((x) => x.id === section)!;
  if (s.customFeeds) return;
  for (const f of await defaultFeeds(section))
    await sql`insert into news_feeds (id, section, source_id, source, home, url, enabled, position)
      values (${f.id}, ${section}, ${f.sourceId}, ${f.source}, ${f.home}, ${f.url}, true, ${f.position})
      on conflict (id) do nothing`;
  await sql`insert into news_sections (id, name, enabled, home, position, refresh_min, custom_feeds)
    values (${s.id}, ${s.name}, ${s.enabled}, ${s.home}, ${s.position}, ${s.refreshMin}, true)
    on conflict (id) do update set custom_feeds = true, updated_at = now()`;
  clearFeedConfigCache();
}

export async function saveFeed(f: Omit<FeedCfg, "id" | "sourceId" | "position"> & { id?: string }) {
  await materialize(f.section);
  const sql = await getSql();
  if (f.id) {
    await sql`update news_feeds set source = ${f.source}, home = ${f.home}, url = ${f.url}, enabled = ${f.enabled}, updated_at = now()
      where id = ${f.id} and section = ${f.section}`;
  } else {
    const id = `${f.section}:c${Date.now().toString(36)}`;
    const slugBase = f.source.normalize("NFKD").replace(/[^a-z0-9]+/gi, "").toLowerCase().slice(0, 16);
    const sourceId = slugBase.length >= 2 ? `c-${slugBase}` : `c${Date.now().toString(36)}`;
    const pos = (await sql<{ n: number }>`select coalesce(max(position), 0) + 1 as n from news_feeds where section = ${f.section}`)[0]?.n ?? 0;
    // Reuse the source id of an existing feed with the same outlet name (so slugs stay stable).
    const same = (await sql<{ source_id: string }>`select source_id from news_feeds where section = ${f.section} and source = ${f.source} limit 1`)[0];
    await sql`insert into news_feeds (id, section, source_id, source, home, url, enabled, position)
      values (${id}, ${f.section}, ${same?.source_id ?? sourceId}, ${f.source}, ${f.home}, ${f.url}, ${f.enabled}, ${pos})`;
  }
  clearFeedConfigCache();
}

export async function deleteFeed(section: SectionId, id: string) {
  await materialize(section);
  const sql = await getSql();
  await sql`delete from news_feeds where id = ${id} and section = ${section}`;
  clearFeedConfigCache();
}

/** Back to the built-in feed list for a section. */
export async function resetFeeds(section: SectionId) {
  const sql = await getSql();
  await sql`delete from news_feeds where section = ${section}`;
  await sql`update news_sections set custom_feeds = false where id = ${section}`;
  clearFeedConfigCache();
}

/** A section's refresh interval in ms (default 4 minutes). */
export async function sectionTtl(id: SectionId): Promise<number> {
  try {
    const c = await loadFeedConfig();
    return (c.sections.find((s) => s.id === id)?.refreshMin ?? 4) * 60_000;
  } catch {
    return 4 * 60_000;
  }
}
