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
  restoreTaskAction,
  toggleTaskCompletionAction,
  type TaskFormState,
} from "@/features/tasks/actions";
import { dateTimeBR } from "@/lib/format-date";
import {
  Save,
  Trash2,
  Send,
  Circle,
  CircleCheck,
  CalendarDays,
  Flag,
  Users,
  Columns3,
  Clock3,
  MessageSquare,
  CheckCircle2,
  ArchiveRestore,
} from "lucide-react";
import {
  TaskAttachments,
  type AttachmentItem,
} from "@/features/tasks/task-attachments";
import {
  TaskChecklist,
  type ChecklistView,
} from "@/features/tasks/task-checklist";
import { TaskAssigneePicker } from "@/features/tasks/task-assignee-picker";
import { cn } from "@/lib/utils";

type Column = { id: string; name: string };
type Member = { userId: string; name: string | null; email: string };

const PRIORITY_LABEL: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

const fieldClass =
  "h-9 w-full rounded-md border-0 bg-transparent px-1 text-sm outline-none transition-colors hover:bg-muted/50 focus:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60";

const selectClass =
  "h-9 w-full rounded-md border border-transparent bg-muted/40 px-2 text-sm outline-none transition-colors hover:bg-muted/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60";

function initials(name: string | null | undefined, email: string) {
  const base = (name ?? email).trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return base.slice(0, 2).toUpperCase();
}

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
    archivedAt: Date | null;
  };
  comments: Array<{
    id: string;
    content: string;
    createdAt: Date;
    user: { id: string; name: string | null; email: string };
  }>;
  attachments: AttachmentItem[];
  checklists: ChecklistView[];
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
    attachments,
    checklists,
    currentUserId,
  } = props;

  const formId = `task-edit-${taskId}`;
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

  const router = useRouter();
  const [toggling, startToggle] = useTransition();
  const completed = !!initial.completedAt;
  const archived = !!initial.archivedAt;
  // Conteúdo e metadados: só com tarefa em andamento (não concluída nem arquivada)
  const contentLocked = completed || archived;
  const canEditContent = canEdit && !contentLocked;
  const canEditMeta = canEdit && !contentLocked;
  // Reabrir / mover bucket ainda permitido se só estiver concluída
  const canReopenOrMove = canEdit && !archived;

  const isoDate = (d: Date | null) =>
    d ? new Date(d).toISOString().slice(0, 10) : "";

  const selectedAssignees = members.filter((m) =>
    currentAssigneeIds.includes(m.userId),
  );
  const me = members.find((m) => m.userId === currentUserId);

  return (
    <div className="flex flex-col gap-5">
      {updateState && !updateState.ok && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {updateState.error}
        </p>
      )}

      {/* form “fantasma” — campos usam form={formId} */}
      <form id={formId} action={updateAction} className="hidden" />

      <div className="flex items-start gap-3">
        {canReopenOrMove ? (
          <button
            type="button"
            disabled={toggling}
            title={completed ? "Reabrir" : "Marcar como concluída"}
            className="mt-1.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
            onClick={() => {
              startToggle(async () => {
                const fd = new FormData();
                fd.set("taskId", taskId);
                await toggleTaskCompletionAction(fd);
                router.refresh();
              });
            }}
          >
            {completed ? (
              <CircleCheck className="size-6 text-emerald-600" />
            ) : (
              <Circle className="size-6" />
            )}
          </button>
        ) : completed ? (
          <CircleCheck className="mt-1.5 size-6 shrink-0 text-emerald-600" />
        ) : (
          <Circle className="mt-1.5 size-6 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <input
            form={formId}
            id="title"
            name="title"
            required
            defaultValue={initial.title}
            disabled={!canEditMeta}
            readOnly={!canEditMeta}
            placeholder="Nome da tarefa"
            className={cn(
              "w-full border-0 bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-70",
              (completed || archived) && "text-muted-foreground",
              completed && "line-through",
            )}
          />
          {updateState?.ok === false && updateState.fieldErrors?.title && (
            <p className="mt-1 text-xs text-destructive">
              {updateState.fieldErrors.title}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {archived ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
                  Arquivada
                </span>
                {canEdit && <RestoreTaskButton taskId={taskId} />}
              </span>
            ) : (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2 py-0.5 font-medium",
                  completed
                    ? "bg-emerald-500/15 text-emerald-700"
                    : "bg-sky-500/15 text-sky-700",
                )}
              >
                {completed ? "Concluída" : "Em andamento"}
              </span>
            )}
            {completed && initial.completedAt && (
              <>
                <span>·</span>
                <span className="text-emerald-700">
                  em {dateTimeBR(initial.completedAt)}
                </span>
              </>
            )}
            <span>·</span>
            <span>{currentColumnName}</span>
            {selectedAssignees.length > 0 && (
              <>
                <span>·</span>
                <span className="inline-flex -space-x-1.5">
                  {selectedAssignees.slice(0, 4).map((m) => (
                    <span
                      key={m.userId}
                      title={m.name ?? m.email}
                      className="flex size-5 items-center justify-center rounded-full border border-background bg-primary text-[9px] font-semibold text-primary-foreground"
                    >
                      {initials(m.name, m.email)}
                    </span>
                  ))}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <section className="rounded-xl border border-border/80 bg-card/80 p-4 shadow-sm">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Notas
              </h2>
              {contentLocked && (
                <span className="text-[11px] text-muted-foreground">
                  {archived
                    ? "Tarefa arquivada — somente leitura"
                    : "Reabra a tarefa para editar"}
                </span>
              )}
            </div>
            <textarea
              form={formId}
              id="description"
              name="description"
              rows={8}
              defaultValue={initial.description ?? ""}
              disabled={!canEditMeta}
              readOnly={!canEditContent}
              placeholder="Adicione uma descrição ou notas…"
              className={cn(
                "w-full resize-y rounded-lg border-0 bg-transparent px-0 py-1 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/60 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60",
                !canEditContent && "cursor-default opacity-80",
              )}
            />
          </section>

          <TaskChecklist
            taskId={taskId}
            canEdit={canEditContent}
            checklists={checklists}
          />

          <TaskAttachments
            taskId={taskId}
            canEdit={canEditContent}
            attachments={attachments}
            variant="teams"
          />

          <section className="rounded-xl border border-border/80 bg-card/80 p-4 shadow-sm">
            <h2 className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <MessageSquare className="size-3.5" />
              Comentários
              <span className="font-normal normal-case tracking-normal">
                ({comments.length})
              </span>
              {contentLocked && (
                <span className="ml-auto font-normal normal-case tracking-normal">
                  {archived
                    ? "Arquivada — somente leitura"
                    : "Reabra a tarefa para comentar"}
                </span>
              )}
            </h2>

            {comments.length === 0 ? (
              <p className="mb-4 text-sm text-muted-foreground">
                Nenhuma conversa ainda.
                {canEditContent
                  ? " Seja o primeiro a comentar."
                  : ""}
              </p>
            ) : (
              <ul
                className={cn(
                  "flex flex-col gap-4",
                  canEditContent && "mb-4",
                )}
              >
                {comments.map((c) => (
                  <li key={c.id} className="flex gap-2.5">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
                      {initials(c.user.name, c.user.email)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-sm font-medium">
                          {c.user.name ?? c.user.email}
                          {c.user.id === currentUserId ? " (você)" : ""}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {dateTimeBR(c.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                        {c.content}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {canEditContent && (
              <form action={commentAction} className="flex gap-2.5 border-t border-border/60 pt-4">
                <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  {initials(me?.name, me?.email ?? "EU")}
                </span>
                <div className="min-w-0 flex-1">
                  <textarea
                    name="content"
                    required
                    rows={2}
                    placeholder="Escreva um comentário…"
                    className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  {commentState && !commentState.ok && (
                    <p className="mt-1 text-xs text-destructive">
                      {commentState.error}
                    </p>
                  )}
                  <div className="mt-2 flex justify-end">
                    <Button type="submit" size="sm" disabled={commenting}>
                      <Send className="size-3.5" />
                      {commenting ? "Enviando…" : "Comentar"}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-3 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-xl border border-border/80 bg-card/80 p-3 shadow-sm">
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Propriedades
            </h2>

            <PropertyRow icon={<Users className="size-3.5" />} label="Atribuído a">
              {members.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">
                  Nenhum membro disponível
                </p>
              ) : (
                <TaskAssigneePicker
                  formId={formId}
                  members={members}
                  currentAssigneeIds={currentAssigneeIds}
                  currentUserId={currentUserId}
                  disabled={!canEditMeta}
                />
              )}
            </PropertyRow>

            <PropertyRow icon={<Columns3 className="size-3.5" />} label="Bucket">
              <span className="px-1 text-sm">{currentColumnName}</span>
            </PropertyRow>

            {completed && initial.completedAt && (
              <PropertyRow
                icon={<CheckCircle2 className="size-3.5" />}
                label="Concluída em"
              >
                <span className="px-1 text-sm text-emerald-700">
                  {dateTimeBR(initial.completedAt)}
                </span>
              </PropertyRow>
            )}

            <PropertyRow icon={<Flag className="size-3.5" />} label="Prioridade">
              <select
                form={formId}
                id="priority"
                name="priority"
                defaultValue={initial.priority}
                disabled={!canEditMeta}
                className={selectClass}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p] ?? p}
                  </option>
                ))}
              </select>
            </PropertyRow>

            <PropertyRow
              icon={<CalendarDays className="size-3.5" />}
              label="Início"
            >
              <input
                form={formId}
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={isoDate(initial.startDate)}
                disabled={!canEditMeta}
                className={fieldClass}
              />
            </PropertyRow>

            <PropertyRow
              icon={<CalendarDays className="size-3.5" />}
              label="Prazo"
            >
              <input
                form={formId}
                id="dueDate"
                name="dueDate"
                type="date"
                defaultValue={isoDate(initial.dueDate)}
                disabled={!canEditMeta}
                className={fieldClass}
              />
            </PropertyRow>

            <PropertyRow icon={<Clock3 className="size-3.5" />} label="Estimativa">
              <div className="flex items-center gap-1 px-1">
                <input
                  form={formId}
                  id="estimatedHours"
                  name="estimatedHours"
                  type="number"
                  step="0.5"
                  min="0"
                  defaultValue={initial.estimatedHours ?? ""}
                  disabled={!canEditMeta}
                  placeholder="—"
                  className={cn(fieldClass, "w-20")}
                />
                <span className="text-xs text-muted-foreground">h</span>
              </div>
            </PropertyRow>

            <div className="mt-3 border-t border-border/70 pt-3">
              <Button
                type="submit"
                form={formId}
                className="w-full"
                disabled={!canEditMeta || updating}
                title={
                  contentLocked
                    ? archived
                      ? "Tarefa arquivada — somente leitura"
                      : "Reabra a tarefa para salvar alterações"
                    : undefined
                }
              >
                <Save className="size-4" />
                {updating ? "Salvando…" : "Salvar"}
              </Button>
            </div>
          </div>

          {canReopenOrMove && (
            <MoveBucketForm
              taskId={taskId}
              columns={columns}
              currentColumnId={currentColumnId}
            />
          )}

          {canReopenOrMove && (
            <DeleteTaskButton taskId={taskId} projectId={projectId} />
          )}
        </aside>
      </div>
    </div>
  );
}

function PropertyRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-start gap-2 border-b border-border/50 py-2 last:border-b-0">
      <div className="flex items-center gap-1.5 px-1 pt-1.5 text-[11px] font-medium text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function MoveBucketForm({
  taskId,
  columns,
  currentColumnId,
}: {
  taskId: string;
  columns: Column[];
  currentColumnId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-border/80 bg-card/80 p-3 shadow-sm">
      <label
        htmlFor="columnId"
        className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] font-medium text-muted-foreground"
      >
        <Columns3 className="size-3.5" />
        Mover para bucket
      </label>
      <select
        id="columnId"
        defaultValue={currentColumnId}
        disabled={pending}
        className={selectClass}
        onChange={(e) => {
          const columnId = e.target.value;
          if (columnId === currentColumnId) return;
          const fd = new FormData();
          fd.set("columnId", columnId);
          startTransition(async () => {
            await moveTaskAction(taskId, fd);
            router.refresh();
          });
        }}
      >
        {columns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {pending && (
        <p className="mt-1 px-1 text-[11px] text-muted-foreground">Movendo…</p>
      )}
    </div>
  );
}

function RestoreTaskButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-6 px-2 text-[11px]"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const res = await restoreTaskAction(taskId);
          if (!res.ok) {
            alert(res.error);
            return;
          }
          router.refresh();
        });
      }}
    >
      <ArchiveRestore className="size-3" />
      {pending ? "Restaurando…" : "Restaurar"}
    </Button>
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
    <div className="flex flex-col gap-1 px-1">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        className="justify-start text-muted-foreground hover:text-destructive"
        onClick={() => {
          if (
            !confirm(
              "Arquivar esta tarefa? Ela deixará de aparecer no board. Você pode restaurá-la na aba Arquivadas.",
            )
          ) {
            return;
          }
          setError(null);
          startTransition(async () => {
            try {
              await deleteTaskAction(taskId);
              router.push(`/projects/${projectId}?tab=archived`);
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
                router.push(`/projects/${projectId}?tab=archived`);
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
        {pending ? "Arquivando…" : "Arquivar tarefa"}
      </Button>
    </div>
  );
}
