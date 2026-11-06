import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { busLines, galimPhone } from "@/data/buses";
import { tr, trv } from "@/lib/i18n/core";

export function BusLinesAdmin() {
  const [scope, setScope] = useState<"all" | "city" | "between">("all");
  const [q, setQ] = useState("");

  const filtered = busLines.filter((b) => {
    if (scope !== "all" && b.scope !== scope) return false;
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      return (
        b.number.toLowerCase().includes(needle) ||
        b.from.toLowerCase().includes(needle) ||
        b.to.toLowerCase().includes(needle) ||
        b.note.toLowerCase().includes(needle)
      );
    }
    return true;
  });

  return (
    <div className="stamp space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-extrabold text-ink sm:text-lg">
            🚍 {tr("إدارة ومراجعة خطوط باصات غاليم (גלים) — رهط والنقب")}
          </h2>
          <p className="text-xs font-semibold text-muted">
            {tr("يتم تحديث جداول المواعيد يومياً وبشكل تلقائي من قاعدة بيانات وزارة المواصلات (GTFS) مع التتبع المباشر.")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/buses" className="btn px-3 py-1.5 text-xs font-extrabold">
            🗺️ {tr("فتح صفحة الباصات والخريطة")}
          </Link>
          <a href={`tel:${galimPhone}`} className="btn btn-ghost px-3 py-1.5 text-xs font-extrabold">
            📞 {galimPhone}
          </a>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "all" as const, label: `الكل (${busLines.length})` },
            { id: "city" as const, label: `خطوط داخل رهط (${busLines.filter((b) => b.scope === "city").length})` },
            { id: "between" as const, label: `خطوط بين المدن (${busLines.filter((b) => b.scope === "between").length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setScope(t.id)}
              className={`chip text-xs font-extrabold ${scope === t.id ? "chip-ink" : ""}`}
            >
              {trv(t.label)}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tr("ابحث برقم الخط أو الوجهة…")}
          className="field max-w-xs text-xs"
        />
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((line) => (
          <div
            key={line.number}
            className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper p-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="grid min-w-11 shrink-0 place-items-center rounded-xl bg-primary px-2.5 py-2 font-mono text-sm font-extrabold text-ink">
                {line.number}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-extrabold text-ink sm:text-sm">
                  {trv(line.from)} ↔ {trv(line.to)}
                </p>
                <p className="truncate text-[11px] font-semibold text-muted">
                  {line.scope === "city" ? tr("داخل أحياء رهط") : tr("بين المدن والنقب")}
                  {line.note ? ` · ${trv(line.note)}` : ""}
                </p>
              </div>
            </div>
            <Link
              to="/buses/map/$line"
              params={{ line: line.number }}
              className="shrink-0 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-[11px] font-extrabold text-ink hover:border-primary"
            >
              🗺️ {tr("الخريطة")}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
