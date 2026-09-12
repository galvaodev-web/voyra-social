import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET(request: Request) {
  if (process.env.GITHUB_ACTIONS)
    return Response.json(
      { error: "Indisponivel no GitHub Pages." },
      { status: 503 },
    );

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const c = await createClient();
  if (code && c) {
    const { error } = await c.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/perfil", url));
  }
  return NextResponse.redirect(new URL("/login?erro=confirmacao", url));
}
