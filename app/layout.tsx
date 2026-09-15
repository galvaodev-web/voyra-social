import type { Metadata } from "next";
import "./globals.css";
import { Shell } from "@/components/Shell";
import { createClient } from "@/lib/supabase/server";
import { githubPagesBasePath } from "@/lib/deploy";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "Voyra Social — Viaje. Descubra. Compartilhe.",
    template: "%s | Voyra Social",
  },
  description:
    "Uma comunidade feita para quem vive, planeja e compartilha viagens.",
  icons: {
    icon: `${githubPagesBasePath}/icon.svg`,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const c = await createClient();
  const user = c ? (await c.auth.getUser()).data.user : null;
  const account =
    user && c
      ? (
          await c
            .schema("social")
            .from("profiles")
            .select("name,username")
            .eq("id", user.id)
            .maybeSingle()
        ).data
      : null;
  return (
    <html lang="pt-BR">
      <body>
        <Shell account={account}>{children}</Shell>
      </body>
    </html>
  );
}
