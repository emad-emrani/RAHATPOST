import { createServerFn } from "@tanstack/react-start";

export type AutoKind = "news" | "israel";
export type AutoItem = {
  slug: string;
  kind: AutoKind;
  source: string;
  /** Original title (Arabic feed title, or machine/Hebrew title for Israel news). */
  title: string;
  titleHe?: string;
  category: string;
  publishedAt: string;
  link: string;
  breaking: boolean;
  ov: {
    hidden: boolean;
    pinned: boolean;
    breaking: boolean | null;
    category: string | null;
    title: string | null;
  } | null;
};
export type AutoSource = { kind: AutoKind; name: string; enabled: boolean };

/** Owner + مشرف only: every auto-fetched item (before overrides) with its override. */
export const adminListAutoNews = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ authed: boolean; ok: boolean; items: AutoItem[]; sources: AutoSource[] }> => {
    const { isAdmin } = await import("@/lib/admin-auth");
    if (!(await isAdmin())) return { authed: false, ok: true, items: [], sources: [] };
    try {
      const { loadNews, NEWS_SOURCE_NAMES } = await import("./feeds.server");
      const { loadIsraelNews, ISRAEL_SOURCES } = await import("./israel.server");
      const { clearOverridesCache, loadOverrides } = await import("./overrides.server");
      clearOverridesCache();
      const [news, israel, o] = await Promise.all([loadNews(), loadIsraelNews(), loadOverrides()]);
      const ov = (slug: string) => {
        const x = o.items.get(slug);
        return x
          ? {
              hidden: x.hidden,
              pinned: x.pinned,
              breaking: x.breaking,
              category: x.category,
              title: x.title,
            }
          : null;
      };
      const items: AutoItem[] = [
        ...news.items.map((i) => ({
          slug: i.slug,
          kind: "news" as const,
          source: i.source,
          title: i.title,
          category: i.category,
          publishedAt: i.publishedAt,
          link: i.link,
          breaking: i.breaking,
          ov: ov(i.slug),
        })),
        ...israel.items.map((i) => ({
          slug: i.slug,
          kind: "israel" as const,
          source: i.source,
          title: i.titleAr ?? i.titleHe,
          titleHe: i.titleHe,
          category: i.category,
          publishedAt: i.publishedAt,
          link: i.link,
          breaking: false,
          ov: ov(i.slug),
        })),
      ].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
      const sources: AutoSource[] = [
        ...NEWS_SOURCE_NAMES.map((name) => ({
          kind: "news" as const,
          name,
          enabled: !o.disabled.has(`news:${name}`),
        })),
        ...ISRAEL_SOURCES.map((s) => ({
          kind: "israel" as const,
          name: s.name,
          enabled: !o.disabled.has(`israel:${s.name}`),
        })),
      ];
      return { authed: true, ok: true, items, sources };
    } catch (error) {
      console.error("[auto-news] list failed", error);
      return { authed: true, ok: false, items: [], sources: [] };
    }
  },
);

type SaveInput = {
  slug: string;
  kind: AutoKind;
  hidden: boolean;
  pinned: boolean;
  breaking: boolean | null;
  category: string | null;
  title: string | null;
};

export const adminSaveAutoNews = createServerFn({ method: "POST" })
  .inputValidator((input: SaveInput) => input)
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { isAdmin } = await import("@/lib/admin-auth");
    if (!(await isAdmin())) return { ok: false, message: "انتهت الجلسة." };
    const slug = String(data?.slug ?? "");
    if (!/^[\w-]{3,200}$/.test(slug)) return { ok: false };
    const { clean } = await import("@/lib/submit-guard");
    const title = data.title ? clean(data.title, 300) : "";
    const category = data.category ? clean(data.category, 40) : "";
    if (title && title.length < 3) return { ok: false, message: "العنوان قصير." };
    if (category && category.length < 2) return { ok: false, message: "التصنيف قصير." };
    try {
      const { saveOverride } = await import("./overrides.server");
      await saveOverride({
        slug,
        kind: data.kind === "israel" ? "israel" : "news",
        hidden: Boolean(data.hidden),
        pinned: Boolean(data.pinned),
        breaking:
          data.breaking === null || data.breaking === undefined ? null : Boolean(data.breaking),
        category: category || null,
        title: title || null,
      });
      return { ok: true };
    } catch (error) {
      console.error("[auto-news] save failed", error);
      return { ok: false, message: "تعذّر الحفظ." };
    }
  });

export const adminSetNewsSource = createServerFn({ method: "POST" })
  .inputValidator((input: { kind: AutoKind; name: string; enabled: boolean }) => input)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { isAdmin } = await import("@/lib/admin-auth");
    if (!(await isAdmin())) return { ok: false };
    const { NEWS_SOURCE_NAMES } = await import("./feeds.server");
    const { ISRAEL_SOURCES } = await import("./israel.server");
    const kind = data?.kind === "israel" ? "israel" : "news";
    const known = kind === "news" ? NEWS_SOURCE_NAMES : ISRAEL_SOURCES.map((s) => s.name);
    if (!known.includes(String(data?.name))) return { ok: false };
    const { setSourceEnabled } = await import("./overrides.server");
    await setSourceEnabled(kind, String(data.name), Boolean(data.enabled));
    return { ok: true };
  });

/* ------------------------------------------------- «الأقسام التلقائية»: sections & feeds */

export type AdminSection = {
  id: "news" | "israel" | "tech" | "weather" | "sports";
  name: string;
  enabled: boolean;
  home: boolean;
  position: number;
  refreshMin: number;
  customFeeds: boolean;
  feeds: {
    id: string;
    source: string;
    home: string;
    url: string;
    enabled: boolean;
    stat: { lastFetch: string | null; lastOk: string | null; lastCount: number; lastError: string | null } | null;
  }[];
};

export const adminListSections = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ authed: boolean; sections: AdminSection[] }> => {
    const { isAdmin } = await import("@/lib/admin-auth");
    if (!(await isAdmin())) return { authed: false, sections: [] };
    const fc = await import("./feed-config.server");
    fc.clearFeedConfigCache();
    const [cfg, stats] = await Promise.all([fc.loadFeedConfig(), fc.loadFeedStats()]);
    const statOf = new Map(stats.map((s) => [s.url, s]));
    return {
      authed: true,
      sections: cfg.sections.map((s) => ({
        ...s,
        feeds: cfg.feeds
          .filter((f) => f.section === s.id)
          .map((f) => {
            const st = statOf.get(f.url);
            return {
              id: f.id,
              source: f.source,
              home: f.home,
              url: f.url,
              enabled: f.enabled,
              stat: st
                ? {
                    lastFetch: st.lastFetch ? new Date(st.lastFetch).toISOString() : null,
                    lastOk: st.lastOk ? new Date(st.lastOk).toISOString() : null,
                    lastCount: st.lastCount,
                    lastError: st.lastError,
                  }
                : null,
            };
          }),
      })),
    };
  },
);

const SECTION_SET = new Set(["news", "israel", "tech", "weather", "sports"]);
const FEED_SECTIONS = new Set(["news", "israel", "tech", "sports"]);

async function expireAll() {
  const [{ expireFeeds }, { expireIsrael }] = await Promise.all([import("./feeds.server"), import("./israel.server")]);
  expireFeeds();
  expireIsrael();
}

export const adminSaveSection = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => v as { id: string; name: string; enabled: boolean; home: boolean; position: number; refreshMin: number })
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { isAdmin } = await import("@/lib/admin-auth");
    if (!(await isAdmin())) return { ok: false, message: "انتهت الجلسة." };
    if (!SECTION_SET.has(data?.id)) return { ok: false };
    const name = String(data.name ?? "").trim().slice(0, 60);
    if (name.length < 2) return { ok: false, message: "الاسم قصير." };
    const { saveSection } = await import("./feed-config.server");
    await saveSection({
      id: data.id as AdminSection["id"],
      name,
      enabled: Boolean(data.enabled),
      home: Boolean(data.home),
      position: Math.max(0, Math.min(99, Math.round(Number(data.position) || 0))),
      refreshMin: Math.max(1, Math.min(1440, Math.round(Number(data.refreshMin) || 4))),
    });
    await expireAll();
    return { ok: true };
  });

const validUrl = (u: string) => /^https?:\/\/[^\s"'<>]{4,500}$/i.test(u);

export const adminSaveFeed = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => v as { section: string; id?: string; source: string; home: string; url: string; enabled: boolean })
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { isAdmin } = await import("@/lib/admin-auth");
    if (!(await isAdmin())) return { ok: false, message: "انتهت الجلسة." };
    if (!FEED_SECTIONS.has(data?.section)) return { ok: false };
    const url = String(data.url ?? "").trim();
    const source = String(data.source ?? "").trim().slice(0, 60);
    const home = String(data.home ?? "").trim();
    if (!validUrl(url)) return { ok: false, message: "رابط غير صالح." };
    if (source.length < 2) return { ok: false, message: "اسم المصدر قصير." };
    if (home && !validUrl(home)) return { ok: false, message: "رابط الموقع غير صالح." };
    const { saveFeed } = await import("./feed-config.server");
    await saveFeed({
      ...(data.id ? { id: String(data.id).slice(0, 80) } : {}),
      section: data.section as "news",
      source,
      home: home || new URL(url).origin,
      url,
      enabled: data.enabled !== false,
    });
    await expireAll();
    return { ok: true };
  });

export const adminDeleteFeed = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => v as { section: string; id: string })
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { isAdmin } = await import("@/lib/admin-auth");
    if (!(await isAdmin()) || !FEED_SECTIONS.has(data?.section)) return { ok: false };
    const { deleteFeed } = await import("./feed-config.server");
    await deleteFeed(data.section as "news", String(data.id).slice(0, 80));
    await expireAll();
    return { ok: true };
  });

export const adminResetFeeds = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => v as { section: string })
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { isAdmin } = await import("@/lib/admin-auth");
    if (!(await isAdmin()) || !FEED_SECTIONS.has(data?.section)) return { ok: false };
    const { resetFeeds } = await import("./feed-config.server");
    await resetFeeds(data.section as "news");
    await expireAll();
    return { ok: true };
  });

export const adminTestFeed = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => v as { section: string; url: string })
  .handler(async ({ data }): Promise<{ ok: boolean; count: number; images: number; latest?: string; error?: string }> => {
    const { isAdmin } = await import("@/lib/admin-auth");
    if (!(await isAdmin())) return { ok: false, count: 0, images: 0, error: "انتهت الجلسة." };
    const url = String(data?.url ?? "").trim();
    if (!validUrl(url)) return { ok: false, count: 0, images: 0, error: "رابط غير صالح." };
    const { testFeedUrl } = await import("./feeds.server");
    const r = await testFeedUrl(url);
    if (FEED_SECTIONS.has(data.section)) {
      const { recordFeedStats } = await import("./feed-config.server");
      recordFeedStats(data.section as "news", [{ url, count: r.count, ...(r.error ? { error: r.error } : {}) }]);
    }
    return { ok: !r.error, ...r };
  });
