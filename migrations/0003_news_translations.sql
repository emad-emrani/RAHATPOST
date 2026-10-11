-- Machine translations (Hebrew → Arabic) of Israel news headlines/excerpts, keyed by news item id,
-- so each item is translated once and survives server restarts.
create table if not exists news_translations (
  id text primary key,
  title_ar text,
  summary_ar text,
  provider text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists news_translations_created_idx on news_translations (created_at);
