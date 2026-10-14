"use client";

import { useState, useTransition, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MoreHorizontal,
  Check,
  ExternalLink,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { moveTaskAction, deleteTaskAction } from "@/features/tasks/actions";

type Column = { id: string; name: string };

export function TaskCardMenu({
  projectId,
  taskId,
  currentColumnId,
  columns,
  onMoved,
}: {
  projectId: string;
  taskId: string;
  currentColumnId: string;
  columns: Column[];
  /** Atualização otimista no board (ex.: Kanban local). */
  onMoved?: (taskId: string, columnId: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMove = (columnId: string) => {
    if (columnId === currentColumnId || pending) return;
    onMoved?.(taskId, columnId);
    const fd = new FormData();
    fd.set("columnId", columnId);
    startTransition(async () => {
      try {
        await moveTaskAction(taskId, fd);
      } catch (err) {
        console.error("[TaskCardMenu] move failed:", err);
      }
      router.refresh();
    });
  };

  const stopDragInterference = (e: SyntheticEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Ações da tarefa"
            disabled={pending}
            onPointerDown={stopDragInterference}
            onMouseDown={stopDragInterference}
            onClick={stopDragInterference}
            className="ml-auto inline-flex size-7 shrink-0 items-center justify-center rounded text-muted-foreground opacity-100 transition-opacity hover:bg-accent hover:text-foreground sm:opacity-0 sm:group-hover/card:opacity-100 data-[state=open]:opacity-100 focus-visible:opacity-100 disabled:opacity-50"
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={4}
          className="z-[100] min-w-[12rem]"
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
            Mover para
          </DropdownMenuLabel>
          {columns.length === 0 ? (
            <DropdownMenuItem disabled>Nenhuma coluna</DropdownMenuItem>
          ) : (
            columns.map((c) => {
              const isCurrent = c.id === currentColumnId;
              return (
                <DropdownMenuItem
                  key={c.id}
                  disabled={pending || isCurrent}
                  onSelect={() => {
                    if (!isCurrent) handleMove(c.id);
                  }}
                >
                  <span className="flex-1 truncate">{c.name}</span>
                  {isCurrent && (
                    <Check className="size-3.5 text-muted-foreground" />
                  )}
                </DropdownMenuItem>
              );
            })
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/projects/${projectId}/tasks/${taskId}`}>
              <ExternalLink className="size-3.5" />
              Abrir detalhes
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={pending}
            className="text-destructive focus:text-destructive"
            onSelect={(e) => {
              e.preventDefault();
              setError(null);
              setConfirmArchive(true);
            }}
          >
            <Trash2 className="size-3.5" />
            Arquivar tarefa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={(next) => {
          if (pending) return;
          setConfirmArchive(next);
          if (!next) setError(null);
        }}
        title="Arquivar esta tarefa?"
        description="Ela some do board. Dá para restaurar depois na aba Arquivadas."
        confirmLabel="Sim, arquivar"
        pending={pending}
        pendingLabel="Arquivando…"
        error={error}
        onConfirm={() => {
          setError(null);
          startTransition(async () => {
            try {
              await deleteTaskAction(taskId);
              setConfirmArchive(false);
              router.refresh();
            } catch (err) {
              if (
                typeof err === "object" &&
                err !== null &&
                "digest" in err &&
                String((err as { digest?: string }).digest).startsWith(
                  "NEXT_REDIRECT",
                )
              ) {
                setConfirmArchive(false);
                router.refresh();
                return;
              }
              setError("Não foi possível arquivar a tarefa.");
              console.error("[TaskCardMenu] archive failed:", err);
            }
          });
        }}
      />
    </>
  );
}
