-- Patch: track per-listing view counts so the listings page can surface
-- "trending" (most-viewed) properties at the top.
-- Run once in Supabase SQL Editor.

-- -------------------------------------------------------------------------
-- 1. view_count column
-- -------------------------------------------------------------------------
alter table public.properties
  add column if not exists view_count integer not null default 0;

create index if not exists properties_view_count_idx
  on public.properties (view_count desc);

-- -------------------------------------------------------------------------
-- 2. atomic increment function — called from POST /api/properties/:id/view
-- -------------------------------------------------------------------------
create or replace function public.increment_property_views(pid uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.properties
     set view_count = coalesce(view_count, 0) + 1
   where id = pid
     and is_active = true
     and deleted_at is null;
$$;

-- Allow anon + authenticated callers to invoke the function so that
-- public property views count. The function itself still honours the
-- is_active / deleted_at filters above.
grant execute on function public.increment_property_views(uuid) to anon, authenticated;
