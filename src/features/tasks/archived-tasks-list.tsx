"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArchiveRestore, ExternalLink, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dateBR, dateTimeBR } from "@/lib/format-date";
import { restoreTaskAction } from "@/features/tasks/actions";
import { cn } from "@/lib/utils";

export type ArchivedTaskRow = {
  id: string;
  title: string;
  priority: string;
  dueDate: Date | null;
  completedAt: Date | null;
  archivedAt: Date;
  column: { id: string; name: string };
  assignees: Array<{ user: { id: string; name: string | null } }>;
};

const priorityColor: Record<string, string> = {
  LOW: "bg-slate-500/10 text-slate-700",
  MEDIUM: "bg-sky-500/10 text-sky-700",
  HIGH: "bg-amber-500/10 text-amber-700",
  URGENT: "bg-red-500/10 text-red-700",
};

export function ArchivedTasksList({
  projectId,
  tasks,
  canEdit,
}: {
  projectId: string;
  tasks: ArchivedTaskRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
        <Inbox className="mx-auto mb-3 size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Nenhuma tarefa arquivada neste projeto.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {tasks.length}{" "}
        {tasks.length === 1 ? "tarefa arquivada" : "tarefas arquivadas"}.
        Restaurar devolve a tarefa ao board na mesma coluna.
      </p>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {tasks.map((t) => (
          <li
            key={t.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/projects/${projectId}/tasks/${t.id}`}
                  className="truncate font-medium hover:underline"
                >
                  {t.title}
                </Link>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[11px]",
                    priorityColor[t.priority] ?? "bg-muted",
                  )}
                >
                  {t.priority}
                </span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                  {t.column.name}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Arquivada em {dateTimeBR(t.archivedAt)}
                {t.completedAt
                  ? ` · Concluída em ${dateBR(t.completedAt)}`
                  : ""}
                {t.assignees.length > 0
                  ? ` · ${t.assignees
                      .map((a) => a.user.name)
                      .filter(Boolean)
                      .slice(0, 3)
                      .join(", ")}`
                  : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/projects/${projectId}/tasks/${t.id}`}>
                  <ExternalLink className="size-3.5" />
                  Abrir
                </Link>
              </Button>
              {canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending && pendingId === t.id}
                  onClick={() => {
                    setPendingId(t.id);
                    startTransition(async () => {
                      const res = await restoreTaskAction(t.id);
                      setPendingId(null);
                      if (!res.ok) {
                        alert(res.error);
                        return;
                      }
                      router.refresh();
                    });
                  }}
                >
                  <ArchiveRestore className="size-3.5" />
                  {pending && pendingId === t.id
                    ? "Restaurando…"
                    : "Restaurar"}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
