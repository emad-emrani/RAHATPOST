/**
 * Admin overrides for auto-fetched news (migration 0010), applied wherever news is served.
 * Cached per server instance for a short time; writes clear the local cache at once.
 */
import { getSql } from "@/lib/db";
import type { IsraelNewsItem, NewsItem } from "./types";

export type NewsKind = "news" | "israel";
export type Override = {
  slug: string;
  kind: NewsKind;
  hidden: boolean;
  pinned: boolean;
  breaking: boolean | null;
  category: string | null;
  title: string | null;
};
export type Overrides = { items: Map<string, Override>; disabled: Set<string> };

const TTL_MS = 20_000;
let cache: { at: number; value: Overrides } | null = null;

export function clearOverridesCache() {
  cache = null;
}

export async function loadOverrides(): Promise<Overrides> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  try {
    const sql = await getSql();
    const [rows, sources] = await Promise.all([
      sql<Override>`select slug, kind, hidden, pinned, breaking, category, title from news_overrides`,
      sql<{ kind: string; source: string }>`
        select kind, source from news_source_settings where enabled = false`,
    ]);
    const value: Overrides = {
      items: new Map(rows.map((r) => [r.slug, r])),
      disabled: new Set(sources.map((s) => `${s.kind}:${s.source}`)),
    };
    cache = { at: Date.now(), value };
    return value;
  } catch (error) {
    console.error("[news] overrides unavailable", error);
    return cache?.value ?? { items: new Map(), disabled: new Set() };
  }
}

const pinnedFirst = <T extends { pinned?: boolean }>(items: T[]) =>
  items
    .map((it, i) => [it, i] as const)
    .sort((a, b) => Number(!!b[0].pinned) - Number(!!a[0].pinned) || a[1] - b[1])
    .map(([it]) => it);

/** Local (Arabic) feed items: drop hidden / disabled sources, apply edits, pinned first. */
export function applyNews(items: NewsItem[], o: Overrides): NewsItem[] {
  const out: NewsItem[] = [];
  for (const item of items) {
    if (o.disabled.has(`news:${item.source}`)) continue;
    const ov = o.items.get(item.slug);
    if (ov?.hidden) continue;
    out.push(
      ov
        ? {
            ...item,
            ...(ov.title ? { title: ov.title } : {}),
            ...(ov.category ? { category: ov.category } : {}),
            ...(ov.breaking !== null ? { breaking: ov.breaking } : {}),
            ...(ov.pinned ? { pinned: true } : {}),
          }
        : item,
    );
  }
  return pinnedFirst(out);
}

/** Israel items: same, the title override replaces the Arabic (machine) title. */
export function applyIsrael(items: IsraelNewsItem[], o: Overrides): IsraelNewsItem[] {
  const out: IsraelNewsItem[] = [];
  for (const item of items) {
    if (o.disabled.has(`israel:${item.source}`)) continue;
    const ov = o.items.get(item.slug);
    if (ov?.hidden) continue;
    out.push(
      ov
        ? {
            ...item,
            ...(ov.title ? { titleAr: ov.title } : {}),
            ...(ov.category ? { category: ov.category } : {}),
            ...(ov.breaking ? { breaking: true } : {}),
            ...(ov.pinned ? { pinned: true } : {}),
          }
        : item,
    );
  }
  return pinnedFirst(out);
}

export async function saveOverride(o: Override): Promise<void> {
  const sql = await getSql();
  const empty = !o.hidden && !o.pinned && o.breaking === null && !o.category && !o.title;
  if (empty) await sql`delete from news_overrides where slug = ${o.slug}`;
  else
    await sql`
      insert into news_overrides (slug, kind, hidden, pinned, breaking, category, title)
      values (${o.slug}, ${o.kind}, ${o.hidden}, ${o.pinned}, ${o.breaking}, ${o.category}, ${o.title})
      on conflict (slug) do update set kind = excluded.kind, hidden = excluded.hidden,
        pinned = excluded.pinned, breaking = excluded.breaking, category = excluded.category,
        title = excluded.title, updated_at = now()`;
  clearOverridesCache();
}

export async function setSourceEnabled(kind: NewsKind, source: string, enabled: boolean) {
  const sql = await getSql();
  await sql`
    insert into news_source_settings (kind, source, enabled) values (${kind}, ${source}, ${enabled})
    on conflict (kind, source) do update set enabled = excluded.enabled, updated_at = now()`;
  clearOverridesCache();
}
