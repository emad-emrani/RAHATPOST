/**
 * Verified app links for the store apps (server-only).
 *
 *  - Android App Links: /.well-known/assetlinks.json lists the SHA-256 certificate fingerprints
 *    allowed to open rahatpost.com links in com.rahatpost.app. The upload key is built in; add
 *    the Play App Signing key (Play Console → Setup → App signing) WITHOUT a code change via
 *      ASSETLINKS_SHA256="AA:BB:…,CC:DD:…"   (comma-separated, colons optional)
 *  - iOS Universal Links: /.well-known/apple-app-site-association needs the Apple Team ID:
 *      APPLE_TEAM_ID="ABCDE12345"
 *    Until it is set the file is served with no app IDs (valid JSON, matches nothing).
 */

export const ANDROID_PACKAGE = "com.rahatpost.app";
export const IOS_BUNDLE_ID = "com.rahatpost.app";

/** Upload key (/workspace/store/rahatpost-upload.jks, alias "upload"). Public, not a secret. */
export const UPLOAD_KEY_SHA256 =
  "5B:B6:CF:15:3C:23:25:2E:18:61:52:B9:AE:6D:05:B8:DC:B2:0E:72:A2:3A:2C:45:DB:40:24:FC:61:3B:02:E4";

/** "5bb6cf15…" or "5B:B6:…" → "5B:B6:…"; anything that is not 32 bytes of hex is dropped. */
export function normalizeFingerprint(value: string): string | null {
  const hex = value.replace(/[^0-9a-f]/gi, "").toUpperCase();
  if (hex.length !== 64) return null;
  return hex.match(/../g)!.join(":");
}

export function assetLinkFingerprints(extra = process.env.ASSETLINKS_SHA256 ?? ""): string[] {
  const all = [UPLOAD_KEY_SHA256, ...extra.split(",")]
    .map((v) => normalizeFingerprint(v.trim()))
    .filter((v): v is string => Boolean(v));
  return [...new Set(all)];
}

export function assetLinks(extra?: string) {
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: ANDROID_PACKAGE,
        sha256_cert_fingerprints: assetLinkFingerprints(extra),
      },
    },
  ];
}

/** Paths that must stay in the browser: OAuth, API, admin, media files. */
const EXCLUDED = ["/api/*", "/app-auth/*", "/login*", "/admin*", "/media/*", "/.well-known/*"];

export function appleAppSiteAssociation(teamId = process.env.APPLE_TEAM_ID?.trim() ?? "") {
  const appIDs = /^[A-Z0-9]{10}$/.test(teamId) ? [`${teamId}.${IOS_BUNDLE_ID}`] : [];
  return {
    applinks: {
      details: [
        {
          appIDs,
          components: [
            ...EXCLUDED.map((path) => ({ "/": path, exclude: true })),
            { "/": "*", comment: "Everything else (news, ads, directory, buses…)" },
          ],
        },
      ],
    },
    webcredentials: { apps: appIDs },
  };
}

export const wellKnownHeaders = {
  "content-type": "application/json",
  "cache-control": "public, max-age=300, s-maxage=3600",
};
