// Security regression (run against a local dev server):
//   ADMIN_PASSWORD=... npx vite dev --port 5179 --host 127.0.0.1 &
//   node scripts/auth-roles.e2e.mjs
// Proves: a new account (any extra fields, even the adminmaster email) gets no admin role/access,
// sign-up from the admin login is refused, and the admin login offers no sign-up.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://127.0.0.1:5179";
const ORIGIN = process.env.AUTH_ORIGIN ?? "http://127.0.0.1:8080"; // a trusted origin locally
const MASTER = process.env.ADMIN_MASTER_EMAIL ?? "amad.wwf@gmail.com";
const results = [];
const ok = (name) => results.push("PASS " + name);

async function signUp(email, extra = {}, referer = `${BASE}/login`) {
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { origin: ORIGIN, referer, "content-type": "application/json" },
    body: JSON.stringify({ email, password: "Passw0rd-test!", name: "Tester", ...extra }),
  });
  return { status: res.status, cookie: res.headers.getSetCookie?.().map((c) => c.split(";")[0]).join("; ") ?? "", body: await res.json().catch(() => ({})) };
}

// 1) Sign-up trying to smuggle privilege fields.
const evil = await signUp(`evil-${Date.now()}@example.com`, { role: "admin", roles: ["adminmaster"], isAdmin: true, emailVerified: true });
assert.ok(evil.status === 200 || evil.status === 400, "sign-up answered");
if (evil.status === 200) assert.notEqual(evil.body?.user?.emailVerified, true, "emailVerified not settable");
assert.equal(evil.body?.user?.role, undefined, "no role field on user");
ok("sign-up ignores role/emailVerified fields");

// 2) Password account using the adminmaster email: unverified → never adminmaster.
const fake = await signUp(MASTER, { emailVerified: true, role: "adminmaster" });
// (the real master email may already exist; either way it must not grant access)

// 3) Sign-up from the admin login is refused.
const fromAdmin = await signUp(`team-${Date.now()}@example.com`, {}, `${BASE}/login?redirect=%2Fadmin`);
assert.equal(fromAdmin.status, 403, "sign-up from admin login refused");
const viaCb = await signUp(`team2-${Date.now()}@example.com`, { callbackURL: "/admin" });
assert.equal(viaCb.status, 403, "sign-up with /admin callback refused");
ok("no sign-up path from /admin (referer or callbackURL)");

// 4) The new accounts have no admin access (UI shows the no-permission notice, no dashboard).
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? "/usr/bin/google-chrome" });
for (const [label, acct] of [["smuggled-fields account", evil], ["master-email password account", fake]]) {
  if (acct.status !== 200 || !acct.cookie) continue;
  const ctx = await browser.newContext();
  const host = new URL(BASE).hostname;
  await ctx.addCookies(acct.cookie.split("; ").map((c) => { const [name, ...v] = c.split("="); return { name, value: v.join("="), domain: host, path: "/" }; }));
  const page = await ctx.newPage();
  await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const text = await page.locator("body").innerText();
  assert.ok(text.includes("لا تملك صلاحية"), `${label}: denied page shown`);
  if (label.startsWith("smuggled")) await page.screenshot({ path: process.env.DENIED_SHOT ?? "/tmp/admin-denied.png" });
  assert.ok(!text.includes("نشاط اليوم"), `${label}: dashboard not shown`);
  ok(`${label} → member only (no admin access)`);
  await ctx.close();
}

// 5) Server-side: the /admin document is 403 for a signed-in plain member, and every admin
//    server function the owner's dashboard calls returns nothing useful for that member.
if (evil.cookie && process.env.ADMIN_PASSWORD) {
  const doc = await fetch(`${BASE}/admin`, { headers: { cookie: evil.cookie } });
  assert.equal(doc.status, 403, "/admin is 403 for a plain member");
  ok("/admin document → 403 for plain member");
  const owner = await (await browser.newContext()).newPage();
  const calls = new Map();
  owner.on("requestfinished", async (req) => {
    if (!req.url().includes("/_serverFn/") || req.method() !== "POST") return;
    const res = await req.response();
    calls.set(req.url(), { body: req.postData() ?? "", headers: req.headers(), ownerText: res ? await res.text().catch(() => "") : "" });
  });
  await owner.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
  await owner.fill("input[type=password]", process.env.ADMIN_PASSWORD);
  await owner.keyboard.press("Enter");
  await owner.waitForTimeout(6000);
  for (const tab of ["المراجعة", "الإحصائيات"]) {
    await owner.getByRole("tab", { name: tab }).click().catch(() => {});
    await owner.waitForTimeout(2500);
  }
  let checked = 0;
  for (const [url, c] of calls) {
    const id = (() => { try { return Buffer.from(url.split("/_serverFn/")[1].split("?")[0], "base64url").toString(); } catch { return url; } })();
    // Skip identity/login calls (replaying the owner's password login would legitimately log in).
    if (/adminWhoami|adminGate|adminLogin|getAuthConfig|getSiteSettings|getLang/.test(id)) continue;
    const r = await fetch(url, { method: "POST", headers: { ...c.headers, cookie: evil.cookie }, body: c.body || undefined });
    const t = await r.text();
    const leaked = r.ok && t === c.ownerText && t.length > 80 && !/"authed":false|unauthorized/.test(t);
    assert.ok(!leaked, `member got owner data from ${url}`);
    checked++;
  }
  assert.ok(checked > 0, "captured admin server functions");
  ok(`${checked} admin server functions deny a plain member`);
}

// 6) Admin login (and /login?redirect=/admin) show no sign-up option.
const page = await (await browser.newContext()).newPage();
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
assert.ok(!(await page.locator("body").innerText()).includes("حساب جديد"));
await page.goto(`${BASE}/login?redirect=%2Fadmin`, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
assert.equal(await page.getByRole("tab", { name: "حساب جديد" }).isVisible(), false);
ok("admin login pages offer no sign-up");
await browser.close();
console.log(results.join("\n"));
