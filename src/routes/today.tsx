import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin, Phone } from "lucide-react";
import { Shell } from "@/components/shell";
import { alert, duty, emergency, events, weather } from "@/data/content";

export const Route = createFileRoute("/today")({
  head: () => ({ meta: [{ title: "لوحة اليوم · رهط بوست" }] }),
  component: TodayPage,
});

function TodayPage() {
  return (
    <Shell>
      <h1 className="mb-4 text-3xl font-bold">لوحة اليوم</h1>
      <div className="flex flex-col gap-4">
        <section className="stamp p-4">
          <p className="text-sm font-bold text-muted">صيدلية الحراسة</p>
          <h2 className="text-2xl font-bold">{duty.name}</h2>
          <p className="font-semibold">
            {duty.neighborhood} · {duty.hours}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a className="btn" href={`tel:${duty.phone.replaceAll("-", "")}`}>
              <Phone className="size-4" aria-hidden />
              اتصال
            </a>
            <a className="btn btn-ghost" href={duty.maps} target="_blank" rel="noreferrer">
              <MapPin className="size-4" aria-hidden />
              الاتجاهات
            </a>
          </div>
        </section>

        <section className="stamp bg-brand-deep p-4">
          <p className="chip">تنبيه</p>
          <h2 className="mt-2 text-xl font-bold">{alert.title}</h2>
          <p className="font-semibold">{alert.body}</p>
          <p className="mt-1 text-sm font-bold">{alert.until}</p>
        </section>

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
                <a href={`tel:${item.phone}`} className="stamp press flex items-center justify-between px-4 py-3">
                  <span className="font-bold">{item.name}</span>
                  <span className="text-2xl font-bold leading-none">{item.phone}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="stamp p-4">
          <h2 className="text-xl font-bold">فعاليات اليوم</h2>
          <ul className="mt-2 divide-y-2 divide-ink/15">
            {events.map((item) => (
              <li key={item.title} className="flex items-baseline justify-between gap-3 py-2">
                <span>
                  <span className="block font-bold">{item.title}</span>
                  <span className="text-sm font-semibold text-muted">{item.place}</span>
                </span>
                <span className="font-bold">{item.time}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="stamp-flat flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-bold text-muted">طقس رهط</p>
            <p className="font-bold">{weather.text}</p>
            <p className="text-sm font-semibold">{weather.wind}</p>
          </div>
          <p className="text-4xl font-bold">{weather.temp}</p>
        </section>
      </div>
    </Shell>
  );
}
