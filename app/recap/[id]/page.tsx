import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, CalendarDays, MapPin, Route } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ShareRecapButton } from "@/components/passport/ShareRecapButton";
import { PublishRecapButton } from "@/components/passport/PublishRecapButton";
import { VoyraTokenCard } from "@/components/passport/VoyraTokenCard";
import type { Passport, Profile } from "@/types/social";

async function loadRecap(id: string) {
  const client = await createClient();
  if (!client) return null;
  const passport = await client
    .schema("social")
    .from("passports")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (passport.error || !passport.data) return null;
  const [profile, auth] = await Promise.all([
    client
      .schema("social")
      .from("profiles")
      .select("id,username,name,bio,city,country,avatar_url,countries,cities,routes,creator,traveling")
      .eq("id", passport.data.user_id)
      .maybeSingle(),
    client.auth.getUser(),
  ]);
  return {
    passport: passport.data as Passport,
    profile: profile.data as Profile | null,
    owner: auth.data.user?.id === passport.data.user_id,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const recap = await loadRecap(id);
  if (!recap) return { title: "Travel Recap" };
  const title = `${recap.passport.destination} · Travel Recap`;
  const description = `${recap.passport.days} dias e ${recap.passport.place_count} lugares em ${recap.passport.destination}, registrados no Voyra Passport.`;
  return { title, description, openGraph: { title, description, type: "article" } };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recap = await loadRecap(id);
  if (!recap) notFound();
  const { passport, profile, owner } = recap;
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const period = `${formatter.format(new Date(`${passport.start_date}T00:00:00Z`))} - ${formatter.format(new Date(`${passport.end_date}T00:00:00Z`))}`;

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "48px 20px 80px" }}>
      <section className="profile-card" style={{ textAlign: "center", padding: 32 }}>
        <span className="eyebrow"><Award size={14} /> VOYRA PASSPORT · VIAGEM VERIFICADA</span>
        <div style={{ margin: "28px auto 20px", width: 112, height: 112, borderRadius: "50%", display: "grid", placeItems: "center", border: "2px solid currentColor" }}>
          <Award size={52} />
        </div>
        <h1 style={{ fontSize: "clamp(2.4rem, 8vw, 5rem)", marginBottom: 8 }}>{passport.destination}</h1>
        {passport.country && <p style={{ fontSize: "1.15rem" }}>{passport.country}</p>}
        <p className="muted">{passport.name}</p>

        <div className="profile-stats" style={{ marginTop: 28 }}>
          <span><strong>{passport.days}</strong><small>dias</small></span>
          <span><strong>{passport.place_count}</strong><small>lugares</small></span>
          <span><strong>{new Date(`${passport.end_date}T00:00:00Z`).getUTCFullYear()}</strong><small>ano</small></span>
        </div>

        <div className="stack" style={{ marginTop: 28, textAlign: "left" }}>
          <p><CalendarDays size={16} /> {period}</p>
          <p><MapPin size={16} /> Uma viagem concluída e confirmada pelo Voyra Travel.</p>
          {passport.cities.length > 0 && <p><MapPin size={16} /> {passport.cities.join(", ")}</p>}
          {profile && <p>Por <Link href={`/u/${profile.username}`}>@{profile.username}</Link></p>}
        </div>

        {passport.token_snapshot.length > 0 && (
          <div className="stack" style={{ marginTop: 24, textAlign: "left" }}>
            <h2>Voyra Tokens</h2>
            {passport.token_snapshot.map((token) => <VoyraTokenCard token={token} key={token.public_id} />)}
          </div>
        )}

        <div className="stack" style={{ marginTop: 28 }}>
          <ShareRecapButton title={`${passport.destination} · Voyra Travel Recap`} />
          {owner && <PublishRecapButton passportId={passport.id} />}
          {passport.public_route_id && (
            <a className="secondary" href={`${process.env.NEXT_PUBLIC_TRAVEL_URL ?? "https://voyra.com"}/roteiros/${passport.public_route_id}`}>
              <Route size={16} /> Ver roteiro público
            </a>
          )}
          <Link className="secondary" href="/">Descobrir minha próxima viagem</Link>
        </div>
      </section>
      <p className="community-note" style={{ marginTop: 20 }}>
        O recap exibe somente dados públicos do Passport. Documentos, reservas, participantes, diário e despesas nunca aparecem nesta página.
      </p>
    </main>
  );
}
