-- Admin overrides for bus lines (additive). Schedules themselves stay GTFS-only.
create table if not exists bus_line_overrides (
  number text primary key,          -- line number, or '*' for a notice shown on the buses page
  hidden boolean not null default false,
  label_from text not null default '',
  label_to text not null default '',
  note text not null default '',
  shape jsonb,                      -- optional route override: {"<dir>": [[lat,lon],...]}
  hidden_stops text[] not null default '{}',
  updated_at timestamptz not null default now()
);
