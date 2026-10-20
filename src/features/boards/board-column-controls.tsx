"use client";

import { useEffect, useRef, useState, useTransition } from "react";
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

/** Botão compacto acima do quadro — não ocupa coluna nem força scroll. */
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
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!panelRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setName("");
        setError(null);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

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

  return (
    <div className="relative" ref={panelRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={() => {
          setOpen((v) => !v);
          setError(null);
        }}
        aria-expanded={open}
      >
        <Plus className="size-3.5" />
        Nova etapa
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 w-64 rounded-lg border border-border bg-card p-3 shadow-md">
          <p className="mb-2 text-xs text-muted-foreground">
            Entre A Fazer e Concluído
          </p>
          <input
            ref={inputRef}
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
            className="mb-2 h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7"
              disabled={pending}
              onClick={() => {
                setOpen(false);
                setName("");
                setError(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7"
              disabled={pending}
              onClick={submit}
            >
              {pending ? "…" : "Criar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function BoardColumnMenu({
  projectId,
  columnId,
  columnName,
  taskCount = 0,
}: {
  projectId: string;
  columnId: string;
  columnName: string;
  taskCount?: number;
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
          taskCount > 0 ? (
            <>
              Excluir a etapa <strong>{columnName}</strong>? As{" "}
              <strong>
                {taskCount}{" "}
                {taskCount === 1 ? "tarefa" : "tarefas"}
              </strong>{" "}
              serão movidas para <strong>A Fazer</strong>.
            </>
          ) : (
            <>
              Excluir a etapa <strong>{columnName}</strong>? Esta ação não pode
              ser desfeita.
            </>
          )
        }
        confirmLabel={
          taskCount > 0 ? "Mover para A Fazer e excluir" : "Sim, excluir"
        }
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
