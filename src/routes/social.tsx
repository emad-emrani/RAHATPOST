import { createFileRoute } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { SocialVipFeedAndTrendsSection } from "@/components/social-vip-feed";
import { breadcrumbLd, seo } from "@/lib/seo";
import { tr } from "@/lib/i18n/core";

export const Route = createFileRoute("/social")({
  head: () =>
    seo({
      title: tr("تواصل اجتماعي · المشاهير والسياسيون والتريند في رهط والعالم · رهط بوست"),
      description: tr(
        "منصة تواصل اجتماعي في رهط بوست: تابع آخر منشورات وتغريدات الشخصيات والمؤسسات المحلية في رهط والنقب، والسياسيين والمشاهير بتصميم فيسبوك وإكس مع ترجمة فورية والتريند المباشر.",
      ),
      path: "/social",
      keywords: [
        "تواصل اجتماعي رهط",
        "تغريدات المشاهير رهط",
        "سياسيون النقب",
        "تريند رهط اليوم",
        "فيسبوك رهط بوست",
      ],
      jsonLd: [breadcrumbLd([{ name: tr("تواصل اجتماعي"), path: "/social" }])],
    }),
  headers: () => ({
    "Cache-Control": "public, max-age=15, s-maxage=60, stale-while-revalidate=180",
  }),
  component: SocialPage,
});

function SocialPage() {
  return (
    <Shell wide>
      <div className="space-y-3">
        {/* Compact Page Top Title Banner */}
        <div className="rounded-2xl border border-primary-deep/50 bg-gradient-to-l from-[#1877f2] via-[#0f2942] to-[#0f172a] px-3.5 py-2 text-white shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-black text-[#111827]">
                🌐 تواصل وتريند
              </span>
              <h1 className="truncate text-xs font-extrabold sm:text-sm">
                {tr("منشورات وتغريدات المشاهير والسياسيين")}
              </h1>
            </div>
            <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-extrabold text-white ring-1 ring-white/20">
              📘 + 𝕏
            </span>
          </div>
        </div>

        {/* Social Feed + Trends */}
        <SocialVipFeedAndTrendsSection isFullPage />
      </div>
    </Shell>
  );
}
