import { redirect } from "next/navigation";
import { Activity, Flag, Plane, Search, UsersRound } from "lucide-react";
import { ModerationQueue, type AdminReport } from "@/components/admin/ModerationQueue";
import { adminSession } from "@/lib/server/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administração", robots: { index: false } };

export default async function AdminPage() {
  const session = await adminSession();
  if (!session) redirect("/");
  const admin = session.admin;

  async function count(schema: "public" | "social", table: string, filter?: [string, unknown]) {
    let query = (schema === "social" ? admin.schema("social") : admin)
      .from(table)
      .select("*", { count: "exact", head: true });
    if (filter) query = query.eq(filter[0], filter[1]);
    const result = await query;
    return result.error ? null : result.count;
  }

  const [users, posts, trips, reports, creators, searches, referrals, subscriptions, queue] =
    await Promise.all([
      count("social", "profiles"),
      count("social", "posts", ["status", "PUBLISHED"]),
      count("public", "trips"),
      count("social", "reports", ["status", "OPEN"]),
      count("social", "profiles", ["creator", true]),
      count("public", "travel_searches"),
      count("public", "partner_referrals"),
      count("public", "subscriptions", ["status", "active"]),
      admin
        .schema("social")
        .from("reports")
        .select("id,target_type,target_id,reason,description,created_at")
        .in("status", ["OPEN", "REVIEWING"])
        .order("created_at", { ascending: true })
        .limit(100),
    ]);
  const metrics = [
    ["Usuários", users, UsersRound],
    ["Posts", posts, Activity],
    ["Viagens", trips, Plane],
    ["Denúncias", reports, Flag],
    ["Creators", creators, UsersRound],
    ["Buscas", searches, Search],
    ["Referrals", referrals, Activity],
    ["Assinaturas", subscriptions, Activity],
  ] as const;

  return (
    <div className="admin-page">
      <header className="admin-header">
        <span className="eyebrow">OPERAÇÃO VOYRA</span>
        <h1>Painel administrativo</h1>
        <p>Visão operacional e fila de moderação. Papel atual: {session.role}.</p>
      </header>
      <section className="admin-metrics" aria-label="Métricas operacionais">
        {metrics.map(([label, value, Icon]) => (
          <div className="admin-metric" key={label}>
            <Icon size={18} />
            <span>{label}</span>
            <strong>{value ?? "-"}</strong>
          </div>
        ))}
      </section>
      <section className="admin-section">
        <h2>Fila de denúncias</h2>
        <ModerationQueue reports={(queue.data ?? []) as AdminReport[]} />
      </section>
    </div>
  );
}
