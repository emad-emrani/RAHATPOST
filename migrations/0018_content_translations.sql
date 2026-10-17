-- Machine translations of dynamic Arabic content (news, products…) into Hebrew/English, keyed by text hash.
create table if not exists content_translations (
  hash text not null,
  lang text not null,
  text text not null,
  created_at timestamptz not null default now(),
  primary key (hash, lang)
);

-- Site languages («اللغات» in admin). Built-ins are seeded in code when the table is empty.
create table if not exists site_languages (
  code text primary key,
  name text not null,
  dir text not null default 'rtl',
  flag text not null default '',
  enabled boolean not null default true,
  is_default boolean not null default false,
  mode text not null default 'ai',
  sort int not null default 100
);

-- UI dictionary per language: AI output and manual admin overrides (manual wins).
create table if not exists ui_translations (
  lang text not null,
  key text not null,
  text text not null,
  source text not null default 'ai',
  updated_at timestamptz not null default now(),
  primary key (lang, key)
);

-- Gemini settings («Gemini» in admin), one row.
create table if not exists gemini_settings (
  id int primary key check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- Daily Gemini usage counters and the latest errors.
create table if not exists gemini_usage (
  day date not null,
  kind text not null,
  calls int not null default 0,
  cached int not null default 0,
  errors int not null default 0,
  primary key (day, kind)
);
create table if not exists gemini_errors (
  id bigserial primary key,
  at timestamptz not null default now(),
  kind text not null,
  message text not null
);
