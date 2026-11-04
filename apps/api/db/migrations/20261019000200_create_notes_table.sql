-- migrate:up
-- The example feature: every note belongs to one user and goes away with them
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  title varchar(120) not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_updated_idx on notes (user_id, updated_at desc);

-- migrate:down
drop table notes;
