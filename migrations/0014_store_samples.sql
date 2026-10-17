-- «مثال» sample products: shown with a badge, cannot be bought, excluded from the sitemap.
-- Admin can turn one into a real product (uncheck «مثال») or delete all samples.
alter table store_products add column if not exists is_sample boolean not null default false;

insert into store_products (id, slug, name, category_id, price_agorot, image_key, short_desc, description,
  duration, badges, active, sort, is_sample) values
  ('samplenetflixmonthly', 'sample-netflix-monthly', 'نتفليكس · اشتراك شهري', 'secnetflix0001', 4900, '8e87de3c4907025048a8e9cbe26ac096.jpg', 'مثال لخطة شهرية لمشاهدة الأفلام والمسلسلات.', 'منتج تجريبي للعرض فقط: السعر غير حقيقي ولا يمكن شراؤه.', 'monthly', '["الأكثر طلباً"]'::jsonb, true, 1, true),
  ('samplenetflix3months', 'sample-netflix-3months', 'نتفليكس · اشتراك 3 أشهر', 'secnetflix0001', 13900, 'be02926ede854a7a18fc0d09eee76e4e.jpg', 'مثال لخطة 3 أشهر بسعر أوفر.', 'منتج تجريبي للعرض فقط: السعر غير حقيقي ولا يمكن شراؤه.', 'quarterly', '["توفير"]'::jsonb, true, 2, true),
  ('samplem365personal', 'sample-m365-personal', 'مايكروسوفت 365 · شخصي سنوي', 'secms365000001', 29900, 'f5d20fff2bcffe4780e972dd9ae2b8b4.jpg', 'مثال: برامج المكتب وتخزين سحابي لمستخدم واحد.', 'منتج تجريبي للعرض فقط: السعر غير حقيقي ولا يمكن شراؤه.', 'yearly', '[]'::jsonb, true, 1, true),
  ('samplem365family', 'sample-m365-family', 'مايكروسوفت 365 · عائلي سنوي', 'secms365000001', 39900, 'b675a9bd1d30d6eedd6178c04ed34e9a.jpg', 'مثال: حتى 6 مستخدمين في اشتراك واحد.', 'منتج تجريبي للعرض فقط: السعر غير حقيقي ولا يمكن شراؤه.', 'yearly', '["للعائلة"]'::jsonb, true, 2, true),
  ('samplechatgptplus', 'sample-chatgpt-plus', 'ChatGPT Plus · شهري', 'secai000000001', 8900, '722cb976fcd517b2c7d917880f9d7229.jpg', 'مثال لاشتراك شهري في مساعد ذكاء اصطناعي.', 'منتج تجريبي للعرض فقط: السعر غير حقيقي ولا يمكن شراؤه.', 'monthly', '["الأكثر طلباً"]'::jsonb, true, 1, true),
  ('samplegemini00', 'sample-gemini', 'Gemini · شهري', 'secai000000001', 8500, '7618cde8a3bf4763abc715fe24850bfa.jpg', 'مثال لاشتراك شهري في مساعد ذكاء اصطناعي.', 'منتج تجريبي للعرض فقط: السعر غير حقيقي ولا يمكن شراؤه.', 'monthly', '[]'::jsonb, true, 2, true),
  ('samplemidjourney', 'sample-midjourney', 'Midjourney · خطة أساسية شهرية', 'secai000000001', 4500, 'db98f2cf731e9af80e781c60239f0386.jpg', 'مثال لخطة توليد صور بالذكاء الاصطناعي.', 'منتج تجريبي للعرض فقط: السعر غير حقيقي ولا يمكن شراؤه.', 'monthly', '[]'::jsonb, true, 3, true)
on conflict do nothing;
