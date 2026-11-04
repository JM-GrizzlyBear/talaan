-- migrate:up
-- One name becomes three: first, middle (optional) and last.
-- Existing names are split at the first space: "Juan dela Cruz" → "Juan" + "dela Cruz".
alter table users
  add column first_name varchar(50),
  add column middle_name varchar(50),
  add column last_name varchar(50);

update users
   set first_name = left(split_part(name, ' ', 1), 50),
       last_name = left(trim(substr(name, length(split_part(name, ' ', 1)) + 1)), 50);

alter table users
  alter column first_name set not null,
  alter column last_name set not null;

alter table users drop column name;

-- migrate:down
alter table users add column name varchar(80);
update users
   set name = left(concat_ws(' ', first_name, middle_name, nullif(last_name, '')), 80);
alter table users alter column name set not null;
alter table users
  drop column first_name,
  drop column middle_name,
  drop column last_name;
