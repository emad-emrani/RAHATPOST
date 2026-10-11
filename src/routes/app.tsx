import { createFileRoute } from "@tanstack/react-router";
import { LogIn, Smartphone, WifiOff } from "lucide-react";
import { InstallButton } from "@/components/install-app";
import { NotificationsCard } from "@/components/notify";
import { Shell } from "@/components/shell";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/app")({
  head: () =>
    seo({
      title: "تطبيق رهط بوست: ثبّته على هاتفك",
      description:
        "ثبّت تطبيق رهط بوست على هاتفك (أندرويد وآيفون) بضغطة واحدة: أخبار رهط والنقب، باصات رهط، الدليل والإعلانات، ويعمل حتى بدون اتصال.",
      path: "/app",
    }),
  component: AppPage,
});

function AppPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex items-center gap-3">
          <img
            src="/icons/icon-192.png"
            alt=""
            width={64}
            height={64}
            className="size-16 rounded-2xl"
          />
          <div>
            <h1 className="text-2xl font-bold">تطبيق رهط بوست</h1>
            <p className="font-semibold text-muted">مجاني، بدون متجر، ويتحدّث تلقائياً</p>
          </div>
        </div>
        <InstallButton />
        <div className="mt-5">
          <NotificationsCard />
        </div>
        <ul className="mt-5 flex flex-col gap-3">
          <li className="stamp flex items-center gap-3 p-4">
            <span className="icon-badge shrink-0">
              <Smartphone className="size-5" aria-hidden />
            </span>
            <span className="font-semibold">
              أيقونة على الشاشة الرئيسية، ويفتح بملء الشاشة كتطبيق.
            </span>
          </li>
          <li className="stamp flex items-center gap-3 p-4">
            <span className="icon-badge shrink-0">
              <WifiOff className="size-5" aria-hidden />
            </span>
            <span className="font-semibold">الصفحات التي فتحتها مؤخراً تعمل حتى بدون إنترنت.</span>
          </li>
          <li className="stamp flex items-center gap-3 p-4">
            <span className="icon-badge shrink-0">
              <LogIn className="size-5" aria-hidden />
            </span>
            <span className="font-semibold">
              تسجيل الدخول بحساب Google يعمل داخل التطبيق أيضاً.
            </span>
          </li>
        </ul>
      </div>
    </Shell>
  );
}
