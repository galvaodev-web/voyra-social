"use client";
import { useState,useEffect } from "react";
import { Plus, Check } from "lucide-react";
import { mutate } from "@/lib/client-api";
export function FollowButton({
  userId,
  compact = false,
  demo = false,
}: {
  userId: string;
  compact?: boolean;
  demo?: boolean;
}) {
  const [following, setFollowing] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [self,setSelf]=useState(false);
  useEffect(()=>{if(demo)return;let active=true;fetch(`/api/social?resource=relationship&target=${userId}`).then(r=>r.json()).then(d=>{if(active&&!d.error){setFollowing(d.following);setSelf(d.self);}}).catch(()=>{});return()=>{active=false;};},[userId,demo]);
  if(self)return null;
  return (
    <>
      <button
        className={compact ? "follow-small" : "secondary"}
        disabled={busy}
        aria-label={following ? "Deixar de seguir" : "Seguir viajante"}
        onClick={async () => {
          setBusy(true);
          try {
            await mutate({
              action: "follow",
              target: userId,
              remove: following,
              demo,
            });
            setFollowing(!following);
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {following ? <Check size={14} /> : <Plus size={14} />}{" "}
        {!compact && (following ? "Seguindo" : "Seguir")}
      </button>
      {message && (
        <div
          className="inline-feedback"
          role="status"
          onClick={() => setMessage("")}
        >
          {message}
        </div>
      )}
    </>
  );
}
