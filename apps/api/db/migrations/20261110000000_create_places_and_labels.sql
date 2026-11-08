-- migrate:up
-- Where paper records and films are kept at home: a folder in a box in a
-- drawer (up to 3 levels; the app checks). Each place has one QR label.
create table places (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users (id) on delete cascade,
  -- The place it's inside. Removing a place first moves what's inside it
  -- up one level (the app does this), so nothing is lost.
  parent_id uuid references places (id) on delete restrict,
  kind varchar(20) not null check (
    kind in ('folder', 'envelope', 'box', 'drawer', 'cabinet', 'bag', 'other')
  ),
  name varchar(80) not null,
  note text not null default '',
  -- An optional photo of where it is (in Cloudinary, like record files)
  photo_key varchar(255) unique,
  photo_format varchar(10) check (photo_format in ('jpg', 'png', 'webp', 'heic')),
  photo_width integer,
  photo_height integer,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references users (id) on delete set null,
  updated_at timestamptz not null default now(),
  check (parent_id is null or parent_id <> id),
  check ((photo_key is null) = (photo_format is null))
);
create index places_owner_idx on places (owner_id);
create index places_parent_idx on places (parent_id);

-- QR labels. The code is printed on the label and in its QR code. A label
-- with no place is blank: printed ahead, named when it's first scanned. When
-- a place is removed its label becomes blank again, since it's still stuck
-- on the box.
create table labels (
  code char(8) primary key,
  owner_id uuid not null references users (id) on delete cascade,
  place_id uuid unique references places (id) on delete set null,
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index labels_blank_idx on labels (owner_id, created_at)
  where place_id is null;

-- Where a record is kept
alter table records
  add column place_id uuid references places (id) on delete set null;
create index records_place_idx on records (place_id) where place_id is not null;

-- migrate:down
alter table records drop column place_id;
drop table labels;
drop table places;
