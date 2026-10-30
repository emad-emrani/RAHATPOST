import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicySection } from "@/components/policy";
import { Shell } from "@/components/shell";
import { tr, trv } from "@/lib/i18n/core";
import { breadcrumbLd, seo } from "@/lib/seo";
import { CONTACT_EMAIL, POLICY_UPDATED } from "@/lib/site";
import { useSiteSettings } from "@/lib/site-settings/context";

export const Route = createFileRoute("/privacy")({
  head: () =>
    seo({
      title: tr("سياسة الخصوصية ومن نحن · رهط بوست"),
      description: tr(
        "سياسة الخصوصية، ملفات تعريف الارتباط (الكوكيز) الخاصة بـ Google AdSense، ومعلومات «من نحن» والتواصل الرسمي لمنصة رهط بوست الإخبارية والخدمية في رهط والنقب.",
      ),
      path: "/privacy",
      jsonLd: [
        breadcrumbLd([{ name: tr("سياسة الخصوصية ومن نحن"), path: "/privacy" }]),
      ],
    }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const st = useSiteSettings();
  const contactEmail = st.texts.contactEmail || CONTACT_EMAIL || "amad.wwf@gmail.com";

  return (
    <Shell>
      <article className="flex flex-col gap-4">
        <header className="rounded-3xl border border-line bg-paper p-5 shadow-2xs">
          <span className="inline-block rounded-full bg-primary px-3 py-0.5 text-xs font-extrabold text-ink">
            {tr("وثيقة رسمية معتمدة")}
          </span>
          <h1 className="mt-2 text-2xl font-extrabold">
            {tr("سياسة الخصوصية، ملفات تعريف الارتباط، ومن نحن · رهط بوست")}
          </h1>
          <p className="mt-1 text-sm font-semibold text-muted">
            {tr("آخر تحديث:")} {trv(POLICY_UPDATED)} · {tr("النطاق الرسمي:")}{" "}
            <span dir="ltr">https://www.rahatpost.com</span>
          </p>
        </header>

        <PolicySection title={tr("من نحن — عن منصة رهط بوست وسياستها التحريرية")}>
          <p>
            {tr(
              "منصة «رهط بوست» (Rahat Post) هي بوابة إخبارية وخدمية مجتمعية مستقلة تخدم أهالي مدينة رهط ومنطقة النقب. تهدف المنصة إلى تقديم تغطية إخبارية محلية موثوقة على مدار الساعة، إلى جانب توفير خدمات رقمية يومية أساسية للسكان تشمل: جدول وخريطة التتبع المباشر لباصات رهط (شركة غاليم)، دليل المصالح والمحلات التجارية في رهط، أدلة الخدمات البلدية والبريد والصحة، لوحة صيدلية المناوبة وأرقام الطوارئ، وسوق ومتجر رهط الموحّد.",
            )}
          </p>
          <p className="mt-2">
            {tr(
              "تلتزم هيئة تحرير رهط بوست بالمعايير المهنية والصحفية، وتراجع جميع مساهمات القراء والإعلانات المبوبة والأنشطة التجارية قبل نشرها لضمان خلوّها من أي محتوى مضلل أو مخالف للقانون.",
            )}
          </p>
        </PolicySection>

        <PolicySection title={tr("إفصاح إعلانات Google AdSense وملفات تعريف الارتباط (Cookies)")}>
          <ul>
            <li>
              <b>{tr("مورّدو الطرف الثالث وإعلانات Google:")}</b>{" "}
              {tr(
                "تستخدم منصة رهط بوست خدمة Google AdSense لعرض الإعلانات للزوار. تستخدم شركة Google، بصفتها مورّداً خارجياً (Third-party vendor)، ملفات تعريف الارتباط (Cookies) — بما في ذلك ملف تعريف الارتباط DART ومعرّفات الإعلانات — لعرض الإعلانات على موقعنا بناءً على زيارات المستخدم السابقة لموقع رهط بوست أو لمواقع أخرى على شبكة الإنترنت.",
              )}
            </li>
            <li>
              <b>{tr("إلغاء الاشتراك في الإعلانات المخصّصة:")}</b>{" "}
              {tr(
                "يمكن للمستخدمين في أي وقت اختيار عدم استخدام ملفات تعريف الارتباط للإعلانات المخصّصة من خلال زيارة",
              )}{" "}
              <a
                href="https://adssettings.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline"
              >
                {tr("إعدادات الإعلانات في Google (Google Ads Settings)")}
              </a>{" "}
              {tr("أو من خلال زيارة")}{" "}
              <a
                href="https://policies.google.com/technologies/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline"
              >
                {tr("سياسة خصوصية الإعلانات في Google")}
              </a>
              .
            </li>
            <li>
              <b>{tr("كيف تستخدم Google البيانات:")}</b>{" "}
              {tr(
                "لمعرفة المزيد حول كيفية جمع Google للبيانات ومعالجتها عند استخدامك لموقعنا، يرجى الاطلاع على صفحة",
              )}{" "}
              <a
                href="https://policies.google.com/technologies/partner-sites"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline"
              >
                {tr("كيفية استخدام Google للبيانات عند استخدامك لمواقع الشركاء أو تطبيقاتهم")}
              </a>
              .
            </li>
            <li>
              <b>{tr("Google Analytics وقياس الأداء:")}</b>{" "}
              {tr(
                "نستخدم خدمة Google Analytics لقياس إحصاءات الزيارات وتحسين تجربة التصفح وسرعة الموقع. لا نعرض أي إعلانات في صفحات تسجيل الدخول أو لوحة الإدارة الخاصة.",
              )}
            </li>
          </ul>
        </PolicySection>

        <PolicySection title={tr("البيانات التي نجمعها وكيف نستخدمها")}>
          <ul>
            <li>
              <b>{tr("عند تسجيل الدخول الاختياري:")}</b>{" "}
              {tr(
                "عند الدخول عبر حساب Google أو Facebook أو البريد الإلكتروني، نحفظ الاسم والبريد الإلكتروني وصورة الحساب لتمكينك من نشر الإعلانات أو التعليقات وإدارتها. لا نحصل على كلمة مرور حسابك الخارجي ولا ننشر شيئاً نيابةً عنك.",
              )}
            </li>
            <li>
              <b>{tr("المحتوى الذي يضيفه المستخدم:")}</b>{" "}
              {tr(
                "الأخبار المجتمعية، إعلانات سوق الحراج، وطلبات إدراج المصالح التجارية في الدليل، مع رقم الهاتف والحي والصور المرفقة (يتم مسح بيانات الموقع الجغرافي EXIF من الصور المرفوعة تلقائياً لحماية خصوصيتك).",
              )}
            </li>
            <li>
              <b>{tr("التعليقات والبلاغات:")}</b>{" "}
              {tr(
                "تظهر التعليقات مع اسم الحساب، ويمكن للمستخدم تعديل تعليقه أو حذفه في أي وقت، كما تتوفر أداة إبلاغ فورية في كل خبر وإعلان وتعليق لمراجعة أي مخالفة.",
              )}
            </li>
            <li>
              <b>{tr("الجلسات والتخزين المحلي:")}</b>{" "}
              {tr(
                "نستخدم ملفات ارتباط أساسية لحفظ جلسة تسجيل الدخول وتفضيل اللغة (العربية، العبرية، الإنجليزية) وإعدادات الإشعارات.",
              )}
            </li>
          </ul>
        </PolicySection>

        <PolicySection title={tr("أمن البيانات وحق حذف الحساب والبيانات")}>
          <p>
            {tr(
              "تُستضاف منصة رهط بوست على خوادم آمنة ومشفّرة عبر بروتوكول HTTPS. يمكنك في أي وقت حذف أي منشور أو إعلان أضفته من صفحة",
            )}{" "}
            <Link to="/my-posts" className="font-bold underline">
              {tr("منشوراتي")}
            </Link>
            {tr(
              "، أو حذف حسابك وكافة بياناتك نهائياً وبشكل فوري بضغطة زر من خيار «حذف حسابي» داخل صفحة منشوراتي.",
            )}
          </p>
        </PolicySection>

        <PolicySection title={tr("حماية خصوصية الأطفال")}>
          <p>
            {tr(
              "خدمات الموقع موجّهة للجمهور العام لمن هم في سن 13 عاماً فما فوق، ولا نجمع عن قصد أي بيانات شخصية من الأطفال دون هذا السن.",
            )}
          </p>
        </PolicySection>

        <PolicySection title={tr("اتصل بنا — التواصل مع إدارة رهط بوست")}>
          <p>
            {tr(
              "لأي استفسار يتعلق بسياسة الخصوصية، الإعلانات التجارية، حقوق النشر، أو طلب حذف البيانات، يسعدنا تواصلكم المباشر مع إدارة منصة رهط بوست (مدينة رهط، النقب) عبر البريد الإلكتروني الرسمي:",
            )}{" "}
            <a
              href={`mailto:${contactEmail}`}
              className="font-extrabold underline"
              dir="ltr"
            >
              {trv(contactEmail)}
            </a>
          </p>
          <p className="mt-2">
            {tr("يرجى الاطلاع أيضاً على")}{" "}
            <Link to="/terms" className="font-bold underline">
              {tr("شروط الاستخدام والسياسة التحريرية")}
            </Link>
            .
          </p>
        </PolicySection>
      </article>
    </Shell>
  );
}
