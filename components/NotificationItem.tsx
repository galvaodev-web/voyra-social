"use client";
import { useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import type { Notification } from "@/types/social";
import { mutate } from "@/lib/client-api";
export function NotificationItem({ item }: { item: Notification }) {
  const [read, setRead] = useState(!!item.read_at);
  const [error, setError] = useState("");
  return (
    <article className="rail-card">
      <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
        <Bell size={20} />
        <div style={{ flex: 1 }}>
          <p>{item.body}</p>
          <small className="muted">
            {new Date(item.created_at).toLocaleDateString("pt-BR")}
          </small>
          {item.post_id && (
            <Link className="post-details" href={`/p/${item.post_id}`}>
              Ver publicação
            </Link>
          )}
        </div>
        <button
          className="secondary"
          disabled={read}
          onClick={async () => {
            try {
              await mutate({ action: "read_notification", target: item.id });
              setRead(true);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          {read ? <Check size={15} /> : "Marcar como lida"}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </article>
  );
}
