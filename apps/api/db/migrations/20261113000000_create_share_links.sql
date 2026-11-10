-- migrate:up

-- A link for a doctor: opens chosen records, lab results and the Medical ID
-- of one person, without signing in, until it ends or is stopped
create table share_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users (id) on delete cascade,
  -- null: the account owner themself
  profile_id uuid references family_profiles (id) on delete cascade,
  token varchar(64) not null unique,
  recipient varchar(80) not null,
  note varchar(300) not null default '',
  include_medical_id boolean not null default false,
  include_labs boolean not null default false,
  record_ids uuid[] not null default '{}',
  expires_at timestamptz not null,
  -- How many browsers may open it (null: no limit)
  max_views integer,
  -- bcrypt; null: no PIN
  pin_hash varchar(100),
  pin_failures integer not null default 0,
  pin_wait_until timestamptz,
  -- The last "it was opened" alert (at most one every 30 minutes)
  alerted_at timestamptz,
  stopped_at timestamptz,
  stopped_by uuid references users (id) on delete set null,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index share_links_owner on share_links (owner_id, created_at desc);

-- Each browser that opened a link. The browser keeps a key in a cookie; only
-- its hash is kept here.
create table share_link_views (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references share_links (id) on delete cascade,
  key_hash varchar(64) not null unique,
  device varchar(80) not null default '',
  opened_at timestamptz not null
);
create index share_link_views_share on share_link_views (share_id, opened_at);

-- migrate:down
drop table share_link_views;
drop table share_links;
