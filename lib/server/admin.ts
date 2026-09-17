import "server-only";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";

export async function adminSession() {
  const client = await createClient();
  if (!client) return null;
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;
  const admin = adminClient();
  const role = await admin
    .schema("social")
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (role.error || !role.data) return null;
  return { user, admin, role: role.data.role as "MODERATOR" | "ADMIN" };
}
