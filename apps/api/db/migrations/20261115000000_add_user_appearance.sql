-- migrate:up

-- How the website looks for someone: colors, light or dark, text size.
-- Saved with the account so every phone and computer matches.
alter table users
  add column appearance jsonb not null default '{}';

-- migrate:down
alter table users drop column appearance;
