import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * AES-256-GCM for payment credentials stored in Neon. The key is derived from STORE_SECRETS_KEY
 * (optional, dedicated) or BETTER_AUTH_SECRET. Without either, secrets cannot be saved.
 */
function key(): Buffer | null {
  const base = process.env.STORE_SECRETS_KEY?.trim() || process.env.BETTER_AUTH_SECRET?.trim();
  if (!base) return null;
  return createHash("sha256").update(`rahatpost-store-secrets-v1:${base}`).digest();
}

export const canEncrypt = () => key() !== null;

export function encryptSecret(plain: string): string {
  const k = key();
  if (!k) throw new Error("no-key");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `v1:${iv.toString("base64")}:${c.getAuthTag().toString("base64")}:${ct.toString("base64")}`;
}

export function decryptSecret(box: string | undefined): string {
  if (!box) return "";
  const k = key();
  const [v, iv, tag, ct] = box.split(":");
  if (!k || v !== "v1" || !iv || !tag || !ct) return "";
  try {
    const d = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64"));
    d.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([d.update(Buffer.from(ct, "base64")), d.final()]).toString("utf8");
  } catch {
    return "";
  }
}
