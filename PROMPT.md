Build a production-quality, mobile-first Arabic (RTL) community web app called "رهط بوست" (Rahat Post), domain rahatpost.com. It is the daily civic, news, business directory, and classifieds site for Rahat and the Negev. Arabic UI only. All layout must be RTL from the root: dir="rtl" lang="ar" on <html>. Use CSS logical properties only (margin-inline, padding-inline, text-start, inset-inline). Never use left/right, ml/mr, pl/pr, or text-left/text-right.

Stack: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui. Font: "IBM Plex Sans Arabic" with system-ui fallback.

Logo: use the supplied mark exactly. It is a hand-drawn black stamp reading رهط بوست, white inside the stamp, on a bright yellow field with orange circle ornaments. Place it in the sticky app bar, (about 48px, rounded) beside the wordmark "رهط بوست" and the line "رهط والنقب". Do not redraw the lettering and do not replace it with a generic icon.

Visual system — a modern delivery-app look (inspired by the HAAT app's design language; never copy its logo, name, illustrations, photos or text):
- Canvas #F1F2F4 (light grey). Cards and app bars white #FFFFFF. Ink #263238. Muted text #5E6670. Hairlines #E4E6EA.
- Primary calm warm yellow #F2C94C (hover #E9BB35), harmonized with the logo yellow #FDB700, for buttons, the active tab (yellow pill behind the icon), selected chips/tiles, verified chips and banners. Deeper gold #D9A92A outlines anything yellow so it stays distinct from the grey canvas. Pale tint #FFF6D6 for badges, icon squares and "عرض الكل" pills. Gold #8A6100 for icons/text on white or the tint. Text and icons on yellow are always ink #263238, never white. Muted amber #B45309 (white text) is reserved for "عاجل" and civic alerts so they stand out from the yellow UI. Green #0E8F47 only for "مباشر"/open states. Focus ring is ink.
- Cards: white, 1px hairline, radius 1rem, soft shadow (0 4px 14px rgb(16 24 40 / 6%)). Lists are one card with hairline dividers. Rows start with a 48px rounded icon square (gold lucide icon on the pale yellow tint) and end with a chevron.
- Primary buttons: yellow with ink text and a gold hairline, radius 14px, 48px tall. Secondary: white with a hairline. Chips are small grey pills; as buttons they are 48px tall; selected = yellow with gold outline and ink text.
- Home: weather/prayer chips and a scroll-snap banner carousel (latest news, buses, add-your-business, today) with dots at the top, then a rounded pill search with an icon, a horizontally scrolling row of category tiles (icon square + label), then latest news, Israel news and the yellow «خدمة البريد» card. Auto-advance is off under prefers-reduced-motion.
- White sticky top bar (logo, wordmark, "أضف"). Mobile bottom tab bar is white with icons and labels, active tab marked by a yellow pill behind its icon, safe-area padding. Desktop shows a pill tab nav under the top bar instead.
- Press feedback is a soft shadow lift and slight scale; no motion under prefers-reduced-motion.
- No purple gradients, no glassmorphism, no hero illustration, no stock photos (publisher news thumbnails are allowed, credited «الصورة: <المصدر>» on the article page), no Inter/Roboto, no emoji icons. Use lucide icons.
- Type: IBM Plex Sans Arabic, 16px body, 14px meta, 20–24px headlines, headline line-height about 1.35, body 1.6.
- Touch targets minimum 48px. The primary test is 390px wide. Desktop is one centered column, max-width 48rem. RTL with logical CSS properties.
- "عاجل" and civic alerts use the amber banner/chip. Verified businesses use a yellow chip reading "موثّق".

Information architecture and routes:
- / Home
- /news and /news/[slug]
- /today Daily board
- /israel-news and /israel-news/[slug] (Israel news from Hebrew outlets, machine-translated)
- /directory and /directory/[slug]
- /ads and /ads/[id]
- /submit with three modes: news tip, classified, business
- Footer note: this is a display build. National emergency numbers are real. Every other phone number is a sample.

Seed realistic Arabic sample data. Neighborhoods are editable records (حي 1 … حي 10). Do not invent fake emergency numbers. Use these real national numbers as tel: links: الشرطة 100، نجمة داود الحمراء 101، الإطفاء 102، طوارئ 112، اتحاد الإنقاذ 1221، الكهرباء 103، الجبهة الداخلية 104، البلدية 106.

Home, top to bottom, mobile:
1. Sticky white app bar: logo, wordmark, "أضف" button. Bottom tab bar on mobile: الرئيسية، الأخبار، اليوم، باصات، الدليل، الإعلانات. Desktop uses a pill tab nav under the app bar instead of the bottom bar.
2. Top (in this order): the civic alert banner in amber and the breaking banner in amber (chip "عاجل", headline, relative time), each only if one exists and is unexpired; then the weather + prayer-times chips; then the banner carousel (latest news, buses, add your business, today) with dots. The carousel's first slide is the very latest story.
3. Search field: "ابحث في الأخبار والدليل والإعلانات". Filtering news, Israel news, directory and ads as the user types (results replace everything below the search field). Empty state in Arabic.
4. Section tiles (horizontal scroll): الأخبار، الباصات، الدليل، الإعلانات، اليوم، أضف.
5. Latest news: one lead card (the 2nd newest story — the newest is already the carousel's first slide), then a stacked list of 4 rows (category, time, title). Each row shows the publisher's own thumbnail from the feed (or the article's og:image), hotlinked with no referrer, lazy, fixed aspect ratio, alt = headline; when there is none or it fails to load, a neutral category icon on the pale tint. No author avatars and never stock or invented photos.
6. "أخبار إسرائيل": 4 rows from /israel-news data (Hebrew outlets, machine-translated; translated items first), thumbnail, title, time · source, chip «ترجمة آلية» or «بالعبرية», credit line, link «عرض الكل» to /israel-news. Loaded in parallel with the rest of the home; hidden if the Hebrew feeds are slow (>2.5 s cold) or fail. Home search also matches these headlines (Arabic or Hebrew).
7. "خدمة البريد": one yellow card (primary-soft, primary border) from the post office guide (/directory/guide/post), three rows jumping to its sections — ادفع في البريد (فواتير، أرنونا، مخالفات وضرائب) → #pay, فروع البريد في رهط → #branches, بنك البريد (مخصصات، تحويل أموال، صرف شيكات وعملات) → #bank — and a full-width button «افتح دليل البريد». No hours or numbers on the card itself; facts stay in the guide.
7a. Then the install banner and the notifications prompt (each only when relevant).
8. Buses: a compact card linking to /buses.
9. "من الدليل": up to 4 places (verified first), category, name, address.
10. "آخر الإعلانات": 4 rows, type chip, title, neighborhood, price if any. Condolence rows stay visually quiet (no colour, no price).
11. Duty pharmacy card: "صيدلية الحراسة اليوم", name, neighborhood, hours, buttons "اتصال" and "الاتجاهات". If no shift is logged, show "لم يُحدَّث جدول اليوم", not a fake pharmacy.
12. Emergency row: horizontal scroll of white cards, large numbers, for 100, 101, 102, 112. Link "كل الأرقام" to /today.

News categories: عاجل، رهط، النقب، بلدية، تعليم، صحة، رياضة، مجتمع، أعمال.
Article page: the source image (16:9) with caption «الصورة: <المصدر>» when available, category chip, H1, time, source, 3–6 short Arabic paragraphs, share row (Telegram, WhatsApp), comments (see below), 3 related stories. No like counters.

Comments (every news page: /news/<slug> and /israel-news/<slug>): reading is public; writing needs Google sign-in (session enforced server-side). Each comment shows name, avatar, relative time; one level of replies; newest/oldest toggle; authors can edit within 10 minutes and delete any time. Published immediately after a filter (Arabic/Hebrew/English profanity + spam, max 1 link, 2–800 chars, 5 per 10 min / 20 per day, honeypot + 3-second rule), with «إبلاغ» on every comment (auto-hidden after 3 reports). Admin tab «التعليقات»: filters (all / reported / hidden / pending), hide / restore / delete, block a user from commenting, and a pre-moderation switch (default off). Comment counts appear on news rows (cached aggregate). Optional push «الردود على تعليقاتي» to the author of a comment that gets a reply.

Daily board /today:
- Right after a real civic alert (if any): «أخبار إسرائيل» — the newest headlines from Hebrew outlets' own RSS (ynet, N12, Maariv, Globes): a lead card with a 16:9 publisher image, then rows with thumbnails (placeholder icon when missing; lazy, no referrer), link «كل الأخبار» to /israel-news. Titles are machine-translated Hebrew → Arabic server-side (cached per item) and chipped «ترجمة آلية»; untranslated items show the Hebrew (lang=he) with chip «بالعبرية». The item page shows the image with «الصورة: <المصدر>», the translated title and excerpt, the original Hebrew title, and «الخبر الأصلي بالعبرية» opening the source in a new tab.
- Today's duty pharmacy (call + maps).
- Full emergency list. Each row is a tel: link with the number in large type.
- Civic alerts with expiry — only real, sourced notices; no alert is shown when none exists.
- Today's community events — only real, sourced events; show nothing rather than invented ones.
- Weather block for Rahat only from a real weather source; never a static fake reading.

Directory:
- Search, category chips, "موثّق فقط" toggle.
- Card: name, category, neighborhood, open/closed, hours, verified badge.
- Profile: description, hours, call (number hidden until "إظهار الرقم"), WhatsApp, map link, and "هذا نشاطي" which confirms "وصل طلب المطالبة، بانتظار اتصال التوثيق".
- Categories: مطاعم، بقالات، صحة، تعليم، ورش، مناسبات.

Classifieds:
- Tabs: الكل، وظائف، سيارات، عقارات، مناسبات، خدمات، مفقودات.
- Occasion samples must be labeled نماذج, including one quiet condolence sample with no price and no colour. Do not invent a real death notice.
- Phone appears only after "إظهار الرقم". WhatsApp uses wa.me. "إبلاغ" confirms "وصل البلاغ للمراقبة".

Submit, one screen, large fields — every mode requires sign-in (Google). Signed-out visitors see a short Arabic explanation and the sign-in button, and return to the same mode after login. The server rejects submissions without a session and stores the user id with each one.
- خبر: title, text, place, optional source link → pending reader news; once approved it appears in /news and home latest news marked «من القراء» with the poster's name, with its own page showing the full text.
- إعلان: type, title, body, price (optional), neighborhood, phone.
- نشاط: name, category, neighborhood, one-line description, phone.
- Success: "وصلنا. لن يُنشر قبل المراجعة." with a link to «منشوراتي» (/my-posts): the user's ads, news and business requests with status, edit (ads) and delete.
- /admin tabs: أخبار القراء، الإعلانات، طلبات الدليل (approve / reject / delete).

Quality bar:
- All visible UI strings in Arabic.
- No horizontal scroll on 390px except the emergency chip row and category chips.
- Keyboard focus visible.
- Anything paid or featured must show "إعلان".
- Do not add chat, checkout, or a marketing landing page (news comments are the only user discussion). The home page is the product.
