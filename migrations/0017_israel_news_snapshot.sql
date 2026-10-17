-- Last good Israel news feed, so a cold serverless instance (or a failing Hebrew feed) never hides the section.
create table if not exists israel_news_snapshot (
  id int primary key check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);
