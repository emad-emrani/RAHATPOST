import { accessToken, GaError, serviceAccount } from "./ga.server";

/** Search Console API (searchanalytics.query + sitemaps.list) with the same service account. */
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const SA_EMAIL_HINT = "rahatpost-stats@rahatpost.iam.gserviceaccount.com";
const ENABLE_URL =
  "https://console.developers.google.com/apis/api/searchconsole.googleapis.com/overview?project=195064417132";

const cache = new Map<string, { at: number; value: unknown }>();
export const clearGscCache = () => cache.clear();
const TTL = 60 * 60_000;

export type GscRow = {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};
export type GscDashboard = {
  site: string;
  range: { start: string; end: string };
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  series: { date: string; clicks: number; impressions: number }[];
  queries: GscRow[];
  pages: GscRow[];
  countries: GscRow[];
  devices: GscRow[];
  sitemaps: {
    path: string;
    lastSubmitted: string;
    lastDownloaded: string;
    errors: number;
    warnings: number;
    submitted: number;
    pending: boolean;
  }[];
  fetchedAt: string;
};

async function api(token: string, path: string, body?: unknown) {
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/${path}`, {
    method: body ? "POST" : "GET",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  const j = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) {
    const m = String(j.error?.message ?? res.status);
    if (/has not been used|is disabled/i.test(m))
      throw new GaError(`فعّل «Google Search Console API» في مشروع Google Cloud: ${ENABLE_URL}`);
    if (res.status === 403)
      throw new GaError(
        `لا صلاحية على هذا الموقع في Search Console. أضف ${SA_EMAIL_HINT} كمستخدم (كامل أو مقيّد) من «الإعدادات» ← «المستخدمون والأذونات».`,
      );
    throw new GaError(`خطأ من Search Console: ${m}`.slice(0, 300));
  }
  return j;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);
/** GA-style range ("27daysAgo"/"today"/YYYY-MM-DD) → YYYY-MM-DD. */
function toDate(v: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const now = new Date();
  if (v === "today") return ymd(now);
  if (v === "yesterday") return ymd(new Date(now.getTime() - 864e5));
  const m = /^(\d{1,3})daysAgo$/.exec(v);
  if (m) return ymd(new Date(now.getTime() - Number(m[1]) * 864e5));
  throw new GaError("نطاق تاريخ غير صالح.");
}

const rows = (j: Record<string, any>): GscRow[] =>
  (j.rows ?? []).map((r: any) => ({
    key: String(r.keys?.[0] ?? ""),
    clicks: Number(r.clicks) || 0,
    impressions: Number(r.impressions) || 0,
    ctr: Number(r.ctr) || 0,
    position: Number(r.position) || 0,
  }));

export async function gscDashboard(startIn: string, endIn: string): Promise<GscDashboard | null> {
  const c = await serviceAccount();
  if (!c) return null;
  const start = toDate(startIn);
  const end = toDate(endIn);
  const key = `${c.gscSite}:${start}:${end}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as GscDashboard;
  const token = await accessToken(c.sa, SCOPE);
  const site = encodeURIComponent(c.gscSite);
  const q = (dimensions: string[], rowLimit = 10) =>
    api(token, `sites/${site}/searchAnalytics/query`, {
      startDate: start,
      endDate: end,
      dimensions,
      rowLimit,
      dataState: "all",
    });
  const [tot, series, queries, pages, countries, devices, sm] = await Promise.all([
    q([], 1),
    q(["date"], 500),
    q(["query"], 15),
    q(["page"], 15),
    q(["country"], 10),
    q(["device"], 5),
    api(token, `sites/${site}/sitemaps`),
  ]);
  const t = rows(tot)[0];
  const value: GscDashboard = {
    site: c.gscSite,
    range: { start, end },
    totals: {
      clicks: t?.clicks ?? 0,
      impressions: t?.impressions ?? 0,
      ctr: t?.ctr ?? 0,
      position: t?.position ?? 0,
    },
    series: rows(series).map((r) => ({
      date: r.key,
      clicks: r.clicks,
      impressions: r.impressions,
    })),
    queries: rows(queries),
    pages: rows(pages).map((r) => ({
      ...r,
      key: r.key.replace(/^https?:\/\/(www\.)?rahatpost\.com/, "") || "/",
    })),
    countries: rows(countries),
    devices: rows(devices),
    sitemaps: (sm.sitemap ?? []).map((s: any) => ({
      path: String(s.path ?? ""),
      lastSubmitted: String(s.lastSubmitted ?? ""),
      lastDownloaded: String(s.lastDownloaded ?? ""),
      errors: Number(s.errors) || 0,
      warnings: Number(s.warnings) || 0,
      submitted: (s.contents ?? []).reduce(
        (n: number, x: any) => n + (Number(x.submitted) || 0),
        0,
      ),
      pending: Boolean(s.isPending),
    })),
    fetchedAt: new Date().toISOString(),
  };
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 50) cache.clear();
  return value;
}
