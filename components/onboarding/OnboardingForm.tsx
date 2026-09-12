"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, Sparkles } from "lucide-react";
import type { Destination } from "@/types/social";

const categories = ["Dicas", "Comida", "Natureza", "Praia", "Aventura", "Cultura", "História", "Viagem"] as const;

export function OnboardingForm({ destinations }: { destinations: Destination[] }) {
  const router = useRouter();
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function toggle(list: string[], value: string, set: (next: string[]) => void) {
    set(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function finish(skip = false) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationIds: skip ? [] : selectedDestinations,
          categories: skip ? [] : selectedCategories,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível continuar.");
      router.push("/");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível continuar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="form-card" style={{ maxWidth: 760, margin: "40px auto" }}>
      <span className="eyebrow"><Sparkles size={14} /> SEU MUNDO, DO SEU JEITO</span>
      <h1>O que faz você querer arrumar as malas?</h1>
      <p>Escolha alguns destinos e estilos. Isso ajuda a Voyra a montar seu primeiro feed.</p>

      <div className="stack">
        <div>
          <h2><Compass size={19} /> Destinos que despertam sua curiosidade</h2>
          <div className="filter-row">
            {destinations.slice(0, 16).map((destination) => (
              <button
                type="button"
                key={destination.id}
                className={`chip ${selectedDestinations.includes(destination.id) ? "selected" : ""}`}
                onClick={() => toggle(selectedDestinations, destination.id, setSelectedDestinations)}
              >
                {destination.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2>Seu jeito de viajar</h2>
          <div className="filter-row">
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                className={`chip ${selectedCategories.includes(category) ? "selected" : ""}`}
                onClick={() => toggle(selectedCategories, category, setSelectedCategories)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <button className="primary" disabled={busy} onClick={() => void finish(false)}>
          {busy ? "Preparando seu feed…" : "Entrar na Voyra"}
        </button>
        <button className="secondary" disabled={busy} onClick={() => void finish(true)}>
          Pular por enquanto
        </button>
        {message && <p role="alert">{message}</p>}
      </div>
    </section>
  );
}
