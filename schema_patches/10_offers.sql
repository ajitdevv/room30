-- Patch 10 — offer banners & popups
-- ---------------------------------------------------------------------
-- Admin-managed marketing offers shown on public pages:
--   * kind='banner' renders as a slim top strip
--   * kind='popup'  renders as a modal once per session
--
-- Run this once in the Supabase SQL editor.

create table if not exists public.offers (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null default 'banner'
                    check (kind in ('banner','popup')),
  title           text not null,
  subtitle        text,
  discount_label  text,
  cta_label       text,
  cta_href        text default '/plans',
  variant         text not null default 'gradient'
                    check (variant in ('gradient','emerald','amber','indigo','rose','dark')),
  audience        text not null default 'all'
                    check (audience in ('all','guest','renter','owner')),
  is_active       boolean not null default true,
  dismissible     boolean not null default true,
  priority        int not null default 0,
  starts_at       timestamptz,
  ends_at         timestamptz,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists offers_active_idx
  on public.offers (is_active, kind, priority desc);

-- updated_at trigger
create or replace function public.offers_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists offers_touch on public.offers;
create trigger offers_touch
before update on public.offers
for each row execute procedure public.offers_touch_updated_at();

-- RLS
alter table public.offers enable row level security;

-- Public read: only active offers that are inside their active window.
drop policy if exists offers_public_read on public.offers;
create policy offers_public_read
on public.offers for select
using (
  is_active = true
  and (starts_at is null or starts_at <= now())
  and (ends_at   is null or ends_at   >= now())
);

-- Admin full access (service role key bypasses RLS; this is for clients
-- authed as admin JWTs, e.g. if an admin UI ever talks directly).
drop policy if exists offers_admin_all on public.offers;
create policy offers_admin_all
on public.offers for all
using (
  exists (select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin')
)
with check (
  exists (select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin')
);
