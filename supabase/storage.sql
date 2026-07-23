-- Storage bucket for shot previews (run after schema.sql)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shots',
  'shots',
  true,
  31457280, -- 30MB wedding JPEGs
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "shots_storage_select" on storage.objects;
drop policy if exists "shots_storage_insert" on storage.objects;
drop policy if exists "shots_storage_update" on storage.objects;
drop policy if exists "shots_storage_delete" on storage.objects;

create policy "shots_storage_select" on storage.objects
  for select using (bucket_id = 'shots');

create policy "shots_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'shots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "shots_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'shots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "shots_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'shots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
