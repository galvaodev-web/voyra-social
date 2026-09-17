-- Server-authorized moderation. Apply after 202609120003_growth.sql.
begin;

create table if not exists social.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('MODERATOR', 'ADMIN')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table if not exists social.account_sanctions (
  user_id uuid primary key references social.profiles(id) on delete cascade,
  status text not null check (status in ('WARNED', 'SUSPENDED', 'BANNED')),
  reason text not null check (length(trim(reason)) between 3 and 1000),
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid not null references social.admin_users(user_id)
);

create table if not exists social.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references social.admin_users(user_id),
  report_id uuid references social.reports(id) on delete set null,
  action text not null check (action in ('DISMISS', 'REMOVE_CONTENT', 'WARN', 'SUSPEND', 'BAN')),
  target_type text not null check (target_type in ('POST', 'COMMENT', 'PROFILE')),
  target_id uuid not null,
  reason text not null check (length(trim(reason)) between 3 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists reports_status_created_idx
  on social.reports(status, created_at desc);
create index if not exists moderation_actions_admin_created_idx
  on social.moderation_actions(admin_user_id, created_at desc);

alter table social.admin_users enable row level security;
alter table social.account_sanctions enable row level security;
alter table social.moderation_actions enable row level security;

revoke all on social.admin_users, social.account_sanctions, social.moderation_actions
  from public, anon, authenticated;
grant all on social.admin_users, social.account_sanctions, social.moderation_actions
  to service_role;

create or replace function social.account_can_mutate(target uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select not exists (
    select 1 from social.account_sanctions s
    where s.user_id=target
      and s.status in ('SUSPENDED', 'BANNED')
      and (s.expires_at is null or s.expires_at > now())
  );
$$;

create or replace function social.guard_mutation()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if tg_table_name not in ('reports', 'account_requests')
     and not social.account_can_mutate(auth.uid()) then
    raise exception 'ACCOUNT_RESTRICTED' using errcode='P0001';
  end if;
  perform social.consume_rate(
    tg_table_name,
    case tg_table_name
      when 'posts' then 15
      when 'comments' then 60
      when 'follows' then 60
      when 'reports' then 20
      else 150
    end
  );
  return new;
end $$;

revoke all on function social.account_can_mutate(uuid) from public, anon, authenticated;
grant execute on function social.account_can_mutate(uuid) to authenticated;

create or replace function social.moderate_report(
  actor uuid,
  target_report uuid,
  action_name text,
  action_reason text
)
returns table(target_user_id uuid, moderated_type text, moderated_id uuid)
language plpgsql security definer set search_path='' as $$
declare
  report_row social.reports;
  owner_id uuid;
  next_status text;
begin
  if not exists (
    select 1 from social.admin_users a
    where a.user_id=actor and a.active
  ) then raise exception 'ADMIN_REQUIRED'; end if;
  if action_name not in ('DISMISS', 'REMOVE_CONTENT', 'WARN', 'SUSPEND', 'BAN')
     or length(trim(action_reason)) not between 3 and 1000 then
    raise exception 'INVALID_ACTION';
  end if;

  select * into report_row from social.reports
  where id=target_report and status in ('OPEN', 'REVIEWING') for update;
  if report_row.id is null then raise exception 'REPORT_UNAVAILABLE'; end if;

  if report_row.target_type='POST' then
    select author_id into owner_id from social.posts where id=report_row.target_id;
  elsif report_row.target_type='COMMENT' then
    select author_id into owner_id from social.comments where id=report_row.target_id;
  else
    select id into owner_id from social.profiles where id=report_row.target_id;
  end if;
  if owner_id is null then raise exception 'TARGET_UNAVAILABLE'; end if;

  if action_name='REMOVE_CONTENT' then
    if report_row.target_type='POST' then
      delete from social.posts where id=report_row.target_id;
    elsif report_row.target_type='COMMENT' then
      delete from social.comments where id=report_row.target_id;
    else
      raise exception 'PROFILE_CONTENT_ACTION_UNSUPPORTED';
    end if;
  elsif action_name in ('WARN', 'SUSPEND', 'BAN') then
    insert into social.account_sanctions(user_id,status,reason,expires_at,updated_by)
    values(
      owner_id,
      case action_name when 'WARN' then 'WARNED' when 'SUSPEND' then 'SUSPENDED' else 'BANNED' end,
      trim(action_reason),
      case when action_name='SUSPEND' then now()+interval '7 days' else null end,
      actor
    )
    on conflict(user_id) do update set
      status=excluded.status,
      reason=excluded.reason,
      expires_at=excluded.expires_at,
      updated_at=now(),
      updated_by=excluded.updated_by;
  end if;

  next_status := case when action_name='DISMISS' then 'DISMISSED' else 'RESOLVED' end;
  update social.reports set status=next_status where id=report_row.id;
  insert into social.moderation_actions(
    admin_user_id,report_id,action,target_type,target_id,reason
  ) values(
    actor,report_row.id,action_name,report_row.target_type,report_row.target_id,trim(action_reason)
  );

  return query select owner_id, report_row.target_type, report_row.target_id;
end $$;

revoke all on function social.moderate_report(uuid,uuid,text,text)
  from public, anon, authenticated;
grant execute on function social.moderate_report(uuid,uuid,text,text)
  to service_role;

notify pgrst, 'reload schema';
commit;
