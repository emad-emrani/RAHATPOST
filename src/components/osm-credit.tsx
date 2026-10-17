import { tr } from "@/lib/i18n/core";
export function OsmCredit() {
  return (
    <p className="mt-6 text-sm font-semibold text-muted">
      {tr("البيانات ©")}{" "}
      <a
        className="underline decoration-2 underline-offset-4"
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
      >
        {tr("مساهمو OpenStreetMap")}
      </a>
      {tr("، وتُحدَّث أسبوعياً. النشاطات «الموثّقة» أضافها أصحابها وراجعناها.")}
    </p>
  );
}
