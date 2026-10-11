export type Classified = {
  id: string;
  type: string;
  title: string;
  body: string;
  neighborhood: string;
  price?: string;
  phone: string;
  quiet?: boolean;
};

export const categories = [
  "عاجل",
  "رهط",
  "النقب",
  "بلدية",
  "تعليم",
  "صحة",
  "رياضة",
  "مجتمع",
  "أعمال",
] as const;

export const adTypes = [
  "الكل",
  "وظائف",
  "سيارات",
  "عقارات",
  "مناسبات",
  "خدمات",
  "مفقودات",
] as const;

export type DutyPharmacy = {
  name: string;
  neighborhood: string;
  hours: string;
  phone: string;
  maps: string;
};

/** Today's duty pharmacy. No real shift data is logged yet, so the UI shows «لم يُحدَّث جدول اليوم». */
export const duty: DutyPharmacy | null = null;

export const weather = {
  temp: "31°",
  text: "مشمس وجاف",
  wind: "رياح خفيفة شمالية",
};

export const alert = {
  title: "انقطاع مياه مخطط",
  body: "حي 7 وحي 9، من التاسعة صباحاً حتى الرابعة عصراً. خزّنوا ماء الشرب فقط.",
  until: "ينتهي اليوم 16:00",
};

export const emergency = [
  { name: "الشرطة", phone: "100" },
  { name: "الإسعاف", phone: "101" },
  { name: "الإطفاء", phone: "102" },
  { name: "طوارئ", phone: "112" },
  { name: "اتحاد الإنقاذ", phone: "1221" },
  { name: "الكهرباء", phone: "103" },
  { name: "الجبهة الداخلية", phone: "104" },
  { name: "البلدية", phone: "106" },
];

export const classifieds: Classified[] = [
  {
    id: "job-accountant",
    type: "وظائف",
    title: "مطلوب محاسب لمكتب صغير في حي 1",
    body: "دوام صباحي، خبرة سنة على الأقل في الرواتب والفواتير. أرسلوا الاسم وسنوات الخبرة على الواتساب.",
    neighborhood: "حي 1",
    phone: "050-000-2201",
  },
  {
    id: "car-skoda",
    type: "سيارات",
    title: "سكودا أوكتافيا 2016 للبيع",
    body: "ترخيص ساري، مفحوصة، مالك واحد. المعاينة في حي 8 بعد العصر.",
    neighborhood: "حي 8",
    price: "32,000 ₪",
    phone: "050-000-2202",
  },
  {
    id: "flat-rent",
    type: "عقارات",
    title: "شقة 4 غرف للإيجار في حي 10",
    body: "طابق ثانٍ، موقف واحد، متاحة أول الشهر القادم. عقد سنة.",
    neighborhood: "حي 10",
    price: "2,400 ₪ / شهر",
    phone: "050-000-2203",
  },
  {
    id: "wedding-sample",
    type: "مناسبات",
    title: "نموذج دعوة فرح — قاعة الواحة",
    body: "هذا شكل إعلان الفرح في رهط بوست: اسم القاعة، اليوم، والساعة. بلا سعر ظاهر في بطاقة الدعوة.",
    neighborhood: "حي 3",
    phone: "050-000-2204",
  },
  {
    id: "condolence-sample",
    type: "مناسبات",
    title: "نموذج تعزية — ديوان حي 5",
    body: "إعلان التعزية يبقى هادئاً: المكان والوقت فقط، بلا لون تنبيه وبلا سعر. هذا نموذج عرض لا خبر حقيقي.",
    neighborhood: "حي 5",
    phone: "050-000-2205",
    quiet: true,
  },
  {
    id: "movers",
    type: "خدمات",
    title: "نقل أثاث داخل رهط والنقب",
    body: "سيارة مغلقة وعاملان. الحجز قبلها بيوم. السعر حسب الحي والطابق.",
    neighborhood: "رهط",
    phone: "050-000-2206",
  },
  {
    id: "keys",
    type: "مفقودات",
    title: "مفاتيح سيارة وُجدت قرب سوق الخميس",
    body: "وُجدت مفاتيح مع ميدالية زرقاء. صاحبها يصف الميدالية عند الاتصال.",
    neighborhood: "حي 4",
    phone: "050-000-2207",
  },
];

export const events = [
  { time: "17:30", title: "تكريم متفوقي حي 3", place: "المركز الجماهيري" },
  { time: "19:00", title: "تدريب ناشئين", place: "القاعة الرياضية" },
  { time: "20:00", title: "عيادة الطوارئ الليلية", place: "مبنى العيادات" },
];

export function getClassified(id: string) {
  return classifieds.find((item) => item.id === id);
}
