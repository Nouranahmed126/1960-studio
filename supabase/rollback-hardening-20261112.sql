-- Pre-hardening definitions and execution grants. Apply only for an intentional rollback.
CREATE OR REPLACE FUNCTION public.allow_student_signup(p_ip text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_count int;
begin
 insert into public.signup_attempts(ip_hash,attempts,window_start) values(md5(coalesce(p_ip,'')),1,now())
 on conflict(ip_hash) do update set attempts=case when public.signup_attempts.window_start<now()-interval '1 hour' then 1 else public.signup_attempts.attempts+1 end,window_start=case when public.signup_attempts.window_start<now()-interval '1 hour' then now() else public.signup_attempts.window_start end
 returning attempts into v_count;
 return v_count<=5;
end $function$
;
revoke execute on function public.allow_student_signup(text) from public, anon, authenticated, service_role;
grant execute on function public.allow_student_signup(text) to service_role;
CREATE OR REPLACE FUNCTION public.approve_student(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_count integer;
begin
 if auth.uid() is null or not public.is_supervisor() then raise exception 'Supervisor only'; end if;
 perform 1 from public.profiles where id=p_user_id and app_role='student' and approval_status='pending' for update;
 if not found then raise exception 'Student not pending'; end if;
 select count(distinct team_id) into v_count from public.team_join_requests where user_id=p_user_id and status='pending';
 if v_count not between 2 and 3 then raise exception 'Student must select two or three teams'; end if;
 insert into public.team_members(team_id,user_id,role)
 select team_id,p_user_id,'member' from public.team_join_requests where user_id=p_user_id and status='pending'
 on conflict do nothing;
 update public.team_join_requests set status='approved' where user_id=p_user_id and status='pending';
 update public.profiles set approval_status='approved' where id=p_user_id;
end;$function$
;
revoke execute on function public.approve_student(uuid) from public, anon, authenticated, service_role;
grant execute on function public.approve_student(uuid) to authenticated;
grant execute on function public.approve_student(uuid) to service_role;
CREATE OR REPLACE FUNCTION public.can_access_studio_file(p_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select public.is_supervisor() or
(case when split_part(p_name,'/',2)='direct' then
  exists(select 1 from public.team_members m join public.profiles p on p.id=m.user_id where m.user_id=auth.uid() and p.approval_status='approved' and m.team_id=case when split_part(p_name,'/',1)~'^[0-9]+$' then split_part(p_name,'/',1)::bigint else null end)
else exists(select 1 from public.assignment_teams at where at.team_id=case when split_part(p_name,'/',1)~'^[0-9]+$' then split_part(p_name,'/',1)::bigint else null end and at.assignment_id=case when split_part(p_name,'/',2)~'^[0-9]+$' then split_part(p_name,'/',2)::bigint else null end and public.is_my_team(at.team_id))
end)
$function$
;
revoke execute on function public.can_access_studio_file(text) from public, anon, authenticated, service_role;
grant execute on function public.can_access_studio_file(text) to anon;
grant execute on function public.can_access_studio_file(text) to authenticated;
grant execute on function public.can_access_studio_file(text) to service_role;
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_teams bigint[]; v_raw jsonb;
begin
 insert into public.profiles(id,full_name,approval_status,app_role)
 values(new.id,coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),'طالب جديد'),'pending','student');
 begin
  v_raw:=new.raw_user_meta_data->'requested_team_ids';
  if jsonb_typeof(v_raw)='array' then
   select array_agg(value::bigint) into v_teams from jsonb_array_elements_text(v_raw) x(value) where value ~ '^[0-9]{1,12}$';
   if cardinality(v_teams) between 2 and 3
    and cardinality(v_teams)=(select count(distinct x) from unnest(v_teams) x)
    and cardinality(v_teams)=(select count(*) from public.teams where id=any(v_teams)) then
     insert into public.team_join_requests(user_id,team_id,status)
     select new.id,x,'pending' from unnest(v_teams) x on conflict(user_id,team_id) do nothing;
   end if;
  end if;
 exception when others then
  raise warning 'Team selection could not be stored for newly registered user';
 end;
 return new;
end;$function$
;
revoke execute on function public.handle_new_user() from public, anon, authenticated, service_role;
grant execute on function public.handle_new_user() to anon;
grant execute on function public.handle_new_user() to authenticated;
grant execute on function public.handle_new_user() to service_role;
grant execute on function public.handle_new_user() to public;
CREATE OR REPLACE FUNCTION public.is_my_team(p_team_id bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.team_members tm
    join public.profiles p on p.id = tm.user_id
    where tm.user_id = (select auth.uid())
      and tm.team_id = p_team_id
      and p.approval_status = 'approved'
  );
$function$
;
revoke execute on function public.is_my_team(bigint) from public, anon, authenticated, service_role;
grant execute on function public.is_my_team(bigint) to anon;
grant execute on function public.is_my_team(bigint) to authenticated;
grant execute on function public.is_my_team(bigint) to service_role;
CREATE OR REPLACE FUNCTION public.is_supervisor()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and app_role = 'supervisor'
      and approval_status = 'approved'
  );
$function$
;
revoke execute on function public.is_supervisor() from public, anon, authenticated, service_role;
grant execute on function public.is_supervisor() to anon;
grant execute on function public.is_supervisor() to authenticated;
grant execute on function public.is_supervisor() to service_role;
CREATE OR REPLACE FUNCTION public.list_approved_crew()
 RETURNS TABLE(id uuid, full_name text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles p where p.id=auth.uid() and (p.app_role='supervisor' or p.approval_status='approved')) then raise exception 'Not authorized'; end if;
 return query select p.id,p.full_name,p.created_at from public.profiles p where p.app_role='student' and p.approval_status='approved' and not p.hidden_from_crew order by p.created_at,p.id;
end $function$
;
revoke execute on function public.list_approved_crew() from public, anon, authenticated, service_role;
grant execute on function public.list_approved_crew() to authenticated;
grant execute on function public.list_approved_crew() to service_role;
CREATE OR REPLACE FUNCTION public.my_discussion_flags()
 RETURNS TABLE(source_type text, source_id bigint, submission_title text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select n.source_type,n.source_id,case when n.source_type='file' then a.file_name when n.source_type='contribution' then c.title else 'تسليم كتابي' end
 from public.submission_feedback_notes n
 left join public.attachments a on n.source_type='file' and a.id=n.source_id
 left join public.contributions c on n.source_type='contribution' and c.id=n.source_id
 left join public.submissions s on n.source_type='submission' and s.id=n.source_id
 where auth.uid() is not null and n.needs_discussion=true and
 ((n.source_type='file' and a.uploaded_by=auth.uid()) or (n.source_type='contribution' and c.user_id=auth.uid()) or (n.source_type='submission' and s.submitted_by=auth.uid()))
 $function$
;
revoke execute on function public.my_discussion_flags() from public, anon, authenticated, service_role;
grant execute on function public.my_discussion_flags() to anon;
grant execute on function public.my_discussion_flags() to authenticated;
grant execute on function public.my_discussion_flags() to service_role;
CREATE OR REPLACE FUNCTION public.my_gold_star_awards()
 RETURNS TABLE(award_type text, award_id bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select 'assignment'::text, ar.assignment_id from public.assignment_reviews ar where ar.student_id=auth.uid() and ar.stars>0 union all select 'file'::text, fr.attachment_id from public.attachment_reviews fr join public.attachments a on a.id=fr.attachment_id where a.uploaded_by=auth.uid() and fr.stars>0 union all select 'contribution'::text, wr.source_id from public.written_submission_reviews wr join public.contributions c on wr.source_type='contribution' and c.id=wr.source_id where c.user_id=auth.uid() and wr.stars>0 union all select 'submission'::text, wr.source_id from public.written_submission_reviews wr join public.submissions s on wr.source_type='submission' and s.id=wr.source_id where s.submitted_by=auth.uid() and wr.stars>0 $function$
;
revoke execute on function public.my_gold_star_awards() from public, anon, authenticated, service_role;
grant execute on function public.my_gold_star_awards() to anon;
grant execute on function public.my_gold_star_awards() to authenticated;
grant execute on function public.my_gold_star_awards() to service_role;
CREATE OR REPLACE FUNCTION public.request_my_teams(p_team_ids bigint[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := auth.uid(); v_count integer;
begin
 if v_uid is null then raise exception 'Login required'; end if;
 if not exists(select 1 from public.profiles where id=v_uid and app_role='student' and approval_status='pending') then raise exception 'Only pending students may request teams'; end if;
 select count(distinct x) into v_count from unnest(p_team_ids) x;
 if v_count not between 2 and 3 or cardinality(p_team_ids)<>v_count then raise exception 'Choose two or three distinct teams'; end if;
 if (select count(*) from public.teams where id=any(p_team_ids))<>v_count then raise exception 'Invalid team'; end if;
 delete from public.team_join_requests where user_id=v_uid and status='pending';
 insert into public.team_join_requests(id,user_id,team_id,status)
 select nextval('public.team_join_requests_id_seq'),v_uid,x,'pending' from unnest(p_team_ids) x;
end;$function$
;
revoke execute on function public.request_my_teams(bigint[]) from public, anon, authenticated, service_role;
grant execute on function public.request_my_teams(bigint[]) to authenticated;
grant execute on function public.request_my_teams(bigint[]) to service_role;
CREATE OR REPLACE FUNCTION public.set_crew_visibility(p_user_id uuid, p_hidden boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if not public.is_supervisor() then raise exception 'Not authorized'; end if;
 if not exists(select 1 from public.profiles where id=p_user_id and app_role='student') then raise exception 'Student not found'; end if;
 update public.profiles set hidden_from_crew=p_hidden where id=p_user_id;
end $function$
;
revoke execute on function public.set_crew_visibility(uuid,boolean) from public, anon, authenticated, service_role;
grant execute on function public.set_crew_visibility(uuid,boolean) to authenticated;
grant execute on function public.set_crew_visibility(uuid,boolean) to service_role;
CREATE OR REPLACE FUNCTION public.student_assignment_scoreboard()
 RETURNS TABLE(assignment_id bigint, assignment_title text, student_id uuid, student_name text, due_at timestamp with time zone, received boolean, delivery_status text, has_star boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select a.id,a.title,p.id,p.full_name,a.due_at,coalesce(r.received,false),r.delivery_status,coalesce(v.stars,0)>0 from public.assignments a join public.assignment_publication pub on pub.assignment_id=a.id and pub.published=true join public.profiles p on p.app_role='student' and p.approval_status='approved' and (pub.team_id is null or exists(select 1 from public.team_members m where m.user_id=p.id and m.team_id=pub.team_id)) left join public.assignment_receipts r on r.assignment_id=a.id and r.student_id=p.id left join public.assignment_reviews v on v.assignment_id=a.id and v.student_id=p.id where auth.uid() is not null and a.archived_at is null $function$
;
revoke execute on function public.student_assignment_scoreboard() from public, anon, authenticated, service_role;
grant execute on function public.student_assignment_scoreboard() to anon;
grant execute on function public.student_assignment_scoreboard() to authenticated;
grant execute on function public.student_assignment_scoreboard() to service_role;
CREATE OR REPLACE FUNCTION public.studio_can_access_team(p_team_id bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select exists(select 1 from public.profiles p where p.id=auth.uid() and p.app_role='supervisor') or exists(select 1 from public.team_members m join public.profiles p on p.id=m.user_id where m.user_id=auth.uid() and m.team_id=p_team_id and p.approval_status='approved') $function$
;
revoke execute on function public.studio_can_access_team(bigint) from public, anon, authenticated, service_role;
grant execute on function public.studio_can_access_team(bigint) to authenticated;
grant execute on function public.studio_can_access_team(bigint) to service_role;
CREATE OR REPLACE FUNCTION public.studio_is_member()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select exists(select 1 from public.profiles where id=auth.uid() and (app_role='supervisor' or approval_status='approved')) $function$
;
revoke execute on function public.studio_is_member() from public, anon, authenticated, service_role;
grant execute on function public.studio_is_member() to authenticated;
grant execute on function public.studio_is_member() to service_role;
CREATE OR REPLACE FUNCTION public.studio_is_supervisor()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$ select exists(select 1 from public.profiles where id=auth.uid() and app_role='supervisor') $function$
;
revoke execute on function public.studio_is_supervisor() from public, anon, authenticated, service_role;
grant execute on function public.studio_is_supervisor() to authenticated;
grant execute on function public.studio_is_supervisor() to service_role;
CREATE OR REPLACE FUNCTION public.studio_notify_supervisors()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ declare kind text; caption text; detail text; target text; begin if TG_TABLE_NAME='profiles' then if NEW.approval_status<>'pending' then return NEW;end if;kind:='signup';caption:='طلب انضمام جديد';detail:=NEW.full_name;target:='/dashboard';elsif TG_TABLE_NAME='studio_props' then kind:='prop';caption:='مقتنى جديد';detail:=NEW.title;target:='/props';else return NEW;end if;insert into public.studio_notifications(recipient_id,kind,title,detail,target_url) select id,kind,caption,detail,target from public.profiles where app_role='supervisor' and approval_status='approved';return NEW;end $function$
;
revoke execute on function public.studio_notify_supervisors() from public, anon, authenticated, service_role;
grant execute on function public.studio_notify_supervisors() to anon;
grant execute on function public.studio_notify_supervisors() to authenticated;
grant execute on function public.studio_notify_supervisors() to service_role;
grant execute on function public.studio_notify_supervisors() to public;
CREATE OR REPLACE FUNCTION public.update_assignment_admin(p_id bigint, p_title text, p_archive boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ begin
 if not public.is_supervisor() then raise exception 'Not authorized'; end if;
 if length(trim(p_title))<3 or length(p_title)>200 then raise exception 'Invalid title'; end if;
 update public.assignments set title=trim(p_title),archived_at=case when p_archive then coalesce(archived_at,now()) else null end where id=p_id;
 if not found then raise exception 'Assignment not found'; end if;
end $function$
;
revoke execute on function public.update_assignment_admin(bigint,text,boolean) from public, anon, authenticated, service_role;
grant execute on function public.update_assignment_admin(bigint,text,boolean) to authenticated;
grant execute on function public.update_assignment_admin(bigint,text,boolean) to service_role;
alter table public.signup_attempts disable row level security;
drop policy if exists "submission team must belong to author" on public.work_submissions;
drop policy if exists "uploaders clean orphaned studio files" on storage.objects;


drop policy if exists "attachment storage path matches author" on public.attachments;
