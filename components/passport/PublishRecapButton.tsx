"use client";
import { useState } from "react";
import Link from "next/link";
import { Send } from "lucide-react";

export function PublishRecapButton({ passportId }: { passportId: string }) {
  const [postId, setPostId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="stack" style={{ gap: 8 }}>
      {postId ? (
        <Link className="primary" href={`/p/${postId}`}>Ver publicação</Link>
      ) : (
        <button
          className="primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setMessage("");
            try {
              const response = await fetch("/api/passport/share", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ passportId }),
              });
              const result = (await response.json()) as { postId?: string; error?: string };
              if (!response.ok || !result.postId)
                throw new Error(result.error ?? "Não foi possível publicar.");
              setPostId(result.postId);
              setMessage("Recap publicado no Voyra Social.");
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Não foi possível publicar.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Send size={16} /> {busy ? "Publicando..." : "Publicar no Social"}
        </button>
      )}
      {message && <small role="status">{message}</small>}
    </div>
  );
}
