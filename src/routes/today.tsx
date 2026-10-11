import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone } from "lucide-react";
import { DutyCard } from "@/components/duty";
import { Shell } from "@/components/shell";
import { alert, emergency } from "@/data/content";

export const Route = createFileRoute("/today")({
  head: () => ({ meta: [{ title: "لوحة اليوم · رهط بوست" }] }),
  component: TodayPage,
});

function TodayPage() {
  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-bold">لوحة اليوم</h1>
      <div className="flex flex-col gap-4">
        <DutyCard label="صيدلية الحراسة" />

        {alert ? (
          <section className="alert-card p-4">
            <p className="chip">تنبيه</p>
            <h2 className="mt-2 text-xl font-bold">{alert.title}</h2>
            <p className="font-semibold">{alert.body}</p>
            <p className="mt-1 text-sm font-bold">{alert.until}</p>
          </section>
        ) : null}

        <Link to="/buses" className="stamp press block p-4">
          <p className="text-sm font-bold text-muted">شركة גלים</p>
          <h2 className="text-xl font-bold">مواعيد باصات رهط</h2>
          <p className="font-semibold">داخل المدينة، وبئر السبع وكسيفة وتل السبع وعسقلان</p>
        </Link>

        <section>
          <h2 className="mb-3 text-xl font-bold">أرقام الطوارئ</h2>
          <ul className="flex flex-col gap-2">
            {emergency.map((item) => (
              <li key={item.phone}>
                <a href={`tel:${item.phone}`} className="stamp press flex items-center gap-3 px-3 py-3">
                  <span className="icon-badge">
                    <Phone className="size-5" aria-hidden />
                  </span>
                  <span className="flex-1 font-bold">{item.name}</span>
                  <span className="text-2xl font-bold leading-none">{item.phone}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>


      </div>
    </Shell>
  );
}
