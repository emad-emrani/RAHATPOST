# دليل تحسين محركات البحث (SEO) — رهط بوست (rahatpost.com)

## 1. التحسينات البرمجية المطبّقة في الموقع

1. **تفعيل فهرسة جميع الأخبار والمقالات (`robots: "index"`) والبيانات المنظمة (`NewsArticle` JSON-LD)**:
   - تم تعديل `src/routes/news.$slug.tsx` و`src/routes/israel-news.$slug.tsx` لإزالة وسم `noindex` عن صفحات الأخبار الفعلية وتفعيل أرشفتها في محرك بحث جوجل مع إضافة البيانات المنظمة الكاملة (`NewsArticle` + `BreadcrumbList`).
2. **توسيع خريطة الموقع (`sitemap.xml`) وخريطة أخبار جوجل (`news-sitemap.xml`)**:
   - في `src/routes/sitemap[.]xml.ts`: تمت إضافة جميع صفحات خرائط ومسارات خطوط باصات رهط الـ 20 (`/buses/map/1` حتى `/buses/map/471`)، بالإضافة إلى جميع الأخبار النشطة (أخبار رهط والنقب، الرياضة، التقنية، وأخبار إسرائيل المترجمة)، و83+ مصلحة ومؤسسة محلية في دليل رهط (`/directory/*`).
   - في `src/routes/news-sitemap[.]xml.ts`: تمت إضافة الأخبار النشطة والمترجمة لضمان امتلاء خريطة أخبار جوجل (`news-sitemap.xml`) بأحدث العناوين العربية على مدار الساعة.
3. **إصلاح حقن وسوم المشاركة والسيو في الخادم (`scripts/grok-pwa-shared.mjs` و`src/lib/og/site.json`)**:
   - تم إصلاح الحاقن الوسيط في الخادم ليحافظ على الوصف الخاص بكل صفحة (`og:description` و`twitter:description`)، والرابط الأساسي (`og:url`)، واسم الموقع (`og:site_name`)، ونوع المقال (`og:type="article"`)، وصورة الخبر أو المنتج أو الإعلان الخاصة (`og:image` و`twitter:image`) بدلاً من حذفها.
4. **تعزيز الترابط الداخلي (Internal Linking) وإبراز «دليل رهط» و«خطوط الباصات»**:
   - تحديث الفوتر (`src/components/shell.tsx`) والقائمة الرئيسية وشريط الأقسام (`src/components/home-parts.tsx`) والصفحة الرئيسية (`src/routes/index.tsx`) لربط جميع الأقسام المفهرسة وعرض قسم «دليل محلات وخدمات رهط» (`/directory`).
   - إضافة قسم روابط مباشر لجميع خطوط باصات رهط الـ 20 في صفحة `/buses` وتحسين عناوين صفحات `/buses/map/$line` لتشمل نقطة الانطلاق والوصول (مثل `خط باص 450 (رهط ↔ بئر السبع)`).
5. **تثبيت كود التحقق من Google Search Console والوسوم الجغرافية المحلية**:
   - تثبيت رمز التحقق `gZirpZH5RWc4SxozAbvqJJPBxhk4DyFprqchBfkZhOU` كقيمة افتراضية في `vite.config.ts` و`src/lib/site-settings/types.ts` لضمان عدم اختفائه أبداً.
   - إضافة الكلمات المفتاحية المحلية، ووسوم الموقع الجغرافي لمدينة رهط والنقب (`geo.region`, `geo.placename`, `geo.position`)، وروابط اللغة القياسية (`hreflang`).

## 2. خطوات التفعيل الفوري في Google Search Console

1. ارفع التعديلات المحدثة إلى الفرع `main` في مستودع GitHub ليقوم Vercel ببناء النسخة الجديدة تلقائياً.
2. افتح [Google Search Console](https://search.google.com/search-console) واختر موقع `https://rahatpost.com/`.
3. من القائمة الجانبية، افتح **خرائط المواقع (Sitemaps)** وأرسل الخريطتين التاليتين:
   - `https://rahatpost.com/sitemap.xml`
   - `https://rahatpost.com/news-sitemap.xml`
4. من شريط **فحص عنوان URL (URL Inspection)** في الأعلى، افحص الروابط الرئيسية التالية واضغط على **طلب الفهرسة (Request Indexing)** لكل منها:
   - `https://rahatpost.com/`
   - `https://rahatpost.com/news`
   - `https://rahatpost.com/buses`
   - `https://rahatpost.com/directory`
   - `https://rahatpost.com/haraj`
   - `https://rahatpost.com/today`
