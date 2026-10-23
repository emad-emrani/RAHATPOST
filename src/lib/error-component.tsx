import { Link, type ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

const FALLBACK_MESSAGE = "An unexpected error occurred. Try reloading the page.";

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return FALLBACK_MESSAGE;
}

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main
      className={
        "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center " +
        "bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50"
      }
    >
      <span className="text-red-500" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm break-words text-zinc-500 dark:text-zinc-400">
        {errorMessage(error)}
      </p>
    </main>
  );
}

export function AppNotFoundComponent() {
  return (
    <main
      dir="rtl"
      lang="ar"
      className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-4 px-4 py-12 text-center"
    >
      <h1 className="text-2xl font-bold">الصفحة غير موجودة (404)</h1>
      <p className="font-semibold text-muted">
        الرابط الذي تبحث عنه غير متوفر أو تم نقله. يمكنك تصفح أقسام موقع رهط بوست الرئيسية:
      </p>
      <nav className="mt-2 flex flex-wrap justify-center gap-2" aria-label="أقسام الموقع">
        <Link to="/" className="btn px-4">
          الرئيسية
        </Link>
        <Link to="/news" className="btn btn-ghost px-4">
          أخبار رهط والنقب
        </Link>
        <Link to="/buses" className="btn btn-ghost px-4">
          باصات رهط
        </Link>
        <Link to="/directory" className="btn btn-ghost px-4">
          دليل رهط
        </Link>
        <Link to="/haraj" className="btn btn-ghost px-4">
          حراج رهط
        </Link>
        <Link to="/today" className="btn btn-ghost px-4">
          لوحة اليوم
        </Link>
      </nav>
    </main>
  );
}
