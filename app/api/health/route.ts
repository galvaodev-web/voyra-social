import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  let database: "ok" | "unavailable" | "unconfigured" = configured ? "unavailable" : "unconfigured";
  if (configured) {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const result = await client.schema("social").from("destinations").select("id").limit(1);
    database = result.error ? "unavailable" : "ok";
  }
  const healthy = database !== "unavailable";
  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "voyra-social",
      timestamp: new Date().toISOString(),
      dependencies: {
        database,
        travel: process.env.VOYRA_TRAVEL_API_URL ? "configured" : "unconfigured",
        videoUploads:
          process.env.NEXT_PUBLIC_VIDEO_UPLOAD_ENABLED === "true" ? "enabled" : "disabled",
      },
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
