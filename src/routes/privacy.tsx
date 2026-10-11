import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicySection } from "@/components/policy";
import { Shell } from "@/components/shell";
import { breadcrumbLd, seo } from "@/lib/seo";
import { CONTACT_EMAIL, POLICY_UPDATED } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  head: () =>
    seo({
      title: "سياسة الخصوصية · رهط بوست",
      description:
        "ما المعلومات التي يجمعها رهط بوست (اسم وبريد حساب Google، منشوراتك، رقم الهاتف إن أضفته)، أين تُخزَّن، ومن يراها، وكيف تحذف حسابك وبياناتك.",
      path: "/privacy",
      jsonLd: [breadcrumbLd([{ name: "سياسة الخصوصية", path: "/privacy" }])],
    }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <Shell>
      <article className="flex flex-col gap-4">
        <header>
          <h1 className="text-2xl font-bold">سياسة الخصوصية</h1>
          <p className="font-semibold text-muted">آخر تحديث: {POLICY_UPDATED}</p>
        </header>
        <p className="text-lg">
          رهط بوست موقع وتطبيق مجتمعي لأهالي رهط والنقب. نجمع أقل ما يلزم لتشغيل الخدمة، ولا نبيع
          بياناتك ولا نعرض إعلانات تتبّعك.
        </p>

        <PolicySection title="ما الذي نجمعه">
          <ul>
            <li>
              <b>عند تسجيل الدخول بحساب Google</b> (أو Facebook إن توفّر): اسمك، بريدك الإلكتروني
              وصورة الحساب. لا نحصل على كلمة مرورك ولا ننشر شيئاً على حسابك.
            </li>
            <li>
              <b>ما تنشره</b>: الأخبار والإعلانات وطلبات إضافة النشاط، مع الحي ورقم الهاتف الذي
              تكتبه بنفسك والصور التي ترفعها معها (نزيل منها بيانات الموقع والكاميرا تلقائياً).
            </li>
            <li>
              <b>البلاغات</b>: سبب البلاغ والملاحظة. نحفظ بصمة مشفّرة لا يمكن عكسها من حسابك أو
              عنوان IP فقط لمنع تكرار البلاغات.
            </li>
            <li>
              <b>الإشعارات</b>: إذا فعّلتها، نحفظ عنوان الاشتراك الذي يعطيه متصفحك والمواضيع التي
              اخترتها.
            </li>
            <li>
              <b>معلومات تقنية</b>: عنوان IP ونوع المتصفح في سجلات الخادم لفترة قصيرة لحماية الموقع
              من الإساءة، وإحصاءات زيارات وأداء مجمّعة بلا هوية وبلا ملفات ارتباط (Vercel
              Analytics).
            </li>
          </ul>
        </PolicySection>

        <PolicySection title="من يرى ماذا">
          <ul>
            <li>بعد موافقة الإدارة يظهر منشورك للجميع مع الاسم الذي يظهر في حسابك.</li>
            <li>رقم الهاتف في الإعلان أو النشاط يظهر لمن يضغط «إظهار الرقم».</li>
            <li>بريدك الإلكتروني لا يُعرض لأحد.</li>
            <li>فريق الإدارة يرى المنشورات قبل نشرها والبلاغات المرسلة عنها.</li>
          </ul>
        </PolicySection>

        <PolicySection title="أين تُخزَّن البيانات">
          <p>
            يُستضاف الموقع على Vercel، وتُحفظ قاعدة البيانات لدى Neon (PostgreSQL) والصور في Vercel
            Blob، والاتصال بينهما مشفّر. تمرّ الإشعارات عبر خدمة الإشعارات الخاصة بمتصفحك (Google أو
            Apple أو Mozilla).
          </p>
        </PolicySection>

        <PolicySection title="ملفات تعريف الارتباط والتخزين المحلي">
          <ul>
            <li>ملف ارتباط لجلسة تسجيل الدخول (ينتهي بعد 7 أيام أو عند الخروج).</li>
            <li>
              تخزين محلي في جهازك لتذكّر إخفاء بطاقة «ثبّت التطبيق» أو الإشعارات، وصفحات محفوظة
              للعمل بدون اتصال.
            </li>
            <li>لا نستخدم ملفات ارتباط إعلانية أو تتبّع من أطراف أخرى.</li>
          </ul>
        </PolicySection>

        <PolicySection title="حذف بياناتك">
          <p>
            يمكنك حذف أي منشور من صفحة{" "}
            <Link to="/my-posts" className="font-bold underline">
              منشوراتي
            </Link>
            ، أو حذف حسابك كاملاً من «منشوراتي» ← «حذف حسابي». يُحذف عندها فوراً: حسابك، جلساتك، ربط
            حساب Google/Facebook، كل إعلاناتك وأخبارك وطلبات نشاطك (حتى الموافَق عليها في الدليل)
            وصورها واشتراكات الإشعارات. تبقى البلاغات التي أرسلتَها بدون أي ربط بك.
          </p>
          <p>
            قد تبقى نسخة في النسخ الاحتياطية التلقائية لدى مزوّد قاعدة البيانات لفترة محدودة، ثم
            تُمحى تلقائياً.
          </p>
        </PolicySection>

        <PolicySection title="الأطفال">
          <p>الخدمة موجّهة لمن هم 13 عاماً فما فوق. لا نجمع بيانات الأطفال عن قصد.</p>
        </PolicySection>

        <PolicySection title="التواصل">
          {CONTACT_EMAIL ? (
            <p>
              لأي سؤال عن الخصوصية أو لطلب حذف بياناتك:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold underline" dir="ltr">
                {CONTACT_EMAIL}
              </a>
            </p>
          ) : (
            <p>لأي سؤال عن الخصوصية أو لحذف بياناتك استخدم «حذف حسابي» في صفحة منشوراتي.</p>
          )}
          <p>
            اقرأ أيضاً{" "}
            <Link to="/terms" className="font-bold underline">
              شروط الاستخدام
            </Link>
            .
          </p>
        </PolicySection>
      </article>
    </Shell>
  );
}
