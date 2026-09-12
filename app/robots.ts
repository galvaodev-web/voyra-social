import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/destinos/", "/u/", "/p/", "/roteiros"],
      disallow: [
        "/api/",
        "/perfil",
        "/creator",
        "/salvos",
        "/colecoes/",
        "/notificacoes",
        "/criar",
        "/seguindo",
        "/login",
        "/cadastro",
      ],
    },
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/sitemap.xml`,
  };
}
