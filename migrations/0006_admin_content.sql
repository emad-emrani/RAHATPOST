-- Admin-managed content (duty pharmacy, civic alerts), content reports and web-push subscriptions.

-- Duty pharmacy ("صيدلية المناوبة") for one date or a date range (Israel local dates, inclusive).
create table if not exists duty_shifts (
  id text primary key,
  start_date date not null,
  end_date date not null,
  name text not null check (char_length(name) between 2 and 80),
  address text not null check (char_length(address) between 2 and 120),
  phone text not null check (char_length(phone) between 9 and 16),
  hours text not null check (char_length(hours) between 2 and 60),
  map_url text check (map_url is null or char_length(map_url) <= 500),
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists duty_shifts_dates_idx on duty_shifts (start_date, end_date);

-- Civic / emergency alerts ("التنبيهات"), shown between starts_at and ends_at.
create table if not exists civic_alerts (
  id text primary key,
  title text not null check (char_length(title) between 3 and 100),
  body text not null check (char_length(body) between 3 and 600),
  severity text not null default 'civic' check (severity in ('civic', 'urgent')),
  link text check (link is null or char_length(link) <= 500),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  pushed_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists civic_alerts_window_idx on civic_alerts (ends_at, starts_at);

-- Reports ("إبلاغ") on reader news, ads and approved businesses. Anyone can report (signed-in or
-- not); reporter_key is a salted hash of the user id or IP, used only to count distinct reporters.
create table if not exists content_reports (
  id text primary key,
  target_type text not null check (target_type in ('news', 'ad', 'business')),
  target_id text not null check (char_length(target_id) between 1 and 40),
  reason text not null check (char_length(reason) between 2 and 40),
  note text check (note is null or char_length(note) <= 500),
  reporter_user_id text references "user" ("id") on delete set null,
  reporter_key text not null,
  status text not null default 'pending' check (status in ('pending', 'dismissed', 'actioned')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists content_reports_target_idx on content_reports (target_type, target_id, status);
create index if not exists content_reports_status_idx on content_reports (status, created_at desc);

-- Web-push subscriptions (one row per browser endpoint) with per-topic opt-ins.
create table if not exists push_subscriptions (
  endpoint text primary key check (char_length(endpoint) <= 1000),
  p256dh text not null,
  auth text not null,
  user_id text references "user" ("id") on delete cascade,
  topic_alerts boolean not null default true,
  topic_news boolean not null default false,
  topic_pharmacy boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
