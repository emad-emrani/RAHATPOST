import type { ReactNode } from "react";

export function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="stamp p-4">
      <h2 className="mb-2 text-xl font-bold">{title}</h2>
      <div className="flex flex-col gap-2 text-lg leading-relaxed [&_li]:ms-5 [&_li]:list-disc">
        {children}
      </div>
    </section>
  );
}
