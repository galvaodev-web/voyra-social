import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  getUserTrips,
  addPlaceToTrip,
  importRoute,
  publishTrip,
  TravelUnavailable,
} from "@/lib/voyra-travel";
import { isGithubPages } from "@/lib/deploy";

async function token() {
  const c = await createClient();
  if (!c) return null;
  const {
    data: { user },
  } = await c.auth.getUser();
  if (!user) return null;
  const {
    data: { session },
  } = await c.auth.getSession();
  return session?.access_token ?? null;
}

export async function GET() {
  if (isGithubPages) return Response.json([]);
  const t = await token();
  if (!t)
    return Response.json(
      { error: "Entre na sua conta Voyra para ver suas viagens." },
      { status: 401 },
    );
  try {
    return Response.json(await getUserTrips(t));
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof TravelUnavailable
            ? e.message
            : "Suas viagens estão indisponíveis no momento.",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return new Response(null, { status: 403 });
  const t = await token();
  if (!t)
    return Response.json(
      { error: "Entre na sua conta Voyra." },
      { status: 401 },
    );
  try {
    const b = z
      .object({
        action: z.enum(["add_place", "import_route", "publish_trip"]).optional(),
        tripId: z.string().uuid().optional(),
        postId: z.string().uuid().optional(),
        routeId: z.string().uuid().optional(),
      })
      .parse(await request.json());

    if (b.action === "import_route") {
      if (!b.routeId) throw new Error("route");
      return Response.json(await importRoute(t, b.routeId));
    }
    if (b.action === "publish_trip") {
      if (!b.tripId) throw new Error("trip");
      return Response.json(await publishTrip(t, b.tripId));
    }
    if (!b.tripId || !b.postId) throw new Error("place");

    const c = await createClient();
    const { data } = await c!
      .schema("social")
      .rpc("post_detail", { target_id: b.postId });
    if (!data?.place_name)
      return Response.json(
        { error: "Este lugar não está disponível." },
        { status: 404 },
      );
    return Response.json(await addPlaceToTrip(t, b.tripId, b.postId));
  } catch (error) {
    const message =
      error instanceof TravelUnavailable
        ? error.message
        : "Não foi possível concluir a ação no Voyra Travel. Tente novamente.";
    return Response.json({ error: message }, { status: 503 });
  }
}
