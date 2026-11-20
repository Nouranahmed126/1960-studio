create table public.gallery_likes (
  post_id bigint not null references public.project_gallery(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  primary key (post_id, user_id)
);

create table public.gallery_comments (
  id uuid primary key default gen_random_uuid(),
  post_id bigint not null references public.project_gallery(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  author_name text not null,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index gallery_likes_user_idx on public.gallery_likes (user_id);
create index gallery_comments_post_idx on public.gallery_comments (post_id, created_at desc, id);
create index gallery_comments_user_idx on public.gallery_comments (user_id);

alter table public.gallery_likes enable row level security;
alter table public.gallery_comments enable row level security;
revoke all on public.gallery_likes, public.gallery_comments from public, anon, authenticated;
grant select, delete on public.gallery_likes, public.gallery_comments to authenticated;
grant insert (post_id) on public.gallery_likes to authenticated;
grant insert (post_id, body) on public.gallery_comments to authenticated;

create policy gallery_likes_read on public.gallery_likes for select to authenticated
using (exists (select 1 from public.project_gallery p where p.id = post_id));
create policy gallery_likes_add on public.gallery_likes for insert to authenticated
with check (user_id = (select auth.uid()) and exists (select 1 from public.project_gallery p where p.id = post_id));
create policy gallery_likes_remove on public.gallery_likes for delete to authenticated
using (user_id = (select auth.uid()) and exists (select 1 from public.project_gallery p where p.id = post_id));

create policy gallery_comments_read on public.gallery_comments for select to authenticated
using (exists (select 1 from public.project_gallery p where p.id = post_id));
create policy gallery_comments_add on public.gallery_comments for insert to authenticated
with check (user_id = (select auth.uid()) and exists (select 1 from public.project_gallery p where p.id = post_id));
create policy gallery_comments_remove on public.gallery_comments for delete to authenticated
using ((user_id = (select auth.uid()) or (select public.is_supervisor()))
  and exists (select 1 from public.project_gallery p where p.id = post_id));

create function public.set_gallery_comment_author() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  select coalesce(nullif(btrim(p.full_name), ''), 'عضو الاستوديو') into new.author_name
    from public.profiles p where p.id = new.user_id;
  return new;
end;
$$;

create trigger set_gallery_comment_author before insert on public.gallery_comments
for each row execute function public.set_gallery_comment_author();
revoke execute on function public.set_gallery_comment_author() from public, anon, authenticated;

create function public.gallery_interaction_counts(post_ids bigint[])
returns table (post_id bigint, likes bigint, comments bigint, liked boolean)
language sql stable security invoker set search_path = '' as $$
  select p.id,
    (select count(*) from public.gallery_likes l where l.post_id = p.id),
    (select count(*) from public.gallery_comments c where c.post_id = p.id),
    exists (select 1 from public.gallery_likes l where l.post_id = p.id and l.user_id = (select auth.uid()))
  from public.project_gallery p where p.id = any(post_ids);
$$;

revoke execute on function public.gallery_interaction_counts(bigint[]) from public, anon;
grant execute on function public.gallery_interaction_counts(bigint[]) to authenticated;
