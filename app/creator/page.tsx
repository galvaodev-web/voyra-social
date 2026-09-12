import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
export const metadata = {
  title: "Painel do criador",
  robots: { index: false },
};
export default async function Page() {
  const c = await createClient();
  if (!c) redirect("/login");
  const {
    data: { user },
  } = await c.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await c.schema("social").rpc("creator_summary");
  if (error) throw new Error("Métricas indisponíveis.");
  const cards = [
    ["Visualizações", data.views ?? "—"],
    ["Curtidas", data.likes],
    ["Salvamentos", data.saves],
    ["Seguidores", data.followers],
    ["Posts publicados", data.posts],
    ["Roteiros publicados", data.routes],
  ];
  return (
    <>
      <section className="page-intro">
        <div>
          <span className="eyebrow">VOYRA PARA CRIADORES</span>
          <h1>Suas histórias levam pessoas mais longe.</h1>
          <p>Acompanhe o impacto das suas descobertas.</p>
        </div>
      </section>
      <div className="metric-grid">
        {cards.map(([label, value]) => (
          <section className="metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small className="muted">Total acumulado</small>
          </section>
        ))}
      </div>
      <p className="notice">
        O coletor agregado de visualizações ainda não está ativo. Nenhum número
        é estimado ou inventado.
      </p>
    </>
  );
}
