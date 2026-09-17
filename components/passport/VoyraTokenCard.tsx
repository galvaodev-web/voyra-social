import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import type { Passport } from "@/types/social";

type Token = Passport["token_snapshot"][number];

const typeLabels: Record<Token["token_type"], string> = {
  JOURNEY: "Journey",
  COUNTRY: "Country",
  CITY: "City",
  ACHIEVEMENT: "Achievement",
};

export function VoyraTokenCard({ token, recapId }: { token: Token; recapId?: string }) {
  const destination = token.destination || token.country_name || token.achievement_code?.replaceAll("_", " ") || "Journey";
  const card = (
    <article className="voyra-token-card">
      <header><strong>VOYRA</strong><span>{typeLabels[token.token_type]} Token</span></header>
      <div className="voyra-token-mark"><MapPin size={22} /></div>
      <h3>{destination}</h3>
      <p>{token.country_name || "Voyra Journey"} {token.travel_year ? `· ${token.travel_year}` : ""}</p>
      {token.token_type === "JOURNEY" && (
        <div className="voyra-token-stats"><span>{token.days ?? 0} dias</span><span>{token.verified_place_count} lugares</span></div>
      )}
      <div className="voyra-token-verified"><BadgeCheck size={15} /> Verified Trip</div>
      <footer>{token.serial_number}</footer>
    </article>
  );
  return recapId ? <Link className="voyra-token-link" href={`/recap/${recapId}`}>{card}</Link> : card;
}
