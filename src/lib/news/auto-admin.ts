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
