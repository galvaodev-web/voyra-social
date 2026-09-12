import Link from "next/link";
import { Compass, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ImportRouteButton } from "@/components/routes/ImportRouteButton";

export const metadata = { title: "Roteiros da comunidade" };
export const dynamic = "force-dynamic";

type CommunityRoute = {
  id: string;
  title: string;
  destination: string;
  author: string;
  days: number;
  tips: string;
  activities: unknown;
};

export default async function Page() {
  const client = await createClient();
  let routes: CommunityRoute[] = [];
  if (client) {
    const result = await client
      .from("published_routes")
      .select("id,title,destination,author,days,tips,activities")
      .eq("published", true)
      .order("updated_at", { ascending: false })
      .limit(24);
    if (!result.error) routes = (result.data ?? []) as CommunityRoute[];
  }

  return (
    <>
      <section className="page-intro">
        <div>
          <span className="eyebrow">INSPIRAÇÃO QUE VIRA CAMINHO</span>
          <h1>Veja uma viagem. Vá também.</h1>
          <p>Roteiros publicados por viajantes e prontos para virar uma viagem sua.</p>
        </div>
      </section>

      {routes.length ? (
        <section className="destination-grid">
          {routes.map((route) => {
            const activities = Array.isArray(route.activities) ? route.activities.length : 0;
            return (
              <article className="rail-card" key={route.id}>
                <span className="eyebrow"><Compass size={13} /> ROTEIRO DA COMUNIDADE</span>
                <h2>{route.title}</h2>
                <p><MapPin size={14} /> {route.destination}</p>
                <p>{route.days} dias · {activities} lugares · por {route.author}</p>
                <p className="muted">{route.tips}</p>
                <ImportRouteButton routeId={route.id} />
              </article>
            );
          })}
        </section>
      ) : (
        <section className="empty-state">
          <h2>Os primeiros roteiros estão a caminho.</h2>
          <p>
            Quando viajantes publicarem roteiros pelo Voyra Travel, eles aparecerão aqui para
            descoberta e importação.
          </p>
          <Link href="/salvos" className="primary">
            Organizar minhas descobertas
          </Link>
        </section>
      )}
    </>
  );
}
