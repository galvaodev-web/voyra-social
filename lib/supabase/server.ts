import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { configured, cookieOptions } from "./config";
import { isGithubPages } from "@/lib/deploy";

export async function createClient() {
  if (isGithubPages) return null;
  if (!configured) return null;
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions,
      cookies: {
        getAll: () => store.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) =>
              store.set(name, value, options),
            );
          } catch {
            /* Refreshed in proxy for server-rendered pages. */
          }
        },
      },
    },
  );
}
