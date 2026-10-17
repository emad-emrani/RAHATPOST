import { useSiteSettings } from "@/lib/site-settings/context";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PolicySection } from "@/components/policy";
import { Shell } from "@/components/shell";
import { breadcrumbLd, seo } from "@/lib/seo";
import { CONTACT_EMAIL, POLICY_UPDATED } from "@/lib/site";
import { tr, trv } from "@/lib/i18n/core";

export const Route = createFileRoute("/privacy")({
  head: () =>
    seo({
      title: tr("سياسة الخصوصية · رهط بوست"),
      description:
        tr("ما المعلومات التي يجمعها رهط بوست (اسم وبريد حساب Google، منشوراتك، رقم الهاتف إن أضفته)، أين تُخزَّن، ومن يراها، وكيف تحذف حسابك وبياناتك."),
      path: "/privacy",
      jsonLd: [breadcrumbLd([{ name: tr("سياسة الخصوصية"), path: "/privacy" }])],
    }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const g = useSiteSettings().google;
  const adsOn = g.adsenseEnabled && Boolean(g.adsensePub);
  const gaOn = (g.gaEnabled && Boolean(g.gaId)) || Boolean(g.gtmId);
  return (
    <Shell>
      <article className="flex flex-col gap-4">
        <header>
          <h1 className="text-2xl font-bold">{tr("سياسة الخصوصية")}</h1>
          <p className="font-semibold text-muted">{tr("آخر تحديث:")} {trv(POLICY_UPDATED)}</p>
        </header>
        <p className="text-lg">
          {tr("رهط بوست موقع وتطبيق مجتمعي لأهالي رهط والنقب. نجمع أقل ما يلزم لتشغيل الخدمة، ولا نبيع بياناتك ولا نعرض إعلانات تتبّعك.")}
        </p>

        <PolicySection title={tr("ما الذي نجمعه")}>
          <ul>
            <li>
              <b>{tr("عند تسجيل الدخول بحساب Google")}</b> {tr("(أو Facebook أو Apple إن توفّر): اسمك، بريدك الإلكتروني وصورة الحساب. مع Apple يمكنك إخفاء بريدك فنحصل على عنوان وسيط من Apple. لا نحصل على كلمة مرورك ولا ننشر شيئاً على حسابك.")}
            </li>
            <li>
              <b>{tr("ما تنشره")}</b>{tr(": الأخبار والإعلانات وطلبات إضافة النشاط، مع الحي ورقم الهاتف الذي تكتبه بنفسك والصور التي ترفعها معها (نزيل منها بيانات الموقع والكاميرا تلقائياً).")}
            </li>
            <li>
              <b>{tr("التعليقات")}</b>{tr(": نص تعليقك وردودك ووقتها والخبر الذي كتبتها عليه. تظهر للجميع فوراً مع اسمك وصورة حسابك (أو بعد موافقة الإدارة إذا كانت المراجعة المسبقة مفعّلة). يمكنك تعديل التعليق خلال 10 دقائق وحذفه في أي وقت.")}
            </li>
            <li>
              <b>{tr("البلاغات")}</b>{tr(": سبب البلاغ والملاحظة. نحفظ بصمة مشفّرة لا يمكن عكسها من حسابك أو عنوان IP فقط لمنع تكرار البلاغات.")}
            </li>
            <li>
              <b>{tr("الإشعارات")}</b>{tr(": إذا فعّلتها، نحفظ عنوان الاشتراك الذي يعطيه متصفحك والمواضيع التي اخترتها.")}
            </li>
            <li>
              <b>{tr("معلومات تقنية")}</b>{tr(": عنوان IP ونوع المتصفح في سجلات الخادم لفترة قصيرة لحماية الموقع من الإساءة، وإحصاءات زيارات وأداء مجمّعة بلا هوية وبلا ملفات ارتباط (Vercel Analytics).")}
            </li>
          </ul>
        </PolicySection>

        <PolicySection title={tr("من يرى ماذا")}>
          <ul>
            <li>{tr("بعد موافقة الإدارة يظهر منشورك للجميع مع الاسم الذي يظهر في حسابك.")}</li>
            <li>{tr("رقم الهاتف في الإعلان أو النشاط يظهر لمن يضغط «إظهار الرقم».")}</li>
            <li>{tr("بريدك الإلكتروني لا يُعرض لأحد.")}</li>
            <li>
              {tr("فريق الإدارة يرى المنشورات قبل نشرها والبلاغات المرسلة عنها، ويمكنه إخفاء أو حذف أي تعليق مخالف ومنع صاحبه من التعليق.")}
            </li>
          </ul>
        </PolicySection>

        <PolicySection title={tr("أين تُخزَّن البيانات")}>
          <p>
            {tr("يُستضاف الموقع على Vercel، وتُحفظ قاعدة البيانات لدى Neon (PostgreSQL) والصور في Vercel Blob، والاتصال بينهما مشفّر. تمرّ الإشعارات عبر خدمة الإشعارات الخاصة بمتصفحك (Google أو Apple أو Mozilla).")}
          </p>
        </PolicySection>

        <PolicySection title={tr("ملفات تعريف الارتباط والتخزين المحلي")}>
          <ul>
            <li>{tr("ملف ارتباط لجلسة تسجيل الدخول (ينتهي بعد 7 أيام أو عند الخروج).")}</li>
            <li>
              {tr("تخزين محلي في جهازك لتذكّر إخفاء بطاقة «ثبّت التطبيق» أو الإشعارات، وصفحات محفوظة للعمل بدون اتصال.")}
            </li>
            {adsOn || gaOn ? null : <li>{tr("لا نستخدم ملفات ارتباط إعلانية أو تتبّع من أطراف أخرى.")}</li>}
            {gaOn ? (
              <li>
                {tr("نستخدم Google Analytics لقياس عدد الزيارات والصفحات الأكثر قراءة. تضع Google ملفات ارتباط لهذا الغرض، ويمكنك منعها من إعدادات متصفحك أو بإضافة إلغاء الاشتراك من Google.")}
              </li>
            ) : null}
            {adsOn ? (
              <li>
                {tr("نعرض إعلانات من Google AdSense. قد تستخدم Google وشركاؤها ملفات ارتباط لعرض إعلانات بناءً على زياراتك السابقة لهذا الموقع أو لمواقع أخرى. يمكنك إيقاف الإعلانات المخصّصة من")}{" "}
                <a
                  href="https://adssettings.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {tr("إعدادات الإعلانات في Google")}
                </a>
                {tr(". لا نعرض إعلانات في لوحة الإدارة أو صفحات الحساب.")}
              </li>
            ) : null}
          </ul>
        </PolicySection>

        <PolicySection title={tr("حذف بياناتك")}>
          <p>
            {tr("يمكنك حذف أي منشور من صفحة")}{" "}
            <Link to="/my-posts" className="font-bold underline">
              {tr("منشوراتي")}
            </Link>
            {tr("، أو حذف حسابك كاملاً من «منشوراتي» ← «حذف حسابي». يُحذف عندها فوراً: حسابك، جلساتك، ربط حساب Google/Facebook/Apple، كل إعلاناتك وأخبارك وتعليقاتك وردودك وطلبات نشاطك (حتى الموافَق عليها في الدليل) وصورها واشتراكات الإشعارات. تبقى البلاغات التي أرسلتَها بدون أي ربط بك.")}
          </p>
          <p>
            {tr("قد تبقى نسخة في النسخ الاحتياطية التلقائية لدى مزوّد قاعدة البيانات لفترة محدودة، ثم تُمحى تلقائياً.")}
          </p>
        </PolicySection>

        <PolicySection title={tr("الأطفال")}>
          <p>{tr("الخدمة موجّهة لمن هم 13 عاماً فما فوق. لا نجمع بيانات الأطفال عن قصد.")}</p>
        </PolicySection>

        <PolicySection title={tr("التواصل")}>
          {CONTACT_EMAIL ? (
            <p>
              {tr("لأي سؤال عن الخصوصية أو لطلب حذف بياناتك:")}{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold underline" dir="ltr">
                {trv(CONTACT_EMAIL)}
              </a>
            </p>
          ) : (
            <p>{tr("لأي سؤال عن الخصوصية أو لحذف بياناتك استخدم «حذف حسابي» في صفحة منشوراتي.")}</p>
          )}
          <p>
            {tr("اقرأ أيضاً")}{" "}
            <Link to="/terms" className="font-bold underline">
              {tr("شروط الاستخدام")}
            </Link>
            .
          </p>
        </PolicySection>
      </article>
    </Shell>
  );
}
