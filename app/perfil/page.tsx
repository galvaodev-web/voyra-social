import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "@/components/profile/ProfileEditor";
import { redirect } from "next/navigation";
export const metadata = { title: "Meu perfil", robots: { index: false } };
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
  return <ProfileEditor profile={data} />;
}
