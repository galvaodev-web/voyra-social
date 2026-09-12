import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Voyra Social",
    short_name: "Voyra",
    description: "Viaje. Descubra. Compartilhe.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F9F9",
    theme_color: "#006B67",
    lang: "pt-BR",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
