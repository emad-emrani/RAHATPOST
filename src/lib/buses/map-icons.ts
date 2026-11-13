import type * as LeafletNamespace from "leaflet";
import { busSchedule } from "@/data/bus-schedule";
import { stopName } from "@/lib/buses/schedule";

export type BusStopMarkerOpts = {
  index: number;
  total: number;
  code: string;
  name: string;
  isSelected?: boolean;
  isNearest?: boolean;
  nextEtaText?: string;
};

export type BusVehicleMarkerInfo = {
  line: string;
  ref: string;
  plate: string;
  driverName: string;
  driverRole: string;
  fromName: string;
  toName: string;
  speedKmh: number;
  compassAr: string;
  nextStopName: string;
  nextStopCode: string;
  distToNextStopM: number | null;
  etaText: string;
  nearestStopName?: string;
  scheduledStart?: string | null;
  nextDepartureTime?: string | null;
  isLiveSiri: boolean;
  isSelected?: boolean;
  lat: number;
  lon: number;
  updatedAtText: string;
};

/** Format 7- or 8-digit Israeli SIRI vehicle_ref into standard license plate format. */
export function formatBusPlate(ref: string, lineFallback = "1"): string {
  const digits = String(ref ?? "").replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  }
  if (digits.length === 7) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  // Generate a consistent realistic Galim fleet license plate for scheduled buses when SIRI ref is absent
  const num = parseInt(String(lineFallback).replace(/\D/g, "") || "1", 10) || 1;
  const mid = String((num * 7 + 13) % 90 + 10).padStart(2, "0");
  const tail = String((num * 37 + 402) % 900 + 100).padStart(3, "0");
  return `234-${mid}-${tail}`;
}

/** Retrieve driver name & shift info (supports custom saved driver names in localStorage `rp_bus_drivers`). */
export function getBusDriverDetails(line: string, ref?: string): {
  driverName: string;
  driverRole: string;
  fleetCode: string;
} {
  const cleanLine = String(line || "1").trim();
  const num = parseInt(cleanLine.replace(/\D/g, "") || "1", 10) || 1;
  const fleetCode = ref && /^\d+$/.test(ref) ? `GL-${ref.slice(-4)}` : `GL-${String(2300 + num)}`;

  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem("rp_bus_drivers");
      if (raw) {
        const map = JSON.parse(raw) as Record<string, string>;
        if (ref && map[ref]?.trim()) {
          return {
            driverName: map[ref].trim(),
            driverRole: "سائق خط معتمد · شركة غاليم (גלים)",
            fleetCode,
          };
        }
        if (map[`line_${cleanLine}`]?.trim()) {
          return {
            driverName: map[`line_${cleanLine}`].trim(),
            driverRole: "سائق خط معتمد · شركة غاليم (גלים)",
            fleetCode,
          };
        }
      }
    } catch {
      /* ignore storage errors */
    }
  }

  return {
    driverName: `سائق المناوبة الحالية (خط ${cleanLine} — غاليم גלים)`,
    driverRole: "سائق حافلة معتمد · شركة غاليم (مشغّل وزارة المواصلات #23)",
    fleetCode,
  };
}

/** Create a clear, unmistakable Bus Stop Icon (محطة حافلات 🚏) for Leaflet maps. */
export function createBusStopDivIcon(
  Lf: typeof LeafletNamespace,
  opts: BusStopMarkerOpts,
) {
  const isEnd = opts.index === 0 || opts.index === opts.total - 1;
  const highlight = Boolean(opts.isSelected || opts.isNearest);

  const bgHeader = highlight
    ? "#dc2626"
    : isEnd
      ? "#111827"
      : "#1d4ed8";
  const borderCol = highlight
    ? "#fef08a"
    : isEnd
      ? "#f2c94c"
      : "#ffffff";
  const badgeBg = highlight
    ? "#facc15"
    : isEnd
      ? "#f2c94c"
      : "#eff6ff";
  const badgeColor = "#111827";
  const scale = highlight ? 1.15 : isEnd ? 1.05 : 1;

  const html = `
    <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-92%) scale(${scale});cursor:pointer;filter:drop-shadow(0 3px 6px rgba(0,0,0,0.32));">
      ${
        highlight
          ? `<div style="margin-bottom:2px;background:#dc2626;color:#ffffff;font-size:9.5px;font-weight:900;padding:1px 6px;border-radius:999px;border:1.5px solid #ffffff;white-space:nowrap;">🚏 ${
              opts.isNearest ? "أقرب محطة" : "المحطة المختارة"
            }</div>`
          : ""
      }
      <!-- Bus Stop Sign Plate (لوحة محطة الحافلات) -->
      <div style="display:flex;align-items:center;gap:3px;background:${bgHeader};color:#ffffff;padding:3px 6px;border-radius:9px;border:2px solid ${borderCol};">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#facc15" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
          <rect x="4" y="3" width="16" height="14" rx="3" fill="#1e293b"/>
          <path d="M4 11h16"/>
          <path d="M8 14h.01"/>
          <path d="M16 14h.01"/>
          <path d="M6 17v3"/>
          <path d="M18 17v3"/>
        </svg>
        <span style="background:${badgeBg};color:${badgeColor};font-family:monospace;font-size:10px;font-weight:900;line-height:1;padding:2px 4px;border-radius:5px;">
          ${opts.index + 1}
        </span>
      </div>
      <!-- Sign Post & Base Pin -->
      <div style="width:3px;height:8px;background:#1e293b;border-left:1px solid #ffffff;border-right:1px solid #ffffff;"></div>
      <div style="width:8px;height:8px;border-radius:999px;background:${bgHeader};border:2px solid #ffffff;margin-top:-1px;"></div>
    </div>
  `;

  return Lf.divIcon({
    className: "",
    html,
    iconSize: [52, 48],
    iconAnchor: [26, 44],
    popupAnchor: [0, -40],
  });
}

/** Build popup HTML when a user clicks on a Bus Stop marker on the map. */
export function buildBusStopPopupHtml(opts: {
  index: number;
  code: string;
  name: string;
  line: string;
  nextTimes: string[];
  isNearest?: boolean;
}): string {
  const timesHtml =
    opts.nextTimes.length > 0
      ? opts.nextTimes
          .map(
            (t, idx) =>
              `<span style="display:inline-block;background:${
                idx === 0 ? "#f2c94c" : "#f1f5f9"
              };color:#111827;font-weight:900;font-size:11px;padding:3px 8px;border-radius:8px;margin:2px;">🕒 ${t}</span>`,
          )
          .join("")
      : `<span style="color:#64748b;font-size:11px;font-weight:700;">خارج ساعات الرحلات الحالية</span>`;

  return `
    <div dir="rtl" style="min-width:220px;max-width:270px;font-family:system-ui,-apple-system,sans-serif;text-align:right;color:#0f172a;padding:2px;">
      <div style="display:flex;align-items:center;gap:8px;background:#0f172a;color:#ffffff;padding:8px 10px;border-radius:12px;">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9px;background:#f2c94c;color:#111827;font-size:16px;font-weight:900;flex-shrink:0;">🚏</span>
        <div style="min-width:0;flex:1;">
          <div style="font-size:10px;font-weight:800;color:#facc15;">
            محطة حافلات #${opts.index + 1} · رمز ${opts.code} ${opts.isNearest ? "· أقرب محطة لك" : ""}
          </div>
          <div style="font-size:12.5px;font-weight:900;color:#ffffff;line-height:1.3;">
            ${opts.name}
          </div>
        </div>
      </div>
      <div style="margin-top:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:7px 9px;">
        <div style="font-size:10.5px;font-weight:800;color:#475569;margin-bottom:4px;">
          🚌 مواعيد وصول باص خط ${opts.line} لهذه المحطة:
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:2px;">
          ${timesHtml}
        </div>
      </div>
    </div>
  `;
}

/** Create a clear, unmistakable 3D-style Bus Icon (أيقونة حافلة واضحة 🚌) for Leaflet maps. */
export function createLiveBusDivIcon(
  Lf: typeof LeafletNamespace,
  info: BusVehicleMarkerInfo,
) {
  const isSel = Boolean(info.isSelected);
  const pulseColor = info.isLiveSiri ? "#16a34a" : "#f59e0b";
  const statusLabel = info.isLiveSiri
    ? info.speedKmh > 0
      ? `${info.speedKmh} كم/س`
      : "في المحطة"
    : "مجدول";

  const html = `
    <div style="display:inline-flex;flex-direction:column;align-items:center;transform:translate(-50%,-56%);cursor:pointer;filter:drop-shadow(0 6px 12px rgba(0,0,0,0.42));">
      <!-- Top Callout Pill: Line Number + Speed + Click Hint -->
      <div style="display:inline-flex;align-items:center;gap:5px;background:${
        isSel ? "#0f172a" : "#f2c94c"
      };color:${
        isSel ? "#facc15" : "#0f172a"
      };font-weight:900;font-size:11.5px;padding:3px 9px;border-radius:999px;border:2px solid #0f172a;white-space:nowrap;margin-bottom:3px;">
        <span style="display:inline-block;width:8px;height:8px;border-radius:999px;background:${pulseColor};box-shadow:0 0 0 2px #ffffff;"></span>
        <span>باص خط ${info.line}</span>
        <span style="opacity:0.45;">|</span>
        <span dir="ltr" style="font-size:10.5px;">${statusLabel}</span>
      </div>

      <!-- Large Clear Illustrated Bus Body Icon (أيقونة حافلة واضحة) -->
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:54px;height:44px;border-radius:14px;background:linear-gradient(180deg,#facc15 0%,#eab308 100%);border:2.5px solid #0f172a;box-shadow:0 4px 10px rgba(0,0,0,0.3);">
        <svg width="42" height="36" viewBox="0 0 64 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Bus Roof & Body -->
          <rect x="6" y="4" width="52" height="38" rx="9" fill="#0f172a" stroke="#ffffff" stroke-width="2"/>
          <!-- Top Destination Signboard -->
          <rect x="14" y="7" width="36" height="6" rx="2.5" fill="#facc15"/>
          <!-- Panoramic Windshield -->
          <rect x="10" y="15" width="44" height="13" rx="4" fill="#38bdf8" stroke="#bae6fd" stroke-width="1.2"/>
          <!-- Windshield Reflection -->
          <path d="M14 17L22 26" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.65"/>
          <path d="M22 17L27 23" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/>
          <!-- Front Grille & Galim Gold Bumper -->
          <rect x="10" y="31" width="44" height="8" rx="3" fill="#facc15"/>
          <!-- Headlights -->
          <circle cx="15" cy="35" r="2.8" fill="#ffffff" stroke="#0f172a" stroke-width="1.2"/>
          <circle cx="49" cy="35" r="2.8" fill="#ffffff" stroke="#0f172a" stroke-width="1.2"/>
          <!-- Side Mirrors -->
          <rect x="1" y="16" width="4" height="9" rx="2" fill="#0f172a" stroke="#facc15" stroke-width="1.2"/>
          <rect x="59" y="16" width="4" height="9" rx="2" fill="#0f172a" stroke="#facc15" stroke-width="1.2"/>
          <!-- Wheels -->
          <rect x="11" y="42" width="10" height="7" rx="3" fill="#0f172a" stroke="#ffffff" stroke-width="1.5"/>
          <rect x="43" y="42" width="10" height="7" rx="3" fill="#0f172a" stroke="#ffffff" stroke-width="1.5"/>
        </svg>
        <!-- Line Number Badge on Bus Front -->
        <span style="position:absolute;top:14px;background:#0f172a;color:#facc15;font-family:monospace;font-weight:900;font-size:11px;padding:0px 5px;border-radius:5px;border:1.5px solid #facc15;line-height:1.25;">
          ${info.line}
        </span>
      </div>

      <!-- Israeli License Plate Badge under Bus -->
      <div dir="ltr" style="margin-top:2px;display:inline-flex;align-items:center;gap:3px;background:#facc15;color:#0f1727;font-family:monospace;font-weight:900;font-size:10px;padding:1px 6px;border-radius:5px;border:1.5px solid #0f172a;white-space:nowrap;">
        <span style="background:#1d4ed8;color:#ffffff;font-size:8px;padding:0 3px;border-radius:2px;">IL</span>
        <span>${info.plate}</span>
      </div>
    </div>
  `;

  return Lf.divIcon({
    className: "",
    html,
    iconSize: [124, 92],
    iconAnchor: [62, 52],
    popupAnchor: [0, -48],
  });
}

/** Build full rich RTL Popup HTML when clicking on the Bus Icon on the map. */
export function buildLiveBusPopupHtml(info: BusVehicleMarkerInfo): string {
  const distText =
    info.distToNextStopM !== null
      ? info.distToNextStopM >= 1000
        ? `${(info.distToNextStopM / 1000).toFixed(1)} كم`
        : `${info.distToNextStopM} متر`
      : "على المسار";

  return `
    <div dir="rtl" style="min-width:265px;max-width:310px;font-family:system-ui,-apple-system,sans-serif;text-align:right;color:#0f172a;padding:2px;">
      <!-- Header: Bus Line + Route + Live Badge -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;background:linear-gradient(135deg,#0f172a,#1e293b);color:#ffffff;padding:10px 12px;border-radius:14px;">
        <div style="display:flex;align-items:center;gap:8px;min-width:0;">
          <span style="display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:11px;background:#f2c94c;color:#0f172a;font-family:monospace;font-size:16px;font-weight:900;flex-shrink:0;">
            🚌 ${info.line}
          </span>
          <div style="min-width:0;">
            <div style="font-size:13px;font-weight:900;color:#ffffff;">
              حافلة خط ${info.line} · غاليم (גלים)
            </div>
            <div style="font-size:10.5px;font-weight:700;color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
              ${info.fromName} ↔ ${info.toName}
            </div>
          </div>
        </div>
        <span style="background:${
          info.isLiveSiri ? "#16a34a" : "#d97706"
        };color:#ffffff;font-size:9.5px;font-weight:900;padding:3px 7px;border-radius:999px;white-space:nowrap;">
          ${info.isLiveSiri ? "🟢 مباشر GPS" : "🕒 مجدول"}
        </span>
      </div>

      <!-- Bus Number / License Plate & Driver Name Section -->
      <div style="margin-top:8px;background:#fffbeb;border:1.5px solid #fde68a;border-radius:12px;padding:8px 10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:6px;">
          <span style="font-size:11px;font-weight:800;color:#78350f;">🔢 رقم الحافلة (اللوحة):</span>
          <span dir="ltr" style="background:#facc15;color:#0f172a;font-family:monospace;font-weight:900;font-size:12px;padding:2px 8px;border-radius:6px;border:1.5px solid #0f172a;">
            IL ${info.plate}
          </span>
        </div>
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px;border-top:1px dashed #fcd34d;padding-top:6px;">
          <span style="font-size:11px;font-weight:800;color:#78350f;white-space:nowrap;">👨‍✈️ اسم السائق:</span>
          <div style="text-align:left;min-width:0;">
            <div style="font-size:11.5px;font-weight:900;color:#0f172a;">${info.driverName}</div>
            <div style="font-size:9.5px;font-weight:700;color:#92400e;">${info.driverRole}</div>
          </div>
        </div>
      </div>

      <!-- Telemetry & Stops Grid -->
      <div style="margin-top:7px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:8px 10px;font-size:11px;line-height:1.55;">
        <div style="display:flex;justify-content:space-between;gap:6px;">
          <span style="color:#64748b;font-weight:800;">🚏 المحطة القادمة:</span>
          <span style="font-weight:900;color:#0f172a;">${info.nextStopName} (${distText})</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:6px;margin-top:3px;">
          <span style="color:#64748b;font-weight:800;">⏱️ وقت الوصول المتوقع:</span>
          <span style="font-weight:900;color:#15803d;">${info.etaText}</span>
        </div>
        <div style="display:flex;justify-content:space-between;gap:6px;margin-top:3px;">
          <span style="color:#64748b;font-weight:800;">🚀 السرعة والاتجاه:</span>
          <span style="font-weight:900;color:#0f172a;">${info.speedKmh} كم/س · ${info.compassAr}</span>
        </div>
        ${
          info.nearestStopName
            ? `<div style="display:flex;justify-content:space-between;gap:6px;margin-top:3px;">
                <span style="color:#64748b;font-weight:800;">📍 أقرب محطة لموقعك:</span>
                <span style="font-weight:900;color:#1d4ed8;">${info.nearestStopName}</span>
              </div>`
            : ""
        }
        ${
          info.scheduledStart
            ? `<div style="display:flex;justify-content:space-between;gap:6px;margin-top:3px;">
                <span style="color:#64748b;font-weight:800;">🕒 انطلاق الرحلة:</span>
                <span dir="ltr" style="font-weight:900;color:#0f172a;">${info.scheduledStart}</span>
              </div>`
            : ""
        }
      </div>

      <!-- Footer: Galim Dispatch Phone & GPS -->
      <div style="margin-top:7px;display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:10px;font-weight:800;color:#475569;">
        <a href="tel:086688700" style="background:#0f172a;color:#facc15;text-decoration:none;padding:4px 9px;border-radius:8px;font-weight:900;">
          📞 استعلامات غاليم: 08-6688700
        </a>
        <span dir="ltr" style="color:#64748b;font-family:monospace;">
          ${info.lat.toFixed(4)}, ${info.lon.toFixed(4)}
        </span>
      </div>
    </div>
  `;
}

/**
 * Compute a fallback scheduled bus along the route when no live SIRI GPS vehicle is broadcasting
 * (e.g. between trips or late at night) so the Bus Icon is ALWAYS visible and clickable on the map.
 */
export function buildScheduledFallbackBus(opts: {
  line: string;
  fromName: string;
  toName: string;
  stops: [string, number][];
  nextPlanned: { time: string; inMin: number }[];
  nearestStopName?: string;
  nowMs: number;
}): BusVehicleMarkerInfo | null {
  const validStops = opts.stops
    .map(([code, offset]) => ({ code, offset, s: busSchedule.stops[code] }))
    .filter((x) => Boolean(x.s));
  if (validStops.length === 0) return null;

  // Pick a representative stop along the route (or first stop if waiting for departure)
  const nextTrip = opts.nextPlanned[0];
  const targetIdx =
    nextTrip && nextTrip.inMin <= 15 && validStops.length > 2
      ? Math.min(validStops.length - 1, Math.max(1, Math.floor(validStops.length / 3)))
      : 0;
  const currentStop = validStops[targetIdx] ?? validStops[0];
  const nextStop = validStops[Math.min(validStops.length - 1, targetIdx + 1)] ?? currentStop;

  const ref = `2300${opts.line.replace(/\D/g, "") || "1"}`;
  const plate = formatBusPlate(ref, opts.line);
  const driver = getBusDriverDetails(opts.line, ref);

  const etaText = nextTrip
    ? nextTrip.inMin <= 0
      ? "ينطلق الآن"
      : `الساعة ${nextTrip.time} (بعد ${nextTrip.inMin} د)`
    : "حسب جدول الصباح الرسمي";

  return {
    line: opts.line,
    ref,
    plate,
    driverName: driver.driverName,
    driverRole: driver.driverRole,
    fromName: opts.fromName,
    toName: opts.toName,
    speedKmh: nextTrip && nextTrip.inMin <= 10 ? 28 : 0,
    compassAr: "محطة الانطلاق / المسار الرسمي",
    nextStopName: stopName(nextStop.code),
    nextStopCode: nextStop.code,
    distToNextStopM: targetIdx === 0 ? 0 : 350,
    etaText,
    nearestStopName: opts.nearestStopName,
    scheduledStart: nextTrip?.time ?? null,
    nextDepartureTime: nextTrip?.time ?? null,
    isLiveSiri: false,
    isSelected: true,
    lat: currentStop.s.lat,
    lon: currentStop.s.lon,
    updatedAtText: new Date(opts.nowMs).toLocaleTimeString("ar-u-nu-latn", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jerusalem",
    }),
  };
}
