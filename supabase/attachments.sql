-- Run in Supabase SQL Editor after team-approval.sql and the base schema.
-- Private files, maximum 50 MB each. Do not make this bucket public.
insert into storage.buckets (id,name,public,file_size_limit)
values ('studio-files','studio-files',false,52428800)
on conflict(id) do update set public=false,file_size_limit=52428800;

create table if not exists public.attachments (
 id bigint generated always as identity primary key,
 contribution_id bigint not null references public.contributions(id) on delete cascade,
 assignment_id bigint not null,
 team_id bigint not null,
 uploaded_by uuid not null references public.profiles(id),
 storage_path text not null unique,
 original_filename text not null,
 mime_type text,
 size_bytes bigint not null check(size_bytes between 1 and 52428800),
 created_at timestamptz not null default now()
);
create index if not exists attachments_team_idx on public.attachments(team_id,assignment_id);
alter table public.attachments enable row level security;

-- Validate that contribution and attachment share the same assignment/team/author.
create or replace function public.validate_studio_attachment()
returns trigger language plpgsql security definer set search_path=''
as $$
declare c record;
begin
 select assignment_id,team_id,user_id into c
 from public.contributions where id=new.contribution_id;
 if not found or c.assignment_id<>new.assignment_id
    or c.team_id<>new.team_id or c.user_id<>new.uploaded_by then
  raise exception 'Attachment does not match contribution';
 end if;
 if new.storage_path !~ ('^' || new.team_id || '/' || new.assignment_id || '/' || new.uploaded_by || '/[a-zA-Z0-9_-]+$') then
  raise exception 'Invalid attachment storage path';
 end if;
 return new;
end $$;
drop trigger if exists studio_attachment_validate on public.attachments;
create trigger studio_attachment_validate before insert or update on public.attachments
for each row execute function public.validate_studio_attachment();

drop policy if exists "Team members read attachments" on public.attachments;
create policy "Team members read attachments" on public.attachments
for select to authenticated using (public.is_my_team(team_id) or public.is_supervisor());
drop policy if exists "Students add own attachments" on public.attachments;
create policy "Students add own attachments" on public.attachments
for insert to authenticated with check (
 uploaded_by=(select auth.uid()) and public.is_my_team(team_id)
);
drop policy if exists "Supervisor manages attachments" on public.attachments;
create policy "Supervisor manages attachments" on public.attachments
for all to authenticated using(public.is_supervisor()) with check(public.is_supervisor());

-- Every stored object must use team_id/assignment_id/user_uuid/random-id.
-- Storage object read requires an attachment record; uploads require team membership.
drop policy if exists "Studio team file uploads" on storage.objects;
create policy "Studio team file uploads" on storage.objects
for insert to authenticated with check (
 bucket_id='studio-files'
 and (storage.foldername(name))[1] ~ '^[0-9]+$'
 and (storage.foldername(name))[2] ~ '^[0-9]+$'
 and (storage.foldername(name))[3]=(select auth.uid())::text
 and array_length(storage.foldername(name),1)=3
 and public.is_my_team(((storage.foldername(name))[1])::bigint)
 and exists(
  select 1 from public.assignment_teams at
  where at.team_id=((storage.foldername(name))[1])::bigint
    and at.assignment_id=((storage.foldername(name))[2])::bigint
 )
);
drop policy if exists "Studio authorized file reads" on storage.objects;
create policy "Studio authorized file reads" on storage.objects
for select to authenticated using (
 bucket_id='studio-files'
 and exists(
  select 1 from public.attachments a
  where a.storage_path=name
    and (public.is_my_team(a.team_id) or public.is_supervisor())
 )
);
-- No student update/delete policies: uploaded objects are immutable.
