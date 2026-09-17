import { z } from "zod";
import { adminSession } from "@/lib/server/admin";
import { requestContext, structuredLog } from "@/lib/server/logger";

const inputSchema = z.object({
  reportId: z.string().uuid(),
  action: z.enum(["DISMISS", "REMOVE_CONTENT", "WARN", "SUSPEND", "BAN"]),
  reason: z.string().trim().min(3).max(1000),
});

export async function POST(request: Request) {
  const context = requestContext(request, "/api/admin/moderation");
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return Response.json({ error: "Origem inválida." }, { status: 403 });
    const session = await adminSession();
    if (!session)
      return Response.json({ error: "Acesso administrativo necessário." }, { status: 403 });
    context.userId = session.user.id;
    const input = inputSchema.parse(await request.json());
    const report = await session.admin
      .schema("social")
      .from("reports")
      .select("target_type,target_id,status")
      .eq("id", input.reportId)
      .single();
    if (report.error || !report.data || !["OPEN", "REVIEWING"].includes(report.data.status))
      return Response.json({ error: "Denúncia indisponível." }, { status: 404 });

    let media: { type: "IMAGE" | "VIDEO"; storage_path: string }[] = [];
    if (input.action === "REMOVE_CONTENT" && report.data.target_type === "POST") {
      const result = await session.admin
        .schema("social")
        .from("post_media")
        .select("type,storage_path")
        .eq("post_id", report.data.target_id);
      if (!result.error) media = (result.data ?? []) as typeof media;
    }

    const moderated = await session.admin.schema("social").rpc("moderate_report", {
      actor: session.user.id,
      target_report: input.reportId,
      action_name: input.action,
      action_reason: input.reason,
    });
    if (moderated.error || !moderated.data?.[0]) throw moderated.error ?? new Error("No result");
    const targetUserId = moderated.data[0].target_user_id as string;

    let identitySync: "complete" | "pending" = "complete";
    if (input.action === "SUSPEND" || input.action === "BAN") {
      const authResult = await session.admin.auth.admin.updateUserById(targetUserId, {
        ban_duration: input.action === "SUSPEND" ? "168h" : "876000h",
      });
      if (authResult.error) {
        identitySync = "pending";
        structuredLog("error", "moderation_identity_sync_failed", context, {
          action: input.action,
          reportId: input.reportId,
        });
      }
    }

    for (const item of media) {
      const bucket = item.type === "VIDEO" ? "social-videos" : "social-images";
      const removed = await session.admin.storage.from(bucket).remove([item.storage_path]);
      if (removed.error)
        structuredLog("warn", "moderation_storage_cleanup_failed", context, {
          reportId: input.reportId,
          bucket,
        });
    }
    structuredLog("info", "moderation_action_completed", context, {
      action: input.action,
      reportId: input.reportId,
      identitySync,
    });
    return Response.json(
      { ok: true, identitySync, requestId: context.requestId },
      { headers: { "x-request-id": context.requestId } },
    );
  } catch (error) {
    structuredLog("error", "moderation_action_failed", context, {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Não foi possível concluir a moderação.", requestId: context.requestId },
      { status: 400, headers: { "x-request-id": context.requestId } },
    );
  }
}
