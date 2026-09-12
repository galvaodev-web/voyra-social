"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, ArrowUpRight, MapPin } from "lucide-react";

type EligibleTrip = {
  id: string;
  name: string;
  destination: string;
  end_date: string;
  passportId: string | null;
};

export function PassportPanel() {
  const [trips, setTrips] = useState<EligibleTrip[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    try {
      const response = await fetch("/api/passport", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar o Passport.");
      setTrips(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível carregar o Passport.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <section className="rail-card" style={{ marginTop: 24 }}>
      <div className="section-heading">
        <h2><Award size={19} /> Voyra Passport</h2>
      </div>
      <p className="rail-subtitle">
        Viagens concluídas viram selos verificados para guardar e compartilhar.
      </p>
      {!trips.length && !message && <p className="muted">Conclua uma viagem no Voyra Travel para liberar seu primeiro selo.</p>}
      <div className="stack">
        {trips.map((trip) => (
          <div className="collection-option" key={trip.id} style={{ cursor: "default" }}>
            <span>
              <strong>{trip.destination}</strong>
              <small style={{ display: "block" }}><MapPin size={12} /> {trip.name}</small>
            </span>
            {trip.passportId ? (
              <Link className="secondary" href={`/recap/${trip.passportId}`}>
                Ver selo <ArrowUpRight size={14} />
              </Link>
            ) : (
              <button
                className="primary"
                disabled={busy === trip.id}
                onClick={async () => {
                  setBusy(trip.id);
                  setMessage("");
                  try {
                    const response = await fetch("/api/passport", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ tripId: trip.id }),
                    });
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.error || "Não foi possível liberar o selo.");
                    setTrips((current) => current.map((item) => item.id === trip.id ? { ...item, passportId: data.id } : item));
                    setMessage("Voyra Passport liberado!");
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : "Não foi possível liberar o selo.");
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                {busy === trip.id ? "Liberando…" : "Liberar selo"}
              </button>
            )}
          </div>
        ))}
      </div>
      {message && <p role="status" className="notice">{message}</p>}
    </section>
  );
}
