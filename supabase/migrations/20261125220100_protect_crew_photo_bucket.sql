begin;

-- Apply after clients that render crew and artifact photos use signed URLs.
update storage.buckets
set public = false
where id = 'crew-photos' and public;

commit;
