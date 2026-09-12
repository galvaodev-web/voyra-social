"use client";
import { useState, useEffect } from "react";
import { Plus, Route } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { mutate } from "@/lib/client-api";
import type { SocialPost, Collection } from "@/types/social";
export function AddToTripButton({ post }: { post: SocialPost }) {
  const [open, setOpen] = useState(false);
  const [trips, setTrips] = useState<{ id: string; name: string }[]>([]);
  const [message, setMessage] = useState("");
  return (
    <>
      <button
        className="add-trip"
        onClick={async () => {
          setOpen(true);
          setMessage("Buscando suas viagens…");
          try {
            const r = await fetch("/api/travel");
            const result = await r.json();
            if (!r.ok) throw new Error(result.error);
            setTrips(result);
            setMessage(
              result.length
                ? "Escolha a viagem que receberá este lugar."
                : "Você ainda não tem viagens futuras.",
            );
          } catch (e) {
            setMessage((e as Error).message);
          }
        }}
      >
        <Plus size={16} />
        <span>Adicionar ao meu roteiro</span>
      </button>
      {open && (
        <Modal
          title={`Leve ${post.place_name} com você`}
          onClose={() => setOpen(false)}
        >
          <Route size={32} className="teal" />
          <p>{message}</p>
          {trips.map((t) => (
            <button
              className="collection-option"
              key={t.id}
              onClick={async () => {
                try {
                  const r = await fetch("/api/travel", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tripId: t.id, postId: post.id }),
                  });
                  const result = await r.json();
                  if (!r.ok) throw new Error(result.error);
                  setMessage("Lugar adicionado ao seu roteiro!");
                  setTrips([]);
                } catch (e) {
                  setMessage((e as Error).message);
                }
              }}
            >
              {t.name}
              <Plus size={18} />
            </button>
          ))}
        </Modal>
      )}
    </>
  );
}
export function CollectionPicker({
  postId,
  onClose,
}: {
  postId: string;
  onClose: () => void;
}) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    fetch("/api/social?resource=collections")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setMessage(d.error);
        else setCollections(d);
      })
      .catch(() => setMessage("Não foi possível carregar coleções."));
  }, []);
  return (
    <Modal title="Salvar em uma coleção" onClose={onClose}>
      <p>Organize as descobertas da sua próxima viagem.</p>
      {collections.map((c) => (
        <button
          className="collection-option"
          key={c.id}
          onClick={async () => {
            try {
              await mutate({
                action: "collection_item",
                target: postId,
                collectionId: c.id,
              });
              onClose();
            } catch (e) {
              setMessage((e as Error).message);
            }
          }}
        >
          {c.name}
          <Plus size={16} />
        </button>
      ))}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            const c = await mutate({ action: "collection", name });
            setCollections([...collections, c]);
            setName("");
          } catch (e) {
            setMessage((e as Error).message);
          }
        }}
      >
        <label>
          Nova coleção
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={70}
            placeholder="Ex.: Europa 2027"
          />
        </label>
        <button className="primary">Criar coleção</button>
      </form>
      <p role="status">{message}</p>
    </Modal>
  );
}
