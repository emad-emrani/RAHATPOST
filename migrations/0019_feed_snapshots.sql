-- Last good copy of each auto-updating section (news feeds, weather...), so cold starts and failing upstreams never hide a section.
create table if not exists feed_snapshots (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
