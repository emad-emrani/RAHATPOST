import { createServerFn } from "@tanstack/react-start";
import { ownerCategories, type BusinessSubmission, type DirectoryEntry } from "./types";

/* ------------------------------------------------------------ public */

export const getApprovedEntries = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ ok: boolean; entries: DirectoryEntry[] }> => {
    const { getApproved } = await import("./store.server");
    const { ownerEntry } = await import("./types");
    try {
      const approved = await getApproved();
      return { ok: true, entries: approved.map(ownerEntry) };
    } catch (error) {
      console.error("[directory] approved list failed", error);
      return { ok: false, entries: [] };
    }
  },
);

type SubmitInput = {
  name: string;
  category: string;
  area: string;
  about: string;
  phone: string;
  website: string; // honeypot — must stay empty
  startedAt: number;
};

const clean = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/[\u0000-\u001f\u007f<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 3;
const MAX_PENDING = 100;

export const submitBusiness = createServerFn({ method: "POST" })
  .inputValidator((input: SubmitInput): SubmitInput => {
    const data = {
      name: clean(input?.name, 80),
      category: clean(input?.category, 40),
      area: clean(input?.area, 60),
      about: clean(input?.about, 160),
      phone: clean(input?.phone, 20),
      website: String(input?.website ?? ""),
      startedAt: Number(input?.startedAt) || 0,
    };
    if (data.name.length < 2) throw new Error("اكتب اسم النشاط.");
    if (!(ownerCategories as readonly string[]).includes(data.category)) throw new Error("اختر تصنيفاً من القائمة.");
    if (data.area.length < 2) throw new Error("اكتب الحي.");
    if (data.about.length < 5) throw new Error("اكتب سطر وصف قصير.");
    const digits = data.phone.replace(/[\s-]/g, "");
    if (!/^(0\d{8,9}|\+972\d{8,9})$/.test(digits)) throw new Error("رقم الهاتف غير صحيح.");
    data.phone = digits;
    return data;
  })
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    // Bots: filled honeypot or submitted faster than a human could type → pretend success, store nothing.
    if (data.website || Date.now() - data.startedAt < 3000) return { ok: true };

    const { getRequestIP } = await import("@tanstack/react-start/server");
    const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
    const now = Date.now();
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_PER_WINDOW) {
      return { ok: false, message: "أرسلت عدة طلبات للتو. حاول بعد قليل." };
    }
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 5000) hits.clear();

    try {
      const { countPending, createSubmission } = await import("./store.server");
      if ((await countPending()) >= MAX_PENDING) {
        return { ok: false, message: "قائمة المراجعة ممتلئة الآن. حاول لاحقاً." };
      }
      await createSubmission({
        name: data.name,
        category: data.category,
        area: data.area,
        about: data.about,
        phone: data.phone,
      });
      return { ok: true };
    } catch (error) {
      console.error("[directory] submit failed", error);
      return { ok: false, message: "تعذّر الحفظ الآن. حاول مرة أخرى." };
    }
  });

/* ------------------------------------------------------------- admin */

async function requireAdmin() {
  const { getCookie } = await import("@tanstack/react-start/server");
  const { ADMIN_COOKIE, verifySession } = await import("./auth.server");
  if (!verifySession(getCookie(ADMIN_COOKIE))) throw new Error("unauthorized");
}

const loginHits = new Map<string, number[]>();

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => ({ password: String(input?.password ?? "").slice(0, 200) }))
  .handler(async ({ data }): Promise<{ ok: boolean; message?: string }> => {
    const { getRequestIP, setCookie } = await import("@tanstack/react-start/server");
    const { ADMIN_COOKIE, checkPassword, issueSession, sessionMaxAge } = await import("./auth.server");
    const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
    const now = Date.now();
    const recent = (loginHits.get(ip) ?? []).filter((t) => now - t < 15 * 60_000);
    if (recent.length >= 8) return { ok: false, message: "محاولات كثيرة. حاول بعد ربع ساعة." };
    if (!checkPassword(data.password)) {
      recent.push(now);
      loginHits.set(ip, recent);
      return { ok: false, message: "كلمة المرور غير صحيحة." };
    }
    setCookie(ADMIN_COOKIE, issueSession(), {
      httpOnly: true,
      secure: Boolean(process.env.VERCEL),
      sameSite: "strict",
      path: "/",
      maxAge: sessionMaxAge(),
    });
    return { ok: true };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { deleteCookie } = await import("@tanstack/react-start/server");
  const { ADMIN_COOKIE } = await import("./auth.server");
  deleteCookie(ADMIN_COOKIE, { path: "/" });
  return { ok: true };
});

export const adminList = createServerFn({ method: "POST" }).handler(
  async (): Promise<{ authed: boolean; ok: boolean; items: BusinessSubmission[] }> => {
    try {
      await requireAdmin();
    } catch {
      return { authed: false, ok: true, items: [] };
    }
    try {
      const { listSubmissions } = await import("./store.server");
      return { authed: true, ok: true, items: await listSubmissions() };
    } catch (error) {
      console.error("[admin] list failed", error);
      return { authed: true, ok: false, items: [] };
    }
  },
);

export const adminDecide = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; action: "approved" | "rejected" | "pending" | "delete" }) => {
    const id = String(input?.id ?? "");
    const action = input?.action;
    if (!/^[a-f0-9]{16}$/.test(id)) throw new Error("bad id");
    if (!["approved", "rejected", "pending", "delete"].includes(action)) throw new Error("bad action");
    return { id, action };
  })
  .handler(async ({ data }) => {
    await requireAdmin();
    const { decide } = await import("./store.server");
    await decide(data.id, data.action);
    return { ok: true };
  });
