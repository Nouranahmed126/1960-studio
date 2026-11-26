alter table public.plateau_posts
  add column if not exists location text;

alter table public.plateau_posts
  drop constraint if exists plateau_posts_location_length_check;

alter table public.plateau_posts
  add constraint plateau_posts_location_length_check
  check (location is null or char_length(btrim(location)) between 1 and 160);
