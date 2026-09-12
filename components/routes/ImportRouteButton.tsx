"use client";
import { useState } from "react";
import { ArrowUpRight, Route } from "lucide-react";

export function ImportRouteButton({ routeId }: { routeId: string }) {
  const [busy, setBusy] = useState(false);
  const [tripId, setTripId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  return (
    <div className="stack" style={{ gap: 8 }}>
      <button
        className="primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          try {
            const response = await fetch("/api/travel", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "import_route", routeId }),
            });
            const result = (await response.json()) as { id?: string; error?: string };
            if (!response.ok || !result.id) throw new Error(result.error || "Não foi possível importar.");
            setTripId(result.id);
            setMessage("Roteiro adicionado ao seu Voyra Travel.");
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Não foi possível importar.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Route size={16} /> {busy ? "Importando…" : "Usar este roteiro"}
      </button>
      {tripId && (
        <a
          className="secondary"
          href={`${process.env.NEXT_PUBLIC_TRAVEL_URL ?? "https://voyra.com"}/app/viagens/${tripId}`}
        >
          Abrir no Voyra Travel <ArrowUpRight size={15} />
        </a>
      )}
      {message && <small role="status">{message}</small>}
    </div>
  );
}
