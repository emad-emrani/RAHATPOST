# Store release 1.0.0 — technical notes

The full Arabic step-by-step guide for the user (Play Console, App Store Connect, Codemagic,
listing texts, screenshots, data-safety / privacy answers) is shipped outside the repo in
`rahatpost-store-kit.zip` (`STORE-GUIDE.md`). This file is the developer side.

## Android
| | |
|---|---|
| applicationId | `com.rahatpost.app` |
| versionCode / versionName | 1 / 1.0.0 (`app/build.gradle`) |
| minSdk / targetSdk / compileSdk | 24 / 36 / 36 (`variables.gradle`) — Play requires target 36 for new apps since 2026-08-31 |
| AGP / Gradle | 8.10.1 / 8.11.1 |
| Permissions | INTERNET, ACCESS_COARSE/FINE_LOCATION ("أقرب محطة لي", requested by the WebView only on tap). No camera permission: photo capture uses the camera app via intent. |
| Deep links | `com.rahatpost.app://auth` (sign-in hand-back; the site sends it as an `intent://` pinned to our package) + verified App Links for `https://rahatpost.com` content paths (`autoVerify`) |
| Edge-to-edge | `android.adjustMarginsForEdgeToEdge: "auto"` (target 36 enforces edge-to-edge) |
| Back button | handled by the website (`src/lib/auth/native.ts`): history back, or minimise on the first page |
| External links | Capacitor opens non-rahatpost.com navigations in the system browser |
| Uploads | `<input type=file>` handled by Capacitor's `BridgeWebChromeClient` (picker / camera intent) |
| Offline | `www/offline.html` (`server.errorPath`) |

### Signed release build
The upload keystore lives outside the repo (never commit it):
```bash
export ANDROID_HOME=~/opt/android-sdk
export RAHATPOST_KEYSTORE_PROPERTIES=/workspace/store/keystore.properties   # storeFile, storePassword, keyAlias, keyPassword
cd mobile && npx cap sync android && cd android && ./gradlew bundleRelease assembleRelease
# → app/build/outputs/bundle/release/app-release.aab, app/build/outputs/apk/release/app-release.apk
```
Without `RAHATPOST_KEYSTORE_PROPERTIES` the release outputs are unsigned.

### App Links fingerprints
`/.well-known/assetlinks.json` (website, `src/lib/app-links.server.ts`) always contains the upload
key SHA-256 and adds every fingerprint in the Vercel env var `ASSETLINKS_SHA256` (comma-separated).
**After the first Play upload, add the Play App Signing SHA-256** (Play Console → Setup → App signing)
to `ASSETLINKS_SHA256` and redeploy — no code change.

## iOS
| | |
|---|---|
| Bundle id | `com.rahatpost.app`, display name رهط بوست, version 1.0.0 (build set by CI) |
| Devices | iPhone only (`TARGETED_DEVICE_FAMILY = 1`), portrait, iOS 14+ |
| Icons | full iPhone set + 1024 marketing icon (RGB, no alpha) |
| Launch screen | `LaunchScreen.storyboard` + `Splash` image set |
| Info.plist | Arabic/English usage strings for location, photos, camera; `ITSAppUsesNonExemptEncryption = false`; `CFBundleLocalizations` ar, en |
| Entitlements | `App/App.entitlements`: `applinks:rahatpost.com` (enable Associated Domains on the App ID) |
| Universal Links | `/.well-known/apple-app-site-association` served by the site; app IDs appear once `APPLE_TEAM_ID` is set on Vercel |
| Build | `codemagic.yaml` → workflow `ios-testflight` (needs App Store Connect API key integration `rahatpost-asc`) |

`ios/App/App/capacitor.config.json` and `public/` are generated (gitignored): CI runs `npx cap sync ios`
and `pod install` before building.

## Sign in with Apple (guideline 4.8)
Website-side (Better Auth `apple` provider, `src/lib/auth/apple.server.ts`), hidden until all of
`APPLE_CLIENT_ID` (Services ID, e.g. `com.rahatpost.web`), `APPLE_TEAM_ID`, `APPLE_KEY_ID`,
`APPLE_PRIVATE_KEY` (.p8 contents) are set. The ES256 client-secret JWT is minted at server start
(150-day validity, Apple's max is 6 months). Return URL to register on the Services ID:
`https://rahatpost.com/api/auth/callback/apple`. In the app it runs in the system browser like Google.

In-app account deletion (5.1.1(v)) already exists: منشوراتي → حذف حسابي.

## Push (not in 1.0.0)
No Firebase / push plugin is bundled, so nothing can crash without `google-services.json`. Adding
native push needs a Firebase project (user action), `@capacitor/push-notifications`, a device-token
table, FCM HTTP v1 sending, and a 1.1.0 store build. See "Push notifications in the native app" in
README.md.
