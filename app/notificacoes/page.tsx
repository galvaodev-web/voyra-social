import { createClient } from "@/lib/supabase/server";
import { NotificationItem } from "@/components/NotificationItem";
import Link from "next/link";
export const metadata = { title: "Notificações", robots: { index: false } };
export default async function Page() {
  const c = await createClient();
  const { data } = c
    ? await c
        .schema("social")
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50)
    : { data: [] };
  return (
    <>
      <div className="page-intro">
        <div>
          <span className="eyebrow">A COMUNIDADE POR PERTO</span>
          <h1>Novidades no seu caminho.</h1>
        </div>
      </div>
      {data?.length ? (
        data.map((n) => <NotificationItem key={n.id} item={n} />)
      ) : (
        <section className="empty-state">
          <h2>Tudo tranquilo por aqui.</h2>
          <p>Novos seguidores, comentários e conversas aparecerão aqui.</p>
          <Link href="/login" className="primary">
            Entrar na minha conta
          </Link>
        </section>
      )}
    </>
  );
}
