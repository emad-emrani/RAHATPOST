Build a production-quality, mobile-first Arabic (RTL) community web app called "رهط بوست" (Rahat Post), domain rahatpost.com. It is the daily civic, news, business directory, and classifieds site for Rahat and the Negev. Arabic UI only. All layout must be RTL from the root: dir="rtl" lang="ar" on <html>. Use CSS logical properties only (margin-inline, padding-inline, text-start, inset-inline). Never use left/right, ml/mr, pl/pr, or text-left/text-right.

Stack: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui. Font: "IBM Plex Sans Arabic" with system-ui fallback.

Logo: use the supplied mark exactly. It is a hand-drawn black stamp reading رهط بوست, white inside the stamp, on a bright yellow field with orange circle ornaments. Place it in the sticky header at about 64px, beside the wordmark "رهط بوست" and the line "رهط والنقب". Do not redraw the lettering and do not replace it with a generic icon.

Visual system — the page is the logo, not a SaaS template:
- Yellow field #FDB700 (the logo background). Ink #121212. Paper #FFFFFF. Accent orange #E69B02 used ONLY for breaking news and civic alerts.
- Content sits in white "stamp" cards: 3px solid #121212 border, radius 1.15rem, hard offset shadow 4px 4px 0 #121212. Primary buttons are black pills with yellow text and a small orange shadow. Secondary buttons are white pills with a black shadow.
- Pressed stamps shift 1px toward the shadow. Respect prefers-reduced-motion.
- No purple gradients, no glassmorphism, no hero illustration, no three equal feature cards, no Inter/Roboto, no emoji icons. Use a real icon set.
- Type: 16px body, 14px meta, 24–30px Arabic headlines, headline line-height about 1.35, body 1.6.
- Touch targets minimum 48px. The primary test is 390px wide. Desktop is one centered column, max-width 48rem, on the yellow field. No stretched dashboard.
- Chips are black-bordered pills. "عاجل" and paid or featured items use the orange chip. Verified businesses use a black chip with yellow text reading "موثّق".

Information architecture and routes:
- / Home
- /news and /news/[slug]
- /today Daily board
- /directory and /directory/[slug]
- /ads and /ads/[id]
- /submit with three modes: news tip, classified, business
- Footer note: this is a display build. National emergency numbers are real. Every other phone number is a sample.

Seed realistic Arabic sample data. Neighborhoods are editable records (حي 1 … حي 10). Do not invent fake emergency numbers. Use these real national numbers as tel: links: الشرطة 100، نجمة داود الحمراء 101، الإطفاء 102، طوارئ 112، اتحاد الإنقاذ 1221، الكهرباء 103، الجبهة الداخلية 104، البلدية 106.

Home, top to bottom, mobile:
1. Sticky yellow header: logo, wordmark, "أضف" button. Bottom nav on mobile: الرئيسية، الأخبار، اليوم، الدليل، الإعلانات. Desktop uses a text nav under the header instead of the bottom bar.
2. Search field: "ابحث في الأخبار والدليل والإعلانات". Filtering those three lists as the user types. Empty state in Arabic.
3. Breaking stamp in orange: chip "عاجل", headline, relative time. Tapping opens the article.
4. Duty pharmacy card: "صيدلية الحراسة اليوم", name, neighborhood, hours, buttons "اتصال" and "الاتجاهات". If no shift is logged, show "لم يُحدَّث جدول اليوم" in orange, not a fake pharmacy.
5. Emergency row: horizontal scroll of stamp chips, large numbers, for 100, 101, 102, 112. Link "كل الأرقام" to /today.
6. Latest news: one lead stamp, then a stacked list of 4 rows (category, time, title). No author avatars and no fake news photos. Typographic stamps only.
7. Civic alert stamp in orange, only if one exists and is unexpired.
8. "من الدليل": up to 4 verified businesses, category, name, neighborhood.
9. "آخر الإعلانات": 4 rows, type chip, title, neighborhood, price if any. Condolence rows stay visually quiet (no orange, no price).

News categories: عاجل، رهط، النقب، بلدية، تعليم، صحة، رياضة، مجتمع، أعمال.
Article page: category chip, H1, time, source, 3–6 short Arabic paragraphs, share row (Telegram, WhatsApp), 3 related stories. No comments. No like counters.

Daily board /today:
- Today's duty pharmacy (call + maps).
- Full emergency list. Each row is a tel: link with the number in large type.
- Civic alerts with expiry.
- Today's community events.
- Weather block for Rahat. A static sample is acceptable without an API key: temperature, wind, one Arabic condition line.

Directory:
- Search, category chips, "موثّق فقط" toggle.
- Card: name, category, neighborhood, open/closed, hours, verified badge.
- Profile: description, hours, call (number hidden until "إظهار الرقم"), WhatsApp, map link, and "هذا نشاطي" which confirms "وصل طلب المطالبة، بانتظار اتصال التوثيق".
- Categories: مطاعم، بقالات، صحة، تعليم، ورش، مناسبات.

Classifieds:
- Tabs: الكل، وظائف، سيارات، عقارات، مناسبات، خدمات، مفقودات.
- Occasion samples must be labeled نماذج, including one quiet condolence sample with no price and no orange. Do not invent a real death notice.
- Phone appears only after "إظهار الرقم". WhatsApp uses wa.me. "إبلاغ" confirms "وصل البلاغ للمراقبة".

Submit, one screen, large fields:
- خبر: what happened, where, phone.
- إعلان: title, body, neighborhood, phone.
- نشاط: name, category, neighborhood, one-line description, phone.
- Success: "وصلنا. لن يُنشر قبل المراجعة."

Quality bar:
- All visible UI strings in Arabic.
- No horizontal scroll on 390px except the emergency chip row and category chips.
- Keyboard focus visible.
- Anything paid or featured must show "إعلان".
- Do not add comments, chat, checkout, or a marketing landing page. The home page is the product.
