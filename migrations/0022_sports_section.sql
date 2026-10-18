-- «رياضة» auto-news section.
alter table news_sections drop constraint if exists news_sections_id_check;
alter table news_sections add constraint news_sections_id_check check (id in ('news', 'israel', 'tech', 'weather', 'sports'));
alter table news_feeds drop constraint if exists news_feeds_section_check;
alter table news_feeds add constraint news_feeds_section_check check (section in ('news', 'israel', 'tech', 'sports'));
