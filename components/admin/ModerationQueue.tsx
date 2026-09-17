"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, CircleAlert, MessageSquareWarning, ShieldCheck, Trash2 } from "lucide-react";

export type AdminReport = {
  id: string;
  target_type: "POST" | "COMMENT" | "PROFILE";
  target_id: string;
  reason: string;
  description: string;
  created_at: string;
};

const actions = [
  { value: "DISMISS", label: "Ignorar", icon: ShieldCheck },
  { value: "REMOVE_CONTENT", label: "Remover", icon: Trash2 },
  { value: "WARN", label: "Advertir", icon: CircleAlert },
  { value: "SUSPEND", label: "Suspender", icon: MessageSquareWarning },
  { value: "BAN", label: "Banir", icon: Ban },
] as const;

export function ModerationQueue({ reports }: { reports: AdminReport[] }) {
  const router = useRouter();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function moderate(report: AdminReport, action: (typeof actions)[number]["value"]) {
    const reason = reasons[report.id]?.trim();
    if (!reason || reason.length < 3) {
      setMessage("Informe uma justificativa com pelo menos 3 caracteres.");
      return;
    }
    setBusy(`${report.id}:${action}`);
    setMessage("");
    try {
      const response = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: report.id, action, reason }),
      });
      const result = (await response.json()) as { error?: string; identitySync?: string };
      if (!response.ok) throw new Error(result.error || "Falha na moderação.");
      setMessage(
        result.identitySync === "pending"
          ? "A sanção foi aplicada; a sincronização do bloqueio de login ficou pendente."
          : "Ação registrada com sucesso.",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha na moderação.");
    } finally {
      setBusy(null);
    }
  }

  if (!reports.length)
    return <section className="empty-state"><h2>Fila em dia</h2><p>Não há denúncias abertas.</p></section>;

  return (
    <div className="admin-report-list">
      {reports.map((report) => (
        <article className="admin-report" key={report.id}>
          <div className="admin-report-heading">
            <strong>{report.target_type}</strong>
            <time dateTime={report.created_at}>
              {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.created_at))}
            </time>
          </div>
          <h3>{report.reason}</h3>
          <p>{report.description || "Sem descrição adicional."}</p>
          <small>Alvo: {report.target_id}</small>
          <label>
            Justificativa administrativa
            <input
              value={reasons[report.id] ?? ""}
              onChange={(event) => setReasons((current) => ({ ...current, [report.id]: event.target.value }))}
              maxLength={1000}
            />
          </label>
          <div className="admin-actions">
            {actions
              .filter((action) => !(report.target_type === "PROFILE" && action.value === "REMOVE_CONTENT"))
              .map(({ value, label, icon: Icon }) => (
                <button
                  className={value === "BAN" || value === "REMOVE_CONTENT" ? "secondary danger" : "secondary"}
                  disabled={busy !== null}
                  onClick={() => void moderate(report, value)}
                  key={value}
                  title={label}
                >
                  <Icon size={15} /> {busy === `${report.id}:${value}` ? "Processando" : label}
                </button>
              ))}
          </div>
        </article>
      ))}
      <p role="status" className="notice">{message}</p>
    </div>
  );
}
