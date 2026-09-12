import { notFound } from "next/navigation";
import { getPost, getFeed } from "@/lib/feed/service";
import { PostCard } from "@/components/posts/PostCard";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await getPost(id);
  if (!p || p.visibility !== "PUBLIC")
    return {
      title: "Experiência privada",
      robots: { index: false, follow: false },
    };
  return {
    title: `${p.author.name} em ${p.destination?.name ?? "viagem"}`,
    description: p.caption.slice(0, 150),
    robots: { index: !p.demo },
    openGraph: {
      type: "article" as const,
      images: p.media[0]?.url ? [p.media[0].url] : [],
    },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) notFound();
  const related = await getFeed({
    destination: post.destination_id ?? undefined,
  });
  return (
    <div style={{ maxWidth: 800, margin: "auto" }}>
      {post.demo && (
        <p className="notice">
          Experiência de demonstração. Pessoas, relatos e métricas são
          ilustrativos.
        </p>
      )}
      <PostCard post={post} expanded />
      <h2 style={{ margin: "28px 0" }}>Continue sua descoberta</h2>
      {related.posts
        .filter((p) => p.id !== id)
        .slice(0, 3)
        .map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
    </div>
  );
}
