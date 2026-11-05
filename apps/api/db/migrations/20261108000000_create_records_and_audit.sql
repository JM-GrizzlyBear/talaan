-- migrate:up
-- Health records. Each belongs to one account (owner_id): the owner's own, or
-- one of their family profiles (profile_id). The type-specific fields (lab
-- results, medicines, the X-ray reading, HMO amounts) live in "details".
create table records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users (id) on delete cascade,
  -- A profile with records can't be removed (the app says so first)
  profile_id uuid references family_profiles (id) on delete restrict,
  type varchar(20) not null check (
    type in ('imaging', 'lab', 'prescription', 'consultation', 'certificate',
             'vaccination', 'billing', 'other')
  ),
  title varchar(120) not null,
  record_date date not null,
  doctor varchar(120) not null default '',
  facility varchar(120) not null default '',
  notes text not null default '',
  details jsonb not null default '{}',
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references users (id) on delete set null,
  updated_at timestamptz not null default now(),
  -- In the Trash since deleted_at; deleted for good 30 days later
  deleted_at timestamptz,
  deleted_by uuid references users (id) on delete set null
);
create index records_owner_date_idx on records (owner_id, record_date desc)
  where deleted_at is null;
create index records_trash_idx on records (owner_id, deleted_at)
  where deleted_at is not null;
create index records_profile_id_idx on records (profile_id);

-- Who did what, and when: adding, editing (with the changed fields), the
-- Trash, deleting, and changes to who can see the records. Kept even after a
-- record is deleted for good. Rows are only ever added.
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  -- The order entries were written in (two can share the same time)
  seq bigint generated always as identity,
  -- The account whose records (or sharing) this is about
  owner_id uuid not null references users (id) on delete cascade,
  action varchar(40) not null,
  actor_id uuid references users (id) on delete set null,
  -- The actor's name at the time, so the history stays readable
  actor_name varchar(160),
  -- Not a foreign key: the history outlives the record
  record_id uuid,
  -- A record's title, a profile's name or an email, at the time
  subject varchar(255) not null,
  changes jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index audit_log_owner_idx on audit_log (owner_id, created_at desc, seq desc);
create index audit_log_record_idx on audit_log (record_id, created_at desc, seq desc)
  where record_id is not null;

-- Entries can't be changed afterwards, by the app or anyone else
create function audit_log_is_append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_log entries cannot be changed';
end;
$$;
create trigger audit_log_no_update
  before update on audit_log
  for each row execute function audit_log_is_append_only();

-- migrate:down
drop trigger audit_log_no_update on audit_log;
drop function audit_log_is_append_only();
drop table audit_log;
drop table records;
