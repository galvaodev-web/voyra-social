import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import type { Destination } from "@/types/social";
export function DestinationCard({
  destination: d,
}: {
  destination: Destination;
}) {
  return (
    <Link href={`/destinos/${d.slug}`} className="destination-card">
      <Image
        src={d.image_url}
        alt={`${d.name}, ${d.country}`}
        fill
        sizes="(max-width: 600px) 45vw, 200px"
      />
      <span className="destination-shade" />
      <span className="destination-label">
        <strong>{d.name}</strong>
        <small>{d.country}</small>
      </span>
      <ArrowUpRight className="destination-arrow" size={18} />
    </Link>
  );
}
