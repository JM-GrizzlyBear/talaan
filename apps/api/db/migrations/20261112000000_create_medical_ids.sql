-- migrate:up

-- One Medical ID per person: the account owner (profile_id null) or one of
-- their family profiles. The fields are checked by the shared rules.
create table medical_ids (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users (id) on delete cascade,
  profile_id uuid references family_profiles (id) on delete cascade,
  fields jsonb not null,
  -- The last time someone said it's still right (saving counts)
  checked_at timestamptz not null,
  -- The emergency QR: a page anyone can open with the code, showing the
  -- contacts and only the extras chosen
  emergency_on boolean not null default false,
  emergency_token varchar(64) unique,
  emergency_extras jsonb not null default '[]',
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references users (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique nulls not distinct (owner_id, profile_id)
);

-- migrate:down
drop table medical_ids;
