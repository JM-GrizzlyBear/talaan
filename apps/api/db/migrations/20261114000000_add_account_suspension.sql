-- migrate:up

-- Deleting an account first suspends it: nobody sees its records, and signing
-- in brings it back. A year later it's deleted for good.
alter table users
  add column suspended_at timestamptz,
  add column delete_after timestamptz,
  -- The "still suspended" email at 6 months, and the one a week before
  add column deletion_reminded_at timestamptz,
  add column deletion_warned_at timestamptz,
  add constraint users_suspension_check
    check ((suspended_at is null) = (delete_after is null));

create index users_delete_after on users (delete_after)
  where delete_after is not null;

-- History entries still can't be changed, with one exception: when the person
-- who did something deletes their account, the link to them is cleared (their
-- name stays on the entry, so the history still reads right)
create or replace function audit_log_is_append_only() returns trigger
language plpgsql as $$
begin
  if old.actor_id is not null and new.actor_id is null
     and (to_jsonb(new) - 'actor_id') = (to_jsonb(old) - 'actor_id') then
    return new;
  end if;
  raise exception 'audit_log entries cannot be changed';
end;
$$;

-- migrate:down
create or replace function audit_log_is_append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_log entries cannot be changed';
end;
$$;
drop index users_delete_after;
alter table users
  drop constraint users_suspension_check,
  drop column deletion_warned_at,
  drop column deletion_reminded_at,
  drop column delete_after,
  drop column suspended_at;
