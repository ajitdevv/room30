-- Patch: soft-delete for properties with 90-day retention window.
-- deleted_at=null means live. Setting a value hides the listing publicly
-- but keeps it visible on the owner dashboard as "recently deleted".
-- A scheduled job (or manual cleanup) hard-deletes rows older than 90 days.

alter table public.properties
  add column if not exists deleted_at timestamptz;

create index if not exists properties_deleted_at_idx
  on public.properties(deleted_at)
  where deleted_at is not null;

-- Optional helper: convenience view for live listings.
create or replace view public.properties_live as
  select * from public.properties
  where deleted_at is null and is_active = true;
