import { createClient } from "@/lib/supabase/server";
import { getPost } from "@/lib/feed/service";
import { PostCard } from "@/components/posts/PostCard";
import { notFound, redirect } from "next/navigation";
export const metadata = { title: "Coleção", robots: { index: false } };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await createClient();
  if (!c) redirect("/login");
  const { data: collection } = await c
    .schema("social")
    .from("collections")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!collection) notFound();
  const { data } = await c
    .schema("social")
    .from("collection_items")
    .select("post_id")
    .eq("collection_id", id)
    .limit(50);
  const posts = await Promise.all(
    (data ?? []).map((row) => getPost(row.post_id)),
  );
  return (
    <div style={{ maxWidth: 800, margin: "auto" }}>
      <h1>{collection.name}</h1>
      <p className="notice">
        {collection.description ||
          "Lugares e experiências para a próxima viagem."}
      </p>
      {posts
        .filter((p) => p !== null)
        .map((p) => (
          <PostCard post={p} key={p.id} />
        ))}
      {!posts.length && (
        <div className="empty-state">
          <h2>Sua próxima descoberta tem lugar aqui.</h2>
          <p>Salve uma publicação e escolha esta coleção.</p>
        </div>
      )}
    </div>
  );
}
