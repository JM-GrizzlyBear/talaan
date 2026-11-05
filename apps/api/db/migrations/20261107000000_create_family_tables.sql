-- migrate:up
-- Family without their own email or phone (a young child, a lolo), kept under
-- the account of whoever looks after them
create table family_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users (id) on delete cascade,
  first_name varchar(50) not null,
  middle_name varchar(50),
  last_name varchar(50) not null,
  relationship varchar(30) not null,
  birth_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index family_profiles_owner_id_idx on family_profiles (owner_id);

-- An invitation to see someone's records, sent by email. The link carries a
-- random token; only its SHA-256 is kept.
create table family_invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references users (id) on delete cascade,
  email varchar(255) not null,
  relationship varchar(30) not null,
  access varchar(10) not null check (access in ('view', 'manage')),
  token_hash char(64) not null unique,
  status varchar(10) not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  invitee_id uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz not null default now(),
  expires_at timestamptz not null,
  responded_at timestamptz
);
create index family_invitations_inviter_id_idx on family_invitations (inviter_id);
-- One waiting invitation per person invited: inviting again sends a fresh link
create unique index family_invitations_one_pending_idx
  on family_invitations (inviter_id, email) where status = 'pending';

-- Who can see whose records. One way: owner → member.
create table family_access (
  owner_id uuid not null references users (id) on delete cascade,
  member_id uuid not null references users (id) on delete cascade,
  -- Who the member is to the owner
  relationship varchar(30) not null,
  access varchar(10) not null check (access in ('view', 'manage')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, member_id),
  check (owner_id <> member_id)
);
create index family_access_member_id_idx on family_access (member_id);

-- migrate:down
drop table family_access;
drop table family_invitations;
drop table family_profiles;
