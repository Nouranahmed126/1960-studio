-- Tighten RPC access without removing authenticated helpers used by RLS.
revoke execute on function public.can_access_studio_file(text) from public, anon;
grant execute on function public.can_access_studio_file(text) to authenticated, service_role;
revoke execute on function public.is_my_team(bigint) from public, anon;
grant execute on function public.is_my_team(bigint) to authenticated, service_role;
revoke execute on function public.is_supervisor() from public, anon;
grant execute on function public.is_supervisor() to authenticated, service_role;
revoke execute on function public.my_discussion_flags() from public, anon;
grant execute on function public.my_discussion_flags() to authenticated, service_role;
revoke execute on function public.my_gold_star_awards() from public, anon;
grant execute on function public.my_gold_star_awards() to authenticated, service_role;
revoke execute on function public.student_assignment_scoreboard() from public, anon;
grant execute on function public.student_assignment_scoreboard() to authenticated, service_role;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.studio_notify_supervisors() from public, anon, authenticated;
alter table public.signup_attempts enable row level security;
create or replace function public.studio_is_supervisor() returns boolean language sql stable security definer set search_path = '' as $$ select public.is_supervisor() $$;

create or replace function public.studio_is_member() returns boolean language sql stable security definer set search_path = '' as $$ select exists(select 1 from public.profiles where id=auth.uid() and approval_status='approved') $$;

create or replace function public.studio_can_access_team(p_team_id bigint) returns boolean language sql stable security definer set search_path = '' as $$ select public.is_supervisor() or public.is_my_team(p_team_id) $$;
CREATE OR REPLACE FUNCTION public.list_approved_crew()
 RETURNS TABLE(id uuid, full_name text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles p where p.id=auth.uid() and p.approval_status='approved') then raise exception 'Not authorized'; end if;
 return query select p.id,p.full_name,p.created_at from public.profiles p where p.app_role='student' and p.approval_status='approved' and not p.hidden_from_crew order by p.created_at,p.id;
end $function$
;
CREATE OR REPLACE FUNCTION public.student_assignment_scoreboard()
 RETURNS TABLE(assignment_id bigint, assignment_title text, student_id uuid, student_name text, due_at timestamp with time zone, received boolean, delivery_status text, has_star boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select a.id,a.title,p.id,p.full_name,a.due_at,coalesce(r.received,false),r.delivery_status,coalesce(v.stars,0)>0 from public.assignments a join public.assignment_publication pub on pub.assignment_id=a.id and pub.published=true join public.profiles p on p.app_role='student' and p.approval_status='approved' and (pub.team_id is null or exists(select 1 from public.team_members m where m.user_id=p.id and m.team_id=pub.team_id)) left join public.assignment_receipts r on r.assignment_id=a.id and r.student_id=p.id left join public.assignment_reviews v on v.assignment_id=a.id and v.student_id=p.id where exists(select 1 from public.profiles viewer where viewer.id=auth.uid() and viewer.approval_status='approved') and a.archived_at is null $function$
;
alter function public.studio_notify_supervisors() set search_path = '';
alter function public.my_discussion_flags() set search_path = '';
alter function public.my_gold_star_awards() set search_path = '';
alter function public.student_assignment_scoreboard() set search_path = '';
-- Restrictive policy composes with the existing approved-owner policies.
create policy "submission team must belong to author" on public.work_submissions as restrictive for all to authenticated using (true) with check (team_id is null or public.is_my_team(team_id) or public.is_supervisor());

-- Only remove the uploader's unreferenced objects; saved submissions stay protected.
create policy "uploaders clean orphaned studio files" on storage.objects for delete to authenticated using (
 bucket_id='studio-files' and split_part(name,'/',3)=(select auth.uid())::text
 and public.can_access_studio_file(name)
 and not exists(select 1 from public.attachments a where a.storage_path=objects.name)
);
