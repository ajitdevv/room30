-- Patch: add owner phone to properties, and default city to Jaipur.
-- Run once in Supabase SQL Editor.

alter table public.properties
  add column if not exists owner_phone text;

-- Default city column value for new rows
alter table public.properties
  alter column city set default 'Jaipur';

-- Optional: backfill existing rows that somehow have empty city.
update public.properties set city = 'Jaipur' where coalesce(trim(city), '') = '';
