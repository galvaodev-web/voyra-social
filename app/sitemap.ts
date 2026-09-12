import type { MetadataRoute } from "next";
import { getDestinations } from "@/lib/feed/service";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return [
    { url: base },
    ...(await getDestinations()).map((d) => ({
      url: `${base}/destinos/${d.slug}`,
    })),
  ];
}
