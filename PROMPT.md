Build a production-quality, mobile-first Arabic (RTL) community web app called "رهط بوست" (Rahat Post), domain rahatpost.com. It is the daily civic, news, business directory, and classifieds site for Rahat and the Negev. Arabic UI only. All layout must be RTL from the root: dir="rtl" lang="ar" on <html>. Use CSS logical properties only (margin-inline, padding-inline, text-start, inset-inline). Never use left/right, ml/mr, pl/pr, or text-left/text-right.

Stack: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui. Font: "IBM Plex Sans Arabic" with system-ui fallback.

Logo: use the supplied mark exactly. It is a hand-drawn black stamp reading رهط بوست, white inside the stamp, on a bright yellow field with orange circle ornaments. Place it in the sticky app bar, (about 48px, rounded) beside the wordmark "رهط بوست" and the line "رهط والنقب". Do not redraw the lettering and do not replace it with a generic icon.

Visual system — a modern delivery-app look (inspired by the HAAT app's design language; never copy its logo, name, illustrations, photos or text):
- Canvas #F1F2F4 (light grey). Cards and app bars white #FFFFFF. Ink #263238. Muted text #5E6670. Hairlines #E4E6EA.
- Primary crimson #D80047 (hover/pressed #B0003A) for buttons, active tabs, selected chips/tiles and the breaking/civic-alert banner. Soft crimson #FDE8EF for badges, icon squares and "عرض الكل" pills. Yellow #F8CC05 only as an occasional banner fill; the yellow #FDB700 stays inside the رهط بوست logo. Green #0E8F47 only for "مباشر"/open states.
- Cards: white, 1px hairline, radius 1rem, soft shadow (0 4px 14px rgb(16 24 40 / 6%)). Lists are one card with hairline dividers. Rows start with a 48px rounded icon square (lucide icon on soft crimson) and end with a chevron.
- Primary buttons: crimson, white text, radius 14px, 48px tall. Secondary: white with a hairline. Chips are small grey pills; as buttons they are 48px tall; selected = crimson.
- Home: rounded pill search with an icon, a horizontally scrolling row of category tiles (icon square + label), then a scroll-snap banner carousel (latest news, buses, add-your-business, today) with dots. Auto-advance is off under prefers-reduced-motion.
- White sticky top bar (logo, wordmark, "أضف"). Mobile bottom tab bar is white with icons and labels, active tab crimson, safe-area padding. Desktop shows a pill tab nav under the top bar instead.
- Press feedback is a soft shadow lift and slight scale; no motion under prefers-reduced-motion.
- No purple gradients, no glassmorphism, no hero illustration, no stock photos, no Inter/Roboto, no emoji icons. Use lucide icons.
- Type: IBM Plex Sans Arabic, 16px body, 14px meta, 20–24px headlines, headline line-height about 1.35, body 1.6.
- Touch targets minimum 48px. The primary test is 390px wide. Desktop is one centered column, max-width 48rem. RTL with logical CSS properties.
- "عاجل" and civic alerts use the crimson banner. Verified businesses use a crimson chip reading "موثّق".

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
1. Sticky white app bar: logo, wordmark, "أضف" button. Bottom nav on mobile: الرئيسية، الأخبار، اليوم، الدليل، الإعلانات. Desktop uses a text nav under the header instead of the bottom bar.
2. Search field: "ابحث في الأخبار والدليل والإعلانات". Filtering those three lists as the user types. Empty state in Arabic.
3. Breaking banner in crimson: chip "عاجل", headline, relative time. Tapping opens the article.
4. Duty pharmacy card: "صيدلية الحراسة اليوم", name, neighborhood, hours, buttons "اتصال" and "الاتجاهات". If no shift is logged, show "لم يُحدَّث جدول اليوم" in orange, not a fake pharmacy.
5. Emergency row: horizontal scroll of white cards, large numbers, for 100, 101, 102, 112. Link "كل الأرقام" to /today.
6. Latest news: one lead card, then a stacked list of 4 rows (category, time, title). No author avatars and no fake news photos; category icons only.
7. Civic alert banner in crimson, only if one exists and is unexpired.
8. "من الدليل": up to 4 verified businesses, category, name, neighborhood.
9. "آخر الإعلانات": 4 rows, type chip, title, neighborhood, price if any. Condolence rows stay visually quiet (no crimson, no price).

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
- Occasion samples must be labeled نماذج, including one quiet condolence sample with no price and no crimson. Do not invent a real death notice.
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
