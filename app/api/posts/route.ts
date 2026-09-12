import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { postSchema } from "@/lib/validation";
import { validateFile, sniffMime } from "@/lib/media";
import sharp from "sharp";

export const dynamic = "force-static";

export async function POST(request: Request) {
  if (process.env.GITHUB_ACTIONS)
    return Response.json(
      { error: "Indisponivel no GitHub Pages." },
      { status: 503 },
    );

  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Origem inválida." }, { status: 403 });
  const client = await createClient();
  if (!client)
    return Response.json(
      { error: "Conecte o Supabase para publicar com sua conta Voyra." },
      { status: 503 },
    );
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return Response.json(
      { error: "Entre na sua conta Voyra para publicar." },
      { status: 401 },
    );
  if (Number(request.headers.get("content-length")) > 110 * 1024 * 1024)
    return Response.json(
      { error: "O envio ultrapassa o limite permitido." },
      { status: 413 },
    );
  let postId: string | null = null;
  const uploaded: { bucket: string; path: string }[] = [];
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { persistSession: false, autoRefreshToken: false } },
      )
    : null;
  try {
    const form = await request.formData();
    const raw = JSON.parse(String(form.get("post")));
    const post = postSchema.parse(raw);
    const files = form
      .getAll("media")
      .filter((f): f is File => f instanceof File);
    if (
      files.length > 10 ||
      files.reduce((s, f) => s + f.size, 0) > 100 * 1024 * 1024
    )
      throw new Error(
        "Escolha até 10 fotos e no máximo 100 MB por publicação.",
      );
    if (
      post.type === "IMAGE" &&
      (!files.length || files.some((f) => !f.type.startsWith("image/")))
    )
      throw new Error("Escolha pelo menos uma foto válida.");
    if (
      post.type === "VIDEO" &&
      (files.length !== 1 || !files[0].type.startsWith("video/"))
    )
      throw new Error("Escolha um único vídeo.");
    if (!["IMAGE", "VIDEO"].includes(post.type) && files.length)
      throw new Error("Escolha o tipo Fotos ou Vídeo para anexar mídia.");
    if (files.length && !admin)
      throw new Error("O envio de mídia ainda não está configurado.");
    const verified = [];
    for (const file of files) {
      const invalid = validateFile(file);
      if (invalid) throw new Error(invalid);
      let bytes: Uint8Array = new Uint8Array(await file.arrayBuffer());
      if (sniffMime(bytes) !== file.type)
        throw new Error(
          "O conteúdo de um arquivo não corresponde ao formato informado.",
        );
      let contentType = file.type;
      let width: number | null = null;
      let height: number | null = null;
      if (file.type.startsWith("image/")) {
        try {
          const result = await sharp(bytes, { limitInputPixels: 40000000 })
            .rotate()
            .resize({
              width: 1600,
              height: 1600,
              fit: "inside",
              withoutEnlargement: true,
            })
            .webp({ quality: 85 })
            .toBuffer({ resolveWithObject: true });
          bytes = result.data;
          contentType = "image/webp";
          width = result.info.width;
          height = result.info.height;
        } catch {
          throw new Error(
            "Não foi possível processar a imagem. Escolha uma imagem válida de até 40 megapixels.",
          );
        }
      }
      verified.push({ file, bytes, contentType, width, height });
    }
    const { data, error } = await client
      .schema("social")
      .from("posts")
      .insert({ ...post, author_id: user.id })
      .select("id")
      .single();
    if (error)
      throw new Error(
        "Não foi possível criar a publicação. Confira os campos ou tente novamente mais tarde.",
      );
    postId = data.id;
    for (let i = 0; i < verified.length; i++) {
      const { file, bytes, contentType, width, height } = verified[i];
      const video = file.type.startsWith("video/");
      const bucket = video ? "social-videos" : "social-images";
      const path = `${user.id}/${postId}/${video ? "video" : "image"}-${crypto.randomUUID()}`;
      const { error: uploadError } = await admin!.storage
        .from(bucket)
        .upload(path, bytes, { contentType, upsert: false });
      if (uploadError) throw new Error("Não foi possível enviar a mídia.");
      uploaded.push({ bucket, path });
      const { error: mediaError } = await client
        .schema("social")
        .from("post_media")
        .insert({
          post_id: postId,
          type: video ? "VIDEO" : "IMAGE",
          storage_path: path,
          position: i,
          width,
          height,
          alt:
            typeof raw.alt === "string" && raw.alt.trim()
              ? raw.alt.slice(0, 300)
              : "Experiência de viagem",
        });
      if (mediaError) throw new Error("Não foi possível vincular a mídia.");
    }
    const { error: finalError } = await client
      .schema("social")
      .rpc("finalize_post", { target: postId });
    if (finalError)
      throw new Error(
        "Não foi possível publicar. Revise os campos e tente novamente.",
      );
    return Response.json({ id: postId }, { status: 201 });
  } catch (e) {
    if (postId)
      await client.schema("social").from("posts").delete().eq("id", postId);
    if (admin)
      for (const item of uploaded)
        await admin.storage.from(item.bucket).remove([item.path]);
    return Response.json(
      {
        error:
          e instanceof Error && !("issues" in e)
            ? e.message
            : "Confira os campos da publicação.",
      },
      { status: 400 },
    );
  }
}
