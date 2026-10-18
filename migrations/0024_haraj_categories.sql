-- Admin-managed haraj categories and their optional spec fields (seeded from code defaults on first read).
create table if not exists haraj_categories (
  key text primary key,
  sort integer not null default 0,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
