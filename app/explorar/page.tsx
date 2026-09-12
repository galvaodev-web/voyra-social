import { getFeed, getDestinations } from "@/lib/feed/service";
import { Feed } from "@/components/feed/Feed";
import { DestinationCard } from "@/components/destinations/DestinationCard";
import { createClient } from "@/lib/supabase/server";
import { travelers } from "@/lib/demo";
import Link from "next/link";
export const metadata = { title: "Explorar" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const [feed, destinations, c] = await Promise.all([
    getFeed({ search: q }),
    getDestinations(),
    createClient(),
  ]);
  let people = travelers.filter(
    (p) =>
      q && `${p.name} ${p.username}`.toLowerCase().includes(q.toLowerCase()),
  );
  if (c && q) {
    const { data } = await c
      .schema("social")
      .from("profiles")
      .select("*")
      .ilike("name", `%${q.slice(0, 80)}%`)
      .limit(12);
    people = data ?? [];
  }
  return (
    <>
      {q && (
        <>
          <div className="destinations-grid">
            {destinations
              .filter((d) =>
                `${d.name} ${d.country}`
                  .toLowerCase()
                  .includes(q.toLowerCase()),
              )
              .map((d) => (
                <DestinationCard key={d.id} destination={d} />
              ))}
          </div>
          {people.map((p) => (
            <Link key={p.id} className="secondary" href={`/u/${p.username}`}>
              {p.name} · @{p.username}
            </Link>
          ))}
        </>
      )}
      <Feed
        key={q ?? "explore"}
        initial={feed}
        destinations={destinations}
        query={q}
        mode="explore"
        title={
          q ? `Descobertas para “${q}”` : "O mundo tem muito mais para mostrar."
        }
      />
    </>
  );
}
