-- Voyra Web 1.0: enriched Recap snapshots and idempotent Social sharing.
-- Apply after 202609170001_admin_moderation.sql and the Travel Web 1.0 migration.
begin;

alter table social.user_preferences
  add column creator_ids uuid[] not null default '{}';
alter table social.user_preferences
  add constraint user_preferences_creator_limit check(cardinality(creator_ids) <= 12);

alter table social.passports
  add column cities text[] not null default '{}',
  add column token_snapshot jsonb not null default '[]'::jsonb
    check(jsonb_typeof(token_snapshot)='array');

alter table social.posts
  add column source_passport_id uuid references social.passports(id) on delete set null;
create unique index posts_passport_share_unique
  on social.posts(author_id,source_passport_id) where source_passport_id is not null;

create table social.passport_shares (
  passport_id uuid primary key references social.passports(id) on delete cascade,
  user_id uuid not null references social.profiles(id) on delete cascade,
  post_id uuid not null unique references social.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id,passport_id)
);
create index passport_shares_user_idx on social.passport_shares(user_id,created_at desc);
alter table social.passport_shares enable row level security;
create policy passport_shares_read on social.passport_shares for select to authenticated
  using(user_id=auth.uid());
revoke all on social.passport_shares from public,anon,authenticated;
grant select on social.passport_shares to authenticated;
grant all on social.passport_shares to service_role;

create function social.share_passport(target_passport uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare passport social.passports; existing uuid; created uuid; token_count integer;
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  select * into passport from social.passports
    where id=target_passport and user_id=auth.uid() and visible for update;
  if passport.id is null then raise exception 'PASSPORT_UNAVAILABLE'; end if;
  select post_id into existing from social.passport_shares where passport_id=passport.id;
  if existing is not null then return existing; end if;
  token_count := jsonb_array_length(passport.token_snapshot);
  insert into social.posts(
    author_id,type,caption,source_passport_id,visibility,category,status,visited_at
  ) values(
    auth.uid(),'TRIP_UPDATE',
    'Completei '||passport.destination||': '||passport.days||' dias, '||
      passport.place_count||' lugares e '||token_count||' Travel Tokens no meu Voyra Passport.',
    passport.id,'PUBLIC','Travel Recap','PUBLISHED',to_char(passport.end_date,'YYYY-MM')
  ) returning id into created;
  insert into social.passport_shares(passport_id,user_id,post_id)
    values(passport.id,auth.uid(),created);
  return created;
end;
$$;
revoke all on function social.share_passport(uuid) from public,anon;
grant execute on function social.share_passport(uuid) to authenticated;

create function social.set_passport_visibility(target_passport uuid, next_visible boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare
  owner_id uuid;
  token_ids uuid[];
begin
  if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED'; end if;
  select user_id,
    coalesce(array(select (value->>'public_id')::uuid from jsonb_array_elements(token_snapshot) value), '{}')
    into owner_id, token_ids
  from social.passports
  where id=target_passport
  for update;
  if owner_id is null or owner_id<>auth.uid() then raise exception 'PASSPORT_NOT_FOUND'; end if;

  update social.passports set visible=next_visible where id=target_passport;
  update public.travel_tokens set visible=next_visible
    where user_id=owner_id and public_id=any(token_ids);
  return next_visible;
end;
$$;
revoke all on function social.set_passport_visibility(uuid,boolean) from public,anon;
grant execute on function social.set_passport_visibility(uuid,boolean) to authenticated;
revoke update(visible) on social.passports from authenticated;

notify pgrst,'reload schema';
commit;
