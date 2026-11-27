-- Public read-only access for the home highlights and Plateau Archive.
-- Anonymous visitors may read only the display fields, never owner/creator identifiers.

revoke all on table public.studio_props from anon;
grant select (id, title, description, category, image_path, created_at)
  on table public.studio_props to anon;

drop policy if exists "Public can view archive props" on public.studio_props;
create policy "Public can view archive props"
  on public.studio_props
  for select
  to anon
  using (true);

revoke all on table public.studio_honors from anon;
grant select (id, student_name, achievement, award, stars, note, created_at)
  on table public.studio_honors to anon;

drop policy if exists "Public can view honors" on public.studio_honors;
create policy "Public can view honors"
  on public.studio_honors
  for select
  to anon
  using (true);

-- The signup page already has an explicit visitor policy for team names.
-- Grant only the two columns that policy is intended to expose.
revoke all on table public.teams from anon;
grant select (id, name) on table public.teams to anon;
