"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AccountRequests() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState("");
  async function removeAccount() {
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: confirm }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível excluir a conta.");
      router.push("/login?account=deleted");
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return (
    <>
      <a className="secondary" href="/api/account/export" download>
        Exportar meus dados
      </a>
      <p>
        A exclusão remove sua identidade compartilhada, dados do Voyra Travel e do
        Voyra Social, arquivos e assinatura ativa. Digite EXCLUIR para confirmar.
      </p>
      <input
        aria-label="Confirmação de solicitação de exclusão"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="EXCLUIR"
      />
      <button
        style={{ marginTop: 15 }}
        className="secondary"
        disabled={confirm !== "EXCLUIR"}
        onClick={() => void removeAccount()}
      >
        Excluir conta Voyra
      </button>
      <p role="status">{message}</p>
    </>
  );
}
