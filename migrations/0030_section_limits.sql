-- Per auto-section limits: max items kept and max item age (days, 0 = no limit). null = built-in default.
alter table news_sections add column if not exists max_items integer;
alter table news_sections add column if not exists max_age_days integer not null default 0;
