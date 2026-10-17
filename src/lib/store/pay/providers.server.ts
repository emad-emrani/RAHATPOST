import type { PayConfig } from "../settings.server";
import type { Currency, ProviderId } from "../types";

/**
 * Payment provider interface. A provider never marks an order paid from what the browser says:
 * `verify` asks the provider's server and returns paid only when it confirms the exact amount.
 */
export type PayOrder = {
  id: string;
  totalAgorot: number;
  currency: Currency;
  description: string;
  email: string;
  name: string;
};
export type StartResult = { kind: "manual" } | { kind: "redirect"; url: string; ref: string };
export type VerifyResult = { paid: boolean; detail: string; ref?: string };

export interface PaymentProvider {
  id: ProviderId;
  /** Credentials present for this provider. */
  configured(cfg: PayConfig): boolean;
  start(cfg: PayConfig, order: PayOrder, origin: string): Promise<StartResult>;
  /** Server-to-server confirmation for one order (ref = provider's payment id). */
  verify(cfg: PayConfig, order: PayOrder, ref: string): Promise<VerifyResult>;
  test(cfg: PayConfig, origin: string): Promise<{ ok: boolean; message: string }>;
}

const manual: PaymentProvider = {
  id: "manual",
  configured: () => true,
  start: async () => ({ kind: "manual" }),
  verify: async () => ({ paid: false, detail: "manual: paid only when the admin marks it" }),
  test: async () => ({ ok: true, message: "الدفع اليدوي لا يحتاج اتصالاً." }),
};

/* ---------------------------------------------------------------- Cardcom (API v11 LowProfile) */

const CARDCOM = "https://secure.cardcom.solutions/api/v11";
const COIN: Record<Currency, number> = { ILS: 1, USD: 2, EUR: 978 };

async function cardcomPost(path: string, body: unknown): Promise<Record<string, any>> {
  const res = await fetch(`${CARDCOM}/${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok && data.ResponseCode == null) data.ResponseCode = res.status;
  return data;
}

const cardcom: PaymentProvider = {
  id: "cardcom",
  configured: (c) => /^\d{1,10}$/.test(c.cardcom.terminal) && Boolean(c.cardcom.apiName),
  async start(c, order, origin) {
    const back = (s: string) => `${origin}/my-orders?order=${order.id}&pay=${s}`;
    const r = await cardcomPost("LowProfile/Create", {
      TerminalNumber: Number(c.cardcom.terminal),
      ApiName: c.cardcom.apiName,
      Operation: "ChargeOnly",
      Amount: order.totalAgorot / 100,
      ISOCoinId: COIN[order.currency] ?? 1,
      ReturnValue: order.id,
      ProductName: order.description.slice(0, 200),
      Language: "he",
      SuccessRedirectUrl: back("done"),
      FailedRedirectUrl: back("failed"),
      WebHookUrl: `${origin}/api/store-webhook/cardcom`,
    });
    if (r.ResponseCode !== 0 || !r.LowProfileId || !r.Url)
      throw new Error(
        `cardcom create failed: ${r.ResponseCode} ${String(r.Description ?? "").slice(0, 120)}`,
      );
    return { kind: "redirect", url: String(r.Url), ref: String(r.LowProfileId) };
  },
  async verify(c, order, ref) {
    if (!/^[0-9a-f-]{20,60}$/i.test(ref)) return { paid: false, detail: "bad LowProfileId" };
    const r = await cardcomPost("LowProfile/GetLpResult", {
      TerminalNumber: Number(c.cardcom.terminal),
      ApiName: c.cardcom.apiName,
      LowProfileId: ref,
    });
    const t = (r.TranzactionInfo ?? {}) as Record<string, any>;
    const amount = Math.round(Number(t.Amount ?? NaN) * 100);
    const okCode = r.ResponseCode === 0 && (t.ResponseCode == null || t.ResponseCode === 0);
    const okOrder = String(r.ReturnValue ?? "") === order.id;
    const okAmount = amount === order.totalAgorot;
    const paid = okCode && okOrder && okAmount && Boolean(t.TranzactionId);
    return {
      paid,
      ref: t.TranzactionId ? String(t.TranzactionId) : undefined,
      detail: `cardcom code=${r.ResponseCode} tx=${t.TranzactionId ?? "-"} order=${okOrder} amount=${amount}/${order.totalAgorot}`,
    };
  },
  async test(c, origin) {
    if (!cardcom.configured(c))
      return { ok: false, message: "أدخل رقم الطرفية واسم مستخدم الواجهة (ApiName)." };
    try {
      const r = await cardcomPost("LowProfile/Create", {
        TerminalNumber: Number(c.cardcom.terminal),
        ApiName: c.cardcom.apiName,
        Operation: "ChargeOnly",
        Amount: 1,
        ReturnValue: "connection-test",
        SuccessRedirectUrl: `${origin}/store`,
        FailedRedirectUrl: `${origin}/store`,
        WebHookUrl: `${origin}/api/store-webhook/cardcom`,
      });
      return r.ResponseCode === 0
        ? { ok: true, message: "تم الاتصال بـ Cardcom بنجاح (أُنشئت صفحة دفع تجريبية دون أي خصم)." }
        : {
            ok: false,
            message: `رفضت Cardcom الطلب: ${r.ResponseCode} ${String(r.Description ?? "")}`.slice(
              0,
              200,
            ),
          };
    } catch {
      return { ok: false, message: "تعذّر الوصول إلى خادم Cardcom." };
    }
  },
};

/* ------------------------------------------------------------- Tranzila (hosted page, scaffold) */

const tranzila: PaymentProvider = {
  id: "tranzila",
  configured: (c) => /^[a-zA-Z0-9_-]{2,40}$/.test(c.tranzila.supplier),
  async start(c, order, origin) {
    const back = (s: string) => `${origin}/my-orders?order=${order.id}&pay=${s}`;
    const q = new URLSearchParams({
      sum: (order.totalAgorot / 100).toFixed(2),
      currency: order.currency === "USD" ? "2" : order.currency === "EUR" ? "978" : "1",
      cred_type: "1",
      tranmode: "A",
      orderid: order.id,
      pdesc: order.description.slice(0, 100),
      contact: order.name,
      email: order.email,
      lang: "il",
      notify_url_address: `${origin}/api/store-webhook/tranzila`,
      success_url_address: back("done"),
      fail_url_address: back("failed"),
    });
    return {
      kind: "redirect",
      url: `https://direct.tranzila.com/${encodeURIComponent(c.tranzila.supplier)}/iframenew.php?${q}`,
      ref: "",
    };
  },
  // Scaffold: the server-side lookup through Tranzila's API (app key + secret) is not wired yet,
  // so a Tranzila notify NEVER marks an order paid by itself; it is logged for the admin.
  verify: async () => ({
    paid: false,
    detail: "tranzila: automatic verification not enabled; confirm in Tranzila dashboard",
  }),
  test: async (c) =>
    tranzila.configured(c)
      ? {
          ok: true,
          message:
            "تم حفظ اسم المسوف (Supplier). لا يوجد اختبار اتصال تلقائي لـ Tranzila بعد؛ والتأكيد التلقائي للدفع غير مفعّل (يؤكّده المشرف).",
        }
      : { ok: false, message: "أدخل اسم المسوف (Supplier/Terminal) من Tranzila." },
};

export const PROVIDER_IMPL: Record<ProviderId, PaymentProvider> = { manual, cardcom, tranzila };

/** Provider used for new checkouts: the chosen one only when enabled and configured. */
export function activeProvider(c: PayConfig): PaymentProvider {
  const p = PROVIDER_IMPL[c.provider];
  return c.enabled && p && p.configured(c) ? p : manual;
}
