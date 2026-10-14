"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { adminDeleteUserAction } from "./actions";

export function DeleteUserButton({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        disabled={pending}
        className="text-xs text-destructive hover:underline disabled:opacity-50"
      >
        Excluir
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          setOpen(next);
          if (!next) setError(null);
        }}
        title={`Excluir o usuário "${userName}"?`}
        description="Ele será removido do sistema. Projetos e tarefas que ele criou permanecerão, atribuídos a você como criador. Esta ação não pode ser desfeita."
        confirmLabel="Sim, excluir"
        pending={pending}
        pendingLabel="Excluindo…"
        error={error}
        onConfirm={() => {
          setError(null);
          const fd = new FormData();
          fd.set("userId", userId);
          startTransition(async () => {
            const result = await adminDeleteUserAction(fd);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setOpen(false);
            router.refresh();
          });
        }}
      />
    </>
  );
}
