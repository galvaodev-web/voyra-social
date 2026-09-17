"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
export function AuthForm({ signup = false }: { signup?: boolean }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function google() {
    setBusy(true);
    setMessage("");
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
      });
      if (error) throw error;
    } catch {
      setMessage("Não foi possível conectar ao Google.");
      setBusy(false);
    }
  }
  return (
    <section className="form-card auth-card">
      <span className="eyebrow">UMA CONTA. TODO O UNIVERSO VOYRA.</span>
      <h1 style={{ marginTop: 18 }}>
        {signup ? "O mundo espera por você." : "Bom ter você por aqui."}
      </h1>
      <p>
        {signup
          ? "Crie sua conta Voyra e comece a compartilhar."
          : "Use a mesma conta do Voyra Travel para continuar."}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const f = new FormData(e.currentTarget);
          try {
            const c = createClient();
            const credentials = {
              email: String(f.get("email")),
              password: String(f.get("password")),
            };
            const { error } = signup
              ? await c.auth.signUp({
                  ...credentials,
                  options: {
                    data: { name: String(f.get("name")) },
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                  },
                })
              : await c.auth.signInWithPassword(credentials);
            if (error)
              throw new Error(
                signup
                  ? "Não foi possível cadastrar. Verifique os dados e tente novamente."
                  : "E-mail ou senha inválidos. Confira e tente novamente.",
              );
            if (signup)
              setMessage(
                "Confira seu e-mail para confirmar a conta. Se já tiver uma conta Voyra, faça login.",
              );
            else {
              router.push("/onboarding");
              router.refresh();
            }
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {signup && (
          <label>
            Seu nome
            <input
              name="name"
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
            />
          </label>
        )}
        <label>
          E-mail
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Senha
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={signup ? "new-password" : "current-password"}
          />
        </label>
        <button disabled={busy} className="primary">
          {busy ? "Aguarde…" : signup ? "Criar minha conta" : "Entrar na Voyra"}
        </button>
        {!signup && <Link href="/esqueci-senha">Esqueci minha senha</Link>}
        <p role="status" className="notice">
          {message || "Suas viagens privadas continuam privadas."}
        </p>
      </form>
      {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" && (
        <button className="secondary" disabled={busy} onClick={() => void google()}>
          Continuar com Google
        </button>
      )}
      <Link className="auth-switch" href={signup ? "/login" : "/cadastro"}>
        {signup
          ? "Já tem uma conta? Entrar"
          : "Primeira viagem com a gente? Crie sua conta"}
      </Link>
    </section>
  );
}
