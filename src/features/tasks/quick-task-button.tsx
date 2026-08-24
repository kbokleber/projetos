"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  createQuickTaskAction,
  type TaskFormState,
} from "@/features/tasks/actions";
import { TASK_PRIORITIES } from "@/lib/constants";
import { Plus, X } from "lucide-react";

export function QuickTaskButton({
  projectId,
  boardId,
  columnId,
}: {
  projectId: string;
  boardId: string;
  columnId: string;
}) {
  const [open, setOpen] = useState(false);
  const bound = createQuickTaskAction;
  const [state, formAction, pending] = useActionState<
    TaskFormState,
    FormData
  >(bound, undefined);

  // Fecha ao sucesso
  if (state?.ok && open) {
    setTimeout(() => setOpen(false), 0);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-1 rounded-md border border-dashed border-border bg-background/40 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
      >
        <Plus className="size-3.5" /> Nova tarefa
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="flex flex-col gap-2 rounded-md border border-border bg-card p-2 shadow-sm"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="boardId" value={boardId} />
      <input type="hidden" name="columnId" value={columnId} />

      <input
        autoFocus
        name="title"
        placeholder="O que precisa ser feito?"
        required
        maxLength={240}
        className="rounded-md border border-input bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <div className="flex items-center gap-2">
        <select
          name="priority"
          defaultValue="MEDIUM"
          className="rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="dueDate"
          className="rounded-md border border-input bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {state && !state.ok && (
        <p className="text-xs text-destructive">
          {state.fieldErrors?.title ?? state.error}
        </p>
      )}

      <div className="flex justify-end gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
        >
          <X className="size-3.5" /> Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Criando..." : "Criar"}
        </Button>
      </div>
    </form>
  );
}
