-- The timeline is public. Gallery and project files keep their existing access rules.
grant select (id, author_name, author_role, body, created_at, pinned_at, media_path, media_kind, legacy_media, youtube_id)
  on public.plateau_posts to anon;
create policy plateau_posts_public on public.plateau_posts for select to anon, authenticated
  using (archived_at is null);
create policy plateau_media_public on storage.objects for select to anon, authenticated
  using (bucket_id = 'post-media' and exists (
    select 1 from public.plateau_posts p where p.media_path = storage.objects.name
  ));

alter table public.plateau_likes
  drop constraint plateau_likes_pkey,
  alter column user_id drop not null,
  add column visitor_hash bytea,
  add constraint plateau_likes_identity check (num_nonnulls(user_id, visitor_hash) = 1);
create unique index plateau_likes_member_unique on public.plateau_likes (post_id,user_id) where user_id is not null;
create unique index plateau_likes_visitor_unique on public.plateau_likes (post_id,visitor_hash) where visitor_hash is not null;
create index plateau_likes_post_idx on public.plateau_likes (post_id);

alter table public.plateau_comments
  alter column user_id drop not null,
  add column visitor_hash bytea,
  add constraint plateau_comments_identity check (num_nonnulls(user_id,visitor_hash) = 1);
create index plateau_comments_visitor_idx on public.plateau_comments (visitor_hash, created_at desc) where visitor_hash is not null;
drop trigger set_plateau_comment_author on public.plateau_comments;
create trigger set_plateau_comment_author before insert on public.plateau_comments
for each row when (new.user_id is not null) execute function public.set_gallery_comment_author();

-- Visitor proofs are never returned by the API.
revoke select on public.plateau_likes, public.plateau_comments from authenticated;
grant select (post_id,user_id) on public.plateau_likes to authenticated;
grant select (id,post_id,user_id,author_name,body,created_at) on public.plateau_comments to authenticated;

create function public.plateau_public_counts(post_ids bigint[], visitor_token text default null)
returns table (post_id bigint, likes bigint, comments bigint, liked boolean)
language sql stable security definer set search_path = '' as $$
  select p.id,
    (select count(*) from public.plateau_likes l where l.post_id=p.id),
    (select count(*) from public.plateau_comments c where c.post_id=p.id),
    exists (select 1 from public.plateau_likes l where l.post_id=p.id
      and (l.user_id=(select auth.uid()) or (visitor_token ~ '^[0-9a-f]{64}$'
        and l.visitor_hash=sha256(convert_to(visitor_token,'UTF8')))))
  from public.plateau_posts p where p.archived_at is null and p.id=any(post_ids)
  order by p.id limit 1000;
$$;

create function public.plateau_public_comments(target bigint, max_rows integer default 20)
returns table (id uuid, author_name text, body text, created_at timestamptz, own boolean)
language sql stable security definer set search_path = '' as $$
  select c.id,c.author_name,c.body,c.created_at,coalesce(c.user_id=(select auth.uid()),false)
  from public.plateau_comments c join public.plateau_posts p on p.id=c.post_id
  where c.post_id=target and p.archived_at is null
  order by c.created_at desc,c.id desc limit least(greatest(coalesce(max_rows,20),1),1000);
$$;

create function public.plateau_visitor_like(target bigint, visitor_token text, desired boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare proof bytea;
begin
  if visitor_token is null or visitor_token !~ '^[0-9a-f]{64}$' or desired is null then
    raise exception 'Invalid visitor token' using errcode='22023';
  end if;
  perform 1 from public.plateau_posts where id=target and archived_at is null for share;
  if not found then raise exception 'Post unavailable' using errcode='22023'; end if;
  proof := sha256(convert_to(visitor_token,'UTF8'));
  if desired then
    insert into public.plateau_likes(post_id,user_id,visitor_hash)
      values(target,null,proof) on conflict do nothing;
  else
    delete from public.plateau_likes where post_id=target and visitor_hash=proof;
  end if;
end;
$$;

create function public.plateau_visitor_comment(target bigint, visitor_token text, message text)
returns void language plpgsql security definer set search_path = '' as $$
declare proof bytea;
begin
  if visitor_token is null or visitor_token !~ '^[0-9a-f]{64}$' or message is null
      or char_length(btrim(message)) not between 1 and 500 then
    raise exception 'Invalid comment' using errcode='22023';
  end if;
  perform 1 from public.plateau_posts where id=target and archived_at is null for share;
  if not found then raise exception 'Post unavailable' using errcode='22023'; end if;
  proof := sha256(convert_to(visitor_token,'UTF8'));
  perform pg_advisory_xact_lock(hashtextextended(encode(proof,'hex'), 0));
  if exists (select 1 from public.plateau_comments where visitor_hash=proof and created_at > now()-interval '3 seconds') then
    raise exception 'Comment cooldown' using errcode='22023';
  end if;
  insert into public.plateau_comments(post_id,user_id,visitor_hash,author_name,body)
    values(target,null,proof,'زائر',btrim(message));
end;
$$;

revoke execute on function public.plateau_public_counts(bigint[],text), public.plateau_public_comments(bigint,integer),
  public.plateau_visitor_like(bigint,text,boolean), public.plateau_visitor_comment(bigint,text,text)
  from public;
grant execute on function public.plateau_public_counts(bigint[],text), public.plateau_public_comments(bigint,integer),
  public.plateau_visitor_like(bigint,text,boolean), public.plateau_visitor_comment(bigint,text,text)
  to anon, authenticated;
