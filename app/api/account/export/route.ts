import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export async function GET() {
  const client = await createClient();
  if (!client) return Response.json({ error: "Serviço indisponível." }, { status: 503 });
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
  const admin = adminClient();
  const social = admin.schema("social");
  const [
    travelProfile,
    trips,
    subscriptions,
    socialProfile,
    posts,
    comments,
    likes,
    follows,
    saved,
    collections,
    passports,
    reports,
    notifications,
  ] = await Promise.all([
    admin.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    admin.from("trips").select("*").eq("owner_id", user.id),
    admin
      .from("subscriptions")
      .select("plan,status,current_period_end,cancel_at_period_end,synced_at")
      .eq("user_id", user.id),
    social.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    social.from("posts").select("*,post_media(*)").eq("author_id", user.id),
    social.from("comments").select("*").eq("author_id", user.id),
    social.from("post_likes").select("*").eq("user_id", user.id),
    social.from("follows").select("*").or(`follower_id.eq.${user.id},following_id.eq.${user.id}`),
    social.from("saved_posts").select("*").eq("user_id", user.id),
    social.from("collections").select("*,collection_items(*)").eq("user_id", user.id),
    social.from("passports").select("*").eq("user_id", user.id),
    social.from("reports").select("*").eq("reporter_id", user.id),
    social.from("notifications").select("*").eq("user_id", user.id),
  ]);
  const results = [
    travelProfile, trips, subscriptions, socialProfile, posts, comments, likes,
    follows, saved, collections, passports, reports, notifications,
  ];
  const failed = results.find((result) => result.error);
  if (failed?.error)
    return Response.json({ error: "Não foi possível gerar a exportação." }, { status: 500 });
  const payload = {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at,
    },
    travel: {
      profile: travelProfile.data,
      trips: trips.data ?? [],
      subscriptions: subscriptions.data ?? [],
    },
    social: {
      profile: socialProfile.data,
      posts: posts.data ?? [],
      comments: comments.data ?? [],
      likes: likes.data ?? [],
      follows: follows.data ?? [],
      savedPosts: saved.data ?? [],
      collections: collections.data ?? [],
      passports: passports.data ?? [],
      reports: reports.data ?? [],
      notifications: notifications.data ?? [],
    },
  };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="voyra-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
