-- Phase 1 growth features: onboarding preferences and Voyra Passport.
-- Apply after the Travel launch migration and the two Social migrations.
begin;

create table social.user_preferences (
  user_id uuid primary key references social.profiles(id) on delete cascade,
  destination_ids uuid[] not null default '{}',
  categories text[] not null default '{}',
  onboarding_completed boolean not null default false,
  updated_at timestamptz not null default now(),
  check (cardinality(destination_ids) <= 20),
  check (cardinality(categories) <= 20)
);
alter table social.user_preferences enable row level security;
create policy preferences_owner_select on social.user_preferences
  for select to authenticated using(user_id=auth.uid());
create policy preferences_owner_insert on social.user_preferences
  for insert to authenticated with check(user_id=auth.uid());
create policy preferences_owner_update on social.user_preferences
  for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on social.user_preferences from anon,authenticated;
grant select,insert,update on social.user_preferences to authenticated;
grant all on social.user_preferences to service_role;

create table social.passports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references social.profiles(id) on delete cascade,
  trip_id uuid not null,
  name text not null check(length(name) between 2 and 120),
  destination text not null check(length(destination) between 2 and 120),
  country text not null default '' check(length(country)<=80),
  start_date date not null,
  end_date date not null check(end_date>=start_date),
  days integer not null check(days between 1 and 366),
  place_count integer not null check(place_count>=0),
  public_route_id uuid references public.published_routes(id) on delete set null,
  visible boolean not null default true,
  awarded_at timestamptz not null default now(),
  unique(user_id,trip_id)
);
create index passports_user_idx on social.passports(user_id,awarded_at desc);
alter table social.passports enable row level security;
create policy passport_read on social.passports for select to anon,authenticated
  using(visible or user_id=auth.uid());
create policy passport_owner_visibility on social.passports for update to authenticated
  using(user_id=auth.uid()) with check(user_id=auth.uid());
revoke all on social.passports from anon,authenticated;
grant select on social.passports to anon,authenticated;
grant update(visible) on social.passports to authenticated;
grant all on social.passports to service_role;

notify pgrst,'reload schema';
commit;
