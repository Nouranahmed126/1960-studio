-- Allow active team members to edit only the text and visit location of their own posts.
-- Keep all identity, media, and moderation columns outside the update grant.
grant update (body, location) on table public.plateau_posts to authenticated;

create policy "plateau_posts_update_own_content"
on public.plateau_posts
for update
to authenticated
using (
  (select auth.uid()) = user_id
  and ((select studio_is_member()) or (select is_supervisor()))
  and archived_at is null
)
with check (
  (select auth.uid()) = user_id
  and ((select studio_is_member()) or (select is_supervisor()))
  and archived_at is null
);

create policy "plateau_posts_remove_own"
on public.plateau_posts
for delete
to authenticated
using (
  (select auth.uid()) = user_id
  and ((select studio_is_member()) or (select is_supervisor()))
);
