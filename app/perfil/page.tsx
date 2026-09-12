import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { PassportPanel } from "@/components/passport/PassportPanel";
import { redirect } from "next/navigation";
export const metadata = { title: "Meu perfil", robots: { index: false } };
export const dynamic = "force-dynamic";
export default async function Page() {
  const c = await createClient();
  if (!c) redirect("/login");
  const {
    data: { user },
  } = await c.auth.getUser();
  if (!user) redirect("/login");
  const { data, error } = await c
    .schema("social")
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) throw new Error("Seu perfil está indisponível.");
  return (
    <div style={{ maxWidth: 900, margin: "auto" }}>
      <ProfileEditor profile={data} />
      <PassportPanel />
    </div>
  );
}
