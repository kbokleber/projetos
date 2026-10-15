import Link from "next/link";
import { Circle, CircleCheck } from "lucide-react";
import { toggleTaskCompletionAction } from "@/features/tasks/actions";
import { dateBR } from "@/lib/format-date";
import {
  taskPriorityLabel,
  taskStatusLabel,
  type TaskViewItem,
} from "@/features/tasks/task-view-types";

const priorityClass: Record<string, string> = {
  LOW: "bg-slate-500/10 text-slate-700",
  MEDIUM: "bg-sky-500/10 text-sky-700",
  HIGH: "bg-amber-500/10 text-amber-700",
  URGENT: "bg-red-500/10 text-red-700",
};

export function TasksGridView({
  projectId,
  tasks,
  canEdit,
}: {
  projectId: string;
  tasks: TaskViewItem[];
  canEdit: boolean;
}) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
        Nenhuma tarefa neste board.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="w-10 px-3 py-2.5 font-medium" />
            <th className="px-3 py-2.5 font-medium">Nome</th>
            <th className="px-3 py-2.5 font-medium">Atribuídos</th>
            <th className="px-3 py-2.5 font-medium">Início</th>
            <th className="px-3 py-2.5 font-medium">Vencimento</th>
            <th className="px-3 py-2.5 font-medium">Bucket</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Prioridade</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const completed = !!task.completedAt;
            return (
              <tr
                key={task.id}
                className="border-b border-border last:border-0 hover:bg-accent/30"
              >
                <td className="px-3 py-2 align-middle">
                  {canEdit ? (
                    <form action={toggleTaskCompletionAction}>
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
                  ) : completed ? (
                    <CircleCheck className="size-4 text-emerald-600" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground" />
                  )}
                </td>
                <td className="px-3 py-2 align-middle">
                  <Link
                    href={`/projects/${projectId}/tasks/${task.id}`}
                    className={
                      "font-medium hover:underline " +
                      (completed
                        ? "text-muted-foreground line-through"
                        : "text-foreground")
                    }
                  >
                    {task.title}
                  </Link>
                </td>
                <td className="px-3 py-2 align-middle text-muted-foreground">
                  {task.assignees.length === 0
                    ? "—"
                    : task.assignees
                        .map((a) => a.user.name ?? "Sem nome")
                        .join(", ")}
                </td>
                <td className="px-3 py-2 align-middle text-muted-foreground">
                  {dateBR(task.startDate)}
                </td>
                <td className="px-3 py-2 align-middle text-muted-foreground">
                  {dateBR(task.dueDate)}
                </td>
                <td className="px-3 py-2 align-middle text-muted-foreground">
                  {task.columnName}
                </td>
                <td className="px-3 py-2 align-middle">
                  <span
                    className={
                      "rounded px-1.5 py-0.5 text-[11px] " +
                      (completed
                        ? "bg-emerald-500/10 text-emerald-700"
                        : "bg-sky-500/10 text-sky-700")
                    }
                  >
                    {taskStatusLabel(task)}
                  </span>
                </td>
                <td className="px-3 py-2 align-middle">
                  <span
                    className={
                      "rounded px-1.5 py-0.5 text-[11px] " +
                      (priorityClass[task.priority] ?? "bg-muted")
                    }
                  >
                    {taskPriorityLabel(task.priority)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
