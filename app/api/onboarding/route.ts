import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  destinationIds: z.array(z.string().uuid()).max(20),
  categories: z
    .array(z.enum(["Dicas", "Comida", "Natureza", "Praia", "Aventura", "Cultura", "História", "Viagem"]))
    .max(20),
});

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Origem inválida." }, { status: 403 });
  const client = await createClient();
  if (!client) return Response.json({ error: "Contas reais ainda não estão disponíveis." }, { status: 503 });
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return Response.json({ error: "Entre na sua conta Voyra." }, { status: 401 });
  try {
    const input = schema.parse(await request.json());
    const { error } = await client.schema("social").from("user_preferences").upsert(
      {
        user_id: user.id,
        destination_ids: input.destinationIds,
        categories: input.categories,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw error;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Não foi possível salvar suas preferências." }, { status: 400 });
  }
}
