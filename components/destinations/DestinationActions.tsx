"use client";
import { useState } from "react";
import { mutate } from "@/lib/client-api";
export function DestinationActions({
  id,
  demo,
}: {
  id: string;
  demo: boolean;
}) {
  const [follow, setFollow] = useState(false);
  const [want, setWant] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <>
      <button
        className="secondary"
        onClick={async () => {
          try {
            await mutate({
              action: "destination_follow",
              target: id,
              remove: follow,
              demo,
            });
            setFollow(!follow);
          } catch (e) {
            setMessage((e as Error).message);
          }
        }}
      >
        {follow ? "Seguindo destino" : "Seguir destino"}
      </button>
      <button
        className="primary"
        onClick={async () => {
          try {
            await mutate({
              action: "want_to_go",
              target: id,
              remove: want,
              demo,
            });
            setWant(!want);
          } catch (e) {
            setMessage((e as Error).message);
          }
        }}
      >
        {want ? "Na minha lista ✓" : "Quero conhecer"}
      </button>
      <p role="status">{message}</p>
    </>
  );
}
