-- Enable edits to existing certificates only for an approved supervisor.
-- No rows, files, public read permissions, or account data are modified.
create policy "Approved supervisors edit honors"
on public.studio_honors for update to authenticated
using ((select public.is_supervisor()))
with check ((select public.is_supervisor()));
