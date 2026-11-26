-- Restrict the student scoreboard to the signed-in student's own rows.
-- Approved supervisors retain the complete scoreboard for review.
-- Existing assignment, receipt, and review records are not modified.
create or replace function public.student_assignment_scoreboard()
returns table(
  assignment_id bigint,
  assignment_title text,
  student_id uuid,
  student_name text,
  due_at timestamptz,
  received boolean,
  delivery_status text,
  has_star boolean
)
language sql
stable
security definer
set search_path to ''
as $function$
  select
    a.id,
    a.title,
    p.id,
    p.full_name,
    a.due_at,
    coalesce(r.received, false),
    r.delivery_status,
    coalesce(v.stars, 0) > 0
  from public.assignments a
  join public.assignment_publication pub
    on pub.assignment_id = a.id
   and pub.published = true
  join public.profiles p
    on p.app_role = 'student'
   and p.approval_status = 'approved'
   and (
     pub.team_id is null
     or exists (
       select 1
       from public.team_members m
       where m.user_id = p.id
         and m.team_id = pub.team_id
     )
   )
  left join public.assignment_receipts r
    on r.assignment_id = a.id
   and r.student_id = p.id
  left join public.assignment_reviews v
    on v.assignment_id = a.id
   and v.student_id = p.id
  where exists (
    select 1
    from public.profiles viewer
    where viewer.id = auth.uid()
      and viewer.approval_status = 'approved'
  )
    and a.archived_at is null
    and (
      exists (
        select 1
        from public.profiles viewer
        where viewer.id = auth.uid()
          and viewer.app_role = 'supervisor'
          and viewer.approval_status = 'approved'
      )
      or p.id = auth.uid()
    );
$function$;
