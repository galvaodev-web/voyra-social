"use client";
import { useState } from "react";
import { Flag } from "lucide-react";
import { ReportModal } from "@/components/moderation/ReportModal";
export function ProfileReport({ id, demo }: { id: string; demo: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="icon-button"
        aria-label="Denunciar perfil"
        onClick={() => setOpen(true)}
      >
        <Flag size={17} />
      </button>
      {open && (
        <ReportModal
          target={id}
          type="PROFILE"
          demo={demo}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
