-- Team roles for signed-in members (assigned by the owner in /admin «الأعضاء والصلاحيات»).
-- moderator: all moderation tabs + publishing; writer: publishes/edits/deletes own news only.
create table if not exists admin_roles (
  user_id text primary key references "user" ("id") on delete cascade,
  role text not null check (role in ('moderator', 'writer')),
  created_at timestamptz not null default now()
);
alter table staff_news add column if not exists author_id text references "user" ("id") on delete set null;
alter table staff_news add column if not exists author_name text;
