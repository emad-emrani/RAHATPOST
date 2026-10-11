-- Comments on news articles (feed news, reader news and Israel news), one level of replies.
-- article_key is the article's path without the leading slash ("news/<slug>",
-- "israel-news/<slug>"): stable for a feed item, so comments survive feed refreshes; they are only
-- shown while that article page exists.
create table if not exists comments (
  id text primary key,
  article_key text not null check (char_length(article_key) <= 120),
  parent_id text references comments (id) on delete cascade,
  user_id text not null references "user" ("id") on delete cascade,
  body text not null check (char_length(body) between 2 and 800),
  -- approved: public · pending: waiting for approval (pre-moderation mode) · hidden: by admin or
  -- auto-hidden after reports
  status text not null default 'approved' check (status in ('approved', 'pending', 'hidden')),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index if not exists comments_article_idx on comments (article_key, status, created_at);
create index if not exists comments_parent_idx on comments (parent_id);
create index if not exists comments_user_idx on comments (user_id, created_at desc);
create index if not exists comments_recent_idx on comments (created_at desc);

-- Users blocked from commenting by an admin.
create table if not exists comment_blocks (
  user_id text primary key references "user" ("id") on delete cascade,
  created_at timestamptz not null default now()
);

-- Small key/value settings editable from the admin panel (e.g. comments_premod = 'on').
create table if not exists app_settings (
  key text primary key check (char_length(key) <= 60),
  value text not null check (char_length(value) <= 500),
  updated_at timestamptz not null default now()
);

-- Reports can now target comments.
alter table content_reports drop constraint if exists content_reports_target_type_check;
alter table content_reports add constraint content_reports_target_type_check
  check (target_type in ('news', 'ad', 'business', 'comment'));

-- Push topic: replies to my comments (sent only to the subscriptions of that signed-in user).
alter table push_subscriptions add column if not exists topic_replies boolean not null default true;
