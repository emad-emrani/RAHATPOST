-- «الإحصائيات»: GA4 Data API settings (property id + AES-GCM encrypted service-account JSON).
create table if not exists analytics_settings (
  id int primary key check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
