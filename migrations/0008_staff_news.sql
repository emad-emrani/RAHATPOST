-- News written by the site team from /admin («نشر خبر»): published immediately, shown in /news,
-- the homepage and (when breaking) the عاجل banner. Optional photo lives in Blob under media/<key>.
create table if not exists staff_news (
  id text primary key check (id ~ '^[a-f0-9]{16}$'),
  title text not null check (char_length(title) between 5 and 160),
  category text not null check (char_length(category) between 2 and 40),
  body text not null check (char_length(body) between 20 and 8000),
  image_key text check (image_key is null or image_key ~ '^[a-f0-9]{32}\.(webp|jpg)$'),
  breaking boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists staff_news_created_idx on staff_news (created_at desc);
create unique index if not exists staff_news_image_idx on staff_news (image_key) where image_key is not null;
