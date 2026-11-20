insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media','post-media',false,52428800,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']);

create table public.plateau_posts (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid() references public.profiles(id) on delete set null,
  author_name text not null,
  author_role text not null,
  body text not null default '' check (char_length(body) <= 4000),
  media_path text unique,
  media_kind text check (media_kind in ('image','video')),
  youtube_id text check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  legacy_gallery_id bigint unique,
  legacy_media jsonb not null default '[]',
  pinned_at timestamptz,
  created_at timestamptz not null default now(),
  check ((media_path is null) = (media_kind is null)),
  check (num_nonnulls(media_path,youtube_id) <= 1),
  check (length(btrim(body)) > 0 or media_path is not null or youtube_id is not null or jsonb_array_length(legacy_media) > 0)
);

create index plateau_posts_order_idx on public.plateau_posts (pinned_at desc nulls last, created_at desc, id desc);
create index plateau_posts_user_idx on public.plateau_posts (user_id);
alter table public.plateau_posts enable row level security;
revoke all on public.plateau_posts from public, anon, authenticated;
grant select, delete on public.plateau_posts to authenticated;
grant insert (body, media_path, media_kind, youtube_id) on public.plateau_posts to authenticated;
grant update (pinned_at) on public.plateau_posts to authenticated;

create policy plateau_posts_read on public.plateau_posts for select to authenticated
using ((select public.studio_is_member()) or (select public.is_supervisor()));
create policy plateau_posts_add on public.plateau_posts for insert to authenticated
with check (user_id = (select auth.uid()) and ((select public.studio_is_member()) or (select public.is_supervisor()))
 and (media_path is null or (
 (storage.foldername(media_path))[1] = (select auth.uid())::text
 and exists (select 1 from storage.objects o where o.bucket_id='post-media' and o.name=media_path
   and o.owner_id=(select auth.uid())::text and split_part(o.metadata->>'mimetype','/',1)=media_kind)
 )));
create policy plateau_posts_pin on public.plateau_posts for update to authenticated
using ((select public.is_supervisor())) with check ((select public.is_supervisor()));
create policy plateau_posts_remove on public.plateau_posts for delete to authenticated
using ((select public.is_supervisor()));

create policy plateau_media_read on storage.objects for select to authenticated
using (bucket_id='post-media' and ((select public.studio_is_member()) or (select public.is_supervisor())));
create policy plateau_media_add on storage.objects for insert to authenticated
with check (bucket_id='post-media' and (storage.foldername(name))[1]=(select auth.uid())::text
 and ((select public.studio_is_member()) or (select public.is_supervisor())));
create policy plateau_media_remove on storage.objects for delete to authenticated
using (bucket_id='post-media' and ((select public.is_supervisor()) or
 ((select public.studio_is_member()) and owner_id=(select auth.uid())::text))
 and not exists (select 1 from public.plateau_posts p where p.media_path=storage.objects.name));

create function public.set_plateau_post_author() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  select coalesce(nullif(btrim(p.full_name),''),'عضو الفريق'), p.app_role
    into new.author_name,new.author_role from public.profiles p where p.id=new.user_id;
  return new;
end;
$$;
create trigger set_plateau_post_author before insert on public.plateau_posts
for each row when (new.legacy_gallery_id is null) execute function public.set_plateau_post_author();
revoke execute on function public.set_plateau_post_author() from public, anon, authenticated;

with grouped as (
  select coalesce(carousel_id::text,'post-'||id::text) as grouping,
    jsonb_agg(jsonb_build_object('path',storage_path,'kind',split_part(mime_type,'/',1))
      order by carousel_position nulls last,id) as media
  from public.project_gallery where id<>1 group by 1
), anchors as (
  select distinct on (coalesce(carousel_id::text,'post-'||id::text)) *
  from public.project_gallery where id<>1
  order by coalesce(carousel_id::text,'post-'||id::text),carousel_position nulls last,id
)
insert into public.plateau_posts (user_id,author_name,author_role,body,legacy_gallery_id,legacy_media,created_at)
select profile.id,coalesce(nullif(btrim(profile.full_name),''),'عضو الفريق'),coalesce(profile.app_role,'student'),
  left(concat_ws(E'\n',a.title,nullif(a.description,'')),4000),a.id,g.media,a.created_at
from anchors a join grouped g on g.grouping=coalesce(a.carousel_id::text,'post-'||a.id::text)
left join public.profiles profile on profile.id=a.created_by;
create table public.plateau_likes (
  post_id bigint not null references public.plateau_posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  primary key (post_id, user_id)
);

create table public.plateau_comments (
  id uuid primary key default gen_random_uuid(),
  post_id bigint not null references public.plateau_posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  author_name text not null,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index plateau_likes_user_idx on public.plateau_likes (user_id);
create index plateau_comments_post_idx on public.plateau_comments (post_id, created_at desc, id);
create index plateau_comments_user_idx on public.plateau_comments (user_id);

alter table public.plateau_likes enable row level security;
alter table public.plateau_comments enable row level security;
revoke all on public.plateau_likes, public.plateau_comments from public, anon, authenticated;
grant select, delete on public.plateau_likes, public.plateau_comments to authenticated;
grant insert (post_id) on public.plateau_likes to authenticated;
grant insert (post_id, body) on public.plateau_comments to authenticated;

create policy plateau_likes_read on public.plateau_likes for select to authenticated
using (exists (select 1 from public.plateau_posts p where p.id = post_id));
create policy plateau_likes_add on public.plateau_likes for insert to authenticated
with check (user_id = (select auth.uid()) and exists (select 1 from public.plateau_posts p where p.id = post_id));
create policy plateau_likes_remove on public.plateau_likes for delete to authenticated
using (user_id = (select auth.uid()) and exists (select 1 from public.plateau_posts p where p.id = post_id));

create policy plateau_comments_read on public.plateau_comments for select to authenticated
using (exists (select 1 from public.plateau_posts p where p.id = post_id));
create policy plateau_comments_add on public.plateau_comments for insert to authenticated
with check (user_id = (select auth.uid()) and exists (select 1 from public.plateau_posts p where p.id = post_id));
create policy plateau_comments_remove on public.plateau_comments for delete to authenticated
using ((user_id = (select auth.uid()) or (select public.is_supervisor()))
  and exists (select 1 from public.plateau_posts p where p.id = post_id));

insert into public.plateau_likes (post_id,user_id)
select p.id,l.user_id from public.gallery_likes l join public.plateau_posts p on p.legacy_gallery_id=l.post_id;
insert into public.plateau_comments (id,post_id,user_id,author_name,body,created_at)
select c.id,p.id,c.user_id,c.author_name,c.body,c.created_at
from public.gallery_comments c join public.plateau_posts p on p.legacy_gallery_id=c.post_id;
create trigger set_plateau_comment_author before insert on public.plateau_comments
for each row execute function public.set_gallery_comment_author();

create function public.plateau_interaction_counts(post_ids bigint[])
returns table (post_id bigint, likes bigint, comments bigint, liked boolean)
language sql stable security invoker set search_path = '' as $$
  select p.id,
    (select count(*) from public.plateau_likes l where l.post_id = p.id),
    (select count(*) from public.plateau_comments c where c.post_id = p.id),
    exists (select 1 from public.plateau_likes l where l.post_id = p.id and l.user_id = (select auth.uid()))
  from public.plateau_posts p where p.id = any(post_ids);
$$;

revoke execute on function public.plateau_interaction_counts(bigint[]) from public, anon;
grant execute on function public.plateau_interaction_counts(bigint[]) to authenticated;
