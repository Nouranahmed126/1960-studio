-- The timeline is public. Gallery and project files keep their existing access rules.
grant select (id, author_name, author_role, body, created_at, pinned_at, media_path, media_kind, legacy_media, youtube_id)
  on public.plateau_posts to anon;
create policy plateau_posts_public on public.plateau_posts for select to anon, authenticated
  using (archived_at is null);
create policy plateau_media_public on storage.objects for select to anon, authenticated
  using (bucket_id = 'post-media' and exists (
    select 1 from public.plateau_posts p where p.media_path = storage.objects.name
  ));

create table public.plateau_visitor_likes (
  post_id bigint not null references public.plateau_posts(id) on delete cascade,
  visitor_hash bytea not null,
  primary key (post_id, visitor_hash)
);
create table public.plateau_visitor_comments (
  id uuid primary key default gen_random_uuid(),
  post_id bigint not null references public.plateau_posts(id) on delete cascade,
  visitor_hash bytea not null,
  author_name text not null default 'زائر',
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index plateau_visitor_comments_post_idx on public.plateau_visitor_comments (post_id, created_at desc, id);
create index plateau_visitor_comments_visitor_idx on public.plateau_visitor_comments (visitor_hash, created_at desc);
alter table public.plateau_visitor_likes enable row level security;
alter table public.plateau_visitor_comments enable row level security;
revoke all on public.plateau_visitor_likes, public.plateau_visitor_comments from public, anon, authenticated;

create function public.plateau_public_counts(post_ids bigint[], visitor_token text default null)
returns table (post_id bigint, likes bigint, comments bigint, liked boolean)
language sql stable security definer set search_path = '' as $$
  select p.id,
    (select count(*) from public.plateau_likes l where l.post_id=p.id)
      + (select count(*) from public.plateau_visitor_likes l where l.post_id=p.id),
    (select count(*) from public.plateau_comments c where c.post_id=p.id)
      + (select count(*) from public.plateau_visitor_comments c where c.post_id=p.id),
    (exists (select 1 from public.plateau_likes l where l.post_id=p.id and l.user_id=(select auth.uid()))
      or (visitor_token ~ '^[0-9a-f]{64}$' and exists (
        select 1 from public.plateau_visitor_likes l where l.post_id=p.id
        and l.visitor_hash=sha256(convert_to(visitor_token,'UTF8'))))) is true
  from public.plateau_posts p where p.archived_at is null and p.id=any(post_ids)
  order by p.id limit 1000;
$$;

create function public.plateau_public_comments(target bigint, max_rows integer default 20)
returns table (id uuid, author_name text, body text, created_at timestamptz, own boolean, visitor boolean)
language sql stable security definer set search_path = '' as $$
  select c.id,c.author_name,c.body,c.created_at,c.own,c.visitor
  from (
    select m.id,m.author_name,m.body,m.created_at,coalesce(m.user_id=(select auth.uid()),false) as own,false as visitor
    from public.plateau_comments m where m.post_id=target
    union all
    select g.id,g.author_name,g.body,g.created_at,false,true
    from public.plateau_visitor_comments g where g.post_id=target
  ) c
  where exists (select 1 from public.plateau_posts p where p.id=target and p.archived_at is null)
  order by c.created_at desc,c.id desc limit least(greatest(coalesce(max_rows,20),1),1000);
$$;

create function public.plateau_remove_visitor_comment(target bigint, comment_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or public.is_supervisor() is distinct from true then
    raise exception 'Access denied' using errcode='42501';
  end if;
  delete from public.plateau_visitor_comments where id=comment_id and post_id=target;
  return found;
end;
$$;
revoke execute on function public.plateau_remove_visitor_comment(bigint,uuid) from public, anon;
grant execute on function public.plateau_remove_visitor_comment(bigint,uuid) to authenticated;

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
    insert into public.plateau_visitor_likes(post_id,visitor_hash)
      values(target,proof) on conflict do nothing;
  else
    delete from public.plateau_visitor_likes where post_id=target and visitor_hash=proof;
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
  if exists (select 1 from public.plateau_visitor_comments where visitor_hash=proof and created_at > now()-interval '3 seconds') then
    raise exception 'Comment cooldown' using errcode='22023';
  end if;
  insert into public.plateau_visitor_comments(post_id,visitor_hash,body)
    values(target,proof,btrim(message));
end;
$$;

revoke execute on function public.plateau_public_counts(bigint[],text), public.plateau_public_comments(bigint,integer),
  public.plateau_visitor_like(bigint,text,boolean), public.plateau_visitor_comment(bigint,text,text)
  from public;
grant execute on function public.plateau_public_counts(bigint[],text), public.plateau_public_comments(bigint,integer),
  public.plateau_visitor_like(bigint,text,boolean), public.plateau_visitor_comment(bigint,text,text)
  to anon, authenticated;
