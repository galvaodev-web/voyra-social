import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDestinations } from "@/lib/feed/service";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";

export const metadata = { title: "Personalize sua Voyra" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const client = await createClient();
  if (!client) return <OnboardingForm destinations={await getDestinations()} />;
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

  const destinations = await getDestinations();
  return <OnboardingForm destinations={destinations} />;
}
