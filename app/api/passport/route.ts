import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { getCompletedTrips, getTripCompletion } from "@/lib/voyra-travel";

export const dynamic = "force-dynamic";

async function authenticatedSession() {
  const client = await createClient();
  if (!client) return null;
  const {
    data: { user },
  } = await client.auth.getUser();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!user || !session?.access_token) return null;
  return { client, user, token: session.access_token };
}

export async function GET() {
  const auth = await authenticatedSession();
  if (!auth)
    return Response.json({ error: "Entre na sua conta Voyra." }, { status: 401 });
  try {
    const [trips, awarded] = await Promise.all([
      getCompletedTrips(auth.token),
      auth.client
        .schema("social")
        .from("passports")
        .select("id,trip_id,visible")
        .eq("user_id", auth.user.id),
    ]);
    if (awarded.error) throw awarded.error;
    const byTrip = new Map((awarded.data ?? []).map((item) => [item.trip_id, item]));
    return Response.json(
      trips.map((trip) => ({
        ...trip,
        passportId: byTrip.get(trip.id)?.id ?? null,
        passportVisible: byTrip.get(trip.id)?.visible ?? null,
      })),
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Não foi possível carregar suas viagens concluídas." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Origem inválida." }, { status: 403 });
  const auth = await authenticatedSession();
  if (!auth)
    return Response.json({ error: "Entre na sua conta Voyra." }, { status: 401 });

  try {
    const { tripId } = z.object({ tripId: z.string().uuid() }).parse(await request.json());
    const summary = await getTripCompletion(auth.token, tripId);
    const admin = adminClient();
    const values = {
      user_id: auth.user.id,
      trip_id: summary.trip_id,
      name: summary.name,
      destination: summary.destination,
      country: summary.country,
      start_date: summary.start_date,
      end_date: summary.end_date,
      days: summary.days,
      place_count: summary.place_count,
      public_route_id: summary.public_route_id,
      visible: true,
    };
    const inserted = await admin.schema("social").from("passports").insert(values).select("*").single();
    if (!inserted.error) return Response.json(inserted.data, { status: 201 });
    if (inserted.error.code !== "23505") throw inserted.error;

    const existing = await admin
      .schema("social")
      .from("passports")
      .select("*")
      .eq("user_id", auth.user.id)
      .eq("trip_id", summary.trip_id)
      .single();
    if (existing.error) throw existing.error;
    return Response.json(existing.data);
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível liberar seu Voyra Passport.",
      },
      { status: 400 },
    );
  }
}
