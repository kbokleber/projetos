"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  createBoardColumnAction,
  deleteBoardColumnAction,
  renameBoardColumnAction,
} from "@/features/boards/column-actions";
import { isFixedSystemColumnName } from "@/lib/board-columns";

export function AddBoardColumnButton({
  projectId,
  boardId,
}: {
  projectId: string;
  boardId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Informe o nome da etapa.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createBoardColumnAction({
        projectId,
        boardId,
        name: trimmed,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setName("");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-72 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-3 py-8 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
      >
        <Plus className="size-4" />
        Adicionar etapa
      </button>
    );
  }

  return (
    <div className="flex w-72 shrink-0 flex-col gap-2 rounded-xl border border-border bg-card p-3">
      <p className="text-xs font-medium text-muted-foreground">Nova etapa</p>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") {
            setOpen(false);
            setName("");
            setError(null);
          }
        }}
        placeholder="Ex.: Homologação"
        className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={submit}>
          {pending ? "Salvando…" : "Criar"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            setOpen(false);
            setName("");
            setError(null);
          }}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}

export function BoardColumnMenu({
  projectId,
  columnId,
  columnName,
}: {
  projectId: string;
  columnId: string;
  columnName: string;
}) {
  const router = useRouter();
  const fixed = isFixedSystemColumnName(columnName);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(columnName);
  const [error, setError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (fixed) return null;

  function saveRename() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Informe o nome.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await renameBoardColumnAction({
        projectId,
        columnId,
        name: trimmed,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setRenaming(false);
      router.refresh();
    });
  }

  if (renaming) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              saveRename();
            }
            if (e.key === "Escape") {
              setRenaming(false);
              setName(columnName);
              setError(null);
            }
          }}
          className="h-7 w-full min-w-0 rounded border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        {error && <p className="text-[10px] text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
            aria-label="Opções da etapa"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onSelect={() => {
              setName(columnName);
              setRenaming(true);
            }}
          >
            <Pencil className="size-3.5" />
            Renomear
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(next) => {
          if (!next && pending) return;
          setDeleteOpen(next);
        }}
        title="Excluir etapa?"
        description={
          <>
            Excluir a etapa <strong>{columnName}</strong>? Só é possível se não
            houver tarefas nela.
          </>
        }
        confirmLabel="Sim, excluir"
        pending={pending}
        pendingLabel="Excluindo…"
        onConfirm={() => {
          startTransition(async () => {
            const res = await deleteBoardColumnAction({
              projectId,
              columnId,
            });
            if (!res.ok) {
              setDeleteOpen(false);
              alert(res.error);
              return;
            }
            setDeleteOpen(false);
            router.refresh();
          });
        }}
      />
    </>
  );
}
