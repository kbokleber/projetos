"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TASK_PRIORITIES } from "@/lib/constants";
import {
  createCommentAction,
  moveTaskAction,
  updateTaskDetailsAction,
  deleteTaskAction,
  type TaskFormState,
} from "@/features/tasks/actions";
import { dateTimeBR } from "@/lib/format-date";
import { Save, Trash2, MoveRight, Send } from "lucide-react";

type Column = { id: string; name: string };
type Member = { userId: string; name: string | null; email: string };

export function TaskDetailsPanel(props: {
  taskId: string;
  projectId: string;
  canEdit: boolean;
  columns: Column[];
  currentColumnId: string;
  currentColumnName: string;
  members: Member[];
  currentAssigneeIds: string[];
  initial: {
    title: string;
    description: string | null;
    priority: string;
    startDate: Date | null;
    dueDate: Date | null;
    estimatedHours: number | null;
    completedAt: Date | null;
  };
  comments: Array<{
    id: string;
    content: string;
    createdAt: Date;
    user: { id: string; name: string | null; email: string };
  }>;
  currentUserId: string;
}) {
  const {
    taskId,
    projectId,
    canEdit,
    columns,
    currentColumnId,
    currentColumnName,
    members,
    currentAssigneeIds,
    initial,
    comments,
    currentUserId,
  } = props;

  const boundUpdate = updateTaskDetailsAction.bind(null, taskId);
  const [updateState, updateAction, updating] = useActionState<
    TaskFormState,
    FormData
  >(boundUpdate, undefined);

  const boundComment = createCommentAction.bind(null, taskId);
  const [commentState, commentAction, commenting] = useActionState<
    { ok: boolean; error?: string } | undefined,
    FormData
  >(boundComment, undefined);

  const moveBound = async (formData: FormData) => {
    await moveTaskAction(taskId, formData);
  };

  const isoDate = (d: Date | null) =>
    d ? new Date(d).toISOString().slice(0, 10) : "";

  return (
    <div className="flex flex-col gap-6">
      <form
        action={updateAction}
        className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4"
      >
        {updateState && !updateState.ok && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {updateState.error}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="title" className="text-sm">
            Título
          </label>
          <input
            id="title"
            name="title"
            required
            defaultValue={initial.title}
            disabled={!canEdit}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          />
          {updateState?.ok === false && updateState.fieldErrors?.title && (
            <p className="text-xs text-destructive">
              {updateState.fieldErrors.title}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className="text-sm">
            Descrição
          </label>
          <textarea
            id="description"
            name="description"
            rows={6}
            defaultValue={initial.description ?? ""}
            disabled={!canEdit}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="priority" className="text-sm">Prioridade</label>
            <select
              id="priority"
              name="priority"
              defaultValue={initial.priority}
              disabled={!canEdit}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="startDate" className="text-sm">Início</label>
            <input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={isoDate(initial.startDate)}
              disabled={!canEdit}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dueDate" className="text-sm">Prazo</label>
            <input
              id="dueDate"
              name="dueDate"
              type="date"
              defaultValue={isoDate(initial.dueDate)}
              disabled={!canEdit}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="estimatedHours" className="text-sm">Estimativa (h)</label>
            <input
              id="estimatedHours"
              name="estimatedHours"
              type="number"
              step="0.5"
              min="0"
              defaultValue={initial.estimatedHours ?? ""}
              disabled={!canEdit}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm">Responsáveis</label>
          <p className="text-xs text-muted-foreground">
            Pessoas com acesso a este projeto (membros do projeto ou do
            workspace). Marque quantas quiser.
          </p>
          {members.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
              Nenhum membro disponível. Convide usuários ao workspace ou ao
              projeto.
            </p>
          ) : (
            <div className="grid max-h-48 gap-1.5 overflow-y-auto rounded-md border border-input bg-background p-2 sm:grid-cols-2">
              {members.map((m) => (
                <label
                  key={m.userId}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="assigneeIds"
                    value={m.userId}
                    defaultChecked={currentAssigneeIds.includes(m.userId)}
                    disabled={!canEdit}
                    className="size-4 rounded border-input"
                  />
                  <span className="min-w-0 truncate">
                    {m.name ?? m.email}
                    {m.userId === currentUserId ? " (você)" : ""}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <div className="text-xs text-muted-foreground">
            Coluna atual: <span className="font-medium text-foreground">{currentColumnName}</span>
          </div>
          {canEdit && (
            <Button type="submit" disabled={updating}>
              <Save className="size-4" />
              {updating ? "Salvando..." : "Salvar alterações"}
            </Button>
          )}
        </div>
      </form>

      {canEdit && (
        <form
          action={moveBound}
          className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="columnId" className="text-sm">
              Mover para
            </label>
            <select
              id="columnId"
              name="columnId"
              defaultValue={currentColumnId}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="outline">
            <MoveRight className="size-4" />
            Mover
          </Button>
        </form>
      )}

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium">Comentários</h2>

        {canEdit && (
          <form action={commentAction} className="mb-4 flex flex-col gap-2">
            <textarea
              name="content"
              required
              rows={3}
              placeholder="Escreva um comentário..."
              className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {commentState && !commentState.ok && (
              <p className="text-xs text-destructive">{commentState.error}</p>
            )}
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={commenting}>
                <Send className="size-3.5" />
                {commenting ? "Enviando..." : "Comentar"}
              </Button>
            </div>
          </form>
        )}

        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum comentário ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {comments.map((c) => (
              <li
                key={c.id}
                className="rounded-md border border-border bg-background p-3"
              >
                <header className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {c.user.name ?? c.user.email}
                    {c.user.id === currentUserId && (
                      <span className="ml-1.5 text-muted-foreground">
                        (você)
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    {dateTimeBR(c.createdAt)}
                  </span>
                </header>
                <p className="whitespace-pre-wrap text-sm">{c.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {canEdit && (
        <DeleteTaskButton taskId={taskId} projectId={projectId} />
      )}
    </div>
  );
}

function DeleteTaskButton({
  taskId,
  projectId,
}: {
  taskId: string;
  projectId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (
            !confirm(
              "Arquivar esta tarefa? Ela deixará de aparecer no board.",
            )
          ) {
            return;
          }
          setError(null);
          startTransition(async () => {
            try {
              await deleteTaskAction(taskId);
              router.push(`/projects/${projectId}`);
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
                router.push(`/projects/${projectId}`);
                router.refresh();
                return;
              }
              setError(
                err instanceof Error
                  ? err.message
                  : "Não foi possível arquivar a tarefa.",
              );
            }
          });
        }}
      >
        <Trash2 className="size-3.5" />
        {pending ? "Arquivando..." : "Arquivar tarefa"}
      </Button>
    </div>
  );
}
