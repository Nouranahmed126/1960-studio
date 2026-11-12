-- Prevent forged uploader paths and mismatched contribution/team metadata.
create policy "attachment storage path matches author" on public.attachments
as restrictive for insert to authenticated with check (
 uploaded_by=(select auth.uid())
 and (
  storage_path is null or (
   split_part(storage_path,'/',3)=(select auth.uid())::text
   and split_part(storage_path,'/',1)=coalesce(team_id,(select c.team_id from public.contributions c where c.id=contribution_id))::text
   and public.can_access_studio_file(storage_path)
  )
 )
 and (
  contribution_id is null or exists (
   select 1 from public.contributions c
   where c.id=contribution_id and c.user_id=(select auth.uid())
     and (attachments.team_id is null or attachments.team_id=c.team_id)
  )
 )
);
