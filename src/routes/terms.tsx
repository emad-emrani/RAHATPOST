import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { breadcrumbLd, seo } from "@/lib/seo";
import { CONTACT_EMAIL, POLICY_UPDATED } from "@/lib/site";
import { PolicySection } from "@/components/policy";

export const Route = createFileRoute("/terms")({
  head: () =>
    seo({
      title: "شروط الاستخدام · رهط بوست",
      description:
        "شروط استخدام رهط بوست: النشر بعد المراجعة، المحتوى الممنوع، الإبلاغ عن المنشورات، مسؤولية الناشر، والأخبار من مصادر خارجية.",
      path: "/terms",
      jsonLd: [breadcrumbLd([{ name: "شروط الاستخدام", path: "/terms" }])],
    }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <Shell>
      <article className="flex flex-col gap-4">
        <header>
          <h1 className="text-2xl font-bold">شروط الاستخدام</h1>
          <p className="font-semibold text-muted">آخر تحديث: {POLICY_UPDATED}</p>
        </header>
        <PolicySection title="الخدمة">
          <p>
            رهط بوست يجمع أخبار رهط والنقب من مصادرها، ويتيح للأهالي نشر أخبار وإعلانات وإضافة
            أنشطتهم إلى الدليل. الخدمة مجانية وتُقدَّم «كما هي».
          </p>
        </PolicySection>
        <PolicySection title="النشر">
          <ul>
            <li>النشر يتطلب تسجيل الدخول، وكل منشور يُراجَع قبل ظهوره.</li>
            <li>أنت مسؤول عن صحة ما تنشره وعن حقك في نشر الصور والمعلومات.</li>
            <li>للإدارة أن ترفض أو تحذف أي منشور يخالف هذه الشروط دون إشعار.</li>
          </ul>
        </PolicySection>
        <PolicySection title="ممنوع">
          <ul>
            <li>الإساءة أو التحريض أو الكراهية أو التهديد.</li>
            <li>الاحتيال، والإعلانات المضللة، وبيع الممنوعات.</li>
            <li>نشر معلومات شخصية أو صور عن شخص آخر دون إذنه.</li>
            <li>الأخبار الكاذبة أو المنسوخة دون ذكر المصدر.</li>
            <li>الرسائل المكررة والدعاية المزعجة.</li>
          </ul>
        </PolicySection>
        <PolicySection title="الإبلاغ">
          <p>
            في كل خبر قارئ وإعلان ونشاط زر «إبلاغ عن مشكلة». المنشور الذي يتلقى عدة بلاغات يُخفى
            مؤقتاً حتى تراجعه الإدارة.
          </p>
        </PolicySection>
        <PolicySection title="الأخبار والمعلومات">
          <p>
            الأخبار المأخوذة من مواقع أخرى تُعرض بعنوانها ومقتطف قصير مع رابط للمصدر الأصلي، وترجمة
            أخبار إسرائيل آلية وقد تحتوي أخطاء. مواعيد الباصات والصيدلية المناوبة والتنبيهات
            للمساعدة فقط؛ في الطوارئ اتصل بـ 100 أو 101.
          </p>
        </PolicySection>
        <PolicySection title="الحساب">
          <p>
            يمكنك حذف حسابك في أي وقت من «منشوراتي». تفاصيل البيانات في{" "}
            <Link to="/privacy" className="font-bold underline">
              سياسة الخصوصية
            </Link>
            {CONTACT_EMAIL ? (
              <>
                ، وللتواصل:{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold underline" dir="ltr">
                  {CONTACT_EMAIL}
                </a>
              </>
            ) : null}
            .
          </p>
        </PolicySection>
      </article>
    </Shell>
  );
}
