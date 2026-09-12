import Image from "next/image";
import { notFound } from "next/navigation";
import { getDestinations, getFeed } from "@/lib/feed/service";
import { destinations } from "@/lib/demo";
import { PostCard } from "@/components/posts/PostCard";
import { DestinationActions } from "@/components/destinations/DestinationActions";

export function generateStaticParams() {
  return destinations.map((destination) => ({ slug: destination.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const d = (await getDestinations()).find((d) => d.slug === slug);
  return {
    title: d?.name ?? "Destino",
    description: d?.description,
    openGraph: { images: d ? [d.image_url] : [] },
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const d = (await getDestinations()).find((d) => d.slug === slug);
  if (!d) notFound();
  const feed = await getFeed({ destination: d.id });
  return (
    <>
      <section className="destination-hero">
        <Image
          src={d.image_url}
          fill
          priority
          sizes="100vw"
          alt={`${d.name}, ${d.country}`}
        />
        <div>
          <span className="eyebrow" style={{ color: "white" }}>
            SEU PRÓXIMO DESTINO
          </span>
          <h1>{d.name}</h1>
          <p>
            {d.country} · {d.description}
          </p>
        </div>
      </section>
      <div className="detail-columns">
        <section>
          {feed.demo && (
            <p className="demo-label">Publicações de demonstração</p>
          )}
          {feed.posts.map((p) => (
            <PostCard post={p} key={p.id} />
          ))}
          {!feed.posts.length && (
            <div className="empty-state">
              <h2>Seja a primeira história deste destino.</h2>
            </div>
          )}
        </section>
        <aside className="detail-context">
          <h2>Explore {d.name} no seu tempo.</h2>
          <p>{d.season}</p>
          <p>
            Consulte a previsão antes de viajar. Ainda não há uma fonte de clima
            ao vivo conectada.
          </p>
          <DestinationActions id={d.id} demo={feed.demo} />
          <h3>Dicas da comunidade</h3>
          <p>
            Experiências pessoais ajudam a planejar. Confirme horários, preços e
            condições com o estabelecimento.
          </p>
        </aside>
      </div>
    </>
  );
}
