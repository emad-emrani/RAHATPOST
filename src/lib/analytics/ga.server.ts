import { createSign } from "node:crypto";
import { getSql } from "@/lib/db";
import { canEncrypt, decryptSecret, encryptSecret } from "@/lib/store/secrets.server";

/**
 * GA4 Data API (REST) with a Google Cloud service account: a self-signed JWT is exchanged for an
 * access token (scope analytics.readonly). Credentials live in analytics_settings, the JSON key
 * AES-GCM encrypted; GA4_PROPERTY_ID / GA4_SERVICE_ACCOUNT_JSON env vars override.
 */
type Stored = { propertyId: string; saJson?: string; saEmail?: string };
type ServiceAccount = { client_email: string; private_key: string; token_uri?: string };

async function load(): Promise<Stored> {
  const sql = await getSql();
  const rows = await sql<{ data: Stored }>`select data from analytics_settings where id = 1`;
  return { ...(rows[0]?.data ?? {}), propertyId: rows[0]?.data?.propertyId ?? "" };
}

export async function adminView() {
  const s = await load();
  return {
    propertyId: process.env.GA4_PROPERTY_ID?.trim() || s.propertyId,
    saSaved: Boolean(s.saJson) || Boolean(process.env.GA4_SERVICE_ACCOUNT_JSON?.trim()),
    saEmail: s.saEmail ?? "",
    canEncrypt: canEncrypt(),
  };
}

/** Validate the pasted JSON key; returns an Arabic error or null. */
export function parseServiceAccount(text: string): ServiceAccount | string {
  let j: Record<string, unknown>;
  try {
    j = JSON.parse(text);
  } catch {
    return "ملف JSON غير صالح.";
  }
  if (j.type !== "service_account") return "هذا ليس مفتاح حساب خدمة (service_account).";
  if (
    typeof j.client_email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.iam\.gserviceaccount\.com$/.test(j.client_email)
  )
    return "client_email غير موجود في الملف.";
  if (typeof j.private_key !== "string" || !j.private_key.includes("PRIVATE KEY"))
    return "private_key غير موجود في الملف.";
  return { client_email: j.client_email, private_key: j.private_key };
}

export async function saveSettings(input: {
  propertyId?: unknown;
  saJson?: unknown;
  clearSa?: unknown;
}) {
  const s = await load();
  const pid = String(input.propertyId ?? "").trim();
  if (pid && !/^\d{5,15}$/.test(pid))
    throw new Error("معرّف الموقع (Property ID) أرقام فقط، مثل 123456789.");
  s.propertyId = pid;
  const raw = typeof input.saJson === "string" ? input.saJson.trim() : "";
  if (raw) {
    if (raw.length > 10_000) throw new Error("الملف كبير جداً.");
    const sa = parseServiceAccount(raw);
    if (typeof sa === "string") throw new Error(sa);
    if (!canEncrypt()) throw new Error("لا يوجد مفتاح تشفير على الخادم.");
    s.saJson = encryptSecret(JSON.stringify({ type: "service_account", ...sa }));
    s.saEmail = sa.client_email;
  } else if (input.clearSa === true) {
    delete s.saJson;
    delete s.saEmail;
  }
  const sql = await getSql();
  await sql`insert into analytics_settings (id, data) values (1, ${JSON.stringify(s)}::jsonb)
    on conflict (id) do update set data = excluded.data, updated_at = now()`;
  cache.clear();
  token = null;
}

async function credentials(): Promise<{ propertyId: string; sa: ServiceAccount } | null> {
  const s = await load();
  const propertyId = process.env.GA4_PROPERTY_ID?.trim() || s.propertyId;
  const json = process.env.GA4_SERVICE_ACCOUNT_JSON?.trim() || decryptSecret(s.saJson);
  if (!propertyId || !json) return null;
  const sa = parseServiceAccount(json);
  return typeof sa === "string" ? null : { propertyId, sa };
}

let token: { value: string; exp: number; email: string } | null = null;

async function accessToken(sa: ServiceAccount): Promise<string> {
  if (token && token.email === sa.client_email && token.exp > Date.now() + 60_000)
    return token.value;
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const head = b64({ alg: "RS256", typ: "JWT" });
  const claim = b64({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const sig = createSign("RSA-SHA256")
    .update(`${head}.${claim}`)
    .sign(sa.private_key)
    .toString("base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${head}.${claim}.${sig}`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const j = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!res.ok || !j.access_token)
    throw new GaError(`تعذّر تسجيل دخول حساب الخدمة: ${j.error_description ?? res.status}`);
  token = {
    value: j.access_token,
    exp: Date.now() + (j.expires_in ?? 3600) * 1000,
    email: sa.client_email,
  };
  return token.value;
}

export class GaError extends Error {}

type Report = {
  dimensionHeaders?: { name: string }[];
  metricHeaders?: { name: string }[];
  rows?: { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] }[];
};

async function call(
  propertyId: string,
  sa: ServiceAccount,
  method: "runReport" | "runRealtimeReport",
  body: unknown,
): Promise<Report> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:${method}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${await accessToken(sa)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    },
  );
  const j = (await res.json().catch(() => ({}))) as Report & {
    error?: { message?: string; status?: string };
  };
  if (!res.ok) {
    const m = j.error?.message ?? String(res.status);
    if (res.status === 403)
      throw new GaError(
        `لا صلاحية: أضف بريد حساب الخدمة كـ «مُشاهد» في إدارة الوصول للموقع (Property) في GA4، وتأكد من تفعيل Google Analytics Data API. (${m})`,
      );
    if (res.status === 404 || /not found/i.test(m))
      throw new GaError("معرّف الموقع (Property ID) غير صحيح.");
    throw new GaError(`خطأ من Google: ${m}`.slice(0, 300));
  }
  return j;
}

const rowsOf = (r: Report) =>
  (r.rows ?? []).map((x) => ({
    d: (x.dimensionValues ?? []).map((v) => v.value),
    m: (x.metricValues ?? []).map((v) => Number(v.value) || 0),
  }));

const cache = new Map<string, { at: number; value: unknown }>();
const TTL = 5 * 60_000;
async function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.value as T;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 100) cache.clear();
  return value;
}

export type GaDashboard = {
  range: { start: string; end: string };
  realtime: { active: number; pages: { name: string; users: number }[] };
  totals: {
    users: number;
    newUsers: number;
    sessions: number;
    views: number;
    engagementSec: number;
  };
  quick: { today: Totals3; d7: Totals3; d30: Totals3 };
  series: { date: string; users: number; sessions: number; views: number }[];
  pages: { path: string; title: string; views: number; users: number }[];
  sources: { source: string; sessions: number; users: number }[];
  channels: { name: string; sessions: number }[];
  countries: { name: string; users: number }[];
  cities: { name: string; users: number }[];
  devices: { name: string; users: number }[];
  newVsReturning: { name: string; users: number }[];
  fetchedAt: string;
};
type Totals3 = { users: number; sessions: number; views: number };

const DATE_RE = /^(\d{4}-\d{2}-\d{2}|today|yesterday|\d{1,3}daysAgo)$/;

export async function dashboard(start: string, end: string): Promise<GaDashboard | null> {
  const c = await credentials();
  if (!c) return null;
  if (!DATE_RE.test(start) || !DATE_RE.test(end)) throw new GaError("نطاق تاريخ غير صالح.");
  const { propertyId: pid, sa } = c;
  const range = [{ startDate: start, endDate: end }];
  const realtime = await cached(`rt:${pid}`, 60_000, async () => {
    const [tot, pages] = await Promise.all([
      call(pid, sa, "runRealtimeReport", { metrics: [{ name: "activeUsers" }] }),
      call(pid, sa, "runRealtimeReport", {
        dimensions: [{ name: "unifiedScreenName" }],
        metrics: [{ name: "activeUsers" }],
        limit: 8,
      }),
    ]);
    return {
      active: rowsOf(tot)[0]?.m[0] ?? 0,
      pages: rowsOf(pages).map((r) => ({ name: r.d[0], users: r.m[0] })),
    };
  });
  const main = await cached(`m:${pid}:${start}:${end}`, TTL, async () => {
    const top = (dim: string, metric: string, limit = 10) =>
      call(pid, sa, "runReport", {
        dateRanges: range,
        dimensions: [{ name: dim }],
        metrics: [{ name: metric }],
        orderBys: [{ metric: { metricName: metric }, desc: true }],
        limit,
      });
    const quick = (s: string) =>
      call(pid, sa, "runReport", {
        dateRanges: [{ startDate: s, endDate: "today" }],
        metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
      });
    const [totals, series, pages, sources, channels, countries, cities, devices, nvr, qt, q7, q30] =
      await Promise.all([
        call(pid, sa, "runReport", {
          dateRanges: range,
          metrics: [
            { name: "activeUsers" },
            { name: "newUsers" },
            { name: "sessions" },
            { name: "screenPageViews" },
            { name: "userEngagementDuration" },
          ],
        }),
        call(pid, sa, "runReport", {
          dateRanges: range,
          dimensions: [{ name: "date" }],
          metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }],
          orderBys: [{ dimension: { dimensionName: "date" } }],
          limit: 400,
        }),
        call(pid, sa, "runReport", {
          dateRanges: range,
          dimensions: [{ name: "pagePath" }, { name: "pageTitle" }],
          metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 15,
        }),
        call(pid, sa, "runReport", {
          dateRanges: range,
          dimensions: [{ name: "sessionSource" }],
          metrics: [{ name: "sessions" }, { name: "activeUsers" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 10,
        }),
        top("sessionDefaultChannelGroup", "sessions", 8),
        top("country", "activeUsers", 10),
        top("city", "activeUsers", 10),
        top("deviceCategory", "activeUsers", 5),
        top("newVsReturning", "activeUsers", 3),
        quick("today"),
        quick("6daysAgo"),
        quick("29daysAgo"),
      ]);
    const t = rowsOf(totals)[0]?.m ?? [];
    const q = (r: Report): Totals3 => {
      const m = rowsOf(r)[0]?.m ?? [];
      return { users: m[0] ?? 0, sessions: m[1] ?? 0, views: m[2] ?? 0 };
    };
    const ar = (n: string) =>
      ({
        desktop: "كمبيوتر",
        mobile: "هاتف",
        tablet: "جهاز لوحي",
        new: "زوار جدد",
        returning: "زوار عائدون",
        "(not set)": "غير معروف",
      })[n] ?? n;
    return {
      totals: {
        users: t[0] ?? 0,
        newUsers: t[1] ?? 0,
        sessions: t[2] ?? 0,
        views: t[3] ?? 0,
        engagementSec: t[4] ?? 0,
      },
      quick: { today: q(qt), d7: q(q7), d30: q(q30) },
      series: rowsOf(series).map((r) => ({
        date: `${r.d[0].slice(0, 4)}-${r.d[0].slice(4, 6)}-${r.d[0].slice(6, 8)}`,
        users: r.m[0],
        sessions: r.m[1],
        views: r.m[2],
      })),
      pages: rowsOf(pages).map((r) => ({
        path: r.d[0],
        title: r.d[1],
        views: r.m[0],
        users: r.m[1],
      })),
      sources: rowsOf(sources).map((r) => ({ source: r.d[0], sessions: r.m[0], users: r.m[1] })),
      channels: rowsOf(channels).map((r) => ({ name: r.d[0], sessions: r.m[0] })),
      countries: rowsOf(countries).map((r) => ({ name: r.d[0], users: r.m[0] })),
      cities: rowsOf(cities).map((r) => ({ name: r.d[0], users: r.m[0] })),
      devices: rowsOf(devices).map((r) => ({ name: ar(r.d[0]), users: r.m[0] })),
      newVsReturning: rowsOf(nvr)
        .filter((r) => r.d[0])
        .map((r) => ({ name: ar(r.d[0]), users: r.m[0] })),
      fetchedAt: new Date().toISOString(),
    };
  });
  return { range: { start, end }, realtime, ...main };
}

/** Owner «اختبار الاتصال»: one tiny report. */
export async function testConnection(): Promise<string> {
  const c = await credentials();
  if (!c) return "أدخل معرّف الموقع وملف حساب الخدمة أولاً.";
  await call(c.propertyId, c.sa, "runReport", {
    dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
    metrics: [{ name: "activeUsers" }],
  });
  return "تم الاتصال بـ Google Analytics بنجاح.";
}
