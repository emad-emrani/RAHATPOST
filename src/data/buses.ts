export type BusLine = {
  number: string;
  scope: "city" | "between";
  from: string;
  to: string;
  note: string;
};

// Times come from src/data/bus-schedule.ts, regenerated daily from the MOT GTFS feed.

export const galimPhone = "08-6688700";
export const galimSource = "https://www.bus.co.il/Lines?OperatingCompanyID=75";

export const busLines: BusLine[] = [
  {
    number: "1",
    scope: "city",
    from: "السلام، مستودع البلدية",
    to: "الخزان / حطين",
    note: "",
  },
  {
    number: "2",
    scope: "city",
    from: "السلام، الدفيئات",
    to: "الخضر، حي 31",
    note: "",
  },
  {
    number: "3",
    scope: "city",
    from: "محطة تافوح / السلام",
    to: "رفح / البوئي",
    note: "",
  },
  {
    number: "4",
    scope: "city",
    from: "المدينة المنورة، شمال غرب",
    to: "المدينة المنورة، الحديقة",
    note: "",
  },
  {
    number: "4أ",
    scope: "city",
    from: "المدينة المنورة، شمال غرب",
    to: "المدينة المنورة، الحديقة",
    note: "رحلات أقل من خط 4",
  },
  {
    number: "5",
    scope: "city",
    from: "صلاح الدين، مدرسة الهدى",
    to: "صلاح الدين، مدرسة الهدى",
    note: "خط دائري",
  },
  {
    number: "6",
    scope: "city",
    from: "المدينة المنورة، الحديقة",
    to: "صلاح الدين، مدرسة الهدى",
    note: "",
  },
  {
    number: "40",
    scope: "between",
    from: "رهط",
    to: "كسيفة",
    note: "",
  },
  {
    number: "423",
    scope: "between",
    from: "رهط",
    to: "كسيفة",
    note: "",
  },
  {
    number: "425",
    scope: "between",
    from: "رهط",
    to: "تل السبع",
    note: "",
  },
  {
    number: "427",
    scope: "between",
    from: "رهط",
    to: "عرعرة النقب",
    note: "",
  },
  {
    number: "450",
    scope: "between",
    from: "رهط",
    to: "بئر السبع",
    note: "يمر بحي السلام والدفيئات",
  },
  {
    number: "451",
    scope: "between",
    from: "رهط",
    to: "بئر السبع",
    note: "يمر بزمزم والمنزارة",
  },
  {
    number: "452",
    scope: "between",
    from: "رهط",
    to: "بئر السبع",
    note: "",
  },
  {
    number: "454",
    scope: "between",
    from: "رهط",
    to: "بئر السبع",
    note: "",
  },
  {
    number: "455",
    scope: "between",
    from: "رهط",
    to: "بئر السبع",
    note: "",
  },
  {
    number: "462",
    scope: "between",
    from: "رهط",
    to: "سديروت",
    note: "",
  },
  {
    number: "466",
    scope: "between",
    from: "رهط",
    to: "بئر طوفيا",
    note: "",
  },
  {
    number: "467",
    scope: "between",
    from: "رهط",
    to: "عسقلان",
    note: "",
  },
  {
    number: "471",
    scope: "between",
    from: "رهط",
    to: "بئر السبع",
    note: "",
  },
];
