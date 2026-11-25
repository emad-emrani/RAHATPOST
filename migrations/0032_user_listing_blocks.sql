-- Personal blocks on حراج: a signed-in member hides another member's listings from their own view.
-- This is not a site-wide ban (that stays in user_blocks).
create table if not exists user_listing_blocks (
  blocker_id text not null references "user" ("id") on delete cascade,
  blocked_id text not null references "user" ("id") on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists user_listing_blocks_blocked_idx on user_listing_blocks (blocked_id);
