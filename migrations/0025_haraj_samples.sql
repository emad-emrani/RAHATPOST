-- Example listings for the haraj preview. Stored with status 'hidden' + is_sample so the
-- old production code (status = 'approved' only) never shows them; the new code shows them with a «مثال» badge.
alter table classifieds add column if not exists is_sample boolean not null default false;
create table if not exists haraj_flags (key text primary key, set_at timestamptz not null default now());
