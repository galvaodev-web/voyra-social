import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requestContext, structuredLog } from "@/lib/server/logger";

export async function POST(request: Request) {
  const context = requestContext(request, "/api/passport/share");
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return Response.json({ error: "Origem inválida." }, { status: 403 });
    const { passportId } = z.object({ passportId: z.string().uuid() }).parse(await request.json());
    const client = await createClient();
    if (!client) return Response.json({ error: "Serviço indisponível." }, { status: 503 });
    const { data: { user } } = await client.auth.getUser();
    if (!user) return Response.json({ error: "Entre na sua conta Voyra." }, { status: 401 });
    context.userId = user.id;
    const result = await client.schema("social").rpc("share_passport", {
      target_passport: passportId,
    });
    if (result.error) throw result.error;
    structuredLog("info", "passport_shared_to_social", context, { passportId });
    return Response.json(
      { postId: result.data },
      { headers: { "x-request-id": context.requestId } },
    );
  } catch (error) {
    structuredLog("error", "passport_share_failed", context, {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Não foi possível publicar o Recap no Social." },
      { status: 400, headers: { "x-request-id": context.requestId } },
    );
  }
}
