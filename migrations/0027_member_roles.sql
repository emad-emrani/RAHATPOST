-- Admin-defined member roles with permission sets (member, verified, writer, moderator, admin + custom).
create table if not exists member_roles (
  key text primary key,
  sort integer not null default 0,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table admin_roles drop constraint if exists admin_roles_role_check;
alter table admin_invites drop constraint if exists admin_invites_role_check;
