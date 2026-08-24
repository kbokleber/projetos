import Link from "next/link";
import { Circle, CircleCheck, CalendarDays, AlertCircle } from "lucide-react";
import { toggleTaskCompletionAction } from "@/features/tasks/actions";
import { dateBR } from "@/lib/format-date";
import { TaskCardMenu } from "@/features/tasks/task-card-menu";

type Assignee = { user: { id: string; name: string | null } };
type Column = { id: string; name: string };

export function TaskCard({
  projectId,
  task,
  canComplete,
  columns,
}: {
  projectId: string;
  task: {
    id: string;
    title: string;
    priority: string;
    completedAt: Date | null;
    dueDate: Date | null;
    assignees: Assignee[];
    columnId: string;
  };
  canComplete: boolean;
  columns?: Column[];
}) {
  const completed = !!task.completedAt;
  const overdue =
    !completed && task.dueDate && task.dueDate < new Date();

  const priorityColor: Record<string, string> = {
    LOW: "bg-slate-500/10 text-slate-700",
    MEDIUM: "bg-sky-500/10 text-sky-700",
    HIGH: "bg-amber-500/10 text-amber-700",
    URGENT: "bg-red-500/10 text-red-700",
  };

  return (
    <div
      data-task-id={task.id}
      className="group/card flex items-stretch gap-1 rounded-md border border-border bg-card p-2 shadow-sm transition-colors hover:bg-accent/30"
    >
      {canComplete && (
        <form action={toggleTaskCompletionAction} className="pt-1">
          <input type="hidden" name="taskId" value={task.id} />
          <button
            type="submit"
            title={completed ? "Reabrir" : "Concluir"}
            className="text-muted-foreground hover:text-foreground"
          >
            {completed ? (
              <CircleCheck className="size-4 text-emerald-600" />
            ) : (
              <Circle className="size-4" />
            )}
          </button>
        </form>
      )}
      <Link
        href={`/projects/${projectId}/tasks/${task.id}`}
        className="min-w-0 flex-1"
      >
        <p
          className={
            "line-clamp-2 text-sm font-medium " +
            (completed ? "text-muted-foreground line-through" : "")
          }
        >
          {task.title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span
            className={
              "rounded px-1.5 py-0.5 " +
              (priorityColor[task.priority] ?? "bg-muted")
            }
          >
            {task.priority}
          </span>
          {task.dueDate && (
            <span
              className={
                "inline-flex items-center gap-1 " +
                (overdue ? "text-destructive" : "")
              }
            >
              {overdue ? (
                <AlertCircle className="size-3" />
              ) : (
                <CalendarDays className="size-3" />
              )}
              {dateBR(task.dueDate)}
            </span>
          )}
          {task.assignees.length > 0 && (
            <span className="ml-auto flex -space-x-1">
              {task.assignees.slice(0, 3).map((a) => (
                <span
                  key={a.user.id}
                  title={a.user.name ?? ""}
                  className="flex size-4 items-center justify-center rounded-full border border-card bg-primary text-[9px] font-medium text-primary-foreground"
                >
                  {(a.user.name ?? "?").slice(0, 1).toUpperCase()}
                </span>
              ))}
            </span>
          )}
        </div>
      </Link>
      {columns && columns.length > 1 && (
        <TaskCardMenu
          projectId={projectId}
          taskId={task.id}
          currentColumnId={task.columnId}
          columns={columns}
        />
      )}
    </div>
  );
}
