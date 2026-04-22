-- Patch: create a public bucket for property photos + RLS policies.
-- Run once in Supabase SQL Editor.

-- 1. Create the bucket (public read, 5 MB per file, images only).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-images',
  'property-images',
  true,
  5242880,                                           -- 5 MB
  array['image/png','image/jpeg','image/webp','image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. Policies on storage.objects for this bucket.
-- Folder convention: <auth.uid()>/<filename>

drop policy if exists "property-images public read"       on storage.objects;
drop policy if exists "property-images owner insert"      on storage.objects;
drop policy if exists "property-images owner update"      on storage.objects;
drop policy if exists "property-images owner delete"      on storage.objects;

create policy "property-images public read"
  on storage.objects for select
  using (bucket_id = 'property-images');

create policy "property-images owner insert"
  on storage.objects for insert
  with check (
    bucket_id = 'property-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "property-images owner update"
  on storage.objects for update
  using (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "property-images owner delete"
  on storage.objects for delete
  using (
    bucket_id = 'property-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
