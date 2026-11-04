-- migrate:up
-- Talaan signs people in with their email, and greets them by name.
-- Usernames go; every account also records when it agreed to the privacy terms
-- and how long the website waits before it locks.
alter table users add column name varchar(80);
update users set name = username;
alter table users alter column name set not null;
alter table users drop column username;

alter table users add column privacy_consent_at timestamptz;
update users set privacy_consent_at = created_at;
alter table users alter column privacy_consent_at set not null;

alter table users
  add column lock_after_minutes smallint not null default 15
  constraint users_lock_after_minutes_check check (lock_after_minutes in (5, 15, 30, 60));

alter table users add column password_changed_at timestamptz;

-- migrate:down
alter table users drop column password_changed_at;
alter table users drop column lock_after_minutes;
alter table users drop column privacy_consent_at;
alter table users add column username varchar(25);
update users set username = left(regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9_]', '_', 'g'), 25);
alter table users alter column username set not null;
alter table users add constraint users_username_key unique (username);
alter table users drop column name;
