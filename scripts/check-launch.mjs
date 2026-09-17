import { createClient } from "@supabase/supabase-js";

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_TRAVEL_URL",
  "VOYRA_TRAVEL_API_URL",
  "NEXT_PUBLIC_AUTH_COOKIE_DOMAIN",
  "NEXT_PUBLIC_SUPPORT_EMAIL",
];
const problems = [];
for (const name of required) if (!process.env[name]?.trim()) problems.push(`Ausente: ${name}`);
for (const name of ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_TRAVEL_URL", "VOYRA_TRAVEL_API_URL", "NEXT_PUBLIC_SUPABASE_URL"]) {
  if (!process.env[name]) continue;
  try {
    const url = new URL(process.env[name]);
    if (url.protocol !== "https:" || url.username || url.password || url.hostname === "localhost") throw new Error();
  } catch {
    problems.push(`${name} deve ser uma URL HTTPS pública válida.`);
  }
}
if (process.env.NEXT_PUBLIC_VIDEO_UPLOAD_ENABLED !== "false")
  problems.push("Mantenha NEXT_PUBLIC_VIDEO_UPLOAD_ENABLED=false até existir pipeline seguro de vídeo.");
if (process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN && !process.env.NEXT_PUBLIC_AUTH_COOKIE_DOMAIN.startsWith("."))
  problems.push("NEXT_PUBLIC_AUTH_COOKIE_DOMAIN deve iniciar com ponto, por exemplo .voyra.com.");
if (process.env.NEXT_PUBLIC_SUPPORT_EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.NEXT_PUBLIC_SUPPORT_EMAIL))
  problems.push("NEXT_PUBLIC_SUPPORT_EMAIL inválido.");
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}

if (process.argv.includes("--remote")) {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (const table of ["profiles", "posts", "post_media", "comments", "reports", "passports", "admin_users", "account_sanctions", "moderation_actions"]) {
    const result = await db.schema("social").from(table).select("*", { count: "exact", head: true });
    if (result.error) throw new Error(`Tabela social.${table} indisponível. Aplique todas as migrations.`);
  }
  for (const table of ["profiles", "trips", "subscriptions", "travel_searches", "partner_referrals"]) {
    const result = await db.from(table).select("*", { count: "exact", head: true });
    if (result.error) throw new Error(`Tabela public.${table} indisponível. Aplique as migrations Travel primeiro.`);
  }
  const admins = await db.schema("social").from("admin_users").select("user_id", { count: "exact", head: true }).eq("active", true);
  if (!admins.count) throw new Error("Cadastre ao menos um administrador ativo em social.admin_users.");
}
console.log("Configuração do Voyra Social validada sem imprimir segredos.");
