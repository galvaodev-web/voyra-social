import { createClient } from "@/lib/supabase/server";
import {
  getUserTrips,
  addPlaceToTrip,
  TravelUnavailable,
} from "@/lib/voyra-travel";
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
    const b = await request.json();
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
  } catch {
    return Response.json(
      { error: "Não foi possível adicionar o lugar. Tente novamente." },
      { status: 503 },
    );
  }
}
