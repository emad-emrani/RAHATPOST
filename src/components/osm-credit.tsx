export function OsmCredit() {
  return (
    <p className="mt-6 text-sm font-semibold text-muted">
      البيانات ©{" "}
      <a
        className="underline decoration-2 underline-offset-4"
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noopener noreferrer"
      >
        مساهمو OpenStreetMap
      </a>
      ، وتُحدَّث أسبوعياً. النشاطات «الموثّقة» أضافها أصحابها وراجعناها.
    </p>
  );
}
