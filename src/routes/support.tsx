import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageCircle } from "lucide-react";
import { PolicySection } from "@/components/policy";
import { Shell } from "@/components/shell";
import { tr, trv } from "@/lib/i18n/core";
import { breadcrumbLd, seo } from "@/lib/seo";
import { CONTACT_EMAIL } from "@/lib/site";
import { useSiteSettings } from "@/lib/site-settings/context";
import { getStore } from "@/lib/store/api";

const FALLBACK_WHATSAPP = "+972546669704";

function waLink(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : "";
}

export const Route = createFileRoute("/support")({
  loader: async () => {
    const store = await getStore().catch(() => null);
    const whatsapp = store?.ok ? store.settings.whatsapp || FALLBACK_WHATSAPP : FALLBACK_WHATSAPP;
    return { whatsapp };
  },
  head: () =>
    seo({
      title: tr("الدعم والمساعدة · رهط بوست"),
      description: tr(
        "كيف تتواصل مع رهط بوست، تبلغ عن محتوى أو مستخدم، وتحذف حسابك أو تطلب حذف بياناتك. تطبيق رهط بوست لأخبار وخدمات مدينة رهط.",
      ),
      path: "/support",
      jsonLd: [breadcrumbLd([{ name: tr("الدعم والمساعدة"), path: "/support" }])],
    }),
  component: SupportPage,
});

function SupportPage() {
  const st = useSiteSettings();
  const { whatsapp } = Route.useLoaderData();
  const contactEmail = st.texts.contactEmail || CONTACT_EMAIL || "amad.wwf@gmail.com";
  const wa = waLink(whatsapp);

  return (
    <Shell>
      <article className="flex flex-col gap-4">
        <header className="rounded-3xl border border-line bg-paper p-5 shadow-2xs">
          <h1 className="text-2xl font-extrabold">{tr("الدعم والمساعدة")}</h1>
          <p className="mt-2 font-semibold leading-relaxed">
            {tr(
              "رهط بوست تطبيق وموقع لأخبار مدينة رهط والنقب، مواعيد الباصات، دليل المحلات، حراج الإعلانات المبوبة، والمتجر. التصفح مجاني، وبعض الإجراءات مثل نشر إعلان أو تعليق تحتاج حساباً.",
            )}
          </p>
        </header>

        <PolicySection title={tr("تواصل معنا")}>
          <p>{tr("للاستفسار أو لطلب مساعدة في الحساب:")}</p>
          <a className="btn mt-2 w-full sm:w-auto" href={`mailto:${contactEmail}`}>
            <Mail className="size-5" aria-hidden />
            <span dir="ltr">{trv(contactEmail)}</span>
          </a>
          {wa ? (
            <a className="btn mt-2 w-full bg-[#25d366] text-white sm:w-auto" href={wa} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="size-5" aria-hidden />
              {tr("واتساب الدعم")}
            </a>
          ) : null}
        </PolicySection>

        <PolicySection title={tr("الإبلاغ عن محتوى أو مستخدم")}>
          <p>
            {tr(
              "في كل إعلان في حراج رهط يوجد زر «إبلاغ عن إعلان». اختر السبب (احتيال، محتوى غير لائق، سلعة غير قانونية، تصنيف خاطئ، أو أخرى) وأضف ملاحظة إن شئت. البلاغ يصل إلى الإدارة دون الحاجة إلى حساب.",
            )}
          </p>
          <p>
            {tr(
              "إذا وصل الإعلان إلى ثلاثة بلاغات من أشخاص مختلفين يُخفى تلقائياً حتى تراجعه الإدارة. يمكن أيضاً الإبلاغ عن خبر أو تعليق أو نشاط في الدليل من صفحته.",
            )}
          </p>
          <p>
            {tr(
              "إذا كنت داخل حسابك يمكنك إخفاء كل إعلانات عضو معيّن عنك من صفحة إعلانه، عبر «إخفاء إعلانات هذا العضو». هذا الإخفاء لك وحدك ولا يحذف الإعلان من الموقع.",
            )}
          </p>
        </PolicySection>

        <PolicySection title={tr("حذف الحساب أو طلب حذف البيانات")}>
          <p>
            {tr("من داخل التطبيق أو الموقع: افتح")}{" "}
            <Link to="/my-posts" className="font-bold underline">{tr("منشوراتي")}</Link>
            {tr(" ثم «حذف حسابي». يُحذف حسابك وإعلاناتك وأخبارك وتعليقاتك وطلبات الدليل فوراً.")}
          </p>
          <p>
            {tr(
              "إذا لم تستطع الدخول، أرسل طلباً من البريد أعلاه بعنوان «حذف بياناتي» واذكر عنوان البريد المسجّل في الحساب. ننفّذ الحذف بعد التأكد من أن الطلب من صاحب الحساب.",
            )}
          </p>
        </PolicySection>

        <PolicySection title={tr("الخصوصية والشروط")}>
          <p>
            <Link to="/privacy" className="font-bold underline">{tr("سياسة الخصوصية")}</Link>
            {" · "}
            <Link to="/terms" className="font-bold underline">{tr("شروط الاستخدام")}</Link>
          </p>
        </PolicySection>
      </article>
    </Shell>
  );
}
