import { getSql } from "@/lib/db";
import { canEncrypt, decryptSecret, encryptSecret } from "./secrets.server";
import { clip, CURRENCIES, PROVIDERS, type Currency, type ProviderId } from "./types";

/** Stored JSON (secrets are encrypted boxes, never plain). */
type Stored = {
  currency: Currency;
  whatsapp: string;
  email: string;
  provider: ProviderId;
  enabled: boolean;
  testMode: boolean;
  cardcom: { terminal: string; apiName: string; apiPassword?: string };
  tranzila: { supplier: string; password?: string; appKey: string; appSecret?: string };
};

export const SECRET_FIELDS = [
  "cardcom.apiPassword",
  "tranzila.password",
  "tranzila.appSecret",
] as const;
export type SecretField = (typeof SECRET_FIELDS)[number];

/** Admin view: secrets only as "saved" flags; env overrides flagged too. */
export type AdminPaySettings = Omit<Stored, "cardcom" | "tranzila"> & {
  cardcom: { terminal: string; apiName: string };
  tranzila: { supplier: string; appKey: string };
  saved: Record<SecretField, boolean>;
  env: string[];
  canEncrypt: boolean;
};

/** Decrypted runtime credentials (server only). Env vars override the admin values. */
export type PayConfig = {
  provider: ProviderId;
  enabled: boolean;
  testMode: boolean;
  currency: Currency;
  cardcom: { terminal: string; apiName: string; apiPassword: string };
  tranzila: { supplier: string; password: string; appKey: string; appSecret: string };
};

const DEFAULT: Stored = {
  currency: "ILS",
  whatsapp: "+972546669704",
  email: "",
  provider: "manual",
  enabled: false,
  testMode: true,
  cardcom: { terminal: "", apiName: "" },
  tranzila: { supplier: "", appKey: "" },
};

const ENV = {
  "cardcom.terminal": "CARDCOM_TERMINAL",
  "cardcom.apiName": "CARDCOM_API_NAME",
  "cardcom.apiPassword": "CARDCOM_API_PASSWORD",
  "tranzila.supplier": "TRANZILA_SUPPLIER",
  "tranzila.password": "TRANZILA_PW",
  "tranzila.appKey": "TRANZILA_APP_KEY",
  "tranzila.appSecret": "TRANZILA_APP_SECRET",
} as const;
const env = (k: keyof typeof ENV) => process.env[ENV[k]]?.trim() || "";

async function load(): Promise<Stored> {
  const sql = await getSql();
  const rows = await sql<{ data: Partial<Stored> }>`select data from store_settings where id = 1`;
  const d = rows[0]?.data ?? {};
  return {
    ...DEFAULT,
    ...d,
    cardcom: { ...DEFAULT.cardcom, ...(d.cardcom ?? {}) },
    tranzila: { ...DEFAULT.tranzila, ...(d.tranzila ?? {}) },
  };
}

async function save(s: Stored) {
  const sql = await getSql();
  await sql`insert into store_settings (id, data) values (1, ${JSON.stringify(s)}::jsonb)
    on conflict (id) do update set data = excluded.data, updated_at = now()`;
}

export async function payConfig(): Promise<PayConfig> {
  const s = await load();
  return {
    provider: s.provider,
    enabled: s.enabled,
    testMode: s.testMode,
    currency: s.currency,
    cardcom: {
      terminal: env("cardcom.terminal") || s.cardcom.terminal,
      apiName: env("cardcom.apiName") || s.cardcom.apiName,
      apiPassword: env("cardcom.apiPassword") || decryptSecret(s.cardcom.apiPassword),
    },
    tranzila: {
      supplier: env("tranzila.supplier") || s.tranzila.supplier,
      password: env("tranzila.password") || decryptSecret(s.tranzila.password),
      appKey: env("tranzila.appKey") || s.tranzila.appKey,
      appSecret: env("tranzila.appSecret") || decryptSecret(s.tranzila.appSecret),
    },
  };
}

export async function publicContact() {
  const s = await load();
  return { currency: s.currency, whatsapp: s.whatsapp, email: s.email };
}

export async function adminPaySettings(): Promise<AdminPaySettings> {
  const s = await load();
  return {
    currency: s.currency,
    whatsapp: s.whatsapp,
    email: s.email,
    provider: s.provider,
    enabled: s.enabled,
    testMode: s.testMode,
    cardcom: { terminal: s.cardcom.terminal, apiName: s.cardcom.apiName },
    tranzila: { supplier: s.tranzila.supplier, appKey: s.tranzila.appKey },
    saved: {
      "cardcom.apiPassword": Boolean(s.cardcom.apiPassword),
      "tranzila.password": Boolean(s.tranzila.password),
      "tranzila.appSecret": Boolean(s.tranzila.appSecret),
    },
    env: Object.entries(ENV)
      .filter(([, v]) => process.env[v]?.trim())
      .map(([, v]) => v),
    canEncrypt: canEncrypt(),
  };
}

/**
 * Save from the admin form. `secrets[field]`: non-empty string = replace, omitted/"" = keep.
 * `clear` lists secrets to delete.
 */
export async function saveAdminPaySettings(input: Record<string, any>): Promise<void> {
  const s = await load();
  const i = input ?? {};
  const cur = String(i.currency);
  if (cur in CURRENCIES) s.currency = cur as Currency;
  s.whatsapp = clip(i.whatsapp, 20).replace(/[^\d+]/g, "");
  const email = clip(i.email, 120);
  s.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
  const p = String(i.provider);
  if (p in PROVIDERS) s.provider = p as ProviderId;
  s.enabled = i.enabled === true;
  s.testMode = i.testMode !== false;
  s.cardcom.terminal = clip(i.cardcom?.terminal, 12).replace(/\D/g, "");
  s.cardcom.apiName = clip(i.cardcom?.apiName, 60);
  s.tranzila.supplier = clip(i.tranzila?.supplier, 40).replace(/[^a-zA-Z0-9_-]/g, "");
  s.tranzila.appKey = clip(i.tranzila?.appKey, 200);
  const secrets = (i.secrets ?? {}) as Record<string, unknown>;
  const clear = Array.isArray(i.clear) ? i.clear.map(String) : [];
  for (const f of SECRET_FIELDS) {
    const [grp, name] = f.split(".") as ["cardcom" | "tranzila", string];
    const target = s[grp] as Record<string, string | undefined>;
    const v = typeof secrets[f] === "string" ? (secrets[f] as string).trim().slice(0, 300) : "";
    if (v) {
      if (!canEncrypt()) throw new Error("لا يوجد مفتاح تشفير على الخادم (BETTER_AUTH_SECRET).");
      target[name] = encryptSecret(v);
    } else if (clear.includes(f)) delete target[name];
  }
  await save(s);
}
