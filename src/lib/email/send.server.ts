import { getSql } from "@/lib/db";
import { DEFAULT_TEMPLATES, sanitizeTemplates, type EmailKind, type EmailLang, type EmailTemplates } from "./templates";

const SITE = "https://rahatpost.com";
const LOGO = `${SITE}/email-logo.png`;
const SITE_NAME: Record<EmailLang, string> = { ar: "رهط بوست", he: "רהט פוסט", en: "Rahat Post" };
const FOOTER: Record<EmailLang, { privacy: string; why: string }> = {
  ar: { privacy: "سياسة الخصوصية", why: "وصلتك هذه الرسالة لأن لديك حساباً في رهط بوست." },
  he: { privacy: "מדיניות פרטיות", why: "קיבלת הודעה זו כי יש לך חשבון ברהט פוסט." },
  en: { privacy: "Privacy policy", why: "You're receiving this because you have a Rahat Post account." },
};

export async function loadTemplates(): Promise<EmailTemplates> {
  try {
    const sql = await getSql();
    const rows = await sql.query<{ value: unknown }>(`select value from auth_settings where key = 'email_templates'`);
    const v = rows[0]?.value;
    return sanitizeTemplates(typeof v === "string" ? JSON.parse(v) : v);
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

export async function saveTemplates(input: unknown): Promise<EmailTemplates> {
  const t = sanitizeTemplates(input);
  const sql = await getSql();
  await sql.query(
    `insert into auth_settings (key, value, updated_at) values ('email_templates', $1::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [JSON.stringify(t)],
  );
  return t;
}

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fill = (t: string, vars: Record<string, string>) => t.replace(/\{(name|site|link|detail)\}/g, (_, k) => vars[k] ?? "");

/** Branded, RTL-aware HTML (tables + inline styles for mail clients) and a plain-text twin. */
export function render(tpl: EmailTemplates, kind: EmailKind, lang: EmailLang, name: string, link: string, detail = "") {
  const t = tpl.texts[kind][lang] ?? tpl.texts[kind].ar;
  const rtl = lang !== "en";
  const vars = { name: name || (lang === "en" ? "friend" : lang === "he" ? "חבר" : "صديقنا"), site: SITE_NAME[lang], link, detail: detail.slice(0, 300) };
  const subject = fill(t.subject, vars);
  const heading = fill(t.heading, vars);
  const body = fill(t.body, vars);
  const f = FOOTER[lang];
  const dir = rtl ? "rtl" : "ltr";
  const align = rtl ? "right" : "left";
  const paras = body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.75;color:#263238">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const html = `<!doctype html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f1f2f4;font-family:Tahoma,Arial,'Segoe UI',sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f2f4;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e6e1cf">
<tr><td style="background:#FBF3D5;border-bottom:1px solid #EFE3B8;padding:22px 24px" dir="${dir}" align="${align}">
<table role="presentation" cellpadding="0" cellspacing="0" dir="${dir}"><tr>
<td style="padding-${rtl ? "left" : "right"}:12px"><img src="${LOGO}" width="64" height="64" alt="${esc(SITE_NAME[lang])} – ${lang === "en" ? "logo" : lang === "he" ? "לוגו" : "شعار"}" style="display:block;width:64px;height:64px;border-radius:14px;border:0;outline:none;text-decoration:none"></td>
<td style="font-size:22px;font-weight:bold;color:#263238">${esc(SITE_NAME[lang])}<div style="font-size:13px;font-weight:normal;color:#6B5B2E">${lang === "en" ? "Rahat &amp; the Negev" : lang === "he" ? "רהט והנגב" : "رهط والنقب"}</div></td>
</tr></table></td></tr>
<tr><td style="padding:28px 24px 8px" dir="${dir}" align="${align}">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.4;color:#263238">${esc(heading)}</h1>
${paras}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px"><tr><td style="background:#E9D38C;border-radius:12px;border:1px solid #D9C273">
<a href="${esc(link)}" style="display:inline-block;padding:13px 26px;font-size:16px;font-weight:bold;color:#263238;text-decoration:none">${esc(t.button)}</a></td></tr></table>
${kind === "welcome" ? `<p style="margin:0 0 6px;font-size:14px;color:#5f6b72"><a href="${SITE}/news" style="color:#b45309">${lang === "en" ? "Latest news" : lang === "he" ? "חדשות אחרונות" : "آخر الأخبار"}</a> · <a href="${SITE}/haraj" style="color:#b45309">${lang === "en" ? "Rahat Haraj" : lang === "he" ? "יד שנייה רהט" : "حراج رهط"}</a> · <a href="${SITE}/my-posts" style="color:#b45309">${lang === "en" ? "My posts" : lang === "he" ? "הפרסומים שלי" : "منشوراتي"}</a></p>` : `<p style="margin:0 0 6px;font-size:12px;color:#8a949a;word-break:break-all" dir="ltr">${esc(link)}</p>`}
</td></tr>
<tr><td style="background:#fbf7e8;padding:16px 24px;font-size:12px;line-height:1.7;color:#6b6450" dir="${dir}" align="${align}">
${esc(f.why)}<br><a href="${SITE}" style="color:#b45309">rahatpost.com</a> · <a href="${SITE}/privacy" style="color:#b45309">${esc(f.privacy)}</a>
</td></tr></table></td></tr></table></body></html>`;
  const text = `${heading}\n\n${body}\n\n${t.button}: ${link}\n\n—\n${f.why}\n${SITE}`;
  return { subject, html, text };
}

export const mailReady = () => Boolean(process.env.RESEND_API_KEY?.trim() && process.env.STORE_EMAIL_FROM?.trim());

async function deliver(to: string, m: { subject: string; html: string; text: string }): Promise<boolean> {
  if (!mailReady() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.STORE_EMAIL_FROM!.trim(), to: [to], subject: m.subject, html: m.html, text: m.text }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) console.error("[email] send failed", res.status);
  return res.ok;
}

export function langOf(v: string | undefined | null): EmailLang {
  const l = (v ?? "").slice(0, 2);
  return l === "he" || l === "en" ? l : "ar";
}

export async function sendTemplate(kind: EmailKind, to: string, name: string, lang: EmailLang, link: string, force = false, detail = ""): Promise<boolean> {
  try {
    const tpl = await loadTemplates();
    if (!tpl.enabled[kind] && !force) return false;
    return await deliver(to, render(tpl, kind, lang, name, link, detail));
  } catch (error) {
    console.error("[email] template send failed", error);
    return false;
  }
}

/** Visitor's language from the request cookie (used when an account is created). */
export async function requestLang(): Promise<EmailLang> {
  try {
    const { getCookie } = await import("@tanstack/react-start/server");
    return langOf(getCookie("lang"));
  } catch {
    return "ar";
  }
}

/** Member event e-mail by user id (looks up address + name). Never throws; skips sample/unknown users. */
export async function notifyUser(kind: EmailKind, userId: string | null | undefined, path: string, detail = ""): Promise<boolean> {
  if (!userId) return false;
  try {
    const sql = await getSql();
    const rows = await sql.query<{ email: string; name: string }>(`select email, name from "user" where id = $1`, [userId]);
    const u = rows[0];
    if (!u?.email) return false;
    return await sendTemplate(kind, u.email, u.name, await requestLang(), `${SITE}${path}`, false, detail);
  } catch (error) {
    console.error("[email] notify failed", error);
    return false;
  }
}
