-- «الإعلانات المنبثقة»: admin-managed popups with real view/click counters.
create table if not exists popups (
  id text primary key,
  data jsonb not null,
  views integer not null default 0,
  clicks integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
