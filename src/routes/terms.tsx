import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { breadcrumbLd, seo } from "@/lib/seo";
import { CONTACT_EMAIL, POLICY_UPDATED } from "@/lib/site";
import { PolicySection } from "@/components/policy";
import { tr, trv } from "@/lib/i18n/core";

export const Route = createFileRoute("/terms")({
  head: () =>
    seo({
      title: tr("شروط الاستخدام · رهط بوست"),
      description:
        tr("شروط استخدام رهط بوست: النشر بعد المراجعة، المحتوى الممنوع، الإبلاغ عن المنشورات، مسؤولية الناشر، والأخبار من مصادر خارجية."),
      path: "/terms",
      jsonLd: [breadcrumbLd([{ name: tr("شروط الاستخدام"), path: "/terms" }])],
    }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <Shell>
      <article className="flex flex-col gap-4">
        <header>
          <h1 className="text-2xl font-bold">{tr("شروط الاستخدام")}</h1>
          <p className="font-semibold text-muted">{tr("آخر تحديث:")} {trv(POLICY_UPDATED)}</p>
        </header>
        <PolicySection title={tr("الخدمة")}>
          <p>
            {tr("رهط بوست يجمع أخبار رهط والنقب من مصادرها، ويتيح للأهالي نشر أخبار وإعلانات وإضافة أنشطتهم إلى الدليل. الخدمة مجانية وتُقدَّم «كما هي».")}
          </p>
        </PolicySection>
        <PolicySection title={tr("النشر")}>
          <ul>
            <li>{tr("النشر يتطلب تسجيل الدخول، وكل خبر أو إعلان أو نشاط يُراجَع قبل ظهوره.")}</li>
            <li>
              {tr("التعليقات تظهر فوراً بعد فحص تلقائي للألفاظ والروابط (رابط واحد كحد أقصى)، ويمكن للإدارة إخفاؤها أو حذفها ومنع المسيء من التعليق.")}
            </li>
            <li>{tr("أنت مسؤول عن صحة ما تنشره وعن حقك في نشر الصور والمعلومات.")}</li>
            <li>{tr("للإدارة أن ترفض أو تحذف أي منشور يخالف هذه الشروط دون إشعار.")}</li>
          </ul>
        </PolicySection>
        <PolicySection title={tr("ممنوع")}>
          <ul>
            <li>{tr("الإساءة أو التحريض أو الكراهية أو التهديد.")}</li>
            <li>{tr("الاحتيال، والإعلانات المضللة، وبيع الممنوعات.")}</li>
            <li>{tr("نشر معلومات شخصية أو صور عن شخص آخر دون إذنه.")}</li>
            <li>{tr("الأخبار الكاذبة أو المنسوخة دون ذكر المصدر.")}</li>
            <li>{tr("الرسائل المكررة والدعاية المزعجة.")}</li>
          </ul>
        </PolicySection>
        <PolicySection title={tr("الإبلاغ")}>
          <p>
            {tr("في كل خبر قارئ وإعلان ونشاط وتعليق زر «إبلاغ». المنشور الذي يتلقى عدة بلاغات يُخفى مؤقتاً حتى تراجعه الإدارة.")}
          </p>
        </PolicySection>
        <PolicySection title={tr("الأخبار والمعلومات")}>
          <p>
            {tr("الأخبار المأخوذة من مواقع أخرى تُعرض بعنوانها ومقتطف قصير مع رابط للمصدر الأصلي، وترجمة أخبار إسرائيل آلية وقد تحتوي أخطاء. مواعيد الباصات والصيدلية المناوبة والتنبيهات للمساعدة فقط؛ في الطوارئ اتصل بـ 100 أو 101.")}
          </p>
        </PolicySection>
        <PolicySection title={tr("الحساب")}>
          <p>
            {tr("يمكنك حذف حسابك في أي وقت من «منشوراتي». تفاصيل البيانات في")}{" "}
            <Link to="/privacy" className="font-bold underline">
              {tr("سياسة الخصوصية")}
            </Link>
            {CONTACT_EMAIL ? (
              <>
                {tr("، وللتواصل:")}{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold underline" dir="ltr">
                  {trv(CONTACT_EMAIL)}
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
