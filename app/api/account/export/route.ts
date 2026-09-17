import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { requestContext, structuredLog } from "@/lib/server/logger";

type QueryResult = { data: unknown; error: { message: string } | null };

export async function GET(request: Request) {
  const context = requestContext(request, "/api/account/export");
  try {
    const client = await createClient();
    if (!client) return Response.json({ error: "Serviço indisponível." }, { status: 503 });
    const { data: { user } } = await client.auth.getUser();
    if (!user) return Response.json({ error: "Autenticação necessária." }, { status: 401 });
    context.userId = user.id;
    const admin = adminClient();
    const social = admin.schema("social");
    const core = await Promise.all([
      admin.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      admin.from("trips").select("*").eq("owner_id", user.id),
      admin.from("subscriptions").select("plan,status,current_period_end,cancel_at_period_end,synced_at").eq("user_id", user.id),
      admin.from("favorites").select("*").eq("user_id", user.id),
      admin.from("notifications").select("*").eq("user_id", user.id),
      admin.from("travel_searches").select("*,search_preferences(*),provider_results(*),offers(*)").eq("user_id", user.id),
      admin.from("price_alerts").select("*").eq("user_id", user.id),
      admin.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      admin.from("analytics_events").select("*").eq("user_id", user.id),
      admin.from("travel_tokens").select("*").eq("user_id", user.id),
      admin.from("partner_referrals").select("*").eq("user_id", user.id),
      social.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      social.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
      social.from("posts").select("*,post_media(*)").eq("author_id", user.id),
      social.from("comments").select("*").eq("author_id", user.id),
      social.from("post_likes").select("*").eq("user_id", user.id),
      social.from("follows").select("*").or(`follower_id.eq.${user.id},following_id.eq.${user.id}`),
      social.from("destination_follows").select("*").eq("user_id", user.id),
      social.from("want_to_go").select("*").eq("user_id", user.id),
      social.from("saved_posts").select("*").eq("user_id", user.id),
      social.from("collections").select("*,collection_items(*)").eq("user_id", user.id),
      social.from("user_blocks").select("*").eq("blocker_id", user.id),
      social.from("notifications").select("*").eq("user_id", user.id),
      social.from("passports").select("*").eq("user_id", user.id),
      social.from("passport_shares").select("*").eq("user_id", user.id),
      social.from("reports").select("*").eq("reporter_id", user.id),
      social.from("account_requests").select("*").eq("user_id", user.id),
      social.from("account_sanctions").select("status,reason,expires_at,updated_at").eq("user_id", user.id).maybeSingle(),
    ]);
    const failed = (core as QueryResult[]).find((result) => result.error);
    if (failed?.error) throw new Error(failed.error.message);
    const trips = (core[1].data ?? []) as Array<{ id: string }>;
    const tripIds = trips.map((trip) => trip.id);
    const empty = { data: [], error: null };
    const details = tripIds.length
      ? await Promise.all([
          admin.from("trip_members").select("*").in("trip_id", tripIds),
          admin.from("trip_days").select("*").in("trip_id", tripIds),
          admin.from("activities").select("*").in("trip_id", tripIds),
          admin.from("expenses").select("*").in("trip_id", tripIds),
          admin.from("documents").select("*").in("trip_id", tripIds),
          admin.from("bookings").select("*").in("trip_id", tripIds),
          admin.from("trip_notes").select("*").in("trip_id", tripIds),
          admin.from("ai_conversations").select("*").in("trip_id", tripIds),
        ])
      : Array.from({ length: 8 }, () => empty);
    const referralIds = ((core[10].data ?? []) as Array<{ id: string }>).map((item) => item.id);
    const commissions = referralIds.length
      ? await admin.from("commission_events").select("*").in("referral_id", referralIds)
      : empty;
    const secondary = [...details, commissions] as QueryResult[];
    const secondaryFailure = secondary.find((result) => result.error);
    if (secondaryFailure?.error) throw new Error(secondaryFailure.error.message);

    const payload = {
      exportedAt: new Date().toISOString(),
      account: { id: user.id, email: user.email, createdAt: user.created_at, lastSignInAt: user.last_sign_in_at },
      travel: {
        profile: core[0].data,
        trips,
        tripMembers: details[0].data,
        tripDays: details[1].data,
        activities: details[2].data,
        expenses: details[3].data,
        documentsMetadata: details[4].data,
        bookings: details[5].data,
        notes: details[6].data,
        aiConversations: details[7].data,
        subscriptions: core[2].data,
        favorites: core[3].data,
        notifications: core[4].data,
        searches: core[5].data,
        priceAlerts: core[6].data,
        notificationPreferences: core[7].data,
        analyticsEvents: core[8].data,
        travelTokens: core[9].data,
        partnerReferrals: core[10].data,
        commissionEvents: commissions.data,
      },
      social: {
        profile: core[11].data,
        preferences: core[12].data,
        posts: core[13].data,
        comments: core[14].data,
        likes: core[15].data,
        follows: core[16].data,
        destinationFollows: core[17].data,
        wantToGo: core[18].data,
        savedPosts: core[19].data,
        collections: core[20].data,
        blocksCreatedByUser: core[21].data,
        notifications: core[22].data,
        passports: core[23].data,
        passportShares: core[24].data,
        reports: core[25].data,
        accountRequests: core[26].data,
        accountSanction: core[27].data,
      },
    };
    structuredLog("info", "account_export_created", context);
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="voyra-data-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "private, no-store",
        "x-request-id": context.requestId,
      },
    });
  } catch (error) {
    structuredLog("error", "account_export_failed", context, {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Não foi possível gerar a exportação.", requestId: context.requestId },
      { status: 500, headers: { "x-request-id": context.requestId } },
    );
  }
}
