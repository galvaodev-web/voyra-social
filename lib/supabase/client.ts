"use client";
import { createBrowserClient } from "@supabase/ssr";
import { configured, cookieOptions } from "./config";
export function createClient() {
  if (!configured)
    throw new Error("Conecte o Supabase para usar sua conta Voyra.");
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions },
  );
}
