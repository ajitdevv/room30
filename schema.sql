-- =====================================================================
-- Room30 — Supabase schema (paste into SQL Editor and run)
-- Assumes Supabase Auth is enabled (auth.users exists).
-- =====================================================================

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";   -- fuzzy location search

-- ---------------------------------------------------------------------
-- 1. profiles  (extends auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text unique,
  role text not null default 'renter' check (role in ('renter','owner','admin')),
  first_chat_used boolean not null default false,
  created_at timestamptz not null default now()
);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name',''));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- 2. properties
-- ---------------------------------------------------------------------
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  rent integer not null check (rent >= 0),
  deposit integer not null default 0 check (deposit >= 0),
  city text not null,
  locality text not null,
  tenant_type text check (tenant_type in ('student','family','professional','any')),
  furnishing text check (furnishing in ('unfurnished','semi','full')),
  room_type text check (room_type in ('1rk','1bhk','2bhk','3bhk','pg','shared')),
  amenities text[] default '{}',
  available_from date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index properties_city_trgm   on public.properties using gin (city gin_trgm_ops);
create index properties_locality_trgm on public.properties using gin (locality gin_trgm_ops);
create index properties_rent_idx    on public.properties (rent);
create index properties_owner_idx   on public.properties (owner_id);

-- ---------------------------------------------------------------------
-- 3. property_images
-- ---------------------------------------------------------------------
create table public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index property_images_property_idx on public.property_images(property_id);

-- ---------------------------------------------------------------------
-- 4. messages  (1-to-1 chat)
-- ---------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  message text not null,
  created_at timestamptz not null default now()
);
create index messages_pair_idx on public.messages(sender_id, receiver_id, created_at);

-- ---------------------------------------------------------------------
-- 5. plans
-- ---------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price integer not null,                  -- in paise (₹49 = 4900)
  contacts_limit int,                       -- null = unlimited
  duration_days int not null,
  is_active boolean not null default true
);

insert into public.plans (name, price, contacts_limit, duration_days) values
  ('Basic',    4900,  3,   30),
  ('Standard', 9900,  10,  30),
  ('Pro',     19900,  null, 7)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- 6. subscriptions
-- ---------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.plans(id),
  contacts_remaining int,                  -- null = unlimited
  expires_at timestamptz not null,
  razorpay_payment_id text,
  created_at timestamptz not null default now()
);
create index subs_user_idx on public.subscriptions(user_id, expires_at desc);

-- ---------------------------------------------------------------------
-- 7. unlocked_contacts
-- ---------------------------------------------------------------------
create table public.unlocked_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id  uuid not null references public.profiles(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, owner_id)
);

-- ---------------------------------------------------------------------
-- 8. wishlist
-- ---------------------------------------------------------------------
create table public.wishlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, property_id)
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles          enable row level security;
alter table public.properties        enable row level security;
alter table public.property_images   enable row level security;
alter table public.messages          enable row level security;
alter table public.plans             enable row level security;
alter table public.subscriptions     enable row level security;
alter table public.unlocked_contacts enable row level security;
alter table public.wishlist          enable row level security;

-- profiles
create policy "profiles read own or public basic"
  on public.profiles for select using (true);
create policy "profiles update own"
  on public.profiles for update using (auth.uid() = id);

-- properties
create policy "properties public read"
  on public.properties for select using (is_active = true or owner_id = auth.uid());
create policy "owner insert property"
  on public.properties for insert with check (auth.uid() = owner_id);
create policy "owner update own property"
  on public.properties for update using (auth.uid() = owner_id);
create policy "owner delete own property"
  on public.properties for delete using (auth.uid() = owner_id);

-- property_images
create policy "images public read"
  on public.property_images for select using (true);
create policy "owner manage images"
  on public.property_images for all using (
    exists (select 1 from public.properties p
            where p.id = property_id and p.owner_id = auth.uid())
  );

-- messages
create policy "chat participants read"
  on public.messages for select using (auth.uid() in (sender_id, receiver_id));
create policy "send own messages"
  on public.messages for insert with check (auth.uid() = sender_id);

-- plans
create policy "plans public read"
  on public.plans for select using (is_active = true);

-- subscriptions
create policy "user reads own subscription"
  on public.subscriptions for select using (auth.uid() = user_id);
create policy "user inserts own subscription"
  on public.subscriptions for insert with check (auth.uid() = user_id);

-- unlocked_contacts
create policy "user reads own unlocks"
  on public.unlocked_contacts for select using (auth.uid() = user_id);
create policy "user inserts own unlocks"
  on public.unlocked_contacts for insert with check (auth.uid() = user_id);

-- wishlist
create policy "user manages own wishlist"
  on public.wishlist for all using (auth.uid() = user_id);
