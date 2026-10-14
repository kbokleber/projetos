"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteWorkspaceAction } from "./actions";

export function DeleteWorkspaceButton({
  workspaceId,
  workspaceName,
  projectCount,
  canDelete,
  disabledReason,
}: {
  workspaceId: string;
  workspaceName: string;
  projectCount: number;
  canDelete: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!canDelete) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled
        title={disabledReason ?? "Não é possível excluir"}
        className="text-muted-foreground"
      >
        Excluir
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        Excluir
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          setOpen(next);
          if (!next) setError(null);
        }}
        title="Excluir workspace?"
        description={
          <>
            Excluir <strong>{workspaceName}</strong>
            {projectCount > 0
              ? ` e ${projectCount} projeto(s)? Esta ação não pode ser desfeita.`
              : "? Esta ação não pode ser desfeita."}
          </>
        }
        confirmLabel="Sim, excluir"
        pending={pending}
        pendingLabel="Excluindo…"
        error={error}
        onConfirm={() => {
          setError(null);
          const fd = new FormData();
          fd.set("workspaceId", workspaceId);
          startTransition(async () => {
            try {
              const result = await deleteWorkspaceAction(fd);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setOpen(false);
              router.refresh();
            } catch {
              setError("Falha ao excluir. Tente novamente.");
            }
          });
        }}
      />
    </>
  );
}
