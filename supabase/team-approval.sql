-- Apply in Supabase SQL Editor after reviewing existing schema.
-- Requires public.profiles, public.teams, public.team_join_requests and public.team_members.
-- Students cannot insert join requests directly; only through the validated RPC.
drop policy if exists "Students request teams" on public.team_join_requests;

create or replace function public.request_my_teams(p_team_ids bigint[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_count integer;
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;
  if p_team_ids is null or array_length(p_team_ids, 1) not between 2 and 3 then
    raise exception 'Choose two or three teams';
  end if;
  select count(distinct id) into v_count from unnest(p_team_ids) as t(id);
  if v_count <> array_length(p_team_ids, 1) then
    raise exception 'Duplicate teams are not allowed';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = v_user and app_role = 'student' and approval_status = 'pending'
  ) then
    raise exception 'Only pending students may request teams';
  end if;
  if (select count(*) from public.teams where id = any(p_team_ids)) <> v_count then
    raise exception 'Unknown team';
  end if;
  -- Replace only pending/rejected requests; approved requests are never modified here.
  if exists (
    select 1 from public.team_join_requests
    where user_id = v_user and status = 'approved'
  ) then
    raise exception 'Approved requests cannot be changed';
  end if;
  delete from public.team_join_requests where user_id = v_user;
  insert into public.team_join_requests (user_id,team_id,status)
  select v_user, id, 'pending' from unnest(p_team_ids) as t(id);
end;
$$;
revoke all on function public.request_my_teams(bigint[]) from public;
grant execute on function public.request_my_teams(bigint[]) to authenticated;

-- Supervisor approval is atomic and verifies 2-3 pending selections.
create or replace function public.approve_student(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_count integer;
begin
 if not public.is_supervisor() then raise exception 'Supervisor only'; end if;
 if not exists(select 1 from public.profiles where id=p_user_id and app_role='student' and approval_status='pending') then
  raise exception 'Student is not pending';
 end if;
 select count(*) into v_count from public.team_join_requests
 where user_id=p_user_id and status='pending';
 if v_count not between 2 and 3 then raise exception 'Student must request 2 or 3 teams'; end if;
 insert into public.team_members(team_id,user_id,role)
 select team_id,p_user_id,'member' from public.team_join_requests
 where user_id=p_user_id and status='pending'
 on conflict (team_id,user_id) do nothing;
 update public.team_join_requests set status='approved' where user_id=p_user_id and status='pending';
 update public.profiles set approval_status='approved' where id=p_user_id;
end;
$$;
revoke all on function public.approve_student(uuid) from public;
grant execute on function public.approve_student(uuid) to authenticated;
