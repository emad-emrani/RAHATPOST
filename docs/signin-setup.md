# إعداد تسجيل الدخول — رهط بوست

هذا الدليل لصاحب الموقع. لا تحتاج إلى كتابة كود. ستنشئ مفاتيح الدخول عند جوجل وفيسبوك وآبل، ثم تلصقها في إعدادات المشروع على Vercel. لا ترسل المفاتيح في واتساب ولا تضعها داخل GitHub.

الموقع المنشور هو `https://rahatpost.com`. عناوين الرجوع التالية تُنسخ كما هي، حرفاً بحرف.

| الخدمة | العنوان الذي تكتبه عندهم |
| --- | --- |
| جوجل — أصل جافاسكربت | `https://rahatpost.com` وأيضاً `https://www.rahatpost.com` |
| جوجل — عنوان الرجوع | `https://rahatpost.com/api/auth/callback/google` |
| فيسبوك — عنوان الرجوع | `https://rahatpost.com/api/auth/callback/facebook` |
| آبل — عنوان الرجوع | `https://rahatpost.com/api/auth/callback/apple` |
| آبل — النطاق | `rahatpost.com` |

بعد كل لصق في Vercel: احفظ، ثم من تبويب Deployments اختر آخر نشر واضغط Redeploy حتى يقرأ الموقع القيم الجديدة.

## أين تُلصق القيم في Vercel

1. افتح [vercel.com](https://vercel.com) وسجّل الدخول بحساب المشروع.
2. افتح مشروع الموقع (rahatpost.com).
3. Settings → Environment Variables.
4. لكل سطر في ملف `.env.example` أضف اسماً وقيمة. اختر البيئة Production.
5. لا تلصق ملف `.env.example` نفسه. الأسماء فقط، والقيمة السرية بجانبها.

القيم التي يجب أن تكون موجودة حتى يعمل الدخول ولوحة التحكم:

- `DATABASE_URL` و `DATABASE_URL_UNPOOLED`: عادةً موجودان إذا كان الموقع يخزّن البيانات. لا تحذفهما. إن كانا ناقصين، من Vercel → Storage → قاعدة Neon انسخ رابط Postgres.
- `BETTER_AUTH_SECRET`: كلمة طويلة عشوائية من مدير كلمات المرور، 32 حرفاً على الأقل. هذه ليست كلمة مرور الإدارة.
- `BETTER_AUTH_URL`: `https://rahatpost.com`
- `ADMIN_PASSWORD`: كلمة مرور لوحة التحكم، 8 أحرف على الأقل. احفظها عندك. إذا تُركت فارغة، صفحة دخول المالك تقول إن الدخول غير مفعّل، ولا توجد كلمة سر جاهزة يمكن تخمينها.
- `ADMIN_MASTER_EMAIL`: بريدك الذي ستدخل به بعد توثيقه.

## جوجل

1. افتح [Google Cloud Console](https://console.cloud.google.com/) وأنشئ مشروعاً باسم «رهط بوست» إن لم يكن موجوداً.
2. APIs & Services → OAuth consent screen. نوع التطبيق External. اسم التطبيق: رهط بوست. بريد الدعم: بريدك. النطاق: `rahatpost.com`. رابط سياسة الخصوصية: `https://rahatpost.com/privacy`. رابط الشروط: `https://rahatpost.com/terms`.
3. APIs & Services → Credentials → Create credentials → OAuth client ID → Application type: Web application.
4. Authorized JavaScript origins: أضف `https://rahatpost.com` ثم `https://www.rahatpost.com`.
5. Authorized redirect URIs: أضف بالضبط `https://rahatpost.com/api/auth/callback/google`.
6. بعد الحفظ انسخ Client ID إلى `GOOGLE_CLIENT_ID` و Client secret إلى `GOOGLE_CLIENT_SECRET` في Vercel.
7. إن ظهرت شاشة «التطبيق غير موثّق»، من OAuth consent screen انشر التطبيق (Publish) بعد إضافة بريدك كمستخدم تجريبي أثناء الإعداد.

## فيسبوك

1. افتح [Meta for Developers](https://developers.facebook.com/) → My Apps → Create App. اختر حالة الاستخدام التي تشمل تسجيل دخول فيسبوك.
2. أضف منتج Facebook Login.
3. Facebook Login → Settings → Valid OAuth Redirect URIs: `https://rahatpost.com/api/auth/callback/facebook`.
4. Settings → Basic: App Domains = `rahatpost.com`. Site URL = `https://rahatpost.com`. Privacy Policy URL = `https://rahatpost.com/privacy`.
5. انسخ App ID إلى `FACEBOOK_CLIENT_ID` و App Secret إلى `FACEBOOK_CLIENT_SECRET`.
6. بدّل وضع التطبيق من Development إلى Live، وإلا لن يدخل إلا حسابات أضفتها كمجرّبين.

## آبل

هذا مطلوب إذا أردت زر «الدخول بآبل»، وهو ما يراجعه متجر آيفون عندما يكون الدخول بجوجل موجوداً. تحتاج عضوية Apple Developer.

1. من [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources) → Identifiers تأكد أن تطبيق `com.rahatpost.app` فيه Sign in with Apple.
2. أنشئ Services ID جديداً، مثلاً `com.rahatpost.web`. هذا هو `APPLE_CLIENT_ID`. ليس هو نفسه معرّف التطبيق.
3. فعّل Sign in with Apple على خدمات الـ Services ID، ثم Configure. Primary App ID: `com.rahatpost.app`. Domains: `rahatpost.com`. Return URL: `https://rahatpost.com/api/auth/callback/apple`.
4. Keys → أنشئ مفتاحاً وعلّم Sign in with Apple واربطه بالتطبيق. حمّل ملف `AuthKey_XXXXXXXX.p8` مرة واحدة واحفظه. معرّف المفتاح هو `APPLE_KEY_ID`. معرّف الفريق (10 أحرف) من حساب المطوّر هو `APPLE_TEAM_ID`.
5. في Vercel ضع نص الملف كاملًا في `APPLE_PRIVATE_KEY`. إذا طلب الحقل سطراً واحداً، استبدل أسطر الملف الجديدة بالنص `\n` بين BEGIN و END.

بدون هذه الأربعة معاً، زر آبل يبقى مخفياً ودخول جوجل لا يتعطل.

## بعد اللصق

1. Redeploy على Vercel.
2. افتح `https://rahatpost.com/login` وجرّب جوجل. يجب أن تعود إلى الموقع وأنت داخل.
3. من صفحة الإدارة جرّب «دخول المالك» بكلمة `ADMIN_PASSWORD`. إن لم تضع الكلمة بعد، الرسالة توضح أن الدخول غير مفعّل.

بقية الأسماء (الصور، البريد، الإشعارات، الترجمة) مشروحة سطراً بسطر في `.env.example`. الموقع يفتح بدونها، لكن رفع الصور وإعادة تعيين كلمة المرور والإشعارات تبقى متوقفة حتى تُضاف.
