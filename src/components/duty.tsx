import { ExternalLink, MapPin, Phone, Pill, Siren, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { directionsUrl, type CivicAlert, type DutyShift } from "@/lib/board/types";

/** Duty pharmacy card for today's date; without a shift it says so instead of inventing one. */
export function DutyCard({
  duty,
  label = "صيدلية الحراسة اليوم",
  heading = "h2",
}: {
  duty: DutyShift | null;
  label?: string;
  heading?: "h1" | "h2";
}) {
  const H = heading;
  if (!duty) {
    return (
      <section className="stamp flex items-start gap-3 p-4">
        <span className="icon-badge">
          <Pill className="size-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-muted">{label}</p>
          <H className="text-xl font-bold">لم يُحدَّث جدول اليوم</H>
          <p className="text-sm font-semibold text-muted">
            اتصل بصيدليتك أو بنجمة داود الحمراء 101 للاستفسار.
          </p>
        </div>
      </section>
    );
  }
  return (
    <section className="stamp p-4">
      <div className="flex items-start gap-3">
        <span className="icon-badge">
          <Pill className="size-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-muted">{label}</p>
          <H className="text-2xl font-bold">{duty.name}</H>
          <p className="font-semibold">{duty.address}</p>
          <p className="text-sm font-bold text-muted">{duty.hours}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a className="btn" href={`tel:${duty.phone.replaceAll("-", "")}`}>
          <Phone className="size-4" aria-hidden />
          اتصال
        </a>
        <a
          className="btn btn-ghost"
          href={directionsUrl(duty)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MapPin className="size-4" aria-hidden />
          الاتجاهات
        </a>
      </div>
    </section>
  );
}

const UNTIL = new Intl.DateTimeFormat("ar-u-nu-latn", {
  timeZone: "Asia/Jerusalem",
  weekday: "long",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Active civic/urgent alerts; each one disappears on its own once it expires. */
export function AlertsBanner({ alerts }: { alerts: CivicAlert[] }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  // Before hydration trust the server's list (already filtered to the active window).
  const active =
    now === null
      ? alerts
      : alerts.filter((a) => Date.parse(a.endsAt) > now && Date.parse(a.startsAt) <= now);
  if (active.length === 0) return null;
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      {active.map((a) => {
        const urgent = a.severity === "urgent";
        const Icon = urgent ? Siren : TriangleAlert;
        return (
          <section
            key={a.id}
            className={urgent ? "alert-card p-4" : "alert-card-civic p-4"}
            role={urgent ? "alert" : undefined}
          >
            <p className="chip w-fit">
              <Icon className="size-4" aria-hidden />
              {urgent ? "تنبيه عاجل" : "تنبيه بلدي"}
            </p>
            <h2 className="mt-2 text-xl font-bold">{a.title}</h2>
            <p className="whitespace-pre-line font-semibold">{a.body}</p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold">حتى {UNTIL.format(new Date(a.endsAt))}</p>
              {a.link ? (
                <a
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="inline-flex items-center gap-1 text-sm font-bold underline"
                >
                  التفاصيل
                  <ExternalLink className="size-4" aria-hidden />
                </a>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
