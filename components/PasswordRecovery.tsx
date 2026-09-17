"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function PasswordRecovery({ update = false }: { update?: boolean }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="form-card auth-card">
      <span className="eyebrow">UMA CONTA. TODO O UNIVERSO VOYRA.</span>
      <h1>{update ? "Escolha uma nova senha." : "Recupere seu acesso."}</h1>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setMessage("");
          const form = new FormData(event.currentTarget);
          try {
            if (update) {
              const password = String(form.get("password"));
              const confirmation = String(form.get("confirmation"));
              if (password.length < 8 || password !== confirmation)
                throw new Error("Use ao menos 8 caracteres e repita a mesma senha.");
              const { error } = await createClient().auth.updateUser({ password });
              if (error) throw error;
              setMessage("Senha atualizada. Você já pode continuar no Voyra Social.");
            } else {
              const email = String(form.get("email"));
              const { error } = await createClient().auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
              });
              if (error) throw error;
              setMessage("Confira seu e-mail para redefinir a senha.");
            }
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Não foi possível concluir.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {update ? (
          <>
            <label>Nova senha<input name="password" type="password" minLength={8} required autoComplete="new-password" /></label>
            <label>Confirme a senha<input name="confirmation" type="password" minLength={8} required autoComplete="new-password" /></label>
          </>
        ) : (
          <label>E-mail<input name="email" type="email" required autoComplete="email" /></label>
        )}
        <button disabled={busy} className="primary">{busy ? "Aguarde..." : update ? "Salvar nova senha" : "Enviar link"}</button>
        {message && <p role="status" className="notice">{message}</p>}
      </form>
      <Link className="auth-switch" href="/login">Voltar para o login</Link>
    </section>
  );
}
