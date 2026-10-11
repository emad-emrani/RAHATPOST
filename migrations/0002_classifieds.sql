-- User-posted classifieds. Every row belongs to a signed-in user (Better Auth "user".id).
-- New and edited ads are 'pending' until an admin approves them on /admin.
create table if not exists classifieds (
  id text primary key,
  user_id text not null references "user" ("id") on delete cascade,
  type text not null check (type in ('وظائف', 'سيارات', 'عقارات', 'مناسبات', 'خدمات', 'مفقودات')),
  title text not null check (char_length(title) between 3 and 90),
  description text not null check (char_length(description) between 10 and 1000),
  price text check (price is null or char_length(price) <= 30),
  neighborhood text not null check (char_length(neighborhood) between 2 and 60),
  phone text not null check (char_length(phone) between 9 and 16),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists classifieds_user_idx on classifieds (user_id, created_at desc);
create index if not exists classifieds_status_idx on classifieds (status, updated_at desc);
