import { createServerFn } from "@tanstack/react-start";
import { LANG_CODE_RE, type I18nState, type LangDef } from "./core";

/** Public: active language state for a requested code (falls back to the default language). */
export const getI18n = createServerFn({ method: "GET" })
  .inputValidator((v: unknown) => (typeof v === "string" ? v.slice(0, 12) : ""))
  .handler(async ({ data }): Promise<I18nState> => {
    const { loadLanguages, loadDict } = await import("./languages.server");
    const all = await loadLanguages();
    const enabled = all.filter((l) => l.enabled || l.code === "ar");
    const def = enabled.find((l) => l.isDefault) ?? enabled[0];
    const cur = enabled.find((l) => l.code === data) ?? def;
    return { lang: cur.code, dir: cur.dir, dict: await loadDict(cur.code), langs: enabled };
  });

/** Public: translate dynamic Arabic texts (news, products…) into a language, cached. */
export const localizeTexts = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => {
    const d = v as { lang?: unknown; texts?: unknown; kind?: unknown };
    const lang = typeof d?.lang === "string" && LANG_CODE_RE.test(d.lang) ? d.lang : "ar";
    const texts = Array.isArray(d?.texts) ? d.texts.filter((t): t is string => typeof t === "string").slice(0, 120).map((t) => t.slice(0, 4000)) : [];
    return { lang, texts, kind: d?.kind === "auto" ? ("auto" as const) : ("site" as const) };
  })
  .handler(async ({ data }): Promise<string[]> => {
    const { translateContent, loadLanguages } = await import("./languages.server");
    const langs = await loadLanguages();
    if (!langs.some((l) => l.code === data.lang && l.enabled)) return data.texts;
    return translateContent(data.texts, data.lang, 2_500, data.kind);
  });

async function staff(): Promise<boolean> {
  const { isAdmin } = await import("@/lib/admin-auth");
  return isAdmin();
}

// ---------- admin: languages ----------

export type UiRow = { key: string; builtin: string; text: string; source: "builtin" | "ai" | "manual" | "" };

export const adminGetLanguages = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ authed: boolean; langs: LangDef[]; stats: Record<string, { total: number; have: number }> }> => {
    if (!(await staff())) return { authed: false, langs: [], stats: {} };
    const { loadLanguages, loadDict } = await import("./languages.server");
    const { UI_KEYS } = await import("./builtin");
    const langs = await loadLanguages(true);
    const stats: Record<string, { total: number; have: number }> = {};
    for (const l of langs) {
      if (l.code === "ar") continue;
      const d = await loadDict(l.code, true);
      stats[l.code] = { total: UI_KEYS.length, have: UI_KEYS.filter((k) => d[k]).length };
    }
    return { authed: true, langs, stats };
  },
);

export const adminSaveLanguages = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => v as LangDef[])
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    if (!(await staff())) return { ok: false, message: "غير مصرح." };
    if (!Array.isArray(data) || data.length > 30) return { ok: false, message: "بيانات غير صحيحة." };
    const seen = new Set<string>();
    const list: LangDef[] = [];
    for (const [i, l] of data.entries()) {
      const code = String(l.code ?? "").trim().toLowerCase();
      if (!LANG_CODE_RE.test(code) || seen.has(code)) return { ok: false, message: `رمز لغة غير صحيح: ${code}` };
      seen.add(code);
      list.push({
        code,
        name: String(l.name ?? code).trim().slice(0, 40) || code,
        dir: l.dir === "ltr" ? "ltr" : "rtl",
        flag: String(l.flag ?? "").trim().slice(0, 8),
        enabled: code === "ar" ? true : Boolean(l.enabled),
        isDefault: Boolean(l.isDefault),
        mode: l.mode === "manual" ? "manual" : "ai",
        sort: i,
      });
    }
    if (!seen.has("ar")) return { ok: false, message: "العربية لغة أساسية ولا يمكن حذفها." };
    const defs = list.filter((l) => l.isDefault && l.enabled);
    if (defs.length !== 1) {
      list.forEach((l) => (l.isDefault = l.code === (defs[0]?.code ?? "ar")));
    }
    try {
      const { saveLanguages } = await import("./languages.server");
      await saveLanguages(list);
      return { ok: true };
    } catch (e) {
      console.error("[i18n] save languages", e);
      return { ok: false, message: "تعذّر الحفظ." };
    }
  });

export const adminListUi = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => {
    const d = v as { lang?: string; q?: string; missing?: boolean; page?: number };
    return { lang: String(d?.lang ?? ""), q: String(d?.q ?? "").slice(0, 100), missing: Boolean(d?.missing), page: Math.max(0, Number(d?.page) || 0) };
  })
  .handler(async ({ data }): Promise<{ authed: boolean; rows: UiRow[]; total: number }> => {
    if (!(await staff())) return { authed: false, rows: [], total: 0 };
    const { BUILTIN_DICT, UI_KEYS } = await import("./builtin");
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const db = await sql<{ key: string; text: string; source: string }>`
      select key, text, source from ui_translations where lang = ${data.lang} order by (source = 'manual')`;
    const m = new Map(db.map((r) => [r.key, r]));
    let rows: UiRow[] = UI_KEYS.map((k) => {
      const b = BUILTIN_DICT[k]?.[data.lang] ?? "";
      const r = m.get(k);
      return { key: k, builtin: b, text: r?.text ?? b, source: (r?.source as UiRow["source"]) ?? (b ? "builtin" : "") };
    });
    if (data.missing) rows = rows.filter((r) => !r.text);
    if (data.q) {
      const q = data.q.toLowerCase();
      rows = rows.filter((r) => r.key.includes(data.q) || r.text.toLowerCase().includes(q));
    }
    return { authed: true, rows: rows.slice(data.page * 50, data.page * 50 + 50), total: rows.length };
  });

export const adminSaveUi = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => v as { lang: string; key: string; text: string })
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    if (!(await staff()) || !LANG_CODE_RE.test(data.lang) || data.lang === "ar") return { ok: false };
    const { getSql } = await import("@/lib/db");
    const { invalidateDict } = await import("./languages.server");
    const sql = await getSql();
    const text = String(data.text ?? "").trim().slice(0, 2000);
    if (!text) await sql`delete from ui_translations where lang = ${data.lang} and key = ${data.key}`;
    else
      await sql`insert into ui_translations (lang, key, text, source) values (${data.lang}, ${String(data.key).slice(0, 2000)}, ${text}, 'manual')
        on conflict (lang, key) do update set text = excluded.text, source = 'manual', updated_at = now()`;
    invalidateDict(data.lang);
    return { ok: true };
  });

export const adminTranslateMissingUi = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => String(v ?? ""))
  .handler(async ({ data }): Promise<{ ok: boolean; done: number; remaining: number; message?: string }> => {
    if (!(await staff()) || !LANG_CODE_RE.test(data) || data === "ar") return { ok: false, done: 0, remaining: 0, message: "غير مصرح." };
    const { translateMissingUi } = await import("./languages.server");
    const r = await translateMissingUi(data, 120);
    return { ...r, ...(r.ok ? {} : { message: "Gemini غير متاح (تحقق من الإعدادات أو المفتاح)." }) };
  });

export const adminClearLangCache = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => String(v ?? ""))
  .handler(async ({ data }): Promise<{ ok: boolean; n: number }> => {
    if (!(await staff()) || !LANG_CODE_RE.test(data)) return { ok: false, n: 0 };
    const { clearContentCache } = await import("./languages.server");
    return { ok: true, n: await clearContentCache(data) };
  });

// ---------- admin: Gemini ----------

export type GeminiPublic = {
  enabled: boolean;
  uses: { israel: boolean; site: boolean; auto: boolean };
  model: string;
  temperature: number;
  stylePrompt: string;
  hasOwnKey: boolean;
  hasEnvKey: boolean;
  order: ("gemini" | "grok" | "microsoft" | "mymemory")[];
  providers: { gemini: boolean; grok: boolean; microsoft: boolean; mymemory: boolean };
  myMemoryEmail: string;
  azureRegion: string;
  hasAzureOwnKey: boolean;
  hasAzureEnvKey: boolean;
  grokModel: string;
  hasGrokOwnKey: boolean;
  hasGrokEnvKey: boolean;
  aiImages: { enabled: boolean; provider: "gemini" | "grok"; dailyCap: number };
};

export type GeminiUsage = {
  today: { kind: string; calls: number; cached: number; errors: number }[];
  errors: { at: string; kind: string; message: string }[];
};

export const adminGetGemini = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ authed: boolean; settings?: GeminiPublic; usage?: GeminiUsage; models?: string[]; grokModels?: string[]; cache?: { lang: string; n: number }[] }> => {
    if (!(await staff())) return { authed: false };
    const g = await import("./gemini.server");
    const s = await g.loadGeminiSettings(true);
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const [today, errors, cache, models, grokModels] = await Promise.all([
      sql<{ kind: string; calls: number; cached: number; errors: number }>`
        select kind, calls, cached, errors from gemini_usage where day = (now() at time zone 'Asia/Jerusalem')::date order by kind`.catch(() => []),
      sql<{ at: string; kind: string; message: string }>`select at::text, kind, message from gemini_errors order by id desc limit 10`.catch(() => []),
      sql<{ lang: string; n: number }>`select lang, count(*)::int as n from content_translations group by lang order by lang`.catch(() => []),
      g.listGeminiModels(s),
      g.listGrokModels(s),
    ]);
    return {
      authed: true,
      settings: {
        enabled: s.enabled, uses: s.uses, model: s.model, temperature: s.temperature, stylePrompt: s.stylePrompt,
        hasOwnKey: Boolean(s.apiKeyBox), hasEnvKey: Boolean(process.env.GEMINI_API_KEY?.trim()),
        order: s.order, providers: s.providers, grokModel: s.grokModel, aiImages: s.aiImages,
        myMemoryEmail: s.myMemoryEmail, azureRegion: s.azureRegion,
        hasAzureOwnKey: Boolean(s.azureKeyBox), hasAzureEnvKey: Boolean(process.env.AZURE_TRANSLATOR_KEY?.trim()),
        hasGrokOwnKey: Boolean(s.grokKeyBox), hasGrokEnvKey: Boolean(process.env.XAI_API_KEY?.trim()),
      },
      usage: { today, errors },
      models,
      grokModels,
      cache,
    };
  },
);

export const adminSaveGemini = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => v as Partial<GeminiPublic> & { apiKey?: string; clearKey?: boolean; grokKey?: string; clearGrokKey?: boolean; azureKey?: string; clearAzureKey?: boolean })
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    if (!(await staff())) return { ok: false, message: "غير مصرح." };
    const g = await import("./gemini.server");
    const cur = await g.loadGeminiSettings(true);
    const next = {
      ...cur,
      enabled: data.enabled ?? cur.enabled,
      uses: {
        israel: data.uses?.israel ?? cur.uses.israel,
        site: data.uses?.site ?? cur.uses.site,
        auto: data.uses?.auto ?? cur.uses.auto,
      },
      model: /^[\w.-]{3,80}$/.test(data.model ?? "") ? data.model! : cur.model,
      temperature: Math.min(2, Math.max(0, Number(data.temperature ?? cur.temperature) || 0)),
      stylePrompt: String(data.stylePrompt ?? cur.stylePrompt).slice(0, 2000) || g.DEFAULT_STYLE,
      myMemoryEmail: typeof data.myMemoryEmail === "string" && (data.myMemoryEmail === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.myMemoryEmail.trim())) ? data.myMemoryEmail.trim().slice(0, 120) : cur.myMemoryEmail,
      azureRegion: typeof data.azureRegion === "string" && /^[a-z0-9-]{0,40}$/i.test(data.azureRegion.trim()) ? data.azureRegion.trim() : cur.azureRegion,
      order: Array.isArray(data.order) && data.order.length === g.PROVIDERS.length && g.PROVIDERS.every((p) => data.order!.includes(p)) ? data.order : cur.order,
      providers: {
        gemini: data.providers?.gemini ?? cur.providers.gemini,
        grok: data.providers?.grok ?? cur.providers.grok,
        microsoft: data.providers?.microsoft ?? cur.providers.microsoft,
        mymemory: data.providers?.mymemory ?? cur.providers.mymemory,
      },
      grokModel: /^[\w.-]{3,80}$/.test(data.grokModel ?? "") ? data.grokModel! : cur.grokModel,
      aiImages: data.aiImages
        ? {
            enabled: Boolean(data.aiImages.enabled),
            provider: (data.aiImages.provider === "grok" ? "grok" : "gemini") as "gemini" | "grok",
            dailyCap: Math.max(0, Math.min(500, Math.round(Number(data.aiImages.dailyCap) || 0))),
          }
        : cur.aiImages,
    };
    if (data.clearGrokKey) delete next.grokKeyBox;
    if (data.clearAzureKey) delete next.azureKeyBox;
    if (data.azureKey?.trim()) {
      const { canEncrypt, encryptSecret } = await import("@/lib/store/secrets.server");
      if (!canEncrypt()) return { ok: false, message: "لا يمكن تشفير المفتاح على هذا الخادم." };
      next.azureKeyBox = encryptSecret(data.azureKey.trim().slice(0, 300));
    }
    if (data.grokKey?.trim()) {
      const { canEncrypt, encryptSecret } = await import("@/lib/store/secrets.server");
      if (!canEncrypt()) return { ok: false, message: "لا يمكن تشفير المفتاح على هذا الخادم." };
      next.grokKeyBox = encryptSecret(data.grokKey.trim().slice(0, 300));
    }
    if (data.clearKey) delete next.apiKeyBox;
    if (data.apiKey?.trim()) {
      const { canEncrypt, encryptSecret } = await import("@/lib/store/secrets.server");
      if (!canEncrypt()) return { ok: false, message: "لا يمكن تشفير المفتاح على هذا الخادم." };
      next.apiKeyBox = encryptSecret(data.apiKey.trim().slice(0, 200));
    }
    await g.saveGeminiSettings(next);
    return { ok: true };
  });

export const adminTestGemini = createServerFn({ method: "POST" })
  .inputValidator((v: unknown) => v as { text: string; lang: string; provider?: "gemini" | "grok" | "microsoft" | "mymemory" | "" })
  .handler(async ({ data }): Promise<{ ok: boolean; text?: string; message?: string; ms?: number; provider?: string }> => {
    if (!(await staff())) return { ok: false, message: "غير مصرح." };
    const g = await import("./gemini.server");
    const s = await g.loadGeminiSettings(true);
    const lang = String(data.lang).slice(0, 12);
    const t0 = Date.now();
    const out = await g.aiGenerate(
      s,
      "test",
      `You are a professional translator. Translate the text into the language with code "${lang}". ${s.stylePrompt}`,
      String(data.text ?? "").slice(0, 4000),
      { timeoutMs: 30_000, pair: { from: "ar", to: lang }, ...(data.provider ? { only: data.provider } : {}) },
    );
    return out
      ? { ok: true, text: out.text, provider: out.provider, ms: Date.now() - t0 }
      : { ok: false, message: "فشل الطلب. راجع آخر الأخطاء.", ms: Date.now() - t0 };
  });
