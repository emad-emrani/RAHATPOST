-- Store categories become catalog sections (cover/icon, description, colour, sub-sections).
alter table store_categories add column if not exists image_key text
  check (image_key is null or image_key ~ '^[a-f0-9]{32}\.(webp|jpg)$');
alter table store_categories add column if not exists icon text not null default 'bag';
alter table store_categories add column if not exists description text not null default '';
alter table store_categories add column if not exists color text not null default '#f2c94c';
alter table store_categories add column if not exists active boolean not null default true;
alter table store_categories add column if not exists show_soon boolean not null default false;
alter table store_categories add column if not exists parent_id text references store_categories (id) on delete set null;

-- Three empty starter sections (neutral icons, no products/prices). Hidden publicly until they
-- have active products, unless the admin turns on «قريباً».
insert into store_categories (id, name, slug, sort, icon, color, description) values
  ('secnetflix0001', 'نتفليكس', 'netflix', 1, 'tv', '#f6a65a', 'اشتراكات مشاهدة الأفلام والمسلسلات.'),
  ('secms365000001', 'مايكروسوفت 365', 'microsoft-365', 2, 'briefcase', '#7cb7f2', 'اشتراكات برامج المكتب والتخزين السحابي.'),
  ('secai000000001', 'الذكاء الاصطناعي', 'ai', 3, 'sparkles', '#b9a4f2', 'اشتراكات أدوات الذكاء الاصطناعي.')
on conflict do nothing;
