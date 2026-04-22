-- Patch: make signup respect the 'role' sent in user_metadata.
-- Run this once in Supabase SQL Editor after the initial schema.sql.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'renter')
  );
  return new;
end $$;
