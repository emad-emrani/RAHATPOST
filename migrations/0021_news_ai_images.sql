-- AI illustrations for news items without a photo (optional, admin «الذكاء الاصطناعي والترجمة»).
create table if not exists news_ai_images (
  slug text primary key,
  key text,
  provider text not null,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists news_ai_images_created on news_ai_images (created_at);
