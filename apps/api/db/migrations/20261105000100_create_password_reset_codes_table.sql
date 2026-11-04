-- migrate:up
-- "Forgot password" codes: one per account at a time. Only a keyed hash of the
-- 6 digits is stored, and a code stops working after 15 minutes or 5 wrong tries.
create table password_reset_codes (
  user_id uuid primary key references users (id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  tries smallint not null default 0,
  created_at timestamptz not null default now()
);

-- migrate:down
drop table password_reset_codes;
