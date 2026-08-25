"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MoreHorizontal,
  ArrowRight,
  Check,
  ExternalLink,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { moveTaskAction, deleteTaskAction } from "@/features/tasks/actions";

type Column = { id: string; name: string };

export function TaskCardMenu({
  projectId,
  taskId,
  currentColumnId,
  columns,
}: {
  projectId: string;
  taskId: string;
  currentColumnId: string;
  columns: Column[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleMove = (columnId: string) => {
    if (columnId === currentColumnId) return;
    const fd = new FormData();
    fd.set("columnId", columnId);
    startTransition(async () => {
      await moveTaskAction(taskId, fd);
      router.refresh();
    });
  };

  const handleArchive = () => {
    if (
      !confirm("Arquivar esta tarefa? Ela deixará de aparecer no board.")
    ) {
      return;
    }
    startTransition(async () => {
      try {
        await deleteTaskAction(taskId);
      } catch (err) {
        if (
          typeof err === "object" &&
          err !== null &&
          "digest" in err &&
          String((err as { digest?: string }).digest).startsWith(
            "NEXT_REDIRECT",
          )
        ) {
          router.refresh();
          return;
        }
        console.error("[TaskCardMenu] archive failed:", err);
      }
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Ações da tarefa"
          disabled={pending}
          className="ml-auto inline-flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover/card:opacity-100 data-[state=open]:opacity-100 focus-visible:opacity-100 disabled:opacity-50"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={4} className="min-w-[12rem]">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger disabled={pending}>
            <ArrowRight className="size-3.5" />
            Mover para
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-[12rem]">
            {columns.length === 0 ? (
              <DropdownMenuItem disabled>Nenhuma coluna</DropdownMenuItem>
            ) : (
              columns.map((c) => {
                const isCurrent = c.id === currentColumnId;
                return (
                  <DropdownMenuItem
                    key={c.id}
                    disabled={pending || isCurrent}
                    onSelect={(e) => {
                      e.preventDefault();
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
          </DropdownMenuSubContent>
        </DropdownMenuSub>
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
            handleArchive();
          }}
        >
          <Trash2 className="size-3.5" />
          Arquivar tarefa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
