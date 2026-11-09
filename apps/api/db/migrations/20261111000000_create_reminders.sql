-- migrate:up

-- Reminders: checkups, lab tests, medicine, refills… Each belongs to an
-- account (owner_id) and is for the owner or one of their family profiles.
create table reminders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users (id) on delete cascade,
  profile_id uuid references family_profiles (id) on delete cascade,
  record_id uuid references records (id) on delete set null,
  kind varchar(20) not null
    check (kind in ('checkup', 'lab', 'medicine', 'refill', 'vaccination', 'hmo', 'other')),
  title varchar(120) not null,
  dose varchar(120) not null default '',
  note text not null default '',
  -- When it happens (checked by the shared schedule rules)
  schedule jsonb not null,
  -- Minutes before each time, like [0, 30, 1440]
  alerts jsonb not null default '[0]',
  paused boolean not null default false,
  -- Alerts up to here were handled; the next one due (null: none left)
  alerts_checked_until timestamptz not null,
  next_alert_at timestamptz,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create index reminders_owner_id_idx on reminders (owner_id);
create index reminders_record_id_idx on reminders (record_id);
-- The sender asks "which alerts are due?" every minute
create index reminders_next_alert_at_idx on reminders (next_alert_at)
  where not paused and next_alert_at is not null;

-- What was done about one time of a reminder
create table reminder_occurrences (
  reminder_id uuid not null references reminders (id) on delete cascade,
  occurs_at timestamptz not null,
  state varchar(10) not null check (state in ('done', 'skipped', 'snoozed')),
  snoozed_until timestamptz,
  by_user uuid references users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (reminder_id, occurs_at),
  check ((state = 'snoozed') = (snoozed_until is not null))
);

-- Each alert is sent once per person and way, even after a restart: a row is
-- claimed here before sending
create table reminder_deliveries (
  reminder_id uuid not null references reminders (id) on delete cascade,
  occurs_at timestamptz not null,
  -- When the alert was due (the time minus the alert, or the snooze)
  alert_at timestamptz not null,
  user_id uuid not null references users (id) on delete cascade,
  channel varchar(10) not null check (channel in ('email', 'push')),
  sent_at timestamptz not null default now(),
  primary key (reminder_id, alert_at, user_id, channel)
);
create index reminder_deliveries_sent_at_idx on reminder_deliveries (sent_at);

-- People who turned off their own alerts for one reminder
create table reminder_mutes (
  reminder_id uuid not null references reminders (id) on delete cascade,
  user_id uuid not null references users (id) on delete cascade,
  primary key (reminder_id, user_id)
);

-- Each person's alerts for all reminders
alter table users
  add column alert_email boolean not null default true,
  add column alert_push boolean not null default true;

-- Browsers that agreed to show notifications
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  endpoint varchar(1000) not null unique,
  p256dh varchar(200) not null,
  auth varchar(100) not null,
  label varchar(80) not null default '',
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_id_idx on push_subscriptions (user_id);

-- migrate:down
drop table push_subscriptions;
alter table users drop column alert_email, drop column alert_push;
drop table reminder_mutes;
drop table reminder_deliveries;
drop table reminder_occurrences;
drop table reminders;
