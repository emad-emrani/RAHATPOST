/**
 * Mint a Sign in with Apple client secret (ES256 JWT).
 * Apple accepts this JWT for at most 6 months. This script sets 150 days.
 * The website can also mint it itself when APPLE_TEAM_ID, APPLE_KEY_ID and
 * APPLE_PRIVATE_KEY are set, so you only need this if you want to paste
 * APPLE_CLIENT_SECRET into Vercel by hand.
 *
 *   node scripts/apple-client-secret.mjs --team TEAMID --key KEYID --client com.rahatpost.web --p8 ./AuthKey_KEYID.p8
 *
 * Or export APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_CLIENT_ID, APPLE_PRIVATE_KEY (PEM or \n escapes).
 * Do not commit the .p8 file or the printed JWT.
 */
import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const teamId = arg("team") || process.env.APPLE_TEAM_ID;
const keyId = arg("key") || process.env.APPLE_KEY_ID;
const clientId = arg("client") || process.env.APPLE_CLIENT_ID;
const p8Path = arg("p8");
const pem = (
  p8Path ? readFileSync(p8Path, "utf8") : process.env.APPLE_PRIVATE_KEY || ""
).replace(/\\n/g, "\n");

if (!teamId || !keyId || !clientId || !pem.includes("PRIVATE KEY")) {
  console.error(
    "Need Team ID, Key ID, Services ID (client), and the .p8 private key.\n" +
      "Example: node scripts/apple-client-secret.mjs --team ABCDE12345 --key KEYID1234 --client com.rahatpost.web --p8 ./AuthKey_KEYID1234.p8",
  );
  process.exit(1);
}

const b64url = (input) => Buffer.from(input).toString("base64url");
const iat = Math.floor(Date.now() / 1000);
const exp = iat + 150 * 24 * 60 * 60;
const header = b64url(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" }));
const payload = b64url(
  JSON.stringify({
    iss: teamId,
    iat,
    exp,
    aud: "https://appleid.apple.com",
    sub: clientId,
  }),
);
const signature = sign("sha256", Buffer.from(`${header}.${payload}`), {
  key: createPrivateKey(pem),
  dsaEncoding: "ieee-p1363",
});
const jwt = `${header}.${payload}.${b64url(signature)}`;
console.error(`Expires ${new Date(exp * 1000).toISOString()} (150 days, under Apple's 6-month limit).`);
console.log(jwt);
