-- «سوق المستعمل»: the classifieds table becomes used-items listings (same ids, so old /ads/<id> links redirect).
alter table classifieds drop constraint if exists classifieds_type_check;
alter table classifieds alter column type drop not null;
alter table classifieds drop constraint if exists classifieds_description_check;
alter table classifieds add constraint classifieds_description_check check (char_length(description) between 10 and 3000);
alter table classifieds drop constraint if exists classifieds_status_check;
alter table classifieds add constraint classifieds_status_check check (status in ('pending', 'approved', 'rejected', 'hidden'));
alter table classifieds add column if not exists category text not null default 'أخرى';
alter table classifieds add column if not exists price_mode text not null default 'price';
alter table classifieds add column if not exists price_num integer;
alter table classifieds add column if not exists condition text not null default 'مستعمل';
alter table classifieds add column if not exists hide_phone boolean not null default false;
alter table classifieds add column if not exists sold_at timestamptz;
alter table classifieds add column if not exists renewed_at timestamptz;
-- Category-specific details (e.g. cars: make, year, km…), all optional.
alter table classifieds add column if not exists specs jsonb not null default '{}'::jsonb;
-- One-time mapping of the old ad types/prices (rows not yet migrated have renewed_at null).
update classifieds set
  category = case type when 'سيارات' then 'سيارات' when 'عقارات' then 'عقارات' when 'خدمات' then 'خدمات' else 'أخرى' end,
  price_num = case when price ~ '[0-9]' and length(regexp_replace(price, '[^0-9]', '', 'g')) <= 9
    then regexp_replace(price, '[^0-9]', '', 'g')::int else null end,
  price_mode = case when price is null or price !~ '[0-9]' then 'negotiable' else 'price' end,
  renewed_at = updated_at
where renewed_at is null;
create index if not exists classifieds_market_idx on classifieds (status, renewed_at desc);
