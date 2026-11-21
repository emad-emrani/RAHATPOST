# دليل الرفع المباشر على نفس مشروع رهط بوست (GitHub)

هذه الحزمة مصممة خصيصاً للرفع مباشرة على **نفس مستودع موقع رهط بوست الحالي** بأمان 100%:
- **لا تستبدل** `package.json` أو `index.html` أو `vercel.json` أو `README.md` أو `src/App.tsx`.
- **بدون قاعدة بيانات جديدة** (تعتمد بالكامل على `public/rahatpost-layout.json`).
- **لا تغيّر شكل الموقع أو تطبيقي أندرويد وآبل** إطلاقاً.

## خطوات الرفع على نفس مشروع رهط بوست في GitHub
1. فك الضغط عن ملف `rahatpost-same-repo-upload.zip`.
2. افتح مستودع **رهط بوست** الحالي على GitHub ← اضغط `Add file` ← `Upload files`.
3. اسحب جميع الملفات والمجلدات الناتجة (`public`، `src`، `.github`، `rahatpost-auto-link.mjs`، `RAHATPOST_UPLOAD_GUIDE.md`) وأفلتها في صفحة الرفع ← اضغط **Commit changes**.
4. سيعيد Vercel نشر المشروع تلقائياً خلال ثوانٍ، وستفتح لوحة التحكم الحصرية مباشرة على:
   - `https://rahatpost.com/admin-pro/` (أو `https://rahatpost.com/admin-pro/index.html`)
   - **رمز الدخول الافتراضي:** `2026` (غيّره فوراً من صفحة «الربط المباشر والحماية»).

## ربط الجسر بضغطة زر من GitHub (بدون فتح كمبيوتر أو Terminal)
1. من داخل مستودع رهط بوست على GitHub، افتح تبويب **Actions**.
2. اختر **RahatPost Admin Pro (Validate & Optional Auto-Link)** ← اضغط **Run workflow**.
3. سيضيف السطر `<script src="/rahatpost-bridge.js" defer></script>` تلقائياً إلى `index.html` بدون المساس بأي شيء آخر.

## تفعيل النشر المباشر من اللوحة (بدون قاعدة بيانات)
1. افتح `https://rahatpost.com/admin-pro/` وانتقل إلى **الربط المباشر والحماية**.
2. أدخل اسم مستودع رهط بوست (`username/repo`) ورمز **GitHub Personal Access Token** (بصلاحية `Contents: Read and write`) ثم احفظ.
3. بعد ذلك، أي تعديل في ترتيب الأقسام (**الأخبار، الباصات، الخدمات، الدليل، الحراج، القوائم**) أو المظهر تضغط فيه **«نشر للموقع»** سيحدّث `public/rahatpost-layout.json` مباشرة على GitHub وينشره Vercel تلقائياً.

## روابط وتكامل الموقع والتطبيقات
- **تطبيقا Android و iOS**: اقرأ الترتيب والإعدادات مباشرة من:
  `GET https://rahatpost.com/rahatpost-layout.json`
- **ترتيب الأقسام في React (اختياري بدون تغيير التصميم)**:
  ```tsx
  import { RahatSectionOrder } from './admin-pro/RahatSectionOrder';

  <RahatSectionOrder
    sections={{
      news: <NewsSection />,
      buses: <BusesSection />,
      services: <ServicesSection />,
      directory: <DirectorySection />,
      haraj: <HarajSection />,
      menus: <MenusSection />
    }}
  />
  ```
