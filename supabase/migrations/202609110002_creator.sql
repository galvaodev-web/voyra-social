begin;
create function social.creator_summary() returns jsonb language sql stable security definer set search_path='' as $$
select jsonb_build_object(
 'posts',(select count(*) from social.posts where author_id=auth.uid() and status='PUBLISHED'),
 'likes',(select count(*) from social.post_likes l join social.posts p on p.id=l.post_id where p.author_id=auth.uid()),
 'saves',(select count(*) from social.saved_posts s join social.posts p on p.id=s.post_id where p.author_id=auth.uid()),
 'followers',(select count(*) from social.follows where following_id=auth.uid()),
 'routes',(select count(*) from social.posts where author_id=auth.uid() and type='ROUTE' and status='PUBLISHED'),
 'views',null) where auth.uid() is not null;
$$;
revoke all on function social.creator_summary() from public,anon;
grant execute on function social.creator_summary() to authenticated;
commit;
