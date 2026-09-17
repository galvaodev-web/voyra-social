import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDestinations } from "@/lib/feed/service";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";

async function getSuggestedCreators(client: Awaited<ReturnType<typeof createClient>>) {
  if (!client) {
    const { travelers } = await import("@/lib/demo");
    return travelers.slice(0, 8).map(({ id, username, name, city }) => ({ id, username, name, city }));
  }
  const result = await client
    .schema("social")
    .from("profiles")
    .select("id,username,name,city")
    .eq("creator", true)
    .order("created_at", { ascending: false })
    .limit(8);
  return result.data ?? [];
}

export const metadata = { title: "Personalize sua Voyra" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const client = await createClient();
  if (!client)
    return <OnboardingForm destinations={await getDestinations()} creators={await getSuggestedCreators(client)} />;
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login");

  const { edit } = await searchParams;
  const prefs = await client
    .schema("social")
    .from("user_preferences")
    .select("onboarding_completed")
    .eq("user_id", user.id)
    .maybeSingle();
  if (prefs.data?.onboarding_completed && edit !== "1") redirect("/");

  const [destinations, creators] = await Promise.all([getDestinations(), getSuggestedCreators(client)]);
  return <OnboardingForm destinations={destinations} creators={creators} />;
}
