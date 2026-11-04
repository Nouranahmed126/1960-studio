-- 1960 STUDIO: read-only setup verification.
-- Safe to run in Supabase SQL Editor. Does not create, change, or delete data.
select 'profiles' as component, to_regclass('public.profiles') is not null as ready
union all select 'teams', to_regclass('public.teams') is not null
union all select 'team_members', to_regclass('public.team_members') is not null
union all select 'team_join_requests', to_regclass('public.team_join_requests') is not null
union all select 'assignments', to_regclass('public.assignments') is not null
union all select 'assignment_teams', to_regclass('public.assignment_teams') is not null
union all select 'contributions', to_regclass('public.contributions') is not null
union all select 'attachments', to_regclass('public.attachments') is not null
union all select 'request_my_teams', to_regprocedure('public.request_my_teams(bigint[])') is not null
union all select 'approve_student', to_regprocedure('public.approve_student(uuid)') is not null
union all select 'studio-files private bucket',
  coalesce((select not public from storage.buckets where id='studio-files'),false)
order by component;

-- Expected: all ready = true. This does NOT prove RLS or uploads are secure;
-- test those separately with student/supervisor accounts before launch.
