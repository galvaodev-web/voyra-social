"use client";
import { useState } from "react";
import { Share2 } from "lucide-react";

export function ShareRecapButton({ title }: { title: string }) {
  const [message, setMessage] = useState("");
  return (
    <div className="stack" style={{ gap: 8 }}>
      <button
        className="primary"
        onClick={async () => {
          const url = window.location.href;
          try {
            if (navigator.share) {
              await navigator.share({ title, text: "Meu Travel Recap na Voyra", url });
              setMessage("Compartilhado.");
            } else {
              await navigator.clipboard.writeText(url);
              setMessage("Link copiado para compartilhar.");
            }
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") return;
            setMessage("Não foi possível compartilhar. Copie o endereço desta página.");
          }
        }}
      >
        <Share2 size={16} /> Compartilhar recap
      </button>
      {message && <small role="status">{message}</small>}
    </div>
  );
}
