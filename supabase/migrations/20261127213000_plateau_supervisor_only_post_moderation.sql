-- Management of timeline posts is reserved for supervisors.
-- Students no longer have row-level update/delete access through the owner policies.
drop policy if exists "plateau_posts_update_own_content" on public.plateau_posts;
drop policy if exists "plateau_posts_remove_own" on public.plateau_posts;
