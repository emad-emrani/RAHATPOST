import { createFileRoute } from "@tanstack/react-router";
import { LogIn, Smartphone, WifiOff } from "lucide-react";
import { InstallButton } from "@/components/install-app";
import { Shell } from "@/components/shell";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "تطبيق رهط بوست" }] }),
  component: AppPage,
});

function AppPage() {
  return (
    <Shell>
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex items-center gap-3">
          <img src="/icons/icon-192.png" alt="" className="size-16 rounded-2xl" />
          <div>
            <h1 className="text-2xl font-bold">تطبيق رهط بوست</h1>
            <p className="font-semibold text-muted">مجاني، بدون متجر، ويتحدّث تلقائياً</p>
          </div>
        </div>
        <InstallButton />
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
