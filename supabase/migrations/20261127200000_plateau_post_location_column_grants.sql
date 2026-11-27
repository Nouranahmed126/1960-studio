-- Allow approved members/supervisors to publish the optional visit location.
-- Keep INSERT column-scoped; do not grant table-wide INSERT.
grant insert (location) on table public.plateau_posts to authenticated;

-- The public timeline explicitly selects the location field for visible posts.
grant select (location) on table public.plateau_posts to anon;
