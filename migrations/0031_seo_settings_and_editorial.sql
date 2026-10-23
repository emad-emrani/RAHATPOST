-- 0031_seo_settings_and_editorial.sql
-- 1. Enable custom news sections in news_sections and news_feeds (relax hardcoded id check)
alter table news_sections drop constraint if exists news_sections_id_check;
alter table news_sections add constraint news_sections_id_check check (id ~ '^[a-z0-9_-]{2,40}$');

alter table news_feeds drop constraint if exists news_feeds_section_check;
alter table news_feeds add constraint news_feeds_section_check check (section ~ '^[a-z0-9_-]{2,40}$');

-- 2. Optimize homepage section ordering, enable 'directory' and 'duty' pharmacy, and refine tagline/footer in site_settings
update site_settings
set data = jsonb_set(
  jsonb_set(
    jsonb_set(
      data,
      '{home}',
      '[
        {"id": "weather", "visible": true},
        {"id": "slider", "visible": true},
        {"id": "search", "visible": true},
        {"id": "tiles", "visible": true},
        {"id": "quicklinks", "visible": true},
        {"id": "news", "visible": true},
        {"id": "post", "visible": true},
        {"id": "buses", "visible": true},
        {"id": "duty", "visible": true},
        {"id": "directory", "visible": true},
        {"id": "ads", "visible": true},
        {"id": "sports", "visible": true},
        {"id": "tech", "visible": true},
        {"id": "israel", "visible": true},
        {"id": "emergency", "visible": true},
        {"id": "install", "visible": true}
      ]'::jsonb
    ),
    '{texts,tagline}',
    '"أخبار وخدمات رهط والنقب في مكان واحد"'::jsonb
  ),
  '{texts,footer}',
  '"منصة رهط بوست — بوابة أخبار رهط والنقب، مواعيد باصات غاليم، دليل المصالح والخدمات، وحراج رهط. أرقام الطوارئ الوطنية حقيقية ومعتمدة."'::jsonb
),
updated_at = now()
where id = 1;

-- 3. Seed evergreen local Rahat editorial articles in staff_news for Google News & Organic Search
insert into staff_news (id, title, category, body, breaking, author_name, created_at, updated_at)
values
  (
    'a1b2c3d4e5f60001',
    'دليل شامل لخطوط باصات غاليم في رهط والنقب وأوقات الوصول المباشرة',
    'رهط',
    'توفّر منصة رهط بوست متابعة لحظية لجميع خطوط حافلات شركة غاليم (גלים) العاملة داخل أحياء مدينة رهط والخطوط التي تربط المدينة ببئر السبع وتل السبع وكسيفة وعرعرة النقب وسديروت وعسقلان والمركز.

تعمل داخل مدينة رهط الخطوط رقم 1 و2 و3 و4 و4أ و5 و6 لربط الأحياء السكنية والمدارس والمركز التجاري والعيادات الطبية، بينما تنطلق الخطوط 450 و451 و452 و454 و455 و471 نحو مدينة بئر السبع (المحطة المركزية، مستشفى سوروكا، وجامعة بن غوريون) على مدار اليوم.

يمكنكم عبر قسم «باصات رهط» في موقع رهط بوست اختيار رقم الخط أو اسم المحطة لمشاهدة موقع الباص الحي على الخريطة ومعرفة الدقائق المتبقية لوصوله بدقة.',
    false,
    'فريق رهط بوست',
    now() - interval '3 hours',
    now() - interval '3 hours'
  ),
  (
    'a1b2c3d4e5f60002',
    'خدمات البريد وبنك البريد ودفع الأرنونا والفواتير في مدينة رهط',
    'بلدية',
    'يقدّم دليل الخدمات في موقع رهط بوست شرحاً مفصلاً لأهالي المدينة حول طرق تسديد فواتير الكهرباء والمياه وضريبة الأرنونا لبلدية رهط والرسوم الحكومية ومخالفات السير، سواء عبر الدفع الإلكتروني المباشر أو من خلال فروع بريد إسرائيل في رهط.

تنتشر في مدينة رهط ثلاثة فروع ووحدات بريدية رئيسية لخدمة السكان: فرع رهط 1 في شارع صلاح الدين (وحدة 209)، وحدة بريد رهط المركزية في السوق البلدي (وحدة 237)، وفرع المختار في شارع عمر المختار بحي 33 (وحدة 297)، بالإضافة إلى خدمات بنك البريد واستلام الطرود وحجز الأدوار المسبق.',
    false,
    'فريق رهط بوست',
    now() - interval '6 hours',
    now() - interval '6 hours'
  ),
  (
    'a1b2c3d4e5f60003',
    'دليل محلات وخدمات رهط: أضف مصلحتك التجارية مجاناً لتظهر في نتائج البحث',
    'أعمال',
    'يضم دليل رهط في موقع رهط بوست عشرات المصالح التجارية والمؤسسات الخدمية في مدينة رهط، بما في ذلك المطاعم والمقاهي، البقالات والمراكز التجارية، العيادات الطبية والصيدليات، المدارس، المساجد، والبنوك والصرافات الآلية، مع مواقعها الدقيقة على الخريطة وأرقام التواصل المباشر.

يدعو موقع رهط بوست أصحاب المحلات والمصالح التجارية والمهنيين في مدينة رهط والنقب إلى إضافة نشاطهم التجاري مجاناً عبر صفحة «أضف في رهط بوست» ليظهر بعلامة «موثّق» ويسهل على الزبائن والزوار الوصول إليه عبر الموقع وفي نتائج بحث جوجل.',
    false,
    'فريق رهط بوست',
    now() - interval '9 hours',
    now() - interval '9 hours'
  ),
  (
    'a1b2c3d4e5f60004',
    'لوحة اليوم في رهط: حالة الطقس وأوقات الصلاة وصيدلية المناوبة وأرقام الطوارئ',
    'مجتمع',
    'تجمع صفحة «لوحة اليوم» في موقع رهط بوست كافة المعلومات اليومية التي يحتاجها سكان مدينة رهط والنقب في شاشة واحدة سريعة ومحدّثة على مدار الساعة.

تشمل الصفحة حالة الطقس الحالية في رهط وتوقعات الساعات القادمة، ومواقيت الصلاة الدقيقة في مدينة رهط مع العد التنازلي للصلاة القادمة، واسم وعنوان وهاتف صيدلية الحراسة المناوبة اليوم، إلى جانب أرقام الطوارئ الوطنية والمحلية السريعة (الشرطة 100، نجمة داود الحمراء 101، الإطفاء والإنقاذ 102، ومركز بلدية رهط 106).',
    false,
    'فريق رهط بوست',
    now() - interval '12 hours',
    now() - interval '12 hours'
  )
on conflict (id) do nothing;
