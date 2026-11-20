-- Start the Plateau launch with a clean timeline while retaining the imported
-- posts and their interactions. The original gallery remains accessible.
alter table public.plateau_posts add column archived_at timestamptz;
update public.plateau_posts set archived_at = now() where legacy_gallery_id is not null;

create policy plateau_posts_hide_archived on public.plateau_posts
as restrictive for select to authenticated
using (archived_at is null);
