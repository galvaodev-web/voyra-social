import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const c = await createClient();
  if (code && c) {
    const { error } = await c.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/onboarding", url));
  }
  return NextResponse.redirect(new URL("/login?erro=confirmacao", url));
}
