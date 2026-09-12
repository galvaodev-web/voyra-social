"use client";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { reportReasons } from "@/lib/validation";
import { mutate } from "@/lib/client-api";
export function ReportModal({
  target,
  type = "POST",
  demo,
  onClose,
}: {
  target: string;
  type?: "POST" | "COMMENT" | "PROFILE";
  demo?: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<string>(reportReasons[0]);
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  return (
    <Modal title="Denunciar conteúdo" onClose={onClose}>
      <p>
        Ajude a manter a comunidade acolhedora. Sua denúncia será encaminhada
        para análise.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await mutate({
              action: "report",
              target,
              type,
              reason,
              description,
              demo,
            });
            setMessage(
              "Denúncia recebida para análise. Obrigado por cuidar da comunidade.",
            );
          } catch (e) {
            setMessage((e as Error).message);
          }
        }}
      >
        <label>
          Motivo
          <select value={reason} onChange={(e) => setReason(e.target.value)}>
            {reportReasons.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label>
          Mais informações
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
        </label>
        <button className="primary">Enviar denúncia</button>
      </form>
      <p role="status">{message}</p>
    </Modal>
  );
}
