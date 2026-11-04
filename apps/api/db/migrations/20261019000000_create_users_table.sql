-- migrate:up
-- Usernames and emails are stored in lowercase, so "Maria" and "maria" can't both exist
create table users (
  id uuid primary key default gen_random_uuid(),
  username varchar(25) not null unique,
  email varchar(255) not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- migrate:down
drop table users;
