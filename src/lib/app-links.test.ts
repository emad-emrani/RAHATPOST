import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, verify } from "node:crypto";
import {
  appleAppSiteAssociation,
  assetLinkFingerprints,
  assetLinks,
  normalizeFingerprint,
  UPLOAD_KEY_SHA256,
} from "./app-links.server.ts";
import { appleClientSecret } from "./auth/apple.server.ts";
import { appReturnUrl, sitePathFromLink } from "./auth/native.ts";

const PLAY = "aa".repeat(32);

describe("assetlinks.json", () => {
  it("always contains the upload key", () => {
    assert.deepEqual(assetLinkFingerprints(""), [UPLOAD_KEY_SHA256]);
    const [entry] = assetLinks("");
    assert.equal(entry.target.package_name, "com.rahatpost.app");
    assert.deepEqual(entry.relation, ["delegate_permission/common.handle_all_urls"]);
  });
  it("adds comma-separated env fingerprints, normalised, deduped, junk dropped", () => {
    const list = assetLinkFingerprints(` ${PLAY} , nope, ${UPLOAD_KEY_SHA256.toLowerCase()}`);
    assert.equal(list.length, 2);
    assert.equal(list[1], normalizeFingerprint(PLAY));
    assert.match(list[1], /^AA(:AA){31}$/);
  });
});

describe("apple-app-site-association", () => {
  it("matches nothing until APPLE_TEAM_ID is set", () => {
    assert.deepEqual(appleAppSiteAssociation("").applinks.details[0].appIDs, []);
    assert.deepEqual(appleAppSiteAssociation("bad").applinks.details[0].appIDs, []);
  });
  it("uses TEAMID.bundle and keeps OAuth paths out", () => {
    const aasa = appleAppSiteAssociation("ABCDE12345");
    const d = aasa.applinks.details[0];
    assert.deepEqual(d.appIDs, ["ABCDE12345.com.rahatpost.app"]);
    const excluded = d.components.filter((c) => "exclude" in c).map((c) => c["/"]);
    for (const p of ["/api/*", "/app-auth/*", "/login*"]) assert.ok(excluded.includes(p));
    assert.equal(d.components.at(-1)?.["/"], "*");
  });
});

describe("Sign in with Apple client secret", () => {
  it("is an ES256 JWT for appleid.apple.com that verifies with the key", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const jwt = appleClientSecret({
      clientId: "com.rahatpost.web",
      teamId: "ABCDE12345",
      keyId: "KEY1234567",
      privateKey: pem.replace(/\n/g, "\\n"),
      now: 1_700_000_000_000,
    });
    const [h, p, sig] = jwt.split(".");
    const header = JSON.parse(Buffer.from(h, "base64url").toString());
    const payload = JSON.parse(Buffer.from(p, "base64url").toString());
    assert.deepEqual(header, { alg: "ES256", kid: "KEY1234567", typ: "JWT" });
    assert.equal(payload.iss, "ABCDE12345");
    assert.equal(payload.sub, "com.rahatpost.web");
    assert.equal(payload.aud, "https://appleid.apple.com");
    assert.ok(payload.exp - payload.iat <= 15_777_000, "Apple allows at most 6 months");
    const ok = verify(
      "sha256",
      Buffer.from(`${h}.${p}`),
      { key: publicKey, dsaEncoding: "ieee-p1363" },
      Buffer.from(sig, "base64url"),
    );
    assert.ok(ok);
  });
});

describe("native app links", () => {
  const params = new URLSearchParams({ token: "abc", redirect: "/my-posts" });
  it("pins the Android hand-back to our package", () => {
    const url = appReturnUrl(params, "Mozilla/5.0 (Linux; Android 15) Chrome/140");
    assert.equal(
      url,
      "intent://auth?token=abc&redirect=%2Fmy-posts#Intent;scheme=com.rahatpost.app;package=com.rahatpost.app;end",
    );
  });
  it("uses the custom scheme on iOS", () => {
    const url = appReturnUrl(params, "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)");
    assert.equal(url, "com.rahatpost.app://auth?token=abc&redirect=%2Fmy-posts");
  });
  it("only turns rahatpost.com https links into in-app paths", () => {
    assert.equal(sitePathFromLink("https://rahatpost.com/news/x?a=1#c"), "/news/x?a=1#c");
    assert.equal(sitePathFromLink("https://www.rahatpost.com/"), "/");
    assert.equal(sitePathFromLink("https://evil.com/news"), null);
    assert.equal(sitePathFromLink("http://rahatpost.com/news"), null);
    assert.equal(sitePathFromLink("https://rahatpost.com/api/auth/x"), null);
    assert.equal(sitePathFromLink("nonsense"), null);
  });
});
