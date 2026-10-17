-- Admin-managed auto-news sections and their RSS feeds («الأخبار التلقائية» → الأقسام والمصادر).
create table if not exists news_sections (
  id text primary key check (id in ('news', 'israel', 'tech', 'weather')),
  name text not null check (char_length(name) between 2 and 60),
  enabled boolean not null default true,
  home boolean not null default true,
  position int not null default 0,
  refresh_min int not null default 4 check (refresh_min between 1 and 1440),
  -- true once the admin edited this section's feeds (news_feeds rows replace the built-in list).
  custom_feeds boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists news_feeds (
  id text primary key,
  section text not null check (section in ('news', 'israel', 'tech')),
  source_id text not null,
  source text not null,
  home text not null default '',
  url text not null,
  enabled boolean not null default true,
  position int not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists news_feed_stats (
  url text primary key,
  section text not null,
  last_fetch timestamptz,
  last_ok timestamptz,
  last_count int not null default 0,
  last_error text
);
