/**
 * Sign in with Apple (server-only). Required by App Store guideline 4.8 because the app offers
 * Google sign-in. Enabled only when ALL four env vars are set, so it stays hidden until the
 * Apple developer account exists:
 *
 *   APPLE_CLIENT_ID    Services ID, e.g. com.rahatpost.web   (NOT the app bundle id)
 *   APPLE_TEAM_ID      10-character Team ID
 *   APPLE_KEY_ID       Key ID of the "Sign in with Apple" private key
 *   APPLE_PRIVATE_KEY  contents of AuthKey_XXXXXXXXXX.p8 (PEM; "\n" escapes are accepted)
 *
 * Apple does not take a static client secret: it is an ES256 JWT signed with the private key,
 * valid at most 6 months. We mint a fresh one per server instance (valid 150 days), so it never
 * has to be rotated by hand.
 */
import { createPrivateKey, sign } from "node:crypto";

const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

export function appleConfigured(): boolean {
  return Boolean(
    env("APPLE_CLIENT_ID") &&
    env("APPLE_TEAM_ID") &&
    env("APPLE_KEY_ID") &&
    env("APPLE_PRIVATE_KEY"),
  );
}

const b64url = (input: Buffer | string) => Buffer.from(input).toString("base64url");

export function appleClientSecret(
  opts: {
    clientId?: string;
    teamId?: string;
    keyId?: string;
    privateKey?: string;
    now?: number;
  } = {},
): string {
  const clientId = opts.clientId ?? env("APPLE_CLIENT_ID")!;
  const teamId = opts.teamId ?? env("APPLE_TEAM_ID")!;
  const keyId = opts.keyId ?? env("APPLE_KEY_ID")!;
  const pem = (opts.privateKey ?? env("APPLE_PRIVATE_KEY")!).replace(/\\n/g, "\n");
  const iat = Math.floor((opts.now ?? Date.now()) / 1000);
  const header = b64url(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: teamId,
      iat,
      exp: iat + 150 * 24 * 60 * 60,
      aud: "https://appleid.apple.com",
      sub: clientId,
    }),
  );
  const signature = sign("sha256", Buffer.from(`${header}.${payload}`), {
    key: createPrivateKey(pem),
    dsaEncoding: "ieee-p1363",
  });
  return `${header}.${payload}.${b64url(signature)}`;
}

/**
 * Better Auth `socialProviders.apple` options, or undefined when not configured. A malformed key
 * only disables Apple (logged), it never takes Google sign-in down with it.
 */
export function appleProvider() {
  if (!appleConfigured()) return undefined;
  try {
    return { clientId: env("APPLE_CLIENT_ID") as string, clientSecret: appleClientSecret() };
  } catch (error) {
    console.error("[auth] Sign in with Apple disabled: bad APPLE_* configuration", error);
    return undefined;
  }
}
