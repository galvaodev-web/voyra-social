import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  commentSchema,
  collectionSchema,
  reportReasons,
  usernameSchema,
} from "@/lib/validation";
import { isGithubPages } from "@/lib/deploy";
const uuid = z.string().uuid();

export async function GET(request: Request) {
  if (isGithubPages)
    return Response.json({
      error: "Recursos de conta nao rodam no GitHub Pages.",
    });
  const client = await createClient();
  if (!client)
    return Response.json(
      { error: "Conecte o Supabase para acessar sua conta Voyra." },
      { status: 503 },
    );
  const {
    data: { user },
  } = await client.auth.getUser();
  const q = new URL(request.url).searchParams;
  const db = client.schema("social");
  if (q.get("resource") === "relationship") {
    const target = uuid.safeParse(q.get("target"));
    if (!target.success)
      return Response.json({ error: "Perfil inválido." }, { status: 400 });
    if (!user) return Response.json({ following: false, self: false });
    const { data, error } = await db
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", target.data)
      .maybeSingle();
    if (error)
      return Response.json(
        { error: "Não foi possível verificar o perfil." },
        { status: 400 },
      );
    return Response.json({ following: !!data, self: user.id === target.data });
  }
  if (q.get("resource") === "comments") {
    const id = uuid.safeParse(q.get("postId"));
    if (!id.success)
      return Response.json({ error: "Publicação inválida." }, { status: 400 });
    const { data, error } = await db
      .from("comments")
      .select("*,author:profiles!author_id(*)")
      .eq("post_id", id.data)
      .order("created_at")
      .limit(100);
    return Response.json(
      error ? { error: "Comentários indisponíveis." } : data,
      { status: error ? 400 : 200 },
    );
  }
  if (!user)
    return Response.json(
      { error: "Entre na sua conta Voyra para continuar." },
      { status: 401 },
    );
  if (q.get("resource") === "collections") {
    const { data, error } = await db
      .from("collections")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    return Response.json(error ? { error: "Coleções indisponíveis." } : data, {
      status: error ? 400 : 200,
    });
  }
  return Response.json({ error: "Recurso não encontrado." }, { status: 404 });
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Origem inválida." }, { status: 403 });
  const client = await createClient();
  if (!client)
    return Response.json(
      {
        error:
          "O Supabase ainda não está conectado. Entre quando a configuração estiver concluída.",
      },
      { status: 503 },
    );
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return Response.json(
      { error: "Entre na sua conta Voyra para continuar." },
      { status: 401 },
    );
  try {
    const b = await request.json();
    const db = client.schema("social");
    let result;
    if (b.action === "collection") {
      const fields = collectionSchema.parse({
        name: b.name,
        description: b.description ?? "",
      });
      result = await db
        .from("collections")
        .insert({ ...fields, user_id: user.id })
        .select()
        .single();
    } else if (b.action === "profile") {
      const fields = z
        .object({
          username: usernameSchema,
          name: z.string().trim().min(2).max(80),
          bio: z.string().max(400),
          city: z.string().max(80),
          country: z.string().max(80),
          creator: z.boolean(),
        })
        .parse(b.profile);
      result = await db
        .from("profiles")
        .update(fields)
        .eq("id", user.id)
        .select()
        .single();
    } else if (b.action === "account_request") {
      result = await db.from("account_requests").insert({
        user_id: user.id,
        type: z.enum(["EXPORT", "DELETE_ECOSYSTEM"]).parse(b.type),
      });
    } else {
      const target = uuid.parse(b.target);
      if (b.action === "like" || b.action === "save") {
        const table = b.action === "like" ? "post_likes" : "saved_posts";
        result =
          b.remove === true
            ? await db
                .from(table)
                .delete()
                .eq("post_id", target)
                .eq("user_id", user.id)
            : await db
                .from(table)
                .upsert(
                  { post_id: target, user_id: user.id },
                  { onConflict: "post_id,user_id", ignoreDuplicates: true },
                );
      } else if (b.action === "follow") {
        if (target === user.id) throw new Error("self");
        result =
          b.remove === true
            ? await db
                .from("follows")
                .delete()
                .eq("follower_id", user.id)
                .eq("following_id", target)
            : await db.from("follows").upsert(
                { follower_id: user.id, following_id: target },
                {
                  onConflict: "follower_id,following_id",
                  ignoreDuplicates: true,
                },
              );
      } else if (b.action === "block") {
        result = await db
          .from("user_blocks")
          .upsert(
            { blocker_id: user.id, blocked_id: target },
            { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
          );
      } else if (b.action === "comment") {
        result = await db
          .from("comments")
          .insert({
            post_id: target,
            author_id: user.id,
            content: commentSchema.parse(b.content),
            parent_comment_id: b.parent ? uuid.parse(b.parent) : null,
          })
          .select("*,author:profiles!author_id(*)")
          .single();
      } else if (b.action === "delete_comment") {
        result = await db
          .from("comments")
          .delete()
          .eq("id", target)
          .eq("author_id", user.id)
          .select("id")
          .single();
      } else if (b.action === "report") {
        result = await db.from("reports").insert({
          reporter_id: user.id,
          target_id: target,
          target_type: z.enum(["POST", "COMMENT", "PROFILE"]).parse(b.type),
          reason: z.enum(reportReasons).parse(b.reason),
          description: z
            .string()
            .max(2000)
            .parse(b.description ?? ""),
        });
      } else if (b.action === "collection_item") {
        result =
          b.remove === true
            ? await db
                .from("collection_items")
                .delete()
                .eq("collection_id", uuid.parse(b.collectionId))
                .eq("post_id", target)
            : await db.from("collection_items").upsert(
                {
                  collection_id: uuid.parse(b.collectionId),
                  post_id: target,
                },
                {
                  onConflict: "collection_id,post_id",
                  ignoreDuplicates: true,
                },
              );
      } else if (
        b.action === "destination_follow" ||
        b.action === "want_to_go"
      ) {
        const table =
          b.action === "destination_follow"
            ? "destination_follows"
            : "want_to_go";
        result =
          b.remove === true
            ? await db
                .from(table)
                .delete()
                .eq("user_id", user.id)
                .eq("destination_id", target)
            : await db.from(table).upsert(
                { user_id: user.id, destination_id: target },
                {
                  onConflict: "user_id,destination_id",
                  ignoreDuplicates: true,
                },
              );
      } else if (b.action === "read_notification") {
        result = await db
          .from("notifications")
          .update({ read_at: new Date().toISOString() })
          .eq("id", target)
          .eq("user_id", user.id);
      } else if (b.action === "delete_post") {
        result = await db
          .from("posts")
          .delete()
          .eq("id", target)
          .eq("author_id", user.id);
      } else
        return Response.json(
          { error: "Ação não disponível." },
          { status: 400 },
        );
    }
    if (result.error)
      return Response.json(
        {
          error:
            result.error.code === "23505"
              ? "Este registro já existe. Tente outro nome."
              : "Não foi possível concluir. Verifique sua permissão e tente novamente em alguns instantes.",
        },
        { status: 400 },
      );
    return Response.json(result.data ?? { ok: true });
  } catch {
    return Response.json(
      { error: "Confira os dados e tente novamente." },
      { status: 400 },
    );
  }
}
