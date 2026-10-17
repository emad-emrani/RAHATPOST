-- Admin control over auto-fetched news («الأخبار التلقائية»): per-item overrides and per-source switches.
create table if not exists news_overrides (
  slug text primary key check (char_length(slug) between 3 and 200),
  kind text not null check (kind in ('news', 'israel')),
  hidden boolean not null default false,
  pinned boolean not null default false,
  breaking boolean,
  category text check (category is null or char_length(category) between 2 and 40),
  title text check (title is null or char_length(title) between 3 and 300),
  updated_at timestamptz not null default now()
);
create table if not exists news_source_settings (
  kind text not null check (kind in ('news', 'israel')),
  source text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (kind, source)
);
