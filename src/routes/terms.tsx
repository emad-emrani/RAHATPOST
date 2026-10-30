import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicySection } from "@/components/policy";
import { Shell } from "@/components/shell";
import { tr, trv } from "@/lib/i18n/core";
import { breadcrumbLd, seo } from "@/lib/seo";
import { CONTACT_EMAIL, POLICY_UPDATED } from "@/lib/site";
import { useSiteSettings } from "@/lib/site-settings/context";

export const Route = createFileRoute("/terms")({
  head: () =>
    seo({
      title: tr("شروط الاستخدام والسياسة التحريرية · رهط بوست"),
      description: tr(
        "شروط الاستخدام، السياسة التحريرية، حقوق الملكية الفكرية، ومعايير النشر والإعلانات في منصة رهط بوست الإخبارية والخدمية في رهط والنقب.",
      ),
      path: "/terms",
      jsonLd: [
        breadcrumbLd([{ name: tr("شروط الاستخدام"), path: "/terms" }]),
      ],
    }),
  component: TermsPage,
});

function TermsPage() {
  const st = useSiteSettings();
  const contactEmail = st.texts.contactEmail || CONTACT_EMAIL || "amad.wwf@gmail.com";

  return (
    <Shell>
      <article className="flex flex-col gap-4">
        <header className="rounded-3xl border border-line bg-paper p-5 shadow-2xs">
          <span className="inline-block rounded-full bg-primary px-3 py-0.5 text-xs font-extrabold text-ink">
            {tr("اتفاقية الاستخدام والسياسة التحريرية")}
          </span>
          <h1 className="mt-2 text-2xl font-extrabold">
            {tr("شروط الاستخدام والسياسة التحريرية · رهط بوست")}
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted">
            {tr("آخر تحديث:")} {trv(POLICY_UPDATED)} · {tr("النطاق الرسمي:")}{" "}
            <span dir="ltr">https://www.rahatpost.com</span>
          </p>
        </header>

        <PolicySection title={tr("طبيعة الخدمة والهدف المجتمعي")}>
          <p>
            {tr(
              "تقدّم منصة «رهط بوست» تغطية إخبارية محلية وإقليمية لأهالي مدينة رهط والنقب، إلى جانب خدمات رقمية مجتمعية مجانية تشمل: تتبع ومواعيد باصات رهط (شركة غاليم)، دليل المصالح والخدمات، أدلة البريد والبلدية والصحة، صيدلية المناوبة وأرقام الطوارئ، وسوق ومتجر رهط.",
            )}
          </p>
        </PolicySection>

        <PolicySection title={tr("ضوابط النشر والمراجعة التحريرية")}>
          <ul>
            <li>
              {tr(
                "يتطلب نشر أخبار القراء أو الإعلانات في سوق الحراج أو إضافة الأنشطة التجارية تسجيل الدخول، وتخضع المساهمات للمراجعة التحريرية لضمان جودتها ومصداقيتها.",
              )}
            </li>
            <li>
              {tr(
                "تُفحص التعليقات آلياً وبشرياً لمنع الألفاظ المسيئة أو الروابط الضارة، ولإدارة الموقع الحق الكامل في حذف أي تعليق أو منشور يخالف القوانين أو معايير المجتمع.",
              )}
            </li>
            <li>
              {tr(
                "يتحمل الناشر (المستخدم أو المعلن) المسؤولية القانونية الكاملة عن دقة البيانات والصور والأسعار التي يدرجها في إعلانه أو نشاطه التجاري.",
              )}
            </li>
          </ul>
        </PolicySection>

        <PolicySection title={tr("المحتوى المحظور وسياسة الاستخدام الآمن")}>
          <ul>
            <li>
              {tr(
                "يُمنع منعاً باتاً نشر أي محتوى يتضمن تحريضاً، عنفاً، خطاب كراهية، تمييزاً، أو إساءة لأي فرد أو مؤسسة.",
              )}
            </li>
            <li>
              {tr(
                "يُحظر نشر الإعلانات المضللة أو الاحتيالية، أو عرض أي سلع أو خدمات ممنوعة قانونياً أو مخالفة لسياسات برنامج Google AdSense.",
              )}
            </li>
            <li>
              {tr(
                "يُمنع نشر بيانات شخصية أو أرقام هواتف أو صور تخص الغير دون إذن صريح من أصحابها.",
              )}
            </li>
            <li>
              {tr(
                "يُحظر نسخ المقالات المحمية بحقوق الطبع والنشر دون إذن أو دون الإشارة الواضحة للمصدر الأصلي.",
              )}
            </li>
          </ul>
        </PolicySection>

        <PolicySection title={tr("حقوق الملكية الفكرية والمصادر الإخبارية")}>
          <p>
            {tr(
              "الأدلة الخدمية والتقارير المحلية والتصاميم البرمجية خاصة بمنصة رهط بوست. أما الأخبار المستندة إلى وكالات أو مصادر إخبارية خارجية فيُشار فيها بوضوح إلى اسم المصدر الأصلي ورابطه المباشر حفظاً للحقوق الصحفية والأدبية.",
            )}
          </p>
        </PolicySection>

        <PolicySection title={tr("إخلاء المسؤولية عن المواعيد والطوارئ")}>
          <p>
            {tr(
              "تُجلب بيانات تتبع الباصات ومواعيدها والطقس وصيدلية المناوبة من المصادر الرسمية لمساعدة الأهالي وتسهيل حياتهم اليومية، وقد تطرأ عليها تغييرات ميدانية من شركات المشغّلين. في حالات الطوارئ الطبية أو الأمنية يرجى الاتصال المباشر بأرقام الطوارئ الرسمية (الشرطة 100، الإسعاف 101، الإطفاء 102).",
            )}
          </p>
        </PolicySection>

        <PolicySection title={tr("إدارة الحساب، الخصوصية، والتواصل الرسمي")}>
          <p>
            {tr("يمكن لأي مشترك إدارة منشوراته أو حذف حسابه في أي وقت، ولمعرفة تفاصيل ملفات تعريف الارتباط والإعلانات يرجى قراءة")}{" "}
            <Link to="/privacy" className="font-bold underline">
              {tr("سياسة الخصوصية ومن نحن")}
            </Link>
            . {tr("للتواصل مع إدارة الموقع وهيئة التحرير:")}{" "}
            <a
              href={`mailto:${contactEmail}`}
              className="font-extrabold underline"
              dir="ltr"
            >
              {trv(contactEmail)}
            </a>
            .
          </p>
        </PolicySection>
      </article>
    </Shell>
  );
}
