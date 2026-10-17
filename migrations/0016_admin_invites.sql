-- Pending team invites (owner adds by email); applied when that verified email signs in.
create table if not exists admin_invites (
  email text primary key check (email = lower(email)),
  role text not null check (role in ('moderator', 'writer')),
  invited_by text,
  created_at timestamptz not null default now()
);
