"use client";
import { useState } from "react";
import { mutate } from "@/lib/client-api";
export function AccountRequests() {
  const [message, setMessage] = useState("");
  const [confirm, setConfirm] = useState("");
  async function request(type: string) {
    try {
      await mutate({ action: "account_request", type });
      setMessage(
        "Solicitação registrada. O atendimento do ecossistema deverá processá-la; nenhuma exclusão foi executada.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  return (
    <>
      <button className="secondary" onClick={() => void request("EXPORT")}>
        Solicitar exportação dos meus dados
      </button>
      <p>
        A exclusão afeta sua identidade compartilhada com o Voyra Travel. Digite
        EXCLUIR para registrar a solicitação. Ela exige revisão do impacto nas
        duas aplicações.
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
        onClick={() => void request("DELETE_ECOSYSTEM")}
      >
        Solicitar exclusão da conta Voyra
      </button>
      <p role="status">{message}</p>
    </>
  );
}
