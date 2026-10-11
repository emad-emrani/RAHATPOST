# رهط بوست — تطبيقات المتاجر / Store apps

> **العربية أولاً، ثم English بالأسفل.**

## ما هذا؟

هذا المجلد هو مشروع [Capacitor 7](https://capacitorjs.com) يغلّف الموقع الحي **https://rahatpost.com** داخل تطبيق Android وتطبيق iOS حقيقيين:

- الـ WebView يحمّل الموقع مباشرة (`server.url` في `capacitor.config.ts`)، فكل نشر جديد للموقع يحدّث التطبيق فوراً دون إصدار جديد في المتجر.
- `www/` فيه صفحة احتياطية فقط (صفحة "لا يوجد اتصال" عربية).
- معرّف التطبيق: `com.rahatpost.app`، الاسم: `رهط بوست`.
- الأيقونات وشاشة البداية مولّدة من الشعار على الأصفر `#FDB700` (المصدر في `assets/`).

| الأمر                     | ماذا يفعل                                                             |
| ------------------------- | --------------------------------------------------------------------- |
| `npm install`             | تثبيت Capacitor (داخل `mobile/` فقط، منفصل عن الموقع)                 |
| `npm run assets`          | إعادة توليد الأيقونات وشاشات البداية من `assets/`                     |
| `npm run android:debug`   | بناء APK تجريبي → `android/app/build/outputs/apk/debug/app-debug.apk` |
| `npm run android:release` | بناء AAB للنشر (يحتاج مفتاح توقيع، انظر بالأسفل)                      |
| `npx cap open ios`        | فتح مشروع iOS في Xcode (على Mac فقط)                                  |

متطلبات البناء على Linux لـ Android: JDK 21 و Android SDK (platform 35, build-tools 35). مشروع iOS موجود في `ios/` لكن **لا يمكن بناؤه على Linux** — يحتاج Mac عليه Xcode و CocoaPods (`cd ios/App && pod install`)، أو خدمة بناء سحابية مثل Codemagic.

## تسجيل الدخول بحساب Google داخل التطبيق

Google تمنع تسجيل الدخول من داخل WebView مضمّن (خطأ `disallowed_useragent`)، لذلك:

1. زر "الدخول بحساب Google" داخل التطبيق يفتح `https://rahatpost.com/app-auth/start` في **متصفح النظام** (Chrome Custom Tab على Android، و SFSafariViewController على iOS) عبر إضافة `@capacitor/browser`.
2. يتم تسجيل الدخول العادي بحساب Google في المتصفح، ثم ينتقل إلى `/app-auth/done`، الذي يطلب من الخادم **رمزاً لمرة واحدة** (إضافة one-time-token في Better Auth: مخزّن مشفّراً بالـ hash وصالح 3 دقائق فقط).
3. الصفحة تفتح الرابط العميق `com.rahatpost.app://auth?token=…`؛ التطبيق يستقبله (إضافة `@capacitor/app`)، يغلق المتصفح ويحمّل `/app-auth/finish` الذي يستبدل الرمز بجلسة دخول داخل التطبيق.

الرمز يُستخدم مرة واحدة فقط (تم اختباره: إعادة استخدامه تفشل).

**قبل الإصدار للعامة (مُستحسن):** الرابط المخصص `com.rahatpost.app://` يمكن أن يسجّله تطبيق آخر نظرياً. للإصدار النهائي استخدم:

- **Android App Links:** انشر `https://rahatpost.com/.well-known/assetlinks.json` ببصمة SHA-256 لمفتاح توقيع Play، ثم فعّل الـ intent-filter المعلّق في `AndroidManifest.xml`.
- **iOS Universal Links:** انشر `https://rahatpost.com/.well-known/apple-app-site-association` وأضف Associated Domains `applinks:rahatpost.com` في Xcode.
  ثم غيّر رابط العودة في `src/routes/app-auth.done.tsx` إلى رابط https.

أيضاً يجب إضافة نطاق الموقع في Google Cloud Console (Authorized redirect URI هو نفس رابط الموقع الحالي `https://rahatpost.com/api/auth/callback/google`، لا شيء جديد مطلوب لأن الدخول يتم في المتصفح على نفس النطاق).

## النشر على Google Play (رسوم مرة واحدة 25$)

1. أنشئ حساب مطوّر: https://play.google.com/console/signup — ادفع 25$، وأكمل التحقق من الهوية (حساب شخصي جديد يتطلب **اختبار مغلق مع 12 مختبِراً لمدة 14 يوماً** قبل النشر للإنتاج؛ حساب "منظمة" يحتاج رقم D-U-N-S).
2. أنشئ مفتاح رفع (upload key) واحفظه بأمان — **لا ترفعه إلى GitHub**:
   ```bash
   keytool -genkey -v -keystore rahatpost-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
3. أضف التوقيع في `android/app/build.gradle` (`signingConfigs.release`) باستخدام متغيرات بيئة، ثم: `npm run android:release` → `android/app/build/outputs/bundle/release/app-release.aab`.
4. في Play Console: Create app → الاسم "رهط بوست"، اللغة الافتراضية العربية، App، Free.
5. أكمل: App content (سياسة الخصوصية: رابط صفحة خصوصية على الموقع، Data safety: البريد/الاسم لتسجيل الدخول، Ads: نعم/لا حسب الموقع، Content rating، Target audience 18+ أو 13+، News app: نعم — قد تطلب Google معلومات الناشر).
6. Store listing: وصف قصير وطويل بالعربية، أيقونة 512×512 (`../public/icons/icon-512.png`)، صورة مميزة 1024×500، ولقطتا شاشة هاتف على الأقل.
7. Testing → Closed testing: ارفع الـ AAB، أضف المختبِرين، وبعد 14 يوماً اطلب Production access.
8. فعّل **Play App Signing** وانسخ بصمة SHA-256 من (Setup → App signing) إلى `assetlinks.json`.

## النشر على App Store (99$ سنوياً)

1. اشترك في Apple Developer Program: https://developer.apple.com/programs/enroll/ (99$/سنة؛ للمنظمة تحتاج D-U-N-S).
2. **تحتاج Mac عليه Xcode** — أو خدمة سحابية: **Codemagic** (لديها خطة مجانية بدقائق macOS)، أو GitHub Actions بـ macOS runner، أو Ionic Appflow.
   - على Mac: `cd mobile && npm install && npx cap sync ios && cd ios/App && pod install && open App.xcworkspace`.
   - في Xcode: Signing & Capabilities → Team، Bundle ID `com.rahatpost.app`، ثم Product → Archive → Distribute → App Store Connect.
   - مع Codemagic: اربط المستودع، اختر مسار `mobile/`، أضف مفتاح App Store Connect API، وفعّل التوقيع التلقائي.
3. في App Store Connect: My Apps → + → New App (الاسم "رهط بوست"، اللغة الأساسية العربية، Bundle ID).
4. املأ: لقطات شاشة (6.7" و 6.5"، و iPad إن كان مدعوماً)، الوصف، الكلمات المفتاحية، رابط الدعم، رابط سياسة الخصوصية، App Privacy، التصنيف العمري.
5. **حساب تجريبي للمراجعة:** وفّر بريداً وكلمة مرور لحساب اختبار (أو اشرح أن التصفح لا يحتاج دخولاً).
6. أرسل للمراجعة عبر TestFlight أولاً ثم Submit for Review.

### ما قد تطلبه Apple — المبدأ 4.2 (الحد الأدنى من الوظائف)

Apple ترفض التطبيقات التي هي "موقع ويب فقط داخل غلاف". لزيادة فرص القبول:

- **مزايا أصلية حقيقية:** إشعارات فورية (Push) للأخبار العاجلة وتنبيهات الباصات — الأهم؛ مشاركة أصلية (Share sheet)؛ اتصال مباشر بأرقام الطوارئ؛ شاشة "بدون اتصال" (موجودة).
- **تسجيل الدخول:** إذا كان التطبيق يقدّم Google Sign-In فإن المبدأ **4.8** يتطلب أيضاً خياراً مكافئاً يحافظ على الخصوصية مثل **Sign in with Apple** (أو تسجيل الدخول بالبريد فقط).
- **حذف الحساب (5.1.1(v)):** إذا كان التطبيق يسمح بإنشاء حساب، يجب توفير حذف الحساب من داخل التطبيق.
- **محتوى المستخدمين (1.2):** الأخبار والإعلانات من القرّاء تتطلب: آلية إبلاغ عن محتوى، حظر مستخدمين، إشراف (لوحة الإدارة موجودة)، وشروط استخدام.
- تجربة سلسة: لا روابط تفتح Safari بشكل مزعج، ولا صفحات فارغة، والتطبيق يعمل جيداً على iPad إن تم دعمه.
- Google Play أقل تشدداً، لكن سياسة "Webview spam" وسياسة تطبيقات الأخبار تنطبقان أيضاً.

---

## English

This folder is a **Capacitor 7** project that wraps the live site **https://rahatpost.com** (`server.url`) as native Android and iOS apps. App id `com.rahatpost.app`, name `رهط بوست`. Every site deploy updates the app instantly; `www/` only holds an Arabic offline fallback page. Icons/splash are generated from the logo on brand yellow `#FDB700` (`assets/`, `npm run assets`).

- **Android:** builds on Linux with JDK 21 + Android SDK 35: `npm run android:debug` → `android/app/build/outputs/apk/debug/app-debug.apk`.
- **iOS:** the `ios/` Xcode project was generated on Linux (`npx cap add ios` works), but `pod install` and building require **macOS + Xcode + CocoaPods**, or a cloud build (Codemagic, GitHub Actions macOS runner, Ionic Appflow).

### Google sign-in in the app

Google blocks OAuth inside embedded WebViews (`disallowed_useragent`). The app therefore:

1. opens `/app-auth/start` in the **system browser** (Custom Tab / SFSafariViewController) via `@capacitor/browser`;
2. after the normal Google sign-in, `/app-auth/done` asks the server for a **single-use token** (Better Auth `one-time-token` plugin, stored hashed, 3-minute expiry) and opens `com.rahatpost.app://auth?token=…`;
3. the app catches the deep link (`@capacitor/app` `appUrlOpen`), closes the browser and loads `/app-auth/finish`, which redeems the token for a session cookie in the WebView. Reuse is rejected (tested).

The website code for this lives in `src/lib/auth/native.ts` and `src/routes/app-auth.*.tsx`; it talks to the plugins through the injected `window.Capacitor` bridge, so the website needs no Capacitor packages.

**Before public release:** custom schemes can be claimed by other apps. Switch the hand-back to **Android App Links** (`/.well-known/assetlinks.json` with the Play app-signing SHA-256; uncomment the `autoVerify` intent-filter) and **iOS Universal Links** (`/.well-known/apple-app-site-association` + Associated Domains `applinks:rahatpost.com`), then change the return URL in `app-auth.done.tsx` to https. No change is needed in Google Cloud Console: the OAuth redirect still happens on `https://rahatpost.com/api/auth/callback/google` in the browser.

### Google Play ($25 one-time)

1. Sign up at https://play.google.com/console/signup, pay $25, verify identity. New _personal_ accounts must run a **closed test with 12 testers for 14 days** before production; _organization_ accounts need a D-U-N-S number.
2. Create an upload key (`keytool -genkey -v -keystore rahatpost-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload`). Never commit it.
3. Add `signingConfigs.release` in `android/app/build.gradle` (read passwords from env vars); `npm run android:release` → `app-release.aab`.
4. Play Console → Create app (Arabic default language, Free) → App content: privacy policy URL, Data safety (name/email for sign-in), ads declaration, content rating, target audience, News app declaration.
5. Store listing: Arabic short/long description, 512×512 icon (`public/icons/icon-512.png`), 1024×500 feature graphic, ≥2 phone screenshots.
6. Closed testing → upload AAB → testers → after 14 days apply for production.
7. Enable Play App Signing; copy its SHA-256 into `assetlinks.json`.

### Apple App Store ($99/year)

1. Enroll at https://developer.apple.com/programs/enroll/ ($99/yr; D-U-N-S for organizations).
2. Build on a **Mac** (`npm install && npx cap sync ios && cd ios/App && pod install && open App.xcworkspace`, set Team, Archive → Distribute) or on **Codemagic** (connect repo, working dir `mobile/`, App Store Connect API key, automatic signing).
3. App Store Connect → New App (Arabic primary language, bundle id `com.rahatpost.app`); screenshots (6.7", 6.5", iPad if supported), description, keywords, support + privacy URLs, App Privacy, age rating, a **demo account** for review. TestFlight first, then Submit for Review.

### What Apple may require (Guideline 4.2 – Minimum Functionality, and related)

- Apple rejects "a website in a wrapper". Add native value: **push notifications** (breaking news, bus alerts) is the strongest; native share sheet; tap-to-call emergency numbers; offline screen (present).
- **4.8 Login Services:** offering Google sign-in requires an equivalent privacy-focused option such as **Sign in with Apple**.
- **5.1.1(v):** in-app **account deletion** if accounts can be created.
- **1.2 User-generated content:** reader news/ads need report-content, block-user, moderation (admin exists) and published terms.
- Polish: no dead ends, no unexpected Safari hops, iPad layout if iPad is supported.
