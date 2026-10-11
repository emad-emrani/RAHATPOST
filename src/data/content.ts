export type Classified = {
  id: string;
  type: string;
  title: string;
  body: string;
  neighborhood: string;
  price?: string;
  phone: string;
  quiet?: boolean;
  /** Display example, not a real listing: shown with a «نموذج» label and no contact buttons. */
  sample?: boolean;
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
    sample: true,
    phone: "050-000-2201",
  },
  {
    id: "car-skoda",
    type: "سيارات",
    title: "سكودا أوكتافيا 2016 للبيع",
    body: "ترخيص ساري، مفحوصة، مالك واحد. المعاينة في حي 8 بعد العصر.",
    neighborhood: "حي 8",
    price: "32,000 ₪",
    sample: true,
    phone: "050-000-2202",
  },
  {
    id: "flat-rent",
    type: "عقارات",
    title: "شقة 4 غرف للإيجار في حي 10",
    body: "طابق ثانٍ، موقف واحد، متاحة أول الشهر القادم. عقد سنة.",
    neighborhood: "حي 10",
    price: "2,400 ₪ / شهر",
    sample: true,
    phone: "050-000-2203",
  },
  {
    id: "wedding-sample",
    type: "مناسبات",
    title: "نموذج دعوة فرح — قاعة الواحة",
    body: "هذا شكل إعلان الفرح في رهط بوست: اسم القاعة، اليوم، والساعة. بلا سعر ظاهر في بطاقة الدعوة.",
    neighborhood: "حي 3",
    sample: true,
    phone: "050-000-2204",
  },
  {
    id: "condolence-sample",
    type: "مناسبات",
    title: "نموذج تعزية — ديوان حي 5",
    body: "إعلان التعزية يبقى هادئاً: المكان والوقت فقط، بلا لون تنبيه وبلا سعر. هذا نموذج عرض لا خبر حقيقي.",
    neighborhood: "حي 5",
    sample: true,
    phone: "050-000-2205",
    quiet: true,
  },
  {
    id: "movers",
    type: "خدمات",
    title: "نقل أثاث داخل رهط والنقب",
    body: "سيارة مغلقة وعاملان. الحجز قبلها بيوم. السعر حسب الحي والطابق.",
    neighborhood: "رهط",
    sample: true,
    phone: "050-000-2206",
  },
  {
    id: "keys",
    type: "مفقودات",
    title: "مفاتيح سيارة وُجدت قرب سوق الخميس",
    body: "وُجدت مفاتيح مع ميدالية زرقاء. صاحبها يصف الميدالية عند الاتصال.",
    neighborhood: "حي 4",
    sample: true,
    phone: "050-000-2207",
  },
];

export function getClassified(id: string) {
  return classifieds.find((item) => item.id === id);
}
