"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { mutate } from "@/lib/client-api";
import type { Profile } from "@/types/social";
import Link from "next/link";
export function ProfileEditor({ profile: p }: { profile: Profile }) {
  const [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <section className="form-card">
      <span className="eyebrow">SUA IDENTIDADE VOYRA</span>
      <h1 style={{ marginTop: 15 }}>Seu perfil de viajante</h1>
      <p>Compartilhe apenas o que você quer tornar público.</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          try {
            await mutate({
              action: "profile",
              profile: {
                name: f.get("name"),
                username: f.get("username"),
                bio: f.get("bio"),
                city: f.get("city"),
                country: f.get("country"),
                creator: f.get("creator") === "on",
              },
            });
            setMessage("Perfil atualizado!");
            router.refresh();
          } catch (e) {
            setMessage((e as Error).message);
          }
        }}
      >
        <div className="form-grid">
          <label>
            Nome
            <input
              name="name"
              defaultValue={p.name}
              minLength={2}
              maxLength={80}
              required
            />
          </label>
          <label>
            Username
            <input
              name="username"
              defaultValue={p.username}
              pattern="[a-z0-9_]{3,24}"
              required
            />
          </label>
        </div>
        <label>
          Bio
          <textarea name="bio" defaultValue={p.bio} maxLength={400} />
        </label>
        <div className="form-grid">
          <label>
            Cidade
            <input name="city" defaultValue={p.city} maxLength={80} />
          </label>
          <label>
            País
            <input name="country" defaultValue={p.country} maxLength={80} />
          </label>
        </div>
        <label>
          <input
            style={{ width: "auto", marginRight: 10 }}
            type="checkbox"
            name="creator"
            defaultChecked={p.creator}
          />
          Ativar perfil de criador
        </label>
        <button className="primary">Salvar perfil</button>
        <Link
          style={{ marginLeft: 10 }}
          className="secondary"
          href={`/u/${p.username}`}
        >
          Ver perfil público
        </Link>
        <p role="status" className="notice">
          {message ||
            "E-mail e informações privadas de viagem nunca aparecem no seu perfil."}
        </p>
      </form>
      <div className="form-grid">
        <Link className="secondary" href="/creator">
          Painel do criador
        </Link>
        <button
          className="secondary"
          onClick={async () => {
            const { error } = await createClient().auth.signOut();
            if (error) setMessage("Não foi possível sair. Tente novamente.");
            else {
              router.push("/");
              router.refresh();
            }
          }}
        >
          Sair da conta
        </button>
      </div>
    </section>
  );
}
