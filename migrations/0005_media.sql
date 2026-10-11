-- Photos users attach to their ads (up to 3) and business requests (1 logo/photo).
-- The bytes live in the private Vercel Blob store under media/<key> and are served through
-- /media/<key>; this table records who uploaded each one and what it belongs to.
-- owner_id is null between upload and save (orphans are cleaned up after a day).
create table if not exists media_uploads (
  key text primary key check (key ~ '^[a-f0-9]{32}\.(webp|jpg)$'),
  user_id text not null references "user" ("id") on delete cascade,
  kind text not null check (kind in ('ad', 'business')),
  owner_id text,
  position int not null default 0,
  content_type text not null check (content_type in ('image/webp', 'image/jpeg')),
  size int not null check (size > 0 and size <= 3145728),
  width int not null,
  height int not null,
  created_at timestamptz not null default now()
);

create index if not exists media_uploads_owner_idx on media_uploads (kind, owner_id, position);
create index if not exists media_uploads_user_idx on media_uploads (user_id, created_at desc);
create index if not exists media_uploads_orphan_idx on media_uploads (created_at) where owner_id is null;
