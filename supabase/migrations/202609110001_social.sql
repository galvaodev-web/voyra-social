begin;
create extension if not exists pgcrypto;
create schema if not exists social;
grant usage on schema social to anon, authenticated, service_role;

-- Reuses Voyra Travel identity, without changing any existing profile policy.
create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null default 'Viajante', city text not null default '', avatar_url text,
 saved_routes text[] not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Public presentation only: never expose public.profiles or trips.data to the feed.
create table social.profiles (
 id uuid primary key references public.profiles(id) on delete cascade,
 username text not null unique check(username ~ '^[a-z0-9_]{3,24}$'),
 name text not null default 'Viajante' check(length(name) between 2 and 80),
 bio text not null default '' check(length(bio)<=400), city text not null default '' check(length(city)<=80),
 country text not null default '' check(length(country)<=80), avatar_url text, cover_url text,
 countries integer not null default 0 check(countries>=0), cities integer not null default 0 check(cities>=0), routes integer not null default 0 check(routes>=0),
 creator boolean not null default false, traveling text check(length(traveling)<=80),
 profile_visibility text not null default 'PUBLIC' check(profile_visibility='PUBLIC'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function social.bootstrap_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,name) values(new.id,left(coalesce(nullif(new.raw_user_meta_data->>'name',''),'Viajante'),80)) on conflict(id) do nothing;
 insert into social.profiles(id,username,name) values(new.id,'v_'||substr(replace(new.id::text,'-',''),1,22),case when length(trim(new.raw_user_meta_data->>'name'))>=2 then left(trim(new.raw_user_meta_data->>'name'),80) else 'Viajante' end) on conflict(id) do nothing;
 return new;
end $$;
create trigger social_new_user after insert on auth.users for each row execute function social.bootstrap_profile();
insert into public.profiles(id,name) select id,'Viajante' from auth.users on conflict(id) do nothing;
insert into social.profiles(id,username,name) select id,'v_'||substr(replace(id::text,'-',''),1,22),case when length(name)>=2 then left(name,80) else 'Viajante' end from public.profiles on conflict(id) do nothing;

create table social.destinations (
 id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null,
 country text not null, image_url text not null, category text not null, description text not null default '', season text not null default '', created_at timestamptz not null default now()
);
create table social.places (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 120), destination_id uuid not null references social.destinations,
 category text not null, latitude double precision check(latitude between -90 and 90), longitude double precision check(longitude between -180 and 180), address text, created_at timestamptz not null default now()
);
create table social.posts (
 id uuid primary key default gen_random_uuid(), author_id uuid not null references social.profiles on delete cascade,
 type text not null check(type in ('IMAGE','VIDEO','TEXT','TIP','PLACE_REVIEW','TRIP_UPDATE','ROUTE')),
 caption text not null check(length(trim(caption)) between 3 and 3000),
 destination_id uuid references social.destinations, place_id uuid references social.places, place_name text check(length(place_name)<=120),
 latitude double precision check(latitude is null), longitude double precision check(longitude is null),
 -- Opaque shared ID. No join to private trip aggregate. Linking requires Travel API verification.
 trip_id uuid check(trip_id is null),
 visibility text not null default 'PUBLIC' check(visibility in ('PUBLIC','FOLLOWERS','PRIVATE')),
 category text not null default 'Viagem' check(length(category)<=40), rating numeric(2,1) check(rating between 0.5 and 5), visited_at text check(visited_at ~ '^\d{4}-\d{2}$'),
 status text not null default 'DRAFT' check(status in ('DRAFT','PUBLISHED')),
 moderation_status text not null default 'PENDING' check(moderation_status in ('PENDING','REVIEW','APPROVED')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index posts_cursor on social.posts(created_at desc,id desc) where status='PUBLISHED';
create index posts_destination on social.posts(destination_id,created_at desc,id desc);
create index posts_author on social.posts(author_id,created_at desc,id desc);
create table social.post_media (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references social.posts on delete cascade,
 type text not null check(type in ('IMAGE','VIDEO')), storage_path text not null unique,
 position integer not null check(position between 0 and 9), width integer, height integer, duration numeric,
 alt text not null default 'Foto de viagem' check(length(alt)<=300), unique(post_id,position)
);
create table social.follows (
 id uuid primary key default gen_random_uuid(), follower_id uuid not null references social.profiles on delete cascade,
 following_id uuid not null references social.profiles on delete cascade, created_at timestamptz not null default now(),
 unique(follower_id,following_id), check(follower_id<>following_id)
);
create index follows_following on social.follows(following_id);
create table social.user_blocks (
 id uuid primary key default gen_random_uuid(), blocker_id uuid not null references social.profiles on delete cascade,
 blocked_id uuid not null references social.profiles on delete cascade, created_at timestamptz not null default now(), unique(blocker_id,blocked_id), check(blocker_id<>blocked_id)
);
create index blocks_blocked on social.user_blocks(blocked_id,blocker_id);
create table social.follow_requests (
 follower_id uuid references social.profiles on delete cascade, following_id uuid references social.profiles on delete cascade,
 status text not null default 'PENDING' check(status in ('PENDING','APPROVED','REJECTED')), created_at timestamptz not null default now(), primary key(follower_id,following_id), check(follower_id<>following_id)
);
create table social.post_likes (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references social.posts on delete cascade,
 user_id uuid not null references social.profiles on delete cascade, created_at timestamptz not null default now(), unique(post_id,user_id)
);
create table social.comments (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references social.posts on delete cascade,
 author_id uuid not null references social.profiles on delete cascade, parent_comment_id uuid,
 content text not null check(length(trim(content)) between 1 and 1200), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,post_id), foreign key(parent_comment_id,post_id) references social.comments(id,post_id) on delete cascade
);
create index comments_post on social.comments(post_id,created_at,id);
create table social.saved_posts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references social.profiles on delete cascade,
 post_id uuid not null references social.posts on delete cascade, created_at timestamptz not null default now(), unique(user_id,post_id)
);
create index saved_post_counter on social.saved_posts(post_id);
create table social.collections (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references social.profiles on delete cascade,
 name text not null check(length(trim(name)) between 2 and 70), description text not null default '' check(length(description)<=300), created_at timestamptz not null default now()
);
create table social.collection_items (
 collection_id uuid not null references social.collections on delete cascade, post_id uuid not null references social.posts on delete cascade, created_at timestamptz not null default now(), primary key(collection_id,post_id)
);
create table social.hashtags (id uuid primary key default gen_random_uuid(), name text unique not null check(length(name) between 1 and 50));
create table social.post_hashtags (post_id uuid references social.posts on delete cascade, hashtag_id uuid references social.hashtags on delete cascade, primary key(post_id,hashtag_id));
create table social.destination_follows (user_id uuid references social.profiles on delete cascade, destination_id uuid references social.destinations on delete cascade, created_at timestamptz not null default now(), primary key(user_id,destination_id));
create table social.want_to_go (user_id uuid references social.profiles on delete cascade, destination_id uuid references social.destinations on delete cascade, created_at timestamptz not null default now(), primary key(user_id,destination_id));
create table social.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references social.profiles on delete cascade,
 type text not null check(type in ('FOLLOW','LIKE','COMMENT','REPLY','SAVE_MILESTONE','ROUTE_SHARED','MENTION')),
 body text not null, post_id uuid references social.posts on delete cascade, read_at timestamptz, created_at timestamptz not null default now()
);
create index notifications_user on social.notifications(user_id,created_at desc);
create table social.reports (
 id uuid primary key default gen_random_uuid(), reporter_id uuid not null references social.profiles on delete cascade,
 target_type text not null check(target_type in ('POST','COMMENT','PROFILE')), target_id uuid not null,
 reason text not null check(reason in ('Spam','Assédio','Conteúdo impróprio','Informação enganosa','Golpe','Outro')),
 description text not null default '' check(length(description)<=2000), status text not null default 'OPEN' check(status in ('OPEN','REVIEWING','RESOLVED','DISMISSED')), created_at timestamptz not null default now()
);
create table social.post_metrics_daily (post_id uuid references social.posts on delete cascade, day date not null default current_date, views bigint not null default 0, primary key(post_id,day));
create table social.rate_limits (user_id uuid references auth.users on delete cascade, action text, window_start timestamptz, count integer not null, primary key(user_id,action,window_start));
create table social.account_requests (id uuid primary key default gen_random_uuid(), user_id uuid not null references social.profiles on delete cascade, type text not null check(type in ('EXPORT','DELETE_ECOSYSTEM')), status text not null default 'PENDING' check(status='PENDING'), created_at timestamptz not null default now());

create function social.blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from social.user_blocks where (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a));
$$;
create function social.can_view_post(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from social.posts p where p.id=target and not social.blocked(auth.uid(),p.author_id) and
 (p.author_id=auth.uid() or (p.status='PUBLISHED' and (p.visibility='PUBLIC' or (p.visibility='FOLLOWERS' and exists(select 1 from social.follows f where f.follower_id=auth.uid() and f.following_id=p.author_id))))));
$$;
create function social.consume_rate(action_name text, maximum integer) returns void language plpgsql security definer set search_path='' as $$
declare current_count integer;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 insert into social.rate_limits values(auth.uid(),action_name,date_trunc('hour',now()),1)
 on conflict(user_id,action,window_start) do update set count=social.rate_limits.count+1 returning count into current_count;
 if current_count>maximum then raise exception 'RATE_LIMIT' using errcode='P0001'; end if;
end $$;
create function social.guard_mutation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform social.consume_rate(tg_table_name,case tg_table_name when 'posts' then 15 when 'comments' then 60 when 'follows' then 60 when 'reports' then 20 else 150 end);
 return new;
end $$;
create function social.touch_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
create function social.remove_blocked_follows() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from social.follows where (follower_id=new.blocker_id and following_id=new.blocked_id) or (follower_id=new.blocked_id and following_id=new.blocker_id);
 return new;
end $$;
create trigger after_block after insert on social.user_blocks for each row execute function social.remove_blocked_follows();

do $$ declare t text; begin
 foreach t in array array['profiles','destinations','places','posts','post_media','follows','user_blocks','follow_requests','post_likes','comments','saved_posts','collections','collection_items','hashtags','post_hashtags','destination_follows','want_to_go','notifications','reports','post_metrics_daily','rate_limits','account_requests'] loop
 execute format('alter table social.%I enable row level security',t);
 end loop;
 foreach t in array array['posts','comments','follows','post_likes','saved_posts','collections','collection_items','reports','user_blocks','destination_follows','want_to_go','account_requests'] loop
 execute format('create trigger mutation_rate before insert on social.%I for each row execute function social.guard_mutation()',t);
 end loop;
 foreach t in array array['profiles','posts','comments'] loop
 execute format('create trigger touch before update on social.%I for each row execute function social.touch_updated_at()',t);
 end loop;
end $$;

grant select on social.profiles,social.destinations,social.places,social.posts,social.post_media,social.comments,social.follows,social.hashtags,social.post_hashtags to anon;
grant select,insert,update,delete on all tables in schema social to authenticated;
revoke all on social.rate_limits,social.post_metrics_daily,social.follow_requests from authenticated;
revoke insert,update,delete on social.destinations,social.places,social.hashtags,social.post_hashtags from authenticated;
revoke insert,delete on social.profiles from authenticated;
revoke update on social.profiles from authenticated;
grant update(username,name,bio,city,country,countries,cities,creator,traveling) on social.profiles to authenticated;
revoke update on social.posts from authenticated;
grant update(caption,visibility,category,rating,visited_at) on social.posts to authenticated;
revoke update on social.comments from authenticated;
grant update(content) on social.comments to authenticated;
revoke insert,delete,update on social.notifications from authenticated;
grant update(read_at) on social.notifications to authenticated;
revoke update,delete on social.reports from authenticated;
revoke update on social.follows,social.post_likes,social.saved_posts,social.user_blocks,social.collection_items,social.destination_follows,social.want_to_go,social.account_requests from authenticated;
revoke update on social.collections from authenticated;
grant update(name,description) on social.collections to authenticated;
grant all on all tables in schema social to service_role;

create policy profile_read on social.profiles for select using(not social.blocked(auth.uid(),id));
create policy profile_edit on social.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy destinations_read on social.destinations for select using(true);
create policy places_read on social.places for select using(true);
create policy posts_read on social.posts for select using(social.can_view_post(id));
create policy posts_create on social.posts for insert to authenticated with check(author_id=auth.uid() and status='DRAFT' and moderation_status='PENDING');
create policy posts_edit on social.posts for update to authenticated using(author_id=auth.uid()) with check(author_id=auth.uid());
create policy posts_delete on social.posts for delete to authenticated using(author_id=auth.uid());
create policy media_read on social.post_media for select using(social.can_view_post(post_id));
create policy media_create on social.post_media for insert to authenticated with check(
 exists(select 1 from social.posts p where p.id=post_id and p.author_id=auth.uid() and p.status='DRAFT') and
 split_part(storage_path,'/',1)=auth.uid()::text and split_part(storage_path,'/',2)=post_id::text and
 exists(select 1 from storage.objects o where o.name=storage_path and o.bucket_id=case type when 'VIDEO' then 'social-videos' else 'social-images' end));
create policy media_delete on social.post_media for delete to authenticated using(exists(select 1 from social.posts p where p.id=post_id and p.author_id=auth.uid()));
create policy follows_read on social.follows for select using(not social.blocked(auth.uid(),follower_id) and not social.blocked(auth.uid(),following_id));
create policy follows_add on social.follows for insert to authenticated with check(follower_id=auth.uid() and not social.blocked(follower_id,following_id));
create policy follows_remove on social.follows for delete to authenticated using(follower_id=auth.uid());
create policy blocks_owner on social.user_blocks for all to authenticated using(blocker_id=auth.uid()) with check(blocker_id=auth.uid());
create policy likes_read on social.post_likes for select to authenticated using(social.can_view_post(post_id));
create policy likes_add on social.post_likes for insert to authenticated with check(user_id=auth.uid() and social.can_view_post(post_id));
create policy likes_remove on social.post_likes for delete to authenticated using(user_id=auth.uid());
create policy comments_read on social.comments for select using(social.can_view_post(post_id) and not social.blocked(auth.uid(),author_id));
create policy comments_add on social.comments for insert to authenticated with check(author_id=auth.uid() and social.can_view_post(post_id) and
 (parent_comment_id is null or exists(select 1 from social.comments parent where parent.id=comments.parent_comment_id and parent.post_id=comments.post_id)));
create policy comments_edit on social.comments for update to authenticated using(author_id=auth.uid() and social.can_view_post(post_id)) with check(author_id=auth.uid() and social.can_view_post(post_id));
create policy comments_delete on social.comments for delete to authenticated using(author_id=auth.uid());
create policy saved_read on social.saved_posts for select to authenticated using(user_id=auth.uid() and social.can_view_post(post_id));
create policy saved_add on social.saved_posts for insert to authenticated with check(user_id=auth.uid() and social.can_view_post(post_id));
create policy saved_remove on social.saved_posts for delete to authenticated using(user_id=auth.uid());
create policy collections_owner on social.collections for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy collection_read on social.collection_items for select to authenticated using(exists(select 1 from social.collections c where c.id=collection_id and c.user_id=auth.uid()) and social.can_view_post(post_id));
create policy collection_add on social.collection_items for insert to authenticated with check(exists(select 1 from social.collections c where c.id=collection_id and c.user_id=auth.uid()) and social.can_view_post(post_id));
create policy collection_remove on social.collection_items for delete to authenticated using(exists(select 1 from social.collections c where c.id=collection_id and c.user_id=auth.uid()));
create policy hashtags_read on social.hashtags for select using(true);
create policy post_tags_read on social.post_hashtags for select using(social.can_view_post(post_id));
create policy destination_owner on social.destination_follows for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy want_owner on social.want_to_go for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy notifications_read on social.notifications for select to authenticated using(user_id=auth.uid() and (post_id is null or social.can_view_post(post_id)));
create policy notifications_update on social.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy reports_read on social.reports for select to authenticated using(reporter_id=auth.uid());
create policy reports_add on social.reports for insert to authenticated with check(reporter_id=auth.uid() and status='OPEN' and (
 (target_type='POST' and social.can_view_post(target_id)) or
 (target_type='PROFILE' and exists(select 1 from social.profiles p where p.id=target_id)) or
 (target_type='COMMENT' and exists(select 1 from social.comments c where c.id=target_id))));
create policy account_requests_owner on social.account_requests for select to authenticated using(user_id=auth.uid());
create policy account_requests_insert on social.account_requests for insert to authenticated with check(user_id=auth.uid() and status='PENDING');

-- One aggregate per post. Counts do not reveal who saved a post or private collections.
create function social.post_detail(target_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(p)-'status'-'moderation_status' || jsonb_build_object(
 'author',(select to_jsonb(a) from social.profiles a where a.id=p.author_id),
 'destination',(select to_jsonb(d) from social.destinations d where d.id=p.destination_id),
 'media',coalesce((select jsonb_agg(to_jsonb(m) order by m.position) from social.post_media m where m.post_id=p.id),'[]'::jsonb),
 'likes',(select count(*) from social.post_likes l where l.post_id=p.id),
 'comment_count',(select count(*) from social.comments c where c.post_id=p.id and not social.blocked(auth.uid(),c.author_id)),
 'saves',(select count(*) from social.saved_posts s where s.post_id=p.id),
 'liked',exists(select 1 from social.post_likes l where l.post_id=p.id and l.user_id=auth.uid()),
 'saved',exists(select 1 from social.saved_posts s where s.post_id=p.id and s.user_id=auth.uid())
 ) from social.posts p where p.id=target_id and social.can_view_post(p.id) and p.status='PUBLISHED';
$$;
create function social.feed_page(page_cursor text default null, feed_mode text default 'for-you', category_filter text default null, destination_filter uuid default null, author_filter uuid default null, search_query text default null)
returns setof jsonb language sql stable security invoker set search_path='' as $$
 select social.post_detail(p.id) from social.posts p where p.status='PUBLISHED'
 and (page_cursor is null or (p.created_at,p.id)<(split_part(page_cursor,'|',1)::timestamptz,split_part(page_cursor,'|',2)::uuid))
 and (category_filter is null or category_filter in ('Para você','Em alta') or p.category=category_filter)
 and (destination_filter is null or p.destination_id=destination_filter)
 and (author_filter is null or p.author_id=author_filter)
 and (feed_mode<>'following' or exists(select 1 from social.follows f where f.following_id=p.author_id and f.follower_id=auth.uid()))
 and (feed_mode<>'saved' or exists(select 1 from social.saved_posts s where s.post_id=p.id and s.user_id=auth.uid()))
 and (search_query is null or p.caption ilike '%'||left(search_query,100)||'%' or p.place_name ilike '%'||left(search_query,100)||'%')
 order by p.created_at desc,p.id desc limit 13;
$$;
-- Anon feed still parses the saved branch: grant SELECT, RLS returns no private saves.
grant select on social.saved_posts to anon;

create function social.finalize_post(target uuid) returns void language plpgsql security definer set search_path='' as $$
declare p social.posts; image_count integer; video_count integer; tag text; tag_id uuid; mentioned record;
begin
 select * into p from social.posts where id=target and author_id=auth.uid() and status='DRAFT' for update;
 if p.id is null then raise exception 'Post unavailable'; end if;
 select count(*) filter(where type='IMAGE'),count(*) filter(where type='VIDEO') into image_count,video_count from social.post_media where post_id=target;
 if (p.type='IMAGE' and (image_count<1 or video_count>0)) or (p.type='VIDEO' and (video_count<>1 or image_count>0)) or (p.type not in ('IMAGE','VIDEO') and image_count+video_count>0) then raise exception 'Invalid media'; end if;
 update social.posts set status='PUBLISHED' where id=target;
 for tag in select distinct lower(m[1]) from regexp_matches(p.caption,'#([[:alnum:]_]{1,50})','g') m limit 20 loop
 insert into social.hashtags(name) values(tag) on conflict(name) do update set name=excluded.name returning id into tag_id;
 insert into social.post_hashtags values(target,tag_id) on conflict do nothing;
 end loop;
 for mentioned in select distinct pr.id from regexp_matches(p.caption,'@([a-z0-9_]{3,24})','g') m join social.profiles pr on pr.username=m[1] where pr.id<>auth.uid() and not social.blocked(auth.uid(),pr.id) and (p.visibility='PUBLIC' or (p.visibility='FOLLOWERS' and exists(select 1 from social.follows f where f.follower_id=pr.id and f.following_id=p.author_id))) limit 10 loop
 insert into social.notifications(user_id,type,body,post_id) values(mentioned.id,'MENTION','Você foi mencionado em uma experiência.',target);
 end loop;
end $$;
create function social.notify_interaction() returns trigger language plpgsql security definer set search_path='' as $$
declare recipient uuid; kind text;
begin
 if tg_table_name='follows' then recipient=new.following_id; kind='FOLLOW';
 else select author_id into recipient from social.posts where id=new.post_id; kind=case tg_table_name when 'post_likes' then 'LIKE' else 'COMMENT' end; end if;
 if recipient<>auth.uid() and not social.blocked(auth.uid(),recipient) then
 insert into social.notifications(user_id,type,body,post_id) values(recipient,kind,case kind when 'FOLLOW' then 'Um viajante começou a seguir você.' when 'LIKE' then 'Sua experiência recebeu uma curtida.' else 'Sua experiência recebeu um comentário.' end,case when tg_table_name='follows' then null else (to_jsonb(new)->>'post_id')::uuid end);
 end if;
 if tg_table_name='comments' then
 if new.parent_comment_id is not null then
 select author_id into recipient from social.comments where id=new.parent_comment_id;
 if recipient<>auth.uid() and not social.blocked(auth.uid(),recipient) then insert into social.notifications(user_id,type,body,post_id) values(recipient,'REPLY','Um viajante respondeu seu comentário.',new.post_id); end if;
 end if;
 end if;
 return new;
end $$;
create trigger notify_follow after insert on social.follows for each row execute function social.notify_interaction();
create trigger notify_like after insert on social.post_likes for each row execute function social.notify_interaction();
create trigger notify_comment after insert on social.comments for each row execute function social.notify_interaction();

-- Uploads go through the server byte-signature validator using service_role.
-- Authenticated clients can only read authorized objects; buckets stay private.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('social-images','social-images',false,10485760,array['image/jpeg','image/png','image/webp']),
 ('social-videos','social-videos',false,52428800,array['video/mp4','video/quicktime']),
 ('avatars','avatars',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy social_media_read on storage.objects for select to anon,authenticated using(
 bucket_id in ('social-images','social-videos') and (
 ((storage.foldername(name))[1]=auth.uid()::text) or
 exists(select 1 from social.post_media m where m.storage_path=name and social.can_view_post(m.post_id))));
create policy social_avatar_read on storage.objects for select to anon,authenticated using(bucket_id='avatars' and exists(select 1 from social.profiles p where p.avatar_url=name and not social.blocked(auth.uid(),p.id)));

-- No default execution of SECURITY DEFINER internals.
revoke all on all functions in schema social from public,anon,authenticated;
grant execute on function social.blocked(uuid,uuid),social.can_view_post(uuid),social.post_detail(uuid),social.feed_page(text,text,text,uuid,uuid,text) to anon,authenticated;
grant execute on function social.finalize_post(uuid) to authenticated;
notify pgrst,'reload schema';
commit;

