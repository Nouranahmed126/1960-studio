begin;

-- Allow signed URLs for authorized members before switching the photo bucket.
create policy "Approved members read crew and artifact photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'crew-photos'
  and ((select public.studio_is_member()) or (select public.is_supervisor()))
);

alter policy "Members listen to studio recordings"
on storage.objects to authenticated
using (
  bucket_id = 'studio-recordings'
  and ((select public.studio_is_member()) or (select public.is_supervisor()))
);

alter policy "Studio members read recordings"
on public.studio_recordings to authenticated
using ((select public.studio_is_member()) or (select public.is_supervisor()));

commit;
