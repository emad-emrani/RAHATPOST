-- Business ("نشاط") submissions move from Vercel Blob to Postgres so each one is linked to the
-- signed-in user who sent it. Rows imported from the old Blob store have no user (legacy = true).
create table if not exists business_submissions (
  id text primary key,
  user_id text references "user" ("id") on delete set null,
  name text not null check (char_length(name) between 2 and 80),
  category text not null check (char_length(category) between 2 and 40),
  area text not null check (char_length(area) between 2 and 60),
  about text not null check (char_length(about) between 5 and 160),
  phone text not null check (char_length(phone) between 9 and 16),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  legacy boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists business_submissions_user_idx on business_submissions (user_id, created_at desc);
create index if not exists business_submissions_status_idx on business_submissions (status, updated_at desc);

-- Reader news ("أخبار القراء"): original posts by signed-in users, pending until an admin approves.
create table if not exists reader_news (
  id text primary key,
  user_id text not null references "user" ("id") on delete cascade,
  title text not null check (char_length(title) between 5 and 120),
  body text not null check (char_length(body) between 20 and 4000),
  source_url text check (source_url is null or char_length(source_url) <= 500),
  neighborhood text not null check (char_length(neighborhood) between 2 and 60),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reader_news_user_idx on reader_news (user_id, created_at desc);
create index if not exists reader_news_status_idx on reader_news (status, updated_at desc);

-- Ids already copied from the old Blob store, so a request the admin later deletes here is not
-- imported again.
create table if not exists legacy_blob_imports (
  id text primary key,
  imported_at timestamptz not null default now()
);
