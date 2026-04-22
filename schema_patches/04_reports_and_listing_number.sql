-- Patch: add a reports table and a per-listing numeric ID (00001, 00002, …).
-- Run once in Supabase SQL Editor.

-- -------------------------------------------------------------------------
-- 1. listing_number on properties
-- -------------------------------------------------------------------------
create sequence if not exists public.listing_number_seq start 1;

alter table public.properties
  add column if not exists listing_number bigint default nextval('public.listing_number_seq');

-- Backfill any existing rows.
update public.properties
set listing_number = nextval('public.listing_number_seq')
where listing_number is null;

alter table public.properties
  alter column listing_number set not null;

create unique index if not exists properties_listing_number_idx
  on public.properties(listing_number);

-- -------------------------------------------------------------------------
-- 2. reports table
-- -------------------------------------------------------------------------
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  reason text not null check (reason in (
    'fake_listing', 'wrong_info', 'already_rented',
    'spam', 'abusive', 'scam', 'other'
  )),
  description text check (char_length(description) <= 1000),
  status text not null default 'open'
    check (status in ('open','reviewed','resolved','dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists reports_property_idx on public.reports(property_id);
create index if not exists reports_status_idx   on public.reports(status);
create index if not exists reports_reporter_idx on public.reports(reporter_id);

alter table public.reports enable row level security;

drop policy if exists "user creates own reports" on public.reports;
drop policy if exists "user reads own reports"   on public.reports;

create policy "user creates own reports"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "user reads own reports"
  on public.reports for select
  using (auth.uid() = reporter_id);
