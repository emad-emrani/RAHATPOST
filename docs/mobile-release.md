# قائمة نشر تطبيقي رهط بوست

التطبيقان غلاف للموقع `https://rahatpost.com`. معرّفهما `com.rahatpost.app`، الاسم الظاهر «رهط بوست»، الإصدار `1.0.0`. الأيقونة وشاشة البداية موجودتان في المشروع. ما يلي لا يستطيع أحد غيرك إكماله، لأنه يحتاج حساباتك وتوقيعك.

لا ترفع ملف المفتاح (keystore) ولا كلمات سره إلى GitHub.

## ما هو جاهز في المشروع

- أندرويد: رقم التطبيق `com.rahatpost.app`، الإصدار 1 (1.0.0)، صلاحيات الإنترنت والموقع عند الطلب والإشعارات عند موافقة الزائر.
- آيفون: نفس المعرّف، الإصدار 1.0.0، شرح عربي لصلاحيات الموقع والصور والكاميرا.
- الرجوع بعد تسجيل الدخول يفتح `com.rahatpost.app://auth`. روابط الموقع العادية (الأخبار، الحراج، المتجر، الباصات…) يمكن أن تفتح التطبيق بعد ربط البصمة ومعرّف فريق آبل.
- بناء النسخة الموقّعة موصوف في `codemagic.yaml` ويُشغَّل يدوياً من Codemagic، لا عند كل تعديل.
- إشعارات الموقع (المتصفح) تعتمد مفاتيح `VAPID_*` في Vercel. إشعارات أندرويد الأصلية عبر Firebase اختيارية: سر Codemagic اسمه `GOOGLE_SERVICES_JSON`. بدونه يُبنى التطبيق وتبقى تنبيهات الموقع كما هي.

## أندرويد — ما تفعله أنت

1. أنشئ حساب Google Play Console وادفع رسوم التسجيل مرة واحدة. الحساب الشخصي الجديد قد يطلب اختباراً مغلقاً (12 مختبراً لمدة 14 يوماً) قبل النشر للجميع.
2. على جهازك، مرة واحدة، أنشئ مفتاح الرفع واحفظ الملف وكلمة السر في مكان آمن:
   `keytool -genkey -v -keystore rahatpost-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload`
3. في [Codemagic](https://codemagic.io) اربط مستودع GitHub. من Code signing → Android keystores ارفع الملف وسمِّ المرجع بالضبط `rahatpost_upload`. Codemagic يملأ `CM_KEYSTORE_PATH` و `CM_KEYSTORE_PASSWORD` و `CM_KEY_ALIAS` و `CM_KEY_PASSWORD` بنفسه. لا تكتب كلمات السر في الملف `codemagic.yaml`.
4. شغّل يدوياً المسار «Android → signed AAB». الناتج ملف `.aab`.
5. في Play Console أنشئ تطبيقاً: الاسم «رهط بوست»، اللغة العربية، مجاني.
6. أكمل بيانات المتجر: وصف قصير وطويل بالعربية، أيقونة 512×512، صورة عريضة 1024×500، ولقطتا شاشة للهاتف على الأقل.
7. سياسة الخصوصية: `https://rahatpost.com/privacy`. في Data safety اذكر الاسم والبريد لتسجيل الدخول. صرّح إن كان الموقع يعرض إعلانات.
8. ارفع ملف AAB إلى اختبار مغلق، ثم إلى الإنتاج عندما يسمح الحساب.
9. من Setup → App signing انسخ بصمة SHA-256 لمفتاح Play (وليس فقط مفتاح الرفع) إلى المتغير `ASSETLINKS_SHA256` في Vercel، ثم أعد نشر الموقع. بدونها روابط `https://rahatpost.com` لا تفتح التطبيق مباشرة.

## آيفون — ما تفعله أنت

1. اشترك في [Apple Developer Program](https://developer.apple.com/programs/enroll/) (اشتراك سنوي).
2. في Apple Developer أنشئ معرّف التطبيق `com.rahatpost.app` وفعّل Associated Domains و Sign in with Apple. خطوات مفاتيح الدخول مفصّلة في `docs/signin-setup.md`.
3. في Codemagic → Integrations → App Store Connect أضف مفتاح API (من App Store Connect → Users and Access → Integrations، صلاحية App Manager) وسمِّه بالضبط `rahatpost-asc`.
4. في Codemagic فعّل توقيع iOS من نوع App Store للمعرّف `com.rahatpost.app`.
5. في متغيرات المسار ضع `APP_STORE_APPLE_ID` (الرقم من App Information) إن أردت أن يزيد رقم البناء تلقائياً. اتركه فارغاً فيستخدم عداد Codemagic.
6. شغّل يدوياً المسار «iOS → TestFlight». لا يمكن بناء آيفون على حاسوب لينكس؛ Codemagic يبنيه على ماك.
7. في App Store Connect أنشئ التطبيق: الاسم «رهط بوست»، اللغة الأساسية العربية، Bundle ID `com.rahatpost.app`.
8. املأ الوصف، لقطات الشاشة (مقاس 6.7 إنش و 6.5 إنش)، رابط الدعم، ورابط الخصوصية `https://rahatpost.com/privacy`.
9. في App Privacy اذكر البيانات التي يجمعها تسجيل الدخول. جهّز حساب تجربة للمراجع (بريد وكلمة مرور) أو اكتب أن تصفح الأخبار لا يحتاج دخولاً.
10. بعد TestFlight أرسل النسخة للمراجعة. آبل قد ترفض تطبيقاً هو موقع فقط؛ الإشعارات وحذف الحساب من داخل الموقع (منشوراتي) وتسجيل الدخول بآبل هي ما يراجعونه غالباً.
11. ضع `APPLE_TEAM_ID` في Vercel (10 أحرف) ثم أعد النشر، حتى يتعرف آيفون على روابط الموقع.

## أسرار Codemagic بالاسم فقط

| الاسم | أين يُحفظ | ماذا هو |
| --- | --- | --- |
| `rahatpost_upload` | مرجع متجر المفاتيح | ملف jks وكلماته |
| `rahatpost-asc` | تكامل App Store Connect | مفتاح API لرفع TestFlight |
| `APP_STORE_APPLE_ID` | متغير المسار | رقم التطبيق الرقمي، اختياري |
| `GOOGLE_SERVICES_JSON` | سر اختياري | نص ملف Firebase. اتركه فارغاً في الإصدار الأول |
