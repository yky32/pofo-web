-- Private shots bucket + owner-only object policies
-- Run after schema.sql (and re-run to switch an existing public bucket to private).
--
-- Design:
--   • Bucket is private — no anonymous public object URLs
--   • Photographer uploads/reads with JWT under path owners/{uid}/...
--   • Client gallery delivery uses short-lived signed URLs from the app
--     (service role after share-token RPC), never permanent public links
--   • Same storage_key shape works when you later switch to R2

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shots',
  'shots',
  false, -- private
  104857600, -- 100MB (RAW + large JPEG)
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'image/x-adobe-dng',
    'image/x-canon-cr2',
    'image/x-canon-cr3',
    'image/x-nikon-nef',
    'image/x-sony-arw',
    'application/octet-stream'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "shots_storage_select" on storage.objects;
drop policy if exists "shots_storage_insert" on storage.objects;
drop policy if exists "shots_storage_update" on storage.objects;
drop policy if exists "shots_storage_delete" on storage.objects;

-- Owner folder: either owners/{uid}/… (current) or {uid}/… (legacy)
-- Service role bypasses RLS for signed URL minting after share-token checks.
create policy "shots_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'shots'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        (storage.foldername(name))[1] = 'owners'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

create policy "shots_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'shots'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        (storage.foldername(name))[1] = 'owners'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

create policy "shots_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'shots'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        (storage.foldername(name))[1] = 'owners'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );

create policy "shots_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'shots'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        (storage.foldername(name))[1] = 'owners'
        and (storage.foldername(name))[2] = auth.uid()::text
      )
    )
  );
