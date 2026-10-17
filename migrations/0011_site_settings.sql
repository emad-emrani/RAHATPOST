-- Owner-editable site settings («إعدادات الموقع»): one JSON document.
create table if not exists site_settings (
  id int primary key check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
