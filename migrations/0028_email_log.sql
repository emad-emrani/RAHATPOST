-- One-off member e-mails already sent (e.g. listing expiring/expired per renewal cycle).
create table if not exists email_log (
  key text primary key,
  sent_at timestamptz not null default now()
);
