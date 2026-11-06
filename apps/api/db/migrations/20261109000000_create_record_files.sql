-- migrate:up
-- Photos and PDFs attached to records. The file itself is in Cloudinary (or a
-- local folder while developing); this keeps where it is and what it is.
create table record_files (
  id uuid primary key default gen_random_uuid(),
  -- Deleting a record for good removes these rows (the app removes the files too)
  record_id uuid not null references records (id) on delete cascade,
  owner_id uuid not null references users (id) on delete cascade,
  -- Cloudinary's public_id (or the local file's key)
  storage_key varchar(255) not null unique,
  format varchar(10) not null check (format in ('jpg', 'png', 'webp', 'heic', 'pdf')),
  bytes integer not null check (bytes > 0),
  width integer,
  height integer,
  pages integer,
  -- The name it had on the person's phone or computer
  original_name varchar(255) not null,
  uploaded_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index record_files_record_id_idx on record_files (record_id, created_at);

-- migrate:down
drop table record_files;
