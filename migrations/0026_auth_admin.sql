-- Admin-controlled sign-in methods + blocked members.
create table if not exists auth_settings (key text primary key, value jsonb not null, updated_at timestamptz not null default now());
create table if not exists user_blocks (user_id text primary key references "user" ("id") on delete cascade, blocked_at timestamptz not null default now());
