-- migrate:up
-- Logged-in sessions (connect-pg-simple's table). Deleting a row logs that browser out.
create table session (
  sid varchar not null primary key,
  sess json not null,
  expire timestamp(6) not null
);

create index session_expire_idx on session (expire);

-- migrate:down
drop table session;
