-- Patch: renters leave star ratings + written reviews for owners they
-- chatted with or unlocked. One review per (reviewer, owner) pair so a
-- user can only rate a given owner once (they can edit their own row).
-- Run once in Supabase SQL Editor.

-- -------------------------------------------------------------------------
-- 1. owner_reviews table
-- -------------------------------------------------------------------------
create table if not exists public.owner_reviews (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, reviewer_id),
  check (owner_id <> reviewer_id)   -- no self-reviews
);

create index if not exists owner_reviews_owner_idx
  on public.owner_reviews(owner_id, created_at desc);
create index if not exists owner_reviews_reviewer_idx
  on public.owner_reviews(reviewer_id);

-- keep updated_at honest
create or replace function public.touch_owner_reviews_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists owner_reviews_touch on public.owner_reviews;
create trigger owner_reviews_touch
  before update on public.owner_reviews
  for each row execute procedure public.touch_owner_reviews_updated_at();

-- -------------------------------------------------------------------------
-- 2. RLS — anyone can read (public ratings), only the reviewer can write
-- -------------------------------------------------------------------------
alter table public.owner_reviews enable row level security;

drop policy if exists "reviews public read"  on public.owner_reviews;
drop policy if exists "reviewer inserts"     on public.owner_reviews;
drop policy if exists "reviewer updates own" on public.owner_reviews;
drop policy if exists "reviewer deletes own" on public.owner_reviews;

create policy "reviews public read"
  on public.owner_reviews for select
  using (true);

create policy "reviewer inserts"
  on public.owner_reviews for insert
  with check (auth.uid() = reviewer_id and auth.uid() <> owner_id);

create policy "reviewer updates own"
  on public.owner_reviews for update
  using (auth.uid() = reviewer_id);

create policy "reviewer deletes own"
  on public.owner_reviews for delete
  using (auth.uid() = reviewer_id);

-- -------------------------------------------------------------------------
-- 3. Aggregate helper — average rating + count for an owner
-- -------------------------------------------------------------------------
create or replace function public.owner_rating_summary(oid uuid)
returns table (avg_rating numeric, review_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(round(avg(rating)::numeric, 2), 0) as avg_rating,
    count(*)::int                                as review_count
  from public.owner_reviews
  where owner_id = oid;
$$;

grant execute on function public.owner_rating_summary(uuid) to anon, authenticated;
