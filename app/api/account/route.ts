import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { deleteEcosystemAccount } from "@/lib/voyra-travel";
import { requestContext, structuredLog } from "@/lib/server/logger";

export async function DELETE(request: Request) {
  const context = requestContext(request, "/api/account");
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return Response.json({ error: "Origem inválida." }, { status: 403 });
    const body = (await request.json()) as { confirmation?: unknown };
    if (body.confirmation !== "EXCLUIR")
      return Response.json({ error: "Digite EXCLUIR para confirmar." }, { status: 400 });
    const client = await createClient();
    if (!client) return Response.json({ error: "Serviço indisponível." }, { status: 503 });
    const {
      data: { user },
    } = await client.auth.getUser();
    const { data: sessionData } = await client.auth.getSession();
    if (!user || !sessionData.session)
      return Response.json({ error: "Autenticação necessária." }, { status: 401 });
    context.userId = user.id;
    const admin = adminClient();
    const postResult = await admin
      .schema("social")
      .from("posts")
      .select("id")
      .eq("author_id", user.id);
    if (postResult.error) throw postResult.error;
    const postIds = (postResult.data ?? []).map((post) => post.id);
    if (postIds.length) {
      const mediaResult = await admin
        .schema("social")
        .from("post_media")
        .select("type,storage_path")
        .in("post_id", postIds);
      if (mediaResult.error) throw mediaResult.error;
      for (const item of mediaResult.data ?? []) {
        const bucket = item.type === "VIDEO" ? "social-videos" : "social-images";
        const removed = await admin.storage.from(bucket).remove([item.storage_path]);
        if (removed.error) throw removed.error;
      }
    }
    await deleteEcosystemAccount(sessionData.session.access_token);
    await client.auth.signOut({ scope: "local" });
    structuredLog("info", "account_deleted", context);
    return Response.json({ deleted: true }, { headers: { "x-request-id": context.requestId } });
  } catch (error) {
    structuredLog("error", "account_deletion_failed", context, {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Não foi possível excluir a conta. Tente novamente ou contate o suporte.", requestId: context.requestId },
      { status: 500, headers: { "x-request-id": context.requestId } },
    );
  }
}
