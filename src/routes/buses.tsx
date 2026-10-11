import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Shell } from "@/components/shell";
import { busLines, galimPhone, galimSource, type DayKey } from "@/data/buses";

export const Route = createFileRoute("/buses")({
  head: () => ({ meta: [{ title: "باصات غاليم · رهط بوست" }] }),
  component: BusesPage,
});

const days: { key: DayKey; label: string }[] = [
  { key: "weekday", label: "أحد–خميس" },
  { key: "friday", label: "جمعة" },
  { key: "saturday", label: "سبت" },
];

function currentDay(): DayKey {
  const day = new Date().getDay();
  if (day === 5) return "friday";
  if (day === 6) return "saturday";
  return "weekday";
}

function BusesPage() {
  const [day, setDay] = useState<DayKey>(currentDay);
  const [scope, setScope] = useState<"city" | "between">("city");
  const list = useMemo(() => busLines.filter((line) => line.scope === scope), [scope]);

  return (
    <Shell>
      <h1 className="text-3xl font-bold">باصات غاليم</h1>
      <p className="mt-1 font-semibold text-muted">
        خطوط مدينة رهط والخطوط الخارجة منها. المواعيد من جدول المشغّل لأسبوع 11–17 تشرين الأول 2026، وليست تتبّعاً حيّاً للباص.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <a className="btn" href={`tel:${galimPhone.replaceAll("-", "")}`}>
          غاليم {galimPhone}
        </a>
        <a className="btn btn-ghost" href={galimSource} target="_blank" rel="noreferrer">
          الجدول الأصلي
        </a>
      </div>

      <div className="scroll-row mt-4">
        <button
          type="button"
          className={scope === "city" ? "chip chip-ink shrink-0" : "chip shrink-0 bg-paper"}
          onClick={() => setScope("city")}
        >
          داخل رهط
        </button>
        <button
          type="button"
          className={scope === "between" ? "chip chip-ink shrink-0" : "chip shrink-0 bg-paper"}
          onClick={() => setScope("between")}
        >
          خارج المدينة
        </button>
        {days.map((item) => (
          <button
            key={item.key}
            type="button"
            className={day === item.key ? "chip chip-deep shrink-0" : "chip shrink-0 bg-paper"}
            onClick={() => setDay(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {list.map((line) => {
          const directions = line.times[day];
          const keys = Object.keys(directions);
          return (
            <li key={line.number} className="stamp p-4">
              <div className="flex items-start justify-between gap-3">
                <span>
                  <span className="chip chip-ink">خط {line.number}</span>
                  {line.note ? <p className="mt-2 font-semibold">{line.note}</p> : null}
                </span>
              </div>
              <h2 className="mt-2 text-xl font-bold">
                {line.from} ↔ {line.to}
              </h2>
              {keys.length === 0 ? (
                <p className="mt-2 font-semibold">لا رحلات في هذا اليوم حسب الجدول.</p>
              ) : (
                keys.map((key) => (
                  <div key={key} className="mt-3">
                    <p className="text-sm font-bold text-muted">اتجاه {key === "1" ? "أ" : "ب"}</p>
                    <p className="font-bold leading-7">{directions[key].join(" · ")}</p>
                  </div>
                ))
              )}
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}
