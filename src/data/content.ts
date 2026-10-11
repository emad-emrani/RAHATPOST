export type Article = {
  slug: string;
  title: string;
  category: string;
  time: string;
  source: string;
  breaking: boolean;
  body: string[];
};

export type Business = {
  slug: string;
  name: string;
  category: string;
  neighborhood: string;
  hours: string;
  open: boolean;
  verified: boolean;
  phone: string;
  description: string;
};

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

export const businessCategories = [
  "الكل",
  "مطاعم",
  "بقالات",
  "صحة",
  "تعليم",
  "ورش",
  "مناسبات",
] as const;

export const duty = {
  name: "صيدلية الأمل",
  neighborhood: "حي 2",
  hours: "مفتوحة الآن حتى 8:00 صباحاً",
  phone: "08-000-4510",
  maps: "https://www.google.com/maps/search/?api=1&query=%D8%B1%D9%87%D8%B7",
};

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

export const articles: Article[] = [
  {
    slug: "water-cut",
    title: "انقطاع مياه عن حي 7 وحي 9 حتى الرابعة عصراً",
    category: "بلدية",
    time: "قبل 18 دقيقة",
    source: "بلدية رهط",
    breaking: true,
    body: [
      "أعلنت بلدية رهط انقطاعاً مخططاً للمياه في حي 7 وحي 9 بسبب صيانة خط رئيسي.",
      "يعود الضخ تدريجياً بعد الرابعة عصراً. المطلوب تخزين ما يكفي للشرب، وتأجيل الغسيل وسقي الحدائق.",
      "البلاغات أثناء الانقطاع على خط البلدية 106. لوحة اليوم تبقى محدّثة إذا امتد العمل.",
    ],
  },
  {
    slug: "night-clinic",
    title: "عيادة الطوارئ الليلية في رهط تستقبل حتى منتصف الليل",
    category: "صحة",
    time: "قبل ساعة",
    source: "عيادات رهط",
    breaking: false,
    body: [
      "عيادة الطوارئ الليلية تفتح أبوابها اليوم من الثامنة مساءً حتى منتصف الليل للحالات التي لا تحتمل انتظار الصباح.",
      "الحالات الشديدة تبقى من اختصاص نجمة داود الحمراء على 101، ومستشفى سوروكا في بئر السبع.",
      "اصطحبوا بطاقة صندوق المرضى. الانتظار يُدار حسب الحالة لا حسب الوصول.",
    ],
  },
  {
    slug: "bagrut",
    title: "مدارس رهط تنشر مواعيد استلام شهادات الثانوية",
    category: "تعليم",
    time: "قبل 3 ساعات",
    source: "قسم التعليم",
    breaking: false,
    body: [
      "تسلّم شهادات الثانوية لهذا العام يتم في مبنى كل مدرسة حسب الحرف الأول من اسم العائلة، من الأحد إلى الثلاثاء.",
      "الطالب يحضر الهوية. من يتعذر حضوره يوكّل قريباً من الدرجة الأولى بورقة موقعة.",
      "أسئلة العلامات تُراجع مع المرشد في المدرسة لا عبر صفحات التواصل.",
    ],
  },
  {
    slug: "arena",
    title: "القاعة الرياضية تُفتح بعد الصيانة أمام تدريب الأحياء",
    category: "رياضة",
    time: "اليوم",
    source: "قسم الرياضة",
    breaking: false,
    body: [
      "انتهت صيانة أرضية القاعة البلدية، والتدريبات تعود غداً حسب جدول الأندية المعلن على باب القاعة.",
      "الجمهور يدخل المباريات المسائية من البوابة الشرقية. المواقف خلف القاعة فقط، والشارع الرئيسي يبقى مفتوحاً.",
    ],
  },
  {
    slug: "thursday-market",
    title: "سوق الخميس يعود بتنظيم جديد لمواقف السيارات",
    category: "أعمال",
    time: "أمس",
    source: "رهط بوست",
    breaking: false,
    body: [
      "سوق الخميس يفتح من السادسة صباحاً حتى الثانية ظهراً. المواقف هذه المرة على طرف حي 4 لا داخل ممرات البيع.",
      "الباعة المثبتون يبقون في أماكن الأسبوع الماضي. البسطات الجديدة تسجّل عند مدخل السوق قبل السابعة.",
    ],
  },
  {
    slug: "road-works",
    title: "إغلاق جزئي لطريق رهط–بئر السبع مساء الغد",
    category: "النقب",
    time: "أمس",
    source: "نتيفي إسرائيل",
    breaking: false,
    body: [
      "مسار واحد على طريق رهط–بئر السبع يُغلق مساء الغد من التاسعة حتى الخامسة فجراً لتمديد طبقة إسفلت.",
      "التحويل عبر المدخل الشمالي. من عنده موعد مبكر في سوروكا يخرج قبل التاسعة أو يحسب نصف ساعة إضافية.",
    ],
  },
  {
    slug: "honor-night",
    title: "تكريم متفوقي حي 3 مساء الخميس في المركز الجماهيري",
    category: "مجتمع",
    time: "أمس",
    source: "المركز الجماهيري",
    breaking: false,
    body: [
      "المركز الجماهيري يدعو أهالي حي 3 لتكريم طلاب أنهوا العام بامتياز، الخامسة والنصف مساء الخميس.",
      "الدخول مجاني. القاعة تتسع لعائلتين لكل طالب، والباب يُغلق عند اكتمال المقاعد.",
    ],
  },
];

export const businesses: Business[] = [
  {
    slug: "diwan",
    name: "مطعم الديوان",
    category: "مطاعم",
    neighborhood: "حي 1",
    hours: "12:00 – 23:00",
    open: true,
    verified: true,
    phone: "050-000-1101",
    description: "مشاوي ووجبات عائلية. الطلبات قبل العاشرة مساءً، والجلوس في الصالة الداخلية.",
  },
  {
    slug: "bakery",
    name: "مخبز رهط",
    category: "بقالات",
    neighborhood: "حي 4",
    hours: "5:00 – 20:00",
    open: true,
    verified: true,
    phone: "050-000-1102",
    description: "خبز صباح ومناقيش حتى الظهر. الجمعة حتى الثانية عشرة.",
  },
  {
    slug: "amal-pharmacy",
    name: "صيدلية الأمل",
    category: "صحة",
    neighborhood: "حي 2",
    hours: "حراسة اليوم",
    open: true,
    verified: true,
    phone: "08-000-4510",
    description: "صيدلية الحراسة اليوم. الأدوية المزمنة حسب التوفر، والطوارئ تُخدم أولاً.",
  },
  {
    slug: "noor",
    name: "مركز النور التعليمي",
    category: "تعليم",
    neighborhood: "حي 6",
    hours: "14:00 – 20:00",
    open: false,
    verified: true,
    phone: "050-000-1104",
    description: "تقوية للمرحلة الإعدادية والثانوية. التسجيل في بداية كل شهر فقط.",
  },
  {
    slug: "garage",
    name: "كراج الجنوب",
    category: "ورش",
    neighborhood: "حي 8",
    hours: "8:00 – 17:00",
    open: false,
    verified: false,
    phone: "050-000-1105",
    description: "ميكانيك وكهرباء سيارات. تقدير السعر قبل بدء العمل.",
  },
  {
    slug: "waha",
    name: "قاعة الواحة",
    category: "مناسبات",
    neighborhood: "حي 3",
    hours: "حسب الحجز",
    open: true,
    verified: true,
    phone: "050-000-1106",
    description: "قاعة أفراح تتسع لثلاثمئة مدعو. المعاينة بحجز مسبق عصراً.",
  },
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

export function getArticle(slug: string) {
  return articles.find((item) => item.slug === slug);
}

export function getBusiness(slug: string) {
  return businesses.find((item) => item.slug === slug);
}

export function getClassified(id: string) {
  return classifieds.find((item) => item.id === id);
}
