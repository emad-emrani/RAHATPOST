import { MapPin, Phone } from "lucide-react";
import { duty } from "@/data/content";

/** Duty pharmacy card. Without a logged shift it says so instead of showing a fake pharmacy. */
export function DutyCard({ label = "صيدلية الحراسة اليوم", heading = "h2" }: { label?: string; heading?: "h1" | "h2" }) {
  const H = heading;
  if (!duty) {
    return (
      <section className="stamp bg-brand-deep p-4">
        <p className="text-sm font-bold">{label}</p>
        <H className="mt-1 text-2xl font-bold">لم يُحدَّث جدول اليوم</H>
        <p className="font-semibold">اتصل بصيدليتك أو بنجمة داود الحمراء 101 للاستفسار.</p>
      </section>
    );
  }
  return (
    <section className="stamp p-4">
      <p className="text-sm font-bold text-muted">{label}</p>
      <H className="mt-1 text-2xl font-bold">{duty.name}</H>
      <p className="font-semibold">
        {duty.neighborhood} · {duty.hours}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a className="btn" href={`tel:${duty.phone.replaceAll("-", "")}`}>
          <Phone className="size-4" aria-hidden />
          اتصال
        </a>
        <a className="btn btn-ghost" href={duty.maps} target="_blank" rel="noopener noreferrer">
          <MapPin className="size-4" aria-hidden />
          الاتجاهات
        </a>
      </div>
    </section>
  );
}
