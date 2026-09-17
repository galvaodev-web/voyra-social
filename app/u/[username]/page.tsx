import { getProfile, getFeed } from "@/lib/feed/service";
import { travelers } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { FollowButton } from "@/components/profile/FollowButton";
import { PostCard } from "@/components/posts/PostCard";
import { ProfileReport } from "@/components/profile/ProfileReport";
import type { Passport } from "@/types/social";
import { isGithubPages } from "@/lib/deploy";
import { VoyraTokenCard } from "@/components/passport/VoyraTokenCard";

export function generateStaticParams() {
  return travelers.map((traveler) => ({ username: traveler.username }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const p = await getProfile(username);
  return { title: p?.name ?? "Viajante", description: p?.bio };
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const { tab = "posts" } = isGithubPages
    ? { tab: "posts" }
    : await searchParams;
  const p = await getProfile(username);
  if (!p) notFound();
  const feed = await getFeed({ author: p.id });
  const client = await createClient();
  let passports: Passport[] = [];
  if (client) {
    const result = await client
      .schema("social")
      .from("passports")
      .select("*")
      .eq("user_id", p.id)
      .eq("visible", true)
      .order("end_date", { ascending: false })
      .limit(50);
    if (!result.error) passports = (result.data ?? []) as Passport[];
  }
  const publicTokens = passports.flatMap((passport) =>
    passport.token_snapshot.map((token) => ({ token, recapId: passport.id })),
  );
  const passportCountries = new Set(
    publicTokens.map(({ token }) => token.country_name).filter(Boolean),
  ).size;
  const passportCities = new Set(
    publicTokens
      .filter(({ token }) => token.token_type === "JOURNEY")
      .map(({ token }) => token.destination)
      .filter(Boolean),
  ).size;
  return (
    <div style={{ maxWidth: 900, margin: "auto" }}>
      {p.cover_url && (
        <div className="profile-cover">
          <Image
            src={p.cover_url}
            alt="Imagem de viagem escolhida para o perfil"
            fill
            sizes="900px"
          />
        </div>
      )}
      <section className="profile-card">
        <div className="profile-heading">
          <div className="avatar">
            {p.avatar_url ? (
              <Image src={p.avatar_url} alt={p.name} fill sizes="75px" />
            ) : (
              p.name[0]
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h1>{p.name}</h1>
            <p>
              @{p.username} · {p.city}, {p.country}
            </p>
          </div>
          <FollowButton userId={p.id} demo={feed.demo} />
          <ProfileReport id={p.id} demo={feed.demo} />
        </div>
        <p>{p.bio}</p>
        {p.traveling && (
          <p className="notice">
            Viajando por {p.traveling} · Região compartilhada pelo viajante
          </p>
        )}
        <div className="profile-stats">
          <span>
            <strong>{p.countries}</strong>
            <small>países</small>
          </span>
          <span>
            <strong>{p.cities}</strong>
            <small>cidades</small>
          </span>
          <span>
            <strong>{p.routes}</strong>
            <small>roteiros</small>
          </span>
        </div>
        {feed.demo && (
          <p className="demo-label">Perfil e estatísticas de demonstração</p>
        )}
        <nav className="profile-tabs">
          <Link href={`/u/${username}`}>Posts</Link>
          <Link href={`/u/${username}?tab=passport`}>Passport</Link>
          <Link href={`/u/${username}?tab=viagens`}>Viagens</Link>
          <Link href={`/u/${username}?tab=roteiros`}>Roteiros</Link>
        </nav>
      </section>
      {tab === "posts" ? (
        feed.posts.map((post) => <PostCard key={post.id} post={post} />)
      ) : tab === "passport" ? (
        publicTokens.length ? (
          <section style={{ marginTop: 24 }}>
            <div className="profile-stats">
              <span><strong>{passportCountries}</strong><small>países</small></span>
              <span><strong>{passportCities}</strong><small>cidades</small></span>
              <span><strong>{passports.length}</strong><small>viagens verificadas</small></span>
            </div>
            <div className="voyra-token-grid">
              {publicTokens.map(({ token, recapId }) => (
                <VoyraTokenCard token={token} recapId={recapId} key={token.public_id} />
              ))}
            </div>
          </section>
        ) : (
          <section className="empty-state"><h2>Nenhum Token público ainda.</h2><p>Tokens aparecem no Voyra Passport quando o viajante conclui e compartilha uma viagem.</p></section>
        )
      ) : (
        <section className="empty-state">
          <h2>
            {tab === "viagens"
              ? "Novas histórias vêm por aí."
              : "Os próximos caminhos ainda estão sendo desenhados."}
          </h2>
          <p>
            Somente viagens e roteiros publicados com consentimento aparecem
            aqui.
          </p>
        </section>
      )}
    </div>
  );
}
