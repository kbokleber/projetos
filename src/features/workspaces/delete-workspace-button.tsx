"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  const [confirming, setConfirming] = useState(false);
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

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        Excluir
      </Button>
    );
  }

  function runDelete() {
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
        setConfirming(false);
        router.refresh();
      } catch {
        setError("Falha ao excluir. Tente novamente.");
      }
    });
  }

  return (
    <div className="flex max-w-[16rem] flex-col items-end gap-1.5">
      <p className="text-right text-[11px] text-muted-foreground">
        Excluir <strong className="text-foreground">{workspaceName}</strong>
        {projectCount > 0
          ? ` e ${projectCount} projeto(s)?`
          : " (irreversível)?"}
      </p>
      {error && (
        <p className="text-right text-[11px] text-destructive">{error}</p>
      )}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={pending}
          onClick={runDelete}
        >
          {pending ? "Excluindo…" : "Confirmar"}
        </Button>
      </div>
    </div>
  );
}
