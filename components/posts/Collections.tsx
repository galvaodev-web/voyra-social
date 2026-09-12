"use client";
import { useState, useEffect } from "react";
import { mutate } from "@/lib/client-api";
import type { Collection } from "@/types/social";
import Link from "next/link";
export function Collections() {
  const [items, setItems] = useState<Collection[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/social?resource=collections")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setItems(d);
      })
      .catch(() => {});
  }, []);
  return (
    <section className="rail-card">
      <h2>Suas coleções</h2>
      <p className="rail-subtitle">Pequenas descobertas, grandes planos.</p>
      <div className="filter-row">
        {items.map((c) => (
          <Link href={`/colecoes/${c.id}`} className="secondary" key={c.id}>
            {c.name}
          </Link>
        ))}
      </div>
      <form
        style={{ display: "flex", gap: 10 }}
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const c = await mutate({ action: "collection", name });
            setItems([...items, c]);
            setName("");
          } catch (e) {
            setMessage((e as Error).message);
          }
        }}
      >
        <input
          aria-label="Nome da nova coleção"
          placeholder="Europa 2027, Japão, Praias…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={70}
        />
        <button className="primary" style={{ whiteSpace: "nowrap" }}>
          Criar coleção
        </button>
      </form>
      <p role="status" className="muted">
        {message}
      </p>
    </section>
  );
}
