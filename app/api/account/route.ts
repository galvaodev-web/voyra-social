import { createClient } from "@/lib/supabase/server";
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
