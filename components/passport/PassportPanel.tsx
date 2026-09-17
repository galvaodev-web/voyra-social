"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Award, ArrowUpRight, Eye, EyeOff, MapPin } from "lucide-react";

type EligibleTrip = {
  id: string;
  name: string;
  destination: string;
  end_date: string;
  passportId: string | null;
  passportVisible: boolean | null;
};

export function PassportPanel() {
  const [trips, setTrips] = useState<EligibleTrip[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/passport", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Não foi possível carregar o Passport.");
        return data as EligibleTrip[];
      })
      .then((data) => {
        if (active) setTrips(data);
      })
      .catch((error: unknown) => {
        if (active)
          setMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar o Passport.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function setVisibility(trip: EligibleTrip) {
    if (!trip.passportId) return;
    setBusy(trip.id);
    setMessage("");
    try {
      const visible = !trip.passportVisible;
      const response = await fetch("/api/passport", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passportId: trip.passportId, visible }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Não foi possível alterar a visibilidade.");
      setTrips((current) =>
        current.map((item) =>
          item.id === trip.id ? { ...item, passportVisible: data.visible } : item,
        ),
      );
      setMessage(visible ? "Passport público." : "Passport oculto.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar a visibilidade.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function issueToken(trip: EligibleTrip) {
    setBusy(trip.id);
    setMessage("");
    try {
      const response = await fetch("/api/passport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: trip.id }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Não foi possível liberar o Token.");
      setTrips((current) =>
        current.map((item) =>
          item.id === trip.id
            ? { ...item, passportId: data.id, passportVisible: data.visible }
            : item,
        ),
      );
      setMessage("Voyra Token adicionado ao Passport!");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível liberar o Token.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rail-card" style={{ marginTop: 24 }}>
      <div className="section-heading">
        <h2><Award size={19} /> Voyra Passport</h2>
      </div>
      <p className="rail-subtitle">
        Viagens concluídas liberam Tokens verificados para guardar e compartilhar.
      </p>
      {loading && <p className="muted" role="status">Carregando seu Passport…</p>}
      {!loading && !trips.length && !message && (
        <p className="muted">
          Conclua uma viagem no Voyra Travel para liberar seu primeiro Token.
        </p>
      )}
      <div className="stack">
        {trips.map((trip) => (
          <div className="collection-option" key={trip.id} style={{ cursor: "default" }}>
            <span>
              <strong>{trip.destination}</strong>
              <small style={{ display: "block" }}><MapPin size={12} /> {trip.name}</small>
            </span>
            {trip.passportId ? (
              <span className="filter-row">
                <Link className="secondary" href={`/recap/${trip.passportId}`}>
                  Ver Token <ArrowUpRight size={14} />
                </Link>
                <button
                  className="icon-button"
                  type="button"
                  title={trip.passportVisible ? "Ocultar Passport" : "Tornar Passport público"}
                  aria-label={trip.passportVisible ? "Ocultar Passport" : "Tornar Passport público"}
                  disabled={busy === trip.id}
                  onClick={() => void setVisibility(trip)}
                >
                  {trip.passportVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </span>
            ) : (
              <button
                className="primary"
                disabled={busy === trip.id}
                onClick={() => void issueToken(trip)}
              >
                {busy === trip.id ? "Liberando…" : "Liberar Token"}
              </button>
            )}
          </div>
        ))}
      </div>
      {message && <p role="status" className="notice">{message}</p>}
    </section>
  );
}
