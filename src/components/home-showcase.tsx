import { Link } from "@tanstack/react-router";
import { MapChoices } from "@/components/map-links";
import {
  Bus,
  ChevronDown,
  ChevronLeft,
  LocateFixed,
  MapPin,
  Maximize2,
  Minimize2,
  Navigation,
  RefreshCw,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSiteSettings } from "@/lib/site-settings/context";
import { parseEmergencyNumbers, type QuickLink } from "@/lib/site-settings/types";
import { tr, trv } from "@/lib/i18n/core";
import { adminWhoami } from "@/lib/team/api";
import { busSchedule } from "@/data/bus-schedule";
import { busLines } from "@/data/buses";
import { getLineVehicles } from "@/lib/buses/api";
import { shapeFile, type LineShapes } from "@/lib/buses/map";
import { lineInfo, plannedArrivals, stopName } from "@/lib/buses/schedule";
import {
  GOOGLE_HYBRID_TILE_URL,
  GOOGLE_STREETS_TILE_URL,
  buildBusStopPopupHtml,
  buildLiveBusPopupHtml,
  buildScheduledFallbackBus,
  createBusStopDivIcon,
  createLiveBusDivIcon,
  createUserLocationConeDivIcon,
  formatBusPlate,
  formatPlannedArrivalSlot,
  getBusDriverDetails,
  type BusVehicleMarkerInfo,
} from "@/lib/buses/map-icons";
import type { LayerGroup, Map as LeafletMap } from "leaflet";

type InteractivePostBranch = {
  id: string;
  name: string;
  officialName: string;
  kind: string;
  badge: string;
  address: string;
  phone?: string;
  hours: { dayIdx: number[]; label: string; ranges: [number, number][] }[];
  hoursDisplay: { day: string; time: string }[];
  services: string[];
  note: string;
  url: string;
  appointmentUrl?: string;
  directionsUrl: string;
};

const RAHAT_POST_BRANCHES: InteractivePostBranch[] = [
  {
    id: "209",
    name: "فرع صلاح الدين",
    officialName: "סאלח אדין רהט (209)",
    kind: "فرع بريد وبنك البريد",
    badge: "فرع #209",
    address: "شارع صلاح الدين 237، بجانب مدرسة صلاح الدين، رهط",
    phone: "171",
    hours: [
      { dayIdx: [0, 1], label: "08:00–16:00", ranges: [[480, 960]] },
      { dayIdx: [2], label: "08:00–15:00، 16:00–18:00", ranges: [[480, 900], [960, 1080]] },
      { dayIdx: [3], label: "08:00–18:00", ranges: [[480, 1080]] },
      { dayIdx: [4], label: "08:00–15:00", ranges: [[480, 900]] },
    ],
    hoursDisplay: [
      { day: "الأحد والاثنين", time: "08:00–16:00" },
      { day: "الثلاثاء", time: "08:00–15:00، 16:00–18:00" },
      { day: "الأربعاء", time: "08:00–18:00" },
      { day: "الخميس", time: "08:00–15:00" },
      { day: "الجمعة والسبت", time: "مغلق" },
    ],
    services: ["خدمات مالية (بنك البريد)", "دفع فواتير وأرنونا", "بريد دولي ومحلي", "تأمينات"],
    note: "يعمل بحجز دور مسبق عبر موقع البريد أو الاتصال على 171.",
    url: "https://doar.israelpost.co.il/branch/209",
    appointmentUrl: "https://israelpost.co.il/%D7%A9%D7%99%D7%A8%D7%95%D7%AA%D7%99%D7%9D/%D7%90%D7%99%D7%AA%D7%95%D7%A8-%D7%A1%D7%A0%D7%99%D7%A4%D7%99%D7%9D-%D7%95%D7%96%D7%99%D7%9E%D7%95%D7%9F-%D7%AA%D7%95%D7%A8-%D7%91%D7%A7%D7%9C%D7%99%D7%A7/%D7%96%D7%99%D7%9E%D7%95%D7%9F-%D7%AA%D7%95%D7%A8-%D7%95%D7%91%D7%99%D7%98%D7%95%D7%97?no=209",
    directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=31.399078,34.748416",
  },
  {
    id: "237",
    name: "الوحدة المركزية (السوق)",
    officialName: "היחידה המרכזית רהט (237)",
    kind: "فرع بريد مركزي وبنك البريد",
    badge: "فرع #237",
    address: "المركز التجاري، السوق البلدي، وسط مدينة رهط",
    phone: "171",
    hours: [
      { dayIdx: [0, 2], label: "08:00–18:00", ranges: [[480, 1080]] },
      { dayIdx: [1, 3, 4], label: "08:00–15:00", ranges: [[480, 900]] },
    ],
    hoursDisplay: [
      { day: "الأحد والثلاثاء", time: "08:00–18:00" },
      { day: "الاثنين والأربعاء والخميس", time: "08:00–15:00" },
      { day: "الجمعة والسبت", time: "مغلق" },
    ],
    services: ["خدمات مالية (بنك البريد)", "دفع فواتير وأرنونا", "بطاقات مشحونة وعملات", "بريد دولي ومحلي"],
    note: "يعمل بحجز دور مسبق · فاكس الفرع: 08-6114077.",
    url: "https://doar.israelpost.co.il/branch/237",
    appointmentUrl: "https://israelpost.co.il/%D7%A9%D7%99%D7%A8%D7%95%D7%AA%D7%99%D7%9D/%D7%90%D7%99%D7%AA%D7%95%D7%A8-%D7%A1%D7%A0%D7%99%D7%A4%D7%99%D7%9D-%D7%95%D7%96%D7%99%D7%9E%D7%95%D7%9F-%D7%AA%D7%95%D7%A8-%D7%91%D7%A7%D7%9C%D7%99%D7%A7/%D7%96%D7%99%D7%9E%D7%95%D7%9F-%D7%AA%D7%95%D7%A8-%D7%95%D7%91%D7%99%D7%98%D7%95%D7%97?no=237",
    directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=31.394548,34.753934",
  },
  {
    id: "297",
    name: "فرع المختار (مقابل البلدية)",
    officialName: "אל מוכתר רהט (297)",
    kind: "فرع بريد وبنك البريد",
    badge: "فرع #297",
    address: "مقابل مبنى بلدية رهط",
    phone: "171",
    hours: [
      { dayIdx: [1], label: "08:00–18:00", ranges: [[480, 1080]] },
      { dayIdx: [0, 2, 3, 4], label: "08:00–14:00", ranges: [[480, 840]] },
    ],
    hoursDisplay: [
      { day: "الاثنين", time: "08:00–18:00" },
      { day: "الأحد، الثلاثاء، الأربعاء، الخميس", time: "08:00–14:00" },
      { day: "الجمعة والسبت", time: "مغلق" },
    ],
    services: ["خدمات مالية (بنك البريد)", "دفع فواتير وأرنونا", "بريد دولي ومحلي", "تأمينات"],
    note: "يعمل بحجز دور مسبق عبر موقع البريد أو الهاتف 171.",
    url: "https://doar.israelpost.co.il/branch/297",
    appointmentUrl: "https://israelpost.co.il/%D7%A9%D7%99%D7%A8%D7%95%D7%AA%D7%99%D7%9D/%D7%90%D7%99%D7%AA%D7%95%D7%A8-%D7%A1%D7%A0%D7%99%D7%A4%D7%99%D7%9D-%D7%95%D7%96%D7%99%D7%9E%D7%95%D7%9F-%D7%AA%D7%95%D7%A8-%D7%91%D7%A7%D7%9C%D7%99%D7%A7/%D7%96%D7%99%D7%9E%D7%95%D7%9F-%D7%AA%D7%95%D7%A8-%D7%95%D7%91%D7%99%D7%98%D7%95%D7%97?no=297",
    directionsUrl: "https://www.google.com/maps/search/?api=1&query=%D7%93%D7%95%D7%90%D7%A8%20%D7%90%D7%9C%20%D7%9E%D7%95%D7%9B%D7%AA%D7%A8%20%D7%A8%D7%94%D7%98",
  },
  {
    id: "3795",
    name: "الفارس موبايل (استلام طرود)",
    officialName: "אלפארס מובייל (3795)",
    kind: "مركز تسليم طرود فقط",
    badge: "نقطة #3795",
    address: "شارع صلاح الدين 239، رهط",
    hours: [
      { dayIdx: [0, 1, 2, 3, 4], label: "12:00–20:00", ranges: [[720, 1200]] },
      { dayIdx: [5], label: "09:00–12:00", ranges: [[540, 720]] },
    ],
    hoursDisplay: [
      { day: "الأحد–الخميس", time: "12:00–20:00" },
      { day: "الجمعة", time: "09:00–12:00" },
      { day: "السبت", time: "مغلق" },
    ],
    services: ["استلام الطرود والرسائل فقط (איסוף בלבד)"],
    note: "نقطة مخصصة لاستلام الطرود المسجلة (لا تشمل دفع الفواتير أو بنك البريد).",
    url: "https://doar.israelpost.co.il/branch/3795",
    directionsUrl: "https://www.google.com/maps/dir/?api=1&destination=31.394312,34.74261",
  },
];

function getBranchLiveStatus(branch: InteractivePostBranch, nowMs: number): {
  isOpen: boolean;
  todayHours: string;
} {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(nowMs));
    const wk = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
    const hr = Number(parts.find((p) => p.type === "hour")?.value ?? 10);
    const mn = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayIdx = dayMap[wk] ?? 0;
    const mins = (hr === 24 ? 0 : hr) * 60 + mn;
    const rule = branch.hours.find((h) => h.dayIdx.includes(dayIdx));
    if (!rule) return { isOpen: false, todayHours: "مغلق اليوم" };
    const isOpen = rule.ranges.some(([start, end]) => mins >= start && mins < end);
    return { isOpen, todayHours: rule.label };
  } catch {
    return { isOpen: false, todayHours: "08:00–15:00" };
  }
}

export function InteractiveRahatServicesHub({ now = Date.now() }: { now?: number }) {
  const [mainTab, setMainTab] = useState<"post" | "municipality" | "health" | null>(null);
  const [postSubTab, setPostSubTab] = useState<"branches" | "pay" | "track" | "bank">("branches");
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [showAllHours, setShowAllHours] = useState<boolean>(false);
  const [trackingCode, setTrackingCode] = useState<string>("");
  const [selectedPayIdx, setSelectedPayIdx] = useState<number | null>(null);

  const activeBranch = selectedBranchId
    ? RAHAT_POST_BRANCHES.find((b) => b.id === selectedBranchId) ?? null
    : null;
  const activeStatus = activeBranch ? getBranchLiveStatus(activeBranch, now) : null;

  const paymentOptions = [
    {
      icon: "🏠",
      title: "الأرنونا والمياه (بلدية رهط)",
      desc: "تسديد ضريبة الأرنونا وفواتير المياه أونلاين ببطاقة الاعتماد أو في أي فرع بريد بالقسيمة.",
      steps: [
        "للدفع الفوري عبر بوابة بلدية رهط (PayBill): جهّز رقم الهوية ورقم الزبون/القسيمة.",
        "للدفع في البريد أو تقسيط المبلغ (3 إلى 36 دفعة): أحضر قسيمة الدفع الأصلية.",
        "للاستفسار أو التسويات: قسم الجباية في بلدية رهط على الرقم 08-9914982.",
      ],
      primaryLabel: "دفع الأرنونا والمياه أونلاين ↗",
      primaryHref: "https://www.paybill.co.il/Payment/WaterPayment?p=165",
      secondaryLabel: "دفع الأرنونا عبر موقع البريد ↗",
      secondaryHref: "https://doar.israelpost.co.il/content/city-tax-payment/",
    },
    {
      icon: "🪪",
      title: "شهادة مواطن سنوية (אישור תושב שנתי)",
      desc: "إصدار شهادة إقامة سنوية لسكان مدينة رهط (نموذج 1312 لضريبة الدخل والمؤسسات الرسمية) عبر بوابة بلدية رهط.",
      steps: [
        "يُشترط التسجيل في ملحق بطاقة الهوية (ספח ת.ז) كساكن في مدينة رهط.",
        "إصدار فوري أونلاين للمستوفين لشروط الجباية والأرنونا والمياه والتسجيل في مؤسسات التعليم.",
        "جميع حقوق الخدمة والشعارات والنماذج محفوظة رسمياً لبلدية رهط (עיריית רהט).",
      ],
      primaryLabel: "إصدار אישור תושב שנתי (بلدية رهط) ↗",
      primaryHref: "https://rahat-muni.com/?lang=he",
      secondaryLabel: "بوابة خدمات السكان (رهط 360) ↗",
      secondaryHref: "https://ecrahat.com/%D7%AA%D7%95%D7%A9%D7%91%D7%99%D7%9D",
    },
    {
      icon: "⚡",
      title: "الكهرباء والماء والغاز وبيزك",
      desc: "دفع قسائم شركة الكهرباء وشركات المياه والاتصالات في الفرع أو بتصوير القسيمة أونلاين.",
      steps: [
        "الكهرباء: تحتاج رقم العقد ورقم الفاتورة الظاهرين على القسيمة.",
        "يمكن تقسيط الفواتير من 300 ₪ حتى 100,000 ₪ ببطاقة اعتماد (3–36 دفعة).",
        "يُحسب الدفع في نفس يوم العمل حتى الساعة 18:30 (الأحد–الخميس).",
      ],
      primaryLabel: "دفع قسيمة أونلاين (موقع البريد) ↗",
      primaryHref: "https://doar.israelpost.co.il/voucher",
      secondaryLabel: "شرح تقسيط الفواتير ببطاقة الاعتماد ↗",
      secondaryHref: "https://doar.israelpost.co.il/content/paymet-by-credit-card/",
    },
    {
      icon: "🚗",
      title: "ترخيص السيارة ومخالفات السير",
      desc: "رسوم رخصة المركبة ورخصة السياقة وغرامات الشرطة ومخالفات السير.",
      steps: [
        "رسوم وزارة المواصلات (ترخيص السيارة وفحص السياقة) تُدفع بالقسيمة في البريد أو أونلاين.",
        "مخالفات السير وغرامات الشرطة تُدفع عبر بوابة الدفع الحكومية أو في فروع البريد.",
        "إذا فقدت ورقة المخالفة اتصل بمركز الجباية: *35592 أو 073-2055000.",
      ],
      primaryLabel: "دفع مخالفة السير (gov.il) ↗",
      primaryHref: "https://www.gov.il/ar/service/police_fine_payment",
      secondaryLabel: "بوابة الدفع المباشر للمخالفات ↗",
      secondaryHref: "https://ecom.gov.il/voucherspa/input/318",
    },
    {
      icon: "🏛️",
      title: "التأمين الوطني والضرائب",
      desc: "دفعات التأمين الوطني (ביטוח לאומי)، ضريبة الدخل (מס הכנסה) وضريبة القيمة المضافة (מע״מ).",
      steps: [
        "تُقبل الشيكات من جميع البنوك في كافة فروع البريد برسوم شباك 4 ₪ فقط.",
        "بين 1 و14 من الشهر يمكن الدفع بشيك مؤجّل (شيك واحد لكل قسيمة).",
        "لأصحاب المصالح (أكثر من 10 قسائم): يتوفر مسار «مغلّف الأعمال» السريع.",
      ],
      primaryLabel: "دفع الضرائب في موقع البريد ↗",
      primaryHref: "https://doar.israelpost.co.il/content/tax-payment",
      secondaryLabel: "دفع القسائم الحكومية أونلاين ↗",
      secondaryHref: "https://doar.israelpost.co.il/voucher",
    },
  ];

  const activePay = selectedPayIdx !== null ? paymentOptions[selectedPayIdx] ?? null : null;

  return (
    <div className="stamp overflow-hidden border-2 border-primary/80 bg-gradient-to-b from-primary-soft/60 via-paper to-paper p-3.5 sm:p-4 shadow-sm">
      {/* Top 3 Main Service Category Tabs — Proportional Rounded-Square Tiles */}
      <div
        role="tablist"
        aria-label={tr("أقسام دليل البريد والخدمات في رهط")}
        className="grid grid-cols-3 gap-2.5 sm:gap-3"
      >
        {[
          { id: "post" as const, icon: "📮", title: "البريد والبنك", sub: "4 فروع · تتبع" },
          { id: "municipality" as const, icon: "🏛️", title: "الأرنونا والبلدية", sub: "אישור תושב · 106" },
          { id: "health" as const, icon: "🏥", title: "الصحة والطوارئ", sub: "الإسعاف · العيادات" },
        ].map((tab) => {
          const active = mainTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMainTab((prev) => (prev === tab.id ? null : tab.id))}
              className={`press flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-2.5 text-center transition-all ${
                active
                  ? "border-ink bg-ink text-paper shadow-md ring-2 ring-primary/50"
                  : "border-line bg-paper/95 text-ink hover:border-primary shadow-2xs"
              }`}
            >
              <span
                className={`grid size-12 shrink-0 place-items-center rounded-2xl text-2xl shadow-2xs ${
                  active ? "bg-primary text-ink" : "bg-primary-soft text-ink"
                }`}
                aria-hidden
              >
                {tab.icon}
              </span>
              <span className="min-w-0 w-full">
                <span className="block truncate text-[11px] font-extrabold sm:text-xs">
                  {trv(tab.title)}
                </span>
                <span
                  className={`mt-0.5 block truncate text-[9.5px] font-bold sm:text-[10.5px] ${
                    active ? "text-paper/80" : "text-muted"
                  }`}
                >
                  {trv(tab.sub)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: POST & POSTAL BANK */}
      {mainTab === "post" ? (
        <div className="mt-3.5 space-y-3">
          {/* Interactive Sub-navigation pills */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-surface/90 p-1.5">
            {[
              { id: "branches" as const, label: "📍 فروع رهط وساعات العمل" },
              { id: "pay" as const, label: "💳 دفع الفواتير والأرنونا" },
              { id: "track" as const, label: "📦 تتبع طرد بريدي" },
              { id: "bank" as const, label: "🏦 بنك البريد والمخصصات" },
            ].map((sub) => {
              const isSub = postSubTab === sub.id;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setPostSubTab(sub.id)}
                  className={`press flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-extrabold transition sm:text-sm ${
                    isSub
                      ? "bg-primary text-ink shadow-2xs"
                      : "text-muted hover:bg-paper/60 hover:text-ink"
                  }`}
                >
                  {trv(sub.label)}
                </button>
              );
            })}
          </div>

          {/* Sub-view 1: Interactive Branches with Live Status */}
          {postSubTab === "branches" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {RAHAT_POST_BRANCHES.map((b) => {
                  const st = getBranchLiveStatus(b, now);
                  const isSel = activeBranch?.id === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setSelectedBranchId((prev) => (prev === b.id ? null : b.id));
                        setShowAllHours(false);
                      }}
                      className={`press flex flex-col justify-between rounded-2xl border p-2.5 text-start transition ${
                        isSel
                          ? "border-2 border-primary bg-primary-soft/80 shadow-2xs"
                          : "border-line bg-paper hover:border-primary/60"
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-1">
                        <span className="rounded-lg bg-surface px-1.5 py-0.5 text-[10px] font-extrabold text-muted">
                          {trv(b.badge)}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                            st.isOpen
                              ? "bg-[#16A34A]/15 text-[#15803D]"
                              : "bg-surface text-muted"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              st.isOpen ? "bg-[#16A34A] animate-pulse" : "bg-muted"
                            }`}
                          />
                          {st.isOpen ? tr("مفتوح الآن") : tr("مغلق")}
                        </span>
                      </div>
                      <p className="mt-1.5 truncate text-xs font-extrabold text-ink sm:text-sm">
                        {trv(b.name)}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] font-semibold text-muted" dir="ltr">
                        {trv(st.todayHours)}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Selected Branch Interactive Detail Card (appears after clicking a branch above) */}
              {activeBranch && activeStatus ? (
              <div className="rounded-2xl border border-line bg-paper p-3.5 shadow-2xs">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-extrabold text-ink sm:text-lg">
                        {trv(activeBranch.name)}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                          activeStatus.isOpen
                            ? "bg-[#16A34A]/15 text-[#15803D]"
                            : "bg-alert/10 text-alert"
                        }`}
                      >
                        <span
                          className={`size-2 rounded-full ${
                            activeStatus.isOpen ? "bg-[#16A34A] animate-ping" : "bg-alert"
                          }`}
                        />
                        {activeStatus.isOpen ? tr("مفتوح الآن") : tr("مغلق حالياً")}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-semibold text-muted">
                      {trv(activeBranch.kind)} · <span lang="he">{activeBranch.officialName}</span>
                    </p>
                  </div>
                  <span className="rounded-xl bg-surface px-2.5 py-1 text-xs font-extrabold text-ink">
                    🕒 {tr("اليوم:")}{" "}
                    <bdi dir="ltr" className="text-primary-ink">
                      {trv(activeStatus.todayHours)}
                    </bdi>
                  </span>
                </div>

                <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-ink sm:text-sm">
                  <MapPin className="size-4 shrink-0 text-primary-ink" aria-hidden />
                  <span>{trv(activeBranch.address)}</span>
                </p>

                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {activeBranch.services.map((srv) => (
                    <span
                      key={srv}
                      className="rounded-xl border border-line bg-surface/60 px-2.5 py-1 text-[11px] font-bold text-ink"
                    >
                      ✓ {trv(srv)}
                    </span>
                  ))}
                </div>

                <p className="mt-2 text-xs font-semibold text-muted">💡 {trv(activeBranch.note)}</p>

                {/* Expandable Full Weekly Schedule */}
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => setShowAllHours((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-extrabold text-primary-ink underline decoration-1 underline-offset-4"
                  >
                    <span>
                      {showAllHours
                        ? tr("إخفاء جدول ساعات الأسبوع")
                        : tr("عرض جدول ساعات الأسبوع الكامل")}
                    </span>
                    <ChevronDown
                      className={`size-4 transition-transform ${showAllHours ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                  {showAllHours ? (
                    <div className="mt-2 rounded-xl bg-surface p-2.5 text-xs">
                      {activeBranch.hoursDisplay.map((row) => (
                        <div
                          key={row.day}
                          className="flex items-center justify-between border-b border-line/70 py-1.5 last:border-b-0"
                        >
                          <span className="font-semibold text-ink">{trv(row.day)}</span>
                          <span className="font-extrabold text-primary-ink" dir="ltr">
                            {trv(row.time)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Action Buttons */}
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="sm:col-span-2">
                    <MapChoices googleUrl={activeBranch.directionsUrl} />
                  </div>
                  {activeBranch.appointmentUrl ? (
                    <a
                      href={activeBranch.appointmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-ghost py-2 text-xs font-extrabold"
                    >
                      📅 {tr("حجز دور مسبق")}
                    </a>
                  ) : null}
                  <a
                    href="tel:171"
                    className="btn btn-ghost py-2 text-xs font-extrabold"
                  >
                    📞 {tr("اتصال بمركز 171")}
                  </a>
                  <a
                    href={activeBranch.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost py-2 text-xs font-extrabold"
                  >
                    🔗 {tr("صفحة الفرع الرسمية")}
                  </a>
                </div>
              </div>
              ) : null}
            </div>
          ) : null}

          {/* Sub-view 2: Interactive Bill & Tax Payment Assistant */}
          {postSubTab === "pay" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {paymentOptions.map((opt, idx) => {
                  const isSel = idx === selectedPayIdx;
                  return (
                    <button
                      key={opt.title}
                      type="button"
                      onClick={() => setSelectedPayIdx((prev) => (prev === idx ? null : idx))}
                      className={`press flex items-center gap-2 rounded-2xl border p-2.5 text-start transition ${
                        isSel
                          ? "border-2 border-primary bg-primary-soft font-extrabold text-ink"
                          : "border-line bg-paper font-bold text-ink hover:border-primary/60"
                      }`}
                    >
                      <span className="text-lg" aria-hidden>
                        {opt.icon}
                      </span>
                      <span className="line-clamp-2 text-xs">{trv(opt.title)}</span>
                    </button>
                  );
                })}
              </div>

              {activePay ? (
              <div className="rounded-2xl border border-line bg-paper p-3.5">
                <h3 className="text-base font-extrabold text-ink">
                  {activePay.icon} {trv(activePay.title)}
                </h3>
                <p className="mt-1 text-xs font-semibold text-muted sm:text-sm">
                  {trv(activePay.desc)}
                </p>
                <ul className="mt-2.5 space-y-1.5 text-xs font-semibold text-ink sm:text-sm">
                  {activePay.steps.map((st) => (
                    <li key={st} className="flex items-start gap-2">
                      <span className="mt-0.5 text-primary-ink">✓</span>
                      <span>{trv(st)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={activePay.primaryHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn py-2 text-xs font-extrabold"
                  >
                    {trv(activePay.primaryLabel)}
                  </a>
                  <a
                    href={activePay.secondaryHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost py-2 text-xs font-extrabold"
                  >
                    {trv(activePay.secondaryLabel)}
                  </a>
                </div>
              </div>
              ) : null}
            </div>
          ) : null}

          {/* Sub-view 3: Interactive Parcel Tracker */}
          {postSubTab === "track" ? (
            <div className="rounded-2xl border border-line bg-paper p-3.5 space-y-3">
              <div>
                <h3 className="text-base font-extrabold text-ink">
                  📦 {tr("تتبع الطرود والبعائث في بريد إسرائيل")}
                </h3>
                <p className="mt-0.5 text-xs font-semibold text-muted sm:text-sm">
                  {tr("أدخل رقم التتبع المكون من حروف وأرقام (مثل RR123456789IL أو RS...) لفتح حالة الطرد ومكان استلامه في رهط مباشرة:")}
                </p>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const clean = trackingCode.trim().toUpperCase();
                  const targetUrl = clean
                    ? `https://doar.israelpost.co.il/deliverytracker?itemcode=${encodeURIComponent(clean)}`
                    : "https://doar.israelpost.co.il/deliverytracker";
                  window.open(targetUrl, "_blank", "noopener,noreferrer");
                }}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <input
                  type="text"
                  dir="ltr"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="RR123456789IL / حزمة بريد..."
                  className="field flex-1 font-mono text-sm uppercase"
                />
                <button type="submit" className="btn shrink-0 px-5 py-2.5 text-xs font-extrabold sm:text-sm">
                  🔍 {tr("تتبع الطرد الآن ↗")}
                </button>
              </form>
              <div className="grid gap-2 sm:grid-cols-2 text-xs font-semibold">
                <div className="rounded-xl bg-surface p-2.5">
                  <p className="font-extrabold text-ink">📍 {tr("نقاط استلام الطرود في رهط:")}</p>
                  <p className="mt-0.5 text-muted">
                    {tr("توزّع الطرود حسب الحي في فرع صلاح الدين (209)، البريد المركزي (237)، فرع المختار (297)، أو نقطة الفارس موبايل (3795).")}
                  </p>
                </div>
                <div className="rounded-xl bg-surface p-2.5">
                  <p className="font-extrabold text-ink">🪪 {tr("ماذا تحضر عند الاستلام؟")}</p>
                  <p className="mt-0.5 text-muted">
                    {tr("بطاقة الهوية الأصلية + رقم الرسالة النصية (SMS) التي وصلتك من البريد مع رقم الرف/المرجع.")}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {/* Sub-view 4: Postal Bank (Doar Finance) */}
          {postSubTab === "bank" ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="rounded-2xl border border-line bg-paper p-3">
                <h4 className="text-sm font-extrabold text-ink">
                  💵 {tr("استلام مخصصات التأمين الوطني (קצבאות)")}
                </h4>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {tr("صرف مخصصات التأمين الوطني والرفاه نقداً في فروع رهط (209، 237، 297) بإبراز بطاقة الهوية الأصلية فقط.")}
                </p>
                <a
                  href="https://doar.israelpost.co.il/content/social-security-benefits/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-extrabold text-primary-ink underline"
                >
                  {tr("تفاصيل استلام المخصصات ↗")}
                </a>
              </div>
              <div className="rounded-2xl border border-line bg-paper p-3">
                <h4 className="text-sm font-extrabold text-ink">
                  ⚡ {tr("تحويل فوري داخل البلاد «مزومان بزمان»")}
                </h4>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {tr("تحويل نقدي حتى 10,000 ₪ بدون حساب بنك يصل خلال دقائق بين أي فرعي بريد برقم الهوية ورقم المرجع.")}
                </p>
                <a
                  href="https://doar.israelpost.co.il/content/about-cash-on-time/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-extrabold text-primary-ink underline"
                >
                  {tr("خدمة مزومان بزمان ↗")}
                </a>
              </div>
              <div className="rounded-2xl border border-line bg-paper p-3">
                <h4 className="text-sm font-extrabold text-ink">
                  🌍 {tr("تحويل أموال للخارج وعملات أجنبية")}
                </h4>
                <p className="mt-1 text-xs font-semibold text-muted">
                  {tr("تحويل نقدي دولي عبر DOAR MONEY TRANSFER أو لحساب بنكي عبر Eurogiro، وشراء العملات والبطاقات المشحونة.")}
                </p>
                <a
                  href="https://doar.israelpost.co.il/en/content/doar-money-transfer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-extrabold text-primary-ink underline"
                >
                  {tr("التحويل الدولي ↗")}
                </a>
              </div>
              <div className="rounded-2xl border border-line bg-paper p-3 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-extrabold text-ink">
                    📞 {tr("هاتف خدمة بنك البريد (دوار فيننسيم)")}
                  </h4>
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {tr("للاستفسار عن الحسابات والبطاقات المشحونة والتحويلات المالية:")}
                  </p>
                </div>
                <div className="mt-2 flex gap-2">
                  <a href="tel:025005303" className="btn py-1.5 text-xs font-extrabold">
                    📞 <span dir="ltr">02-5005303</span>
                  </a>
                  <a href="tel:171" className="btn btn-ghost py-1.5 text-xs font-extrabold">
                    📞 <span dir="ltr">171</span>
                  </a>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* TAB 2: MUNICIPALITY & ARNONA + אישור תושב שנתי */}
      {mainTab === "municipality" ? (
        <div className="mt-3.5 space-y-3">
          {/* 4 Proportional Rounded-Square Municipality Action Cards */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <a
              href="https://www.paybill.co.il/Payment/WaterPayment?p=165"
              target="_blank"
              rel="noopener noreferrer"
              className="press flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-primary bg-paper p-3 text-center shadow-2xs transition hover:bg-primary-soft/40"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary text-2xl text-ink shadow-2xs">
                💳
              </span>
              <span className="text-xs font-extrabold text-ink sm:text-sm">
                {tr("دفع الأرنونا والمياه")}
              </span>
              <span className="text-[10.5px] font-bold text-muted">
                {tr("بوابة الدفع الرسمية ↗")}
              </span>
            </a>

            <a
              href="https://rahat-muni.com/?lang=he"
              target="_blank"
              rel="noopener noreferrer"
              className="press flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-emerald-600/50 bg-emerald-500/10 p-3 text-center shadow-2xs transition hover:bg-emerald-500/20"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-2xl text-white shadow-2xs">
                🪪
              </span>
              <span className="text-xs font-extrabold text-ink sm:text-sm">
                {tr("شهادة مواطن سنوية")}
              </span>
              <span className="text-[11px] font-black text-emerald-800" lang="he">
                אישור תושב שנתי ↗
              </span>
            </a>

            <a
              href="tel:089914982"
              className="press flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-paper p-3 text-center shadow-2xs transition hover:border-primary"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-surface text-2xl shadow-2xs">
                📞
              </span>
              <span className="text-xs font-extrabold text-ink sm:text-sm">
                {tr("قسم الجباية — رهط")}
              </span>
              <span className="font-mono text-xs font-extrabold text-primary-ink" dir="ltr">
                08-9914982
              </span>
            </a>

            <a
              href="tel:106"
              className="press flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-paper p-3 text-center shadow-2xs transition hover:border-alert"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-alert/15 text-2xl shadow-2xs">
                🚨
              </span>
              <span className="text-xs font-extrabold text-ink sm:text-sm">
                {tr("طوارئ البلدية 106")}
              </span>
              <span className="text-[10.5px] font-bold text-muted">
                {tr("إنارة، نظافة وطوارئ")}
              </span>
            </a>
          </div>

          {/* Dedicated Detailed Card for אישור תושב שנתי (Annual Resident Certificate) */}
          <div className="rounded-2xl border-2 border-emerald-600/35 bg-gradient-to-r from-emerald-500/10 via-paper to-paper p-3.5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-xl text-white shadow-2xs">
                  🪪
                </span>
                <div>
                  <h4 className="text-xs font-extrabold text-ink sm:text-sm">
                    {tr("إصدار شهادة مواطن سنوية — אישור תושב שנתי (بلدية رهط)")}
                  </h4>
                  <p className="mt-0.5 text-[11px] font-semibold text-muted">
                    {tr("شهادة إثبات سكن في مدينة رهط (نموذج 1312 لضريبة الدخل والمؤسسات الحكومية والجامعات)")}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href="https://rahat-muni.com/?lang=he"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn bg-emerald-600 py-1.5 text-xs font-extrabold text-white hover:bg-emerald-700"
                >
                  🪪 {tr("طلب אישור תושב שנתי أونلاين ↗")}
                </a>
                <a
                  href="https://ecrahat.com/%D7%AA%D7%95%D7%A9%D7%91%D7%99%D7%9D"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost py-1.5 text-xs font-extrabold"
                >
                  {tr("بوابة رهط 360 للسكان ↗")}
                </a>
              </div>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-2xl border border-line bg-paper p-3">
              <h4 className="text-xs font-extrabold text-ink sm:text-sm">
                🏛️ {tr("المركز الجماهيري رهط (מתנ״ס רהט)")}
              </h4>
              <p className="mt-0.5 text-xs font-semibold text-muted">
                {tr("دورات تعليمية ورياضية، فعاليات ثقافية وشبابية وبرامج للأطفال والعائلات في مركز المدينة.")}
              </p>
              <div className="mt-2 flex gap-2">
                <MapChoices googleUrl="https://www.google.com/maps/dir/?api=1&destination=31.3925,34.7544" />
                <Link
                  to="/directory/guide/$guide"
                  params={{ guide: "municipality" }}
                  className="btn btn-ghost py-1.5 text-xs font-extrabold"
                >
                  {tr("دليل البلدية الكامل")}
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-paper p-3">
              <h4 className="text-xs font-extrabold text-ink sm:text-sm">
                🛍️ {tr("السوق البلدي والمركز التجاري رهط")}
              </h4>
              <p className="mt-0.5 text-xs font-semibold text-muted">
                {tr("وسط المدينة — يضم المحلات التجارية، البريد المركزي (237)، البنوك والمطاعم والخدمات.")}
              </p>
              <div className="mt-2 flex gap-2">
                <MapChoices googleUrl="https://www.google.com/maps/dir/?api=1&destination=31.394647,34.758378" />
                <a
                  href="https://rahat-muni.com/%D9%82%D8%B3%D9%85-%D8%A7%D9%84%D8%AC%D8%A8%D8%A7%D9%8A%D9%87/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost py-1.5 text-xs font-extrabold"
                >
                  {tr("موقع بلدية رهط ↗")}
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* TAB 3: HEALTH & EMERGENCY */}
      {mainTab === "health" ? (
        <div className="mt-3.5 space-y-3">
          {/* 1-Tap Emergency Speed Dial */}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {[
              { num: "101", label: "الإسعاف", icon: "🚑" },
              { num: "1221", label: "اتحاد الإنقاذ", icon: "⚡" },
              { num: "100", label: "الشرطة", icon: "🚓" },
              { num: "102", label: "الإطفاء", icon: "🚒" },
              { num: "103", label: "الكهرباء", icon: "🔌" },
              { num: "106", label: "طوارئ البلدية", icon: "🏛️" },
            ].map((em) => (
              <a
                key={em.num}
                href={`tel:${em.num}`}
                className="press flex flex-col items-center justify-center rounded-2xl border border-line bg-paper p-2 text-center shadow-2xs hover:border-alert"
              >
                <span className="text-base" aria-hidden>
                  {em.icon}
                </span>
                <span className="font-mono text-sm font-extrabold text-alert" dir="ltr">
                  {em.num}
                </span>
                <span className="truncate text-[11px] font-bold text-ink">{trv(em.label)}</span>
              </a>
            ))}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-paper p-3">
              <h4 className="text-xs font-extrabold text-ink sm:text-sm">
                🏥 {tr("عيادة ومستشفى كلاليت رهط")}
              </h4>
              <p className="mt-0.5 text-[11px] font-semibold text-muted">
                {tr("طب عائلة وأطفال، عيادات تخصصية، مختبر وصيدلية.")}
              </p>
              <MapChoices googleUrl="https://www.google.com/maps/dir/?api=1&destination=31.394985,34.754784" />
            </div>

            <div className="rounded-2xl border border-line bg-paper p-3">
              <h4 className="text-xs font-extrabold text-ink sm:text-sm">
                👶 {tr("مركز قطرة حليب (טיפת חלב)")}
              </h4>
              <p className="mt-0.5 text-[11px] font-semibold text-muted">
                {tr("تطعيمات الأطفال والرضّع ومتابعة نمو الطفل وصحة الأم.")}
              </p>
              <MapChoices googleUrl="https://www.google.com/maps/dir/?api=1&destination=31.392461,34.751015" />
            </div>

            <div className="rounded-2xl border-2 border-primary bg-primary-soft/60 p-3">
              <h4 className="text-xs font-extrabold text-ink sm:text-sm">
                💊 {tr("صيدلية المناوبة (الحراسة) اليوم")}
              </h4>
              <p className="mt-0.5 text-[11px] font-semibold text-muted">
                {tr("شاهد الصيدلية المناوبة المفتوحة اليوم في رهط مع الهاتف والموقع.")}
              </p>
              <Link
                to="/today"
                className="btn mt-2 w-full py-1.5 text-xs font-extrabold"
              >
                {tr("افتح لوحة اليوم والصيدلية")}
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* Footer Quick Links to All 4 Full Guides */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-line/80 pt-3 text-xs font-extrabold">
        <span className="text-muted">{tr("الأدلة التفصيلية الكاملة:")}</span>
        <div className="flex flex-wrap gap-1.5">
          {[
            { slug: "post", label: "📮 دليل البريد" },
            { slug: "municipality", label: "🏛️ دليل البلدية" },
            { slug: "health", label: "🏥 دليل الصحة" },
          ].map((g) => (
            <Link
              key={g.slug}
              to="/directory/guide/$guide"
              params={{ guide: g.slug }}
              className="rounded-xl border border-line bg-paper px-2.5 py-1 text-ink transition hover:border-primary hover:bg-primary-soft"
            >
              {trv(g.label)}
            </Link>
          ))}
        </div>
      </div>

      {/* Mandatory Official Sources & Institutional Rights Preservation Disclaimer */}
      <div className="mt-2.5 rounded-2xl border border-line/80 bg-surface/70 p-3 text-[11px] font-semibold leading-relaxed text-muted">
        <p className="font-extrabold text-ink">
          ⚖️ {tr("حفظ حقوق المؤسسات والمصادر الرسمية (Official Institutional Rights & Sources):")}
        </p>
        <p className="mt-0.5">
          {tr("جميع الحقوق والعلامات التجارية والشعارات والنماذج الرسمية (بما فيها بلدية رهط עיריית רהט، بريد إسرائيل דואר ישראל، شركة غاليم גלים، وخدمات الصناديق الصحية والطوارئ) محفوظة بالكامل لمؤسساتها الرسمية وأصحابها القانونيين. منصة «رهط بوست» هي منصة إعلامية ومجتمعية مستقلة توجه المستخدمين للروابط الرسمية المباشرة:")}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold" dir="ltr">
          <a href="https://www.gov.il" target="_blank" rel="noopener noreferrer" className="text-primary-ink underline">gov.il</a>
          <a href="https://doar.israelpost.co.il" target="_blank" rel="noopener noreferrer" className="text-primary-ink underline">doar.israelpost.co.il</a>
          <a href="https://www.rahat.muni.il" target="_blank" rel="noopener noreferrer" className="text-primary-ink underline">rahat.muni.il</a>
          <a href="https://bus.gov.il" target="_blank" rel="noopener noreferrer" className="text-primary-ink underline">bus.gov.il</a>
          <a href="https://www.galim-bus.co.il" target="_blank" rel="noopener noreferrer" className="text-primary-ink underline">galim-bus.co.il</a>
        </div>
      </div>
    </div>
  );
}



/* -------------------------------------------------------------------------- */
/* Interactive Rahat Shops & Services Directory Section (Homepage)            */
/* -------------------------------------------------------------------------- */

export type BusesHomeStyleKey =
  | "modern_cards"
  | "live_board"
  | "compact_pills"
  | "dark_gold"
  | "split_showcase"
  | "collapsible";

export type EmergencyHomeStyleKey =
  | "modern_grid"
  | "compact_strip"
  | "color_coded"
  | "dark_gold"
  | "list_rows"
  | "collapsible";

function parseBusesAndEmergencyHomeCfg(quickLinks: { id: string; title: string; subtitle: string; url: string }[]) {
  const item = (quickLinks ?? []).find((q) => q.id === "busemergcfg");
  let busesStyle: BusesHomeStyleKey = "modern_cards";
  let emergencyStyle: EmergencyHomeStyleKey = "dark_gold";
  let includeEmergencyInBuses = true;
  let showAllEmergency = false;

  if (item && item.url.startsWith("/__bemg?")) {
    const sp = new URLSearchParams(item.url.slice(8));
    const bs = sp.get("bs") as BusesHomeStyleKey | null;
    if (
      bs === "modern_cards" ||
      bs === "live_board" ||
      bs === "compact_pills" ||
      bs === "dark_gold" ||
      bs === "split_showcase" ||
      bs === "collapsible"
    ) {
      busesStyle = bs;
    }
    const es = sp.get("es") as EmergencyHomeStyleKey | null;
    if (
      es === "modern_grid" ||
      es === "compact_strip" ||
      es === "color_coded" ||
      es === "dark_gold" ||
      es === "list_rows" ||
      es === "collapsible"
    ) {
      emergencyStyle = es;
    }
    if (sp.get("ieb") === "0") includeEmergencyInBuses = false;
    if (sp.get("sae") === "1") showAllEmergency = true;
  }
  return { busesStyle, emergencyStyle, includeEmergencyInBuses, showAllEmergency };
}

const GALIM_HOME_CITY_LINES = [
  { line: "1", realLine: "1", from: "حي السلام", to: "الخزان / حطين", freq: "كل 20 د" },
  { line: "2", realLine: "2", from: "حي السلام (الدفيئات)", to: "الخضر / حي 31", freq: "كل 20 د" },
  { line: "3", realLine: "3", from: "محطة تافوح / السلام", to: "رفح / البوئي", freq: "كل 25 د" },
  { line: "4 / 4أ", realLine: "4", from: "المدينة المنورة", to: "الحديقة العامة", freq: "كل 20 د" },
  { line: "5", realLine: "5", from: "حي صلاح الدين", to: "مدرسة الهدى (دائري)", freq: "كل 30 د" },
  { line: "6", realLine: "6", from: "المدينة المنورة", to: "حي صلاح الدين", freq: "كل 30 د" },
];

const GALIM_HOME_INTERCITY_LINES = [
  { line: "450", realLine: "450", from: "رهط (الأحياء)", to: "بئر السبع / سوروكا", freq: "كل 15 د" },
  { line: "471", realLine: "471", from: "رهط (مباشر)", to: "بئر السبع المركزية", freq: "سريع" },
  { line: "425", realLine: "425", from: "رهط", to: "تل السبع", freq: "منتظم" },
  { line: "423", realLine: "423", from: "رهط", to: "كسيفة / حورة", freq: "منتظم" },
  { line: "427", realLine: "427", from: "رهط", to: "عرعرة النقب", freq: "منتظم" },
  { line: "467", realLine: "467", from: "رهط", to: "سديروت / عسقلان", freq: "منتظم" },
];

const RAHAT_EMERGENCY_FULL = [
  { name: "الشرطة", sub: "طوارئ الأمن", phone: "100", icon: "🚔", tone: "blue" },
  { name: "الإسعاف (نجمة داود)", sub: "طوارئ طبية", phone: "101", icon: "🚑", tone: "red" },
  { name: "الإطفاء والإنقاذ", sub: "حرائق وإنقاذ", phone: "102", icon: "🚒", tone: "orange" },
  { name: "طوارئ بلدية رهط", sub: "الموكيد البلدي 24/7", phone: "106", icon: "🏛️", tone: "gold" },
  { name: "طوارئ الكهرباء", sub: "أعطال الكهرباء", phone: "103", icon: "⚡", tone: "gold" },
  { name: "الجبهة الداخلية", sub: "تعليمات الطوارئ", phone: "104", icon: "🛡️", tone: "blue" },
  { name: "اتحاد الإنقاذ", sub: "איחוד הצלה", phone: "1221", icon: "🩺", tone: "green" },
  { name: "الطوارئ الموحّد", sub: "خط الطوارئ العام", phone: "112", icon: "🆘", tone: "red" },
  { name: "بدالة بلدية رهط", sub: "مكاتب البلدية", phone: "08-9914800", icon: "📞", tone: "neutral" },
  { name: "استعلامات باصات غاليم", sub: "شركة גלים", phone: "08-6688700", icon: "🚌", tone: "neutral" },
] as const;

function homeHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function homeMinutesLabel(diff: number) {
  if (diff <= 0) return tr("يصل الآن");
  if (diff === 1) return tr("بعد دقيقة");
  if (diff === 2) return tr("بعد دقيقتين");
  if (diff <= 10) return tr("بعد {0} دقائق", diff);
  return tr("بعد {0} دقيقة", diff);
}

export function InteractiveGalimBusesHomeSection() {
  const settings = useSiteSettings();
  const cfg = useMemo(() => parseBusesAndEmergencyHomeCfg(settings.quickLinks ?? []), [settings.quickLinks]);
  const busEmergencyChips = useMemo(() => {
    const saved = parseEmergencyNumbers(settings.quickLinks);
    const source = saved.length
      ? saved.map((item) => ({ label: item.name, phone: item.phone }))
      : [
          { label: "الشرطة", phone: "100" },
          { label: "الإسعاف", phone: "101" },
          { label: "الإطفاء", phone: "102" },
          { label: "بلدية رهط", phone: "106" },
          { label: "الكهرباء", phone: "103" },
          { label: "إنقاذ", phone: "1221" },
        ];
    return source.slice(0, 6);
  }, [settings.quickLinks]);
  const [tab, setTab] = useState<"city" | "intercity" | "emergency">("city");
  const [expanded, setExpanded] = useState(cfg.busesStyle !== "collapsible");

  // Live Interactive Map Drawer State when clicking any bus line number
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [dir, setDir] = useState<string>("1");
  const [selectedStop, setSelectedStop] = useState<string>("");
  const [nearestStopCode, setNearestStopCode] = useState<string>("");
  const [nearestStopDistM, setNearestStopDistM] = useState<number | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [liveVehicles, setLiveVehicles] = useState<{ ref: string; dir: string; lat: number; lon: number; at: string }[]>([]);
  const [busStatus, setBusStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [nowClock, setNowClock] = useState<number>(() => Date.now());
  const [isFullscreenMap, setIsFullscreenMap] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null);
  const LModRef = useRef<typeof import("leaflet") | null>(null);
  const routeLayerRef = useRef<LayerGroup | null>(null);
  const busLayerRef = useRef<LayerGroup | null>(null);
  const userLayerRef = useRef<LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setExpanded(cfg.busesStyle !== "collapsible");
  }, [cfg.busesStyle]);

  useEffect(() => {
    if (!selectedLine) return;
    const id = setInterval(() => setNowClock(Date.now()), 1_000);
    return () => clearInterval(id);
  }, [selectedLine]);

  const info = useMemo(() => (selectedLine ? lineInfo(selectedLine) : null), [selectedLine]);
  const currentDir = useMemo(
    () => info?.dirs.find((d) => d.dir === dir) ?? info?.dirs[0] ?? null,
    [info, dir],
  );
  const lineMeta = useMemo(
    () => (selectedLine ? busLines.find((l) => l.number === selectedLine) : null),
    [selectedLine],
  );

  // Calculate nearest stop along the selected line to user GPS
  const findNearestStop = (lat: number, lon: number, dirObj: typeof currentDir) => {
    if (!dirObj) return;
    let bestCode = "";
    let bestKm = Infinity;
    for (const [code] of dirObj.stops) {
      const s = busSchedule.stops[code];
      if (!s) continue;
      const km = homeHaversineKm(lat, lon, s.lat, s.lon);
      if (km < bestKm) {
        bestKm = km;
        bestCode = code;
      }
    }
    if (bestCode) {
      setNearestStopCode(bestCode);
      setNearestStopDistM(Math.round(bestKm * 1000));
      setSelectedStop(bestCode);
    }
  };

  // Trigger user geolocation & center on nearest stop
  const locateUserAndNearestStop = (dirObj = currentDir, focusOnStop = false) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setUserCoords({ lat, lon });
        findNearestStop(lat, lon, dirObj);

        const Lf = LModRef.current;
        if (Lf && userLayerRef.current && leafletMapRef.current) {
          userLayerRef.current.clearLayers();
          Lf.circleMarker([lat, lon], {
            radius: 10,
            color: "#ffffff",
            weight: 3,
            fillColor: "#1a73e8",
            fillOpacity: 1,
          })
            .addTo(userLayerRef.current)
            .bindTooltip(tr("موقعك الجغرافي الحالي"), { direction: "top" });

          if (focusOnStop && nearestStopCode && busSchedule.stops[nearestStopCode]) {
            const st = busSchedule.stops[nearestStopCode];
            leafletMapRef.current.setView([st.lat, st.lon], 16, { animate: true });
          } else {
            leafletMapRef.current.setView([lat, lon], 15, { animate: true });
          }
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8_000 },
    );
  };

  const handleOpenLineMap = (rawLine: string) => {
    const cleanLine = rawLine.includes("4") && rawLine !== "40" && !rawLine.startsWith("42") && !rawLine.startsWith("45") && !rawLine.startsWith("46") && !rawLine.startsWith("47") ? "4" : rawLine.split(/[–/،\s]/)[0].trim();
    const targetLine = busLines.some((l) => l.number === cleanLine) ? cleanLine : "1";
    const nextInfo = lineInfo(targetLine);
    const firstDir = nextInfo?.dirs[0] ?? null;

    setSelectedLine(targetLine);
    setDir(firstDir?.dir ?? "1");
    setSelectedStop(firstDir?.stops[0]?.[0] ?? "");
    if (userCoords && firstDir) {
      findNearestStop(userCoords.lat, userCoords.lon, firstDir);
    } else {
      locateUserAndNearestStop(firstDir, false);
    }
  };

  // Initialize Leaflet map when selectedLine becomes active
  useEffect(() => {
    if (!selectedLine) {
      leafletMapRef.current?.remove();
      leafletMapRef.current = null;
      setMapReady(false);
      return;
    }
    let cancelled = false;
    void import("leaflet").then((mod) => {
      if (cancelled || !mapContainerRef.current || leafletMapRef.current) return;
      const Lf = (mod as unknown as { default?: typeof mod }).default ?? mod;
      LModRef.current = Lf;
      const m = Lf.map(mapContainerRef.current, { zoomControl: false, attributionControl: true }).setView(
        [31.393, 34.756],
        13,
      );
      Lf.control.zoom({ position: "bottomleft" }).addTo(m);
      Lf.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      }).addTo(m);
      routeLayerRef.current = Lf.layerGroup().addTo(m);
      busLayerRef.current = Lf.layerGroup().addTo(m);
      userLayerRef.current = Lf.layerGroup().addTo(m);
      leafletMapRef.current = m;
      setMapReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedLine]);

  // Resize map smoothly when toggling fullscreen
  useEffect(() => {
    if (!leafletMapRef.current) return;
    const t1 = setTimeout(() => leafletMapRef.current?.invalidateSize(), 60);
    const t2 = setTimeout(() => leafletMapRef.current?.invalidateSize(), 260);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isFullscreenMap, selectedLine]);

  // Draw route shape and stops on the map
  useEffect(() => {
    const Lf = LModRef.current;
    if (!mapReady || !Lf || !routeLayerRef.current || !leafletMapRef.current || !selectedLine || !currentDir) return;
    let cancelled = false;
    routeLayerRef.current.clearLayers();
    const stopPts = currentDir.stops
      .map(([code, offset]) => ({ code, offset, s: busSchedule.stops[code] }))
      .filter((x) => Boolean(x.s));

    void fetch(`/data/bus-shapes/${shapeFile(selectedLine)}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<LineShapes>) : null))
      .catch(() => null)
      .then((shapes) => {
        if (cancelled || !routeLayerRef.current || !leafletMapRef.current) return;
        const path =
          shapes?.dirs[currentDir.dir] ??
          stopPts.map((x) => [x.s.lat, x.s.lon] as [number, number]);

        if (path.length > 0) {
          const poly = Lf.polyline(path, {
            color: "#111827",
            weight: 5,
            opacity: 0.9,
          }).addTo(routeLayerRef.current);

          for (const [i, x] of stopPts.entries()) {
            const isEnd = i === 0 || i === stopPts.length - 1;
            const isSel = x.code === (selectedStop || nearestStopCode);
            Lf.circleMarker([x.s.lat, x.s.lon], {
              radius: isSel ? 10 : isEnd ? 8 : 6,
              color: isSel ? "#DC2626" : "#111827",
              weight: isSel ? 3 : 2,
              fillColor: isSel ? "#DC2626" : isEnd ? "#f2c94c" : "#ffffff",
              fillOpacity: 1,
            })
              .addTo(routeLayerRef.current)
              .bindTooltip(`${i + 1}. ${stopName(x.code)}`, { direction: "top" })
              .on("click", () => {
                setSelectedStop(x.code);
                leafletMapRef.current?.setView([x.s.lat, x.s.lon], 16, { animate: true });
              });
          }

          leafletMapRef.current.fitBounds(poly.getBounds(), { padding: [26, 26] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mapReady, selectedLine, currentDir, selectedStop, nearestStopCode]);

  // Fetch real-time SIRI vehicles every 10 seconds when a line is open
  const fetchLiveBusLocations = async (lineNum = selectedLine) => {
    if (!lineNum) return;
    setBusStatus("loading");
    try {
      const res = await getLineVehicles({ data: { line: lineNum } });
      setLiveVehicles(res.vehicles);
      setBusStatus(res.ok ? "ok" : "error");
    } catch {
      setBusStatus("error");
    }
  };

  useEffect(() => {
    if (!selectedLine) return;
    void fetchLiveBusLocations(selectedLine);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void fetchLiveBusLocations(selectedLine);
    }, 10_000);
    return () => clearInterval(id);
  }, [selectedLine]);

  // Render live buses on map
  useEffect(() => {
    const Lf = LModRef.current;
    if (!mapReady || !Lf || !busLayerRef.current || !selectedLine) return;
    busLayerRef.current.clearLayers();
    for (const v of liveVehicles) {
      const digits = String(v.ref ?? "").replace(/\D/g, "");
      const plate =
        digits.length === 8
          ? `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`
          : digits.length === 7
            ? `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
            : v.ref;
      Lf.marker([v.lat, v.lon], {
        icon: Lf.divIcon({
          className: "",
          html: `<div style="display:inline-flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%);">
            <div style="background:#f2c94c;color:#111827;font-weight:900;font-size:12px;padding:3px 10px;border-radius:999px;border:2px solid #111827;box-shadow:0 4px 10px rgba(0,0,0,0.3);white-space:nowrap;">🚌 خط ${selectedLine} · مباشر</div>
            <div dir="ltr" style="margin-top:2px;background:#facc15;color:#111827;font-family:monospace;font-weight:900;font-size:10px;padding:1px 6px;border-radius:4px;border:1.5px solid #111827;white-space:nowrap;">IL ${plate}</div>
          </div>`,
          iconSize: [110, 46],
          iconAnchor: [55, 23],
        }),
        zIndexOffset: 1500,
      })
        .addTo(busLayerRef.current)
        .on("click", () => {
          leafletMapRef.current?.setView([v.lat, v.lon], 16, { animate: true });
        });
    }
  }, [liveVehicles, mapReady, selectedLine]);

  const activeStopForSchedule = selectedStop || nearestStopCode || currentDir?.stops[0]?.[0] || "";
  const plannedNextList = useMemo(() => {
    if (!selectedLine || !currentDir || !activeStopForSchedule) return [];
    return plannedArrivals(nowClock, selectedLine, currentDir.dir, activeStopForSchedule, 4)
      .map((raw) => formatPlannedArrivalSlot(nowClock, raw))
      .filter((slot): slot is { time: string; inMin: number } => Boolean(slot));
  }, [nowClock, selectedLine, currentDir, activeStopForSchedule]);

  const activeLines = tab === "intercity" ? GALIM_HOME_INTERCITY_LINES : GALIM_HOME_CITY_LINES;
  const isDark = cfg.busesStyle === "dark_gold";

  return (
    <section>
      <div
        className={`stamp overflow-hidden transition-all ${
          isDark
            ? "border-[#F2C94C]/50 bg-[#14120E] text-white shadow-md"
            : cfg.busesStyle === "live_board"
              ? "border-2 border-ink/80 bg-gradient-to-b from-surface via-paper to-paper"
              : "border-2 border-primary/75 bg-gradient-to-b from-primary-soft/50 via-paper to-paper"
        } p-3.5 sm:p-4`}
      >
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span
              className={`grid size-12 shrink-0 place-items-center rounded-2xl text-xl shadow-2xs ${
                isDark ? "bg-[#F2C94C] text-[#14120E]" : "bg-primary text-ink"
              }`}
              aria-hidden
            >
              <Bus className="size-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={`text-sm font-extrabold sm:text-base ${isDark ? "text-white" : "text-ink"}`}>
                  {tr("خطوط باصات غاليم (גלים) — رهط والنقب")}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#16A34A]/15 px-2.5 py-0.5 text-[11px] font-extrabold text-[#15803D]">
                  <span className="size-1.5 rounded-full bg-[#16A34A] animate-ping" />
                  {tr("مباشر · اضغط على رقم الخط لفتح الخريطة الحية")}
                </span>
              </div>
              <p className={`text-xs font-semibold ${isDark ? "text-white/70" : "text-muted"}`}>
                {tr("اضغط على أي رقم باص بالأسفل لإظهار الخريطة الحقيقية وأقرب محطة لموقعك والباص في نفس الوقت")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="btn btn-ghost px-3 py-1.5 text-xs font-extrabold"
            >
              {expanded ? tr("طي القائمة ▲") : tr("عرض الخطوط والمواعيد ▼")}
            </button>
            <Link
              to="/buses"
              className={`press inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-extrabold shadow-2xs transition ${
                isDark
                  ? "bg-[#F2C94C] text-[#14120E]"
                  : "bg-ink text-paper hover:opacity-90"
              }`}
            >
              <span>🗺️ {tr("كل الخطوط")}</span>
              <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" aria-hidden />
            </Link>
          </div>
        </div>

        {expanded ? (
          <div className="mt-3.5 space-y-3">
            {/* 3 Proportional Rounded-Square Category Tabs (#2 اجعلها أيقونات مربعة منحنية الأطراف بحجم متناسق) */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { id: "city" as const, icon: "🚌", title: "خطوط داخل رهط", sub: "خطوط 1–6 بالأحياء" },
                { id: "intercity" as const, icon: "🛣️", title: "بئر السبع والنقب", sub: "سوروكا والبلدات" },
                ...(cfg.includeEmergencyInBuses
                  ? [{ id: "emergency" as const, icon: "🚨", title: "طوارئ رهط", sub: "اتصال سريع 24/7" }]
                  : []),
              ].map((cat) => {
                const isCat = tab === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setTab(cat.id)}
                    className={`press flex flex-col items-center justify-center gap-1 rounded-2xl border p-2.5 text-center transition-all ${
                      isCat
                        ? cat.id === "emergency"
                          ? "border-alert bg-alert text-white shadow-md"
                          : isDark
                            ? "border-[#F2C94C] bg-[#F2C94C] text-[#14120E] shadow-md"
                            : "border-ink bg-primary text-ink shadow-md ring-2 ring-ink/15"
                        : isDark
                          ? "border-white/15 bg-white/5 text-white hover:border-[#F2C94C]"
                          : "border-line bg-paper text-ink hover:border-primary shadow-2xs"
                    }`}
                  >
                    <span
                      className={`grid size-11 shrink-0 place-items-center rounded-2xl text-xl shadow-2xs ${
                        isCat
                          ? "bg-white/25"
                          : isDark
                            ? "bg-white/10"
                            : "bg-primary-soft"
                      }`}
                      aria-hidden
                    >
                      {cat.icon}
                    </span>
                    <span className="line-clamp-1 text-xs font-extrabold sm:text-sm">
                      {trv(cat.title)}
                    </span>
                    <span
                      className={`line-clamp-1 text-[10px] font-bold ${
                        isCat
                          ? cat.id === "emergency"
                            ? "text-white/85"
                            : "text-ink/80"
                          : isDark
                            ? "text-white/60"
                            : "text-muted"
                      }`}
                    >
                      {trv(cat.sub)}
                    </span>
                  </button>
                );
              })}
            </div>

            {tab === "emergency" ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {RAHAT_EMERGENCY_FULL.map((em) => (
                  <a
                    key={em.phone}
                    href={`tel:${em.phone}`}
                    className={`press flex items-center justify-between gap-2 rounded-2xl border p-2.5 transition ${
                      isDark
                        ? "border-white/15 bg-white/5 text-white hover:border-[#F2C94C]"
                        : "border-line bg-paper text-ink hover:border-primary"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-extrabold">
                        {em.icon} {trv(em.name)}
                      </span>
                      <span className={`block truncate text-[10px] font-semibold ${isDark ? "text-white/60" : "text-muted"}`}>
                        {trv(em.sub)}
                      </span>
                    </span>
                    <span
                      dir="ltr"
                      className={`shrink-0 rounded-xl px-2 py-1 font-mono text-xs font-extrabold ${
                        isDark ? "bg-[#F2C94C] text-[#14120E]" : "bg-primary-soft text-primary-ink"
                      }`}
                    >
                      {em.phone}
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              /* Bus Line Cards — Clicking any Bus Line Number opens the Real Live Map + Nearest Stop + Real-Time Bus immediately! */
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {activeLines.map((b) => {
                  const isSelectedLine = selectedLine === b.realLine;
                  return (
                    <button
                      key={b.line}
                      type="button"
                      onClick={() =>
                        setSelectedLine((prev) => {
                          if (prev === b.realLine) return null;
                          handleOpenLineMap(b.realLine);
                          return b.realLine;
                        })
                      }
                      className={`press flex items-center gap-2.5 rounded-2xl border p-2.5 text-start transition-all ${
                        isSelectedLine
                          ? "border-2 border-ink bg-primary/30 text-ink shadow-md ring-2 ring-primary"
                          : isDark
                            ? "border-white/15 bg-white/5 text-white hover:border-[#F2C94C]"
                            : "border-line bg-paper text-ink hover:border-primary shadow-2xs"
                      }`}
                    >
                      {/* Proportional Rounded-Square Bus Number Icon */}
                      <span
                        className={`grid size-12 shrink-0 place-items-center rounded-2xl font-mono text-sm font-black shadow-2xs ${
                          isSelectedLine
                            ? "bg-ink text-primary"
                            : isDark
                              ? "bg-[#F2C94C] text-[#14120E]"
                              : "bg-primary text-ink"
                        }`}
                      >
                        {b.line}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-extrabold">
                          {trv(b.from)} ↔ {trv(b.to)}
                        </span>
                        <span
                          className={`mt-0.5 block truncate text-[11px] font-bold ${
                            isSelectedLine ? "text-emerald-800" : isDark ? "text-white/65" : "text-muted"
                          }`}
                        >
                          {isSelectedLine ? "🗺️ الخريطة الحية مفتوحة ▼" : `🕒 ${trv(b.freq)} · اضغط للخريطة`}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* =========================================================================
             * REAL-TIME LARGE CLEAR BUS MAP + TOP NEAREST STOP BY NAME + LIVE CLOCK
             * (تظهر فور الضغط على أيقونة رقم الباص!)
             * ========================================================================= */}
            {selectedLine ? (
              <div className="mt-3 overflow-hidden rounded-3xl border-2 border-ink bg-paper text-ink shadow-xl">
                {/* 1. TOP BAR: Nearest Stop by Name (Clickable to zoom) + Geographic Location + Live Real-Time Clock */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] px-3.5 py-3 text-white">
                  <button
                    type="button"
                    onClick={() => {
                      const code = nearestStopCode || selectedStop || currentDir?.stops[0]?.[0];
                      if (code && busSchedule.stops[code] && leafletMapRef.current) {
                        const st = busSchedule.stops[code];
                        setSelectedStop(code);
                        leafletMapRef.current.setView([st.lat, st.lon], 16, { animate: true });
                      } else {
                        locateUserAndNearestStop(currentDir, true);
                      }
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2.5 text-start transition hover:opacity-95"
                    title={tr("اضغط لتكبير الخريطة على أقرب محطة وموقعك الجغرافي")}
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-lg font-black text-[#111827] shadow-md">
                      📍
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-emerald-500/25 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                          {userCoords
                            ? tr("أقرب محطة لموقعك الجغرافي (اضغط للتكبير):")
                            : tr("اضغط لتحديد موقعك الجغرافي وأقرب محطة بالاسم:")}
                        </span>
                        {nearestStopDistM !== null ? (
                          <span className="text-[10.5px] font-extrabold text-primary">
                            ({nearestStopDistM < 1000 ? `${nearestStopDistM} متر` : `${(nearestStopDistM / 1000).toFixed(1)} كم`})
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-xs font-black text-white sm:text-sm">
                        🚏 {stopName(nearestStopCode || selectedStop || currentDir?.stops[0]?.[0] || "")}
                      </p>
                    </div>
                  </button>

                  {/* Live Real-Time Clock & Instant Bus Status */}
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="rounded-2xl border border-white/15 bg-white/10 px-3 py-1.5 text-end">
                      <span className="block text-[9.5px] font-bold text-white/75">
                        {tr("الوقت الحقيقي الآن")}
                      </span>
                      <span className="font-mono text-xs font-black text-primary sm:text-sm" dir="ltr">
                        {new Date(nowClock).toLocaleTimeString("ar-u-nu-latn", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: false,
                          timeZone: "Asia/Jerusalem",
                        })}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => locateUserAndNearestStop(currentDir, true)}
                      className="grid size-10 place-items-center rounded-2xl bg-primary text-[#111827] shadow-md transition hover:brightness-105"
                      title={tr("تحديد موقعي الجغرافي الآن")}
                    >
                      <LocateFixed className="size-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedLine(null)}
                      className="grid size-10 place-items-center rounded-2xl bg-white/15 text-xs font-black text-white transition hover:bg-red-600"
                      title={tr("إغلاق الخريطة")}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* 2. REAL-TIME BUS AT THIS EXACT MOMENT BAR (عند الضغط يعطي الباص في نفس الوقت) */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-primary-soft/60 px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-ink font-mono text-sm font-black text-primary">
                      {selectedLine}
                    </span>
                    <div>
                      <p className="text-xs font-extrabold text-ink sm:text-sm">
                        {lineMeta ? `${trv(lineMeta.from)} ↔ ${trv(lineMeta.to)}` : `${tr("خط")} ${selectedLine}`}
                      </p>
                      <p className="text-[11px] font-extrabold text-emerald-800">
                        {liveVehicles.length > 0
                          ? `🟢 ${liveVehicles.length} باص يبث موقعه على الخريطة في نفس الوقت الآن!`
                          : plannedNextList.length > 0
                            ? `🕒 موعد الباص في نفس الوقت عند محطة ${stopName(activeStopForSchedule)}: الساعة ${plannedNextList[0].time} (${homeMinutesLabel(plannedNextList[0].inMin)})`
                            : busStatus === "loading"
                              ? "⏳ جاري جلب موقع الباص المباشر في نفس الوقت…"
                              : "📍 مسار ومواعيد خط الباص المباشرة على الخريطة"}
                      </p>
                    </div>
                  </div>

                  {/* Direction Switcher + Fullscreen Waze Button */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {info && info.dirs.length > 1
                      ? info.dirs.map((dItem) => (
                          <button
                            key={dItem.dir}
                            type="button"
                            onClick={() => {
                              setDir(dItem.dir);
                              setSelectedStop(dItem.stops[0]?.[0] ?? "");
                              if (userCoords) findNearestStop(userCoords.lat, userCoords.lon, dItem);
                            }}
                            className={`flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-extrabold transition ${
                              dItem.dir === currentDir?.dir
                                ? "bg-ink text-paper shadow-2xs"
                                : "border border-line bg-paper text-ink hover:border-primary"
                            }`}
                          >
                            <Navigation className="size-3" />
                            <span>{tr("إلى:")} {stopName(dItem.to)}</span>
                          </button>
                        ))
                      : null}

                    <button
                      type="button"
                      onClick={() => void fetchLiveBusLocations(selectedLine)}
                      className="grid size-8 place-items-center rounded-xl border border-line bg-paper text-ink"
                      title={tr("تحديث موقع الباص الآن")}
                    >
                      <RefreshCw className={`size-4 ${busStatus === "loading" ? "animate-spin" : ""}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsFullscreenMap(true)}
                      className="inline-flex items-center gap-1 rounded-xl bg-ink px-3 py-1.5 text-[11px] font-extrabold text-paper shadow-2xs"
                    >
                      <Maximize2 className="size-3.5" />
                      <span>{tr("ملء الشاشة (Waze)")}</span>
                    </button>
                  </div>
                </div>

                {/* 3. LARGE CLEAR INTERACTIVE LEAFLET MAP */}
                <div
                  className={
                    isFullscreenMap
                      ? "fixed inset-0 z-[9999] h-[100dvh] w-[100dvw] bg-[#0f172a]"
                      : "relative h-[440px] w-full sm:h-[510px]"
                  }
                >
                  <div ref={mapContainerRef} className="absolute inset-0 z-10" dir="ltr" />

                  {isFullscreenMap ? (
                    <>
                      {/* Waze Fullscreen Floating Top Bar */}
                      <div className="pointer-events-auto absolute inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30 flex items-center justify-between gap-2 rounded-2xl border border-white/15 bg-[#0f172a]/95 p-3 text-white shadow-2xl backdrop-blur-md">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary font-mono text-base font-black text-[#111827]">
                            {selectedLine}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-black text-primary">
                              📍 {tr("أقرب محطة:")} {stopName(activeStopForSchedule)}
                            </p>
                            <p className="truncate text-[11px] font-bold text-emerald-400">
                              {liveVehicles.length > 0
                                ? `🟢 ${liveVehicles.length} باص مباشر الآن على الخريطة`
                                : plannedNextList.length > 0
                                  ? `🕒 الباص القادم الساعة ${plannedNextList[0].time} (${homeMinutesLabel(plannedNextList[0].inMin)})`
                                  : `🚌 مسار خط ${selectedLine}`}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsFullscreenMap(false)}
                          className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/15 text-white hover:bg-red-600"
                        >
                          <Minimize2 className="size-5" />
                        </button>
                      </div>

                      {/* Waze Fullscreen Floating Right GPS Controls */}
                      <div className="pointer-events-auto absolute end-3 bottom-24 z-30 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => locateUserAndNearestStop(currentDir, true)}
                          className="grid size-12 place-items-center rounded-2xl border border-white/20 bg-[#0f172a]/90 text-white shadow-2xl"
                        >
                          <LocateFixed className="size-5 text-sky-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void fetchLiveBusLocations(selectedLine)}
                          className="grid size-12 place-items-center rounded-2xl border border-white/20 bg-[#0f172a]/90 text-white shadow-2xl"
                        >
                          <RefreshCw className={`size-5 text-emerald-400 ${busStatus === "loading" ? "animate-spin" : ""}`} />
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>

                {/* 4. REAL-TIME NEXT BUS TIMES AT THE SELECTED / NEAREST STOP */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-paper px-3.5 py-2.5 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-extrabold text-ink">
                      🚏 {tr("مواعيد الباص في محطة")} {stopName(activeStopForSchedule)}:
                    </span>
                    {plannedNextList.length > 0 ? (
                      plannedNextList.map((p, idx) => (
                        <span
                          key={idx}
                          className={`rounded-xl px-2.5 py-1 font-mono text-xs font-extrabold ${
                            idx === 0 ? "bg-primary text-ink shadow-2xs" : "bg-surface text-ink"
                          }`}
                        >
                          {p.time} ({homeMinutesLabel(p.inMin)})
                        </span>
                      ))
                    ) : (
                      <span className="font-bold text-muted">{tr("خارج ساعات العمل حالياً")}</span>
                    )}
                  </div>
                  <Link
                    to="/buses"
                    search={{ line: selectedLine }}
                    className="rounded-xl bg-ink px-3 py-1.5 text-[11px] font-extrabold text-paper"
                  >
                    {tr("كل محطات وجدول خط")} {selectedLine} ‹
                  </Link>
                </div>
              </div>
            ) : null}

            {/* Quick Emergency Strip inside Buses Card */}
            {cfg.includeEmergencyInBuses && tab !== "emergency" ? (
              <div
                className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-xs ${
                  isDark
                    ? "border-white/15 bg-white/5 text-white"
                    : "border-line/80 bg-surface/80 text-ink"
                }`}
              >
                <span className="font-extrabold">
                  🚨 {tr("طوارئ رهط السريعة:")}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {busEmergencyChips.map((em) => (
                    <a
                      key={em.phone}
                      href={`tel:${em.phone}`}
                      className={`press inline-flex items-center gap-1 rounded-xl border px-2 py-1 text-[11px] font-extrabold transition ${
                        isDark
                          ? "border-white/20 bg-white/10 text-white hover:border-[#F2C94C]"
                          : "border-line bg-paper text-ink hover:border-primary"
                      }`}
                    >
                      <span>{trv(em.label)}</span>
                      <span dir="ltr" className={isDark ? "text-[#F2C94C]" : "text-primary-ink"}>
                        {em.phone}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Official Rights & Sources Attribution for Galim & MOT */}
            <p className={`text-[10.5px] font-semibold ${isDark ? "text-white/60" : "text-muted"}`}>
              © {tr("جميع حقوق الجداول والمسارات الرسمية محفوظة لشركة غاليم (גלים) ووزارة المواصلات (bus.gov.il) وخرائط OpenStreetMap.")}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function emergencyDirectory(links: QuickLink[] | undefined) {
  const saved = parseEmergencyNumbers(links);
  if (!saved.length) return RAHAT_EMERGENCY_FULL.map((item) => ({ ...item }));
  return saved.map((item) => {
    const known = RAHAT_EMERGENCY_FULL.find((row) => row.phone === item.phone);
    return known
      ? { ...known, name: item.name }
      : { name: item.name, sub: "رقم من لوحة الإدارة", phone: item.phone, icon: "📞", tone: "gold" };
  });
}

export function InteractiveEmergencyHomeSection() {
  const settings = useSiteSettings();
  const cfg = useMemo(() => parseBusesAndEmergencyHomeCfg(settings.quickLinks ?? []), [settings.quickLinks]);
  const directory = useMemo(() => emergencyDirectory(settings.quickLinks), [settings.quickLinks]);
  const [showAll, setShowAll] = useState(cfg.showAllEmergency && cfg.emergencyStyle !== "collapsible");

  useEffect(() => {
    setShowAll(cfg.showAllEmergency && cfg.emergencyStyle !== "collapsible");
  }, [cfg.showAllEmergency, cfg.emergencyStyle]);

  const list = showAll ? directory : directory.slice(0, 4);
  const isDark = cfg.emergencyStyle === "dark_gold";

  const toneCls = (tone: string) => {
    if (cfg.emergencyStyle !== "color_coded") {
      return isDark
        ? "border-white/15 bg-white/5 text-white hover:border-[#F2C94C]"
        : "border-line bg-paper text-ink hover:border-primary";
    }
    if (tone === "red") return "border-red-500/30 bg-red-500/10 text-ink hover:border-red-500";
    if (tone === "orange") return "border-amber-500/35 bg-amber-500/10 text-ink hover:border-amber-500";
    if (tone === "blue") return "border-sky-500/30 bg-sky-500/10 text-ink hover:border-sky-500";
    if (tone === "green") return "border-emerald-500/30 bg-emerald-500/10 text-ink hover:border-emerald-500";
    return "border-primary/60 bg-primary-soft/60 text-ink hover:border-primary";
  };

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">{tr("أرقام الطوارئ والخدمات في رهط")}</h2>
        <div className="flex items-center gap-2">
          {directory.length > 4 ? (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="chip text-xs font-extrabold"
            >
              {showAll
                ? tr("عرض أهم 4 أرقام فقط ▲")
                : `${tr("عرض كل أرقام الطوارئ")} (${directory.length}) ▼`}
            </button>
          ) : null}
          <Link to="/today" className="text-sm font-bold text-primary-ink">
            {tr("لوحة اليوم")} ‹
          </Link>
        </div>
      </div>

      <div
        className={
          isDark
            ? "stamp border-[#F2C94C]/50 bg-[#14120E] p-3.5 text-white shadow-md"
            : ""
        }
      >
        {cfg.emergencyStyle === "compact_strip" ? (
          <div className="flex flex-wrap gap-2">
            {list.map((item) => (
              <a
                key={item.phone}
                href={`tel:${item.phone}`}
                className="stamp press inline-flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-extrabold hover:border-primary"
              >
                <span className="text-base" aria-hidden>{item.icon}</span>
                <span>{trv(item.name)}</span>
                <span dir="ltr" className="rounded-lg bg-primary px-2 py-0.5 font-mono text-xs font-extrabold text-ink">
                  {item.phone}
                </span>
              </a>
            ))}
          </div>
        ) : cfg.emergencyStyle === "list_rows" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {list.map((item) => (
              <a
                key={item.phone}
                href={`tel:${item.phone}`}
                className="stamp press flex items-center justify-between gap-3 px-3.5 py-3 hover:border-primary"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-lg" aria-hidden>
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-ink">{trv(item.name)}</p>
                    <p className="truncate text-xs font-semibold text-muted">{trv(item.sub)}</p>
                  </div>
                </div>
                <span
                  dir="ltr"
                  className="shrink-0 rounded-xl bg-primary px-3 py-1.5 font-mono text-sm font-extrabold text-ink shadow-2xs"
                >
                  📞 {item.phone}
                </span>
              </a>
            ))}
          </div>
        ) : (
          /* modern_grid, color_coded, dark_gold, collapsible */
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {list.map((item) => (
              <a
                key={item.phone}
                href={`tel:${item.phone}`}
                className={`stamp press flex flex-col items-center justify-between rounded-2xl border px-3 py-3 text-center transition ${toneCls(
                  item.tone,
                )}`}
              >
                <span className="text-xl" aria-hidden>{item.icon}</span>
                <span
                  dir="ltr"
                  className={`mt-1 font-mono text-xl font-extrabold leading-none ${
                    isDark ? "text-[#F2C94C]" : "text-primary-ink"
                  }`}
                >
                  {trv(item.phone)}
                </span>
                <span className="mt-1.5 line-clamp-1 text-xs font-extrabold">
                  {trv(item.name)}
                </span>
                <span className={`text-[10px] font-semibold ${isDark ? "text-white/65" : "text-muted"}`}>
                  {trv(item.sub)}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}


