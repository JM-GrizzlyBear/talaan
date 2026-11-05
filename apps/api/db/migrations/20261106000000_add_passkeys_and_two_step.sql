-- migrate:up
-- Passkeys: sign in with Face ID, Touch ID, a fingerprint or Windows Hello.
-- Only the public key is kept; the private key never leaves the person's device.
create table passkeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  credential_id text not null unique,
  public_key bytea not null,
  counter bigint not null default 0,
  transports text[] not null default '{}',
  device_type varchar(20) not null,
  backed_up boolean not null default false,
  name varchar(60) not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index passkeys_user_id_idx on passkeys (user_id);

-- Two-step sign-in: on for every account, unless the person turns it off
alter table users add column two_step_enabled boolean not null default true;

-- The 6-digit sign-in codes (same columns and rules as password_reset_codes)
create table sign_in_codes (
  user_id uuid primary key references users (id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  tries smallint not null default 0,
  created_at timestamptz not null default now()
);

-- Browsers that passed two-step sign-in and were remembered for 30 days.
-- The browser keeps a random token in a cookie; only its hash is stored here.
create table trusted_browsers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  token_hash text not null,
  label varchar(80) not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_used_at timestamptz not null default now()
);
create index trusted_browsers_user_id_idx on trusted_browsers (user_id);

-- migrate:down
drop table trusted_browsers;
drop table sign_in_codes;
alter table users drop column two_step_enabled;
drop table passkeys;
