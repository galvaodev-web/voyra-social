import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { getTripCompletion } from "@/lib/voyra-travel";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Origem inválida." }, { status: 403 });
  const client = await createClient();
  if (!client) return Response.json({ error: "Contas reais ainda não estão disponíveis." }, { status: 503 });
  const {
    data: { user },
  } = await client.auth.getUser();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!user || !session?.access_token)
    return Response.json({ error: "Entre na sua conta Voyra." }, { status: 401 });

  try {
    const { tripId } = z.object({ tripId: z.string().uuid() }).parse(await request.json());
    const summary = await getTripCompletion(session.access_token, tripId);
    const admin = adminClient();
    const values = {
      user_id: user.id,
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
      .eq("user_id", user.id)
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
