"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Circle, CircleCheck, ListChecks, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  addChecklistItemAction,
  deleteChecklistItemAction,
  toggleChecklistItemAction,
  updateChecklistItemAction,
  type ChecklistActionState,
} from "@/features/tasks/checklist-actions";
import { cn } from "@/lib/utils";

export type ChecklistItemView = {
  id: string;
  description: string;
  completed: boolean;
};

export type ChecklistView = {
  id: string;
  title: string;
  items: ChecklistItemView[];
};

export function TaskChecklist({
  taskId,
  canEdit,
  checklists,
}: {
  taskId: string;
  canEdit: boolean;
  checklists: ChecklistView[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const boundAdd = addChecklistItemAction.bind(null, taskId);
  const [state, action, pending] = useActionState<
    ChecklistActionState,
    FormData
  >(boundAdd, undefined);

  const items = checklists.flatMap((c) => c.items);
  const done = items.filter((i) => i.completed).length;
  const total = items.length;

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      if (inputRef.current) inputRef.current.value = "";
      inputRef.current?.focus();
    }
  }, [state, router]);

  return (
    <section className="rounded-xl border border-border/80 bg-card/80 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <ListChecks className="size-3.5" />
          Lista de verificação
          <span className="font-normal normal-case tracking-normal">
            ({done} de {total} {total === 1 ? "item concluído" : "itens concluídos"})
          </span>
          {!canEdit && total > 0 && (
            <span className="font-normal normal-case tracking-normal">
              · somente leitura
            </span>
          )}
        </h2>
        {total > 0 && (
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.round((done / total) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {total === 0 && !canEdit ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma subtarefa nesta lista.
        </p>
      ) : (
        <ul className="flex flex-col">
          {items.map((item) => (
            <ChecklistRow
              key={item.id}
              item={item}
              canEdit={canEdit}
            />
          ))}
        </ul>
      )}

      {canEdit && (
        <form
          action={action}
          className="mt-1 flex items-center gap-2 border-t border-border/50 pt-2"
        >
          <Circle className="size-5 shrink-0 text-muted-foreground/50" />
          <input
            ref={inputRef}
            name="description"
            required
            maxLength={500}
            disabled={pending}
            placeholder="Adicionar um item"
            className="h-9 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.currentTarget.blur();
              }
            }}
          />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            disabled={pending}
            className="shrink-0 text-primary"
          >
            {pending ? "…" : "Adicionar"}
          </Button>
        </form>
      )}
      {state && !state.ok && (
        <p className="mt-1 text-xs text-destructive">{state.error}</p>
      )}
    </section>
  );
}

function ChecklistRow({
  item,
  canEdit,
}: {
  item: ChecklistItemView;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(item.description);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(item.description);
  }, [item.description]);

  return (
    <li
      className={cn(
        "group flex items-start gap-2 rounded-md px-1 py-1.5 transition-colors hover:bg-muted/40",
        pending && "opacity-60",
      )}
    >
      <button
        type="button"
        disabled={!canEdit || pending}
        title={item.completed ? "Reabrir" : "Concluir"}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground disabled:cursor-default"
        onClick={() => {
          startTransition(async () => {
            setError(null);
            const res = await toggleChecklistItemAction(item.id);
            if (!res.ok) setError(res.error);
            router.refresh();
          });
        }}
      >
        {item.completed ? (
          <CircleCheck className="size-5 text-emerald-600" />
        ) : (
          <Circle className="size-5" />
        )}
      </button>

      {canEdit ? (
        <input
          value={text}
          disabled={pending}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            const next = text.trim();
            if (!next || next === item.description) {
              setText(item.description);
              return;
            }
            startTransition(async () => {
              setError(null);
              const res = await updateChecklistItemAction(item.id, next);
              if (!res.ok) {
                setError(res.error);
                setText(item.description);
              }
              router.refresh();
            });
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur();
            }
            if (e.key === "Escape") {
              setText(item.description);
              e.currentTarget.blur();
            }
          }}
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent py-0.5 text-sm outline-none focus-visible:ring-0",
            item.completed && "text-muted-foreground line-through",
          )}
        />
      ) : (
        <span
          className={cn(
            "min-w-0 flex-1 py-0.5 text-sm",
            item.completed && "text-muted-foreground line-through",
          )}
        >
          {item.description}
        </span>
      )}

      {canEdit && (
        <button
          type="button"
          disabled={pending}
          title="Remover item"
          className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
          onClick={() => {
            if (!confirm("Remover este item da lista?")) return;
            startTransition(async () => {
              setError(null);
              const res = await deleteChecklistItemAction(item.id);
              if (!res.ok) setError(res.error);
              router.refresh();
            });
          }}
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
      {error && (
        <span className="w-full text-[11px] text-destructive">{error}</span>
      )}
    </li>
  );
}
