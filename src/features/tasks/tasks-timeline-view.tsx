import Link from "next/link";
import { dateBR } from "@/lib/format-date";
import type { TaskViewItem } from "@/features/tasks/task-view-types";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

function rangeForTask(task: TaskViewItem): { start: Date; end: Date } | null {
  if (task.startDate && task.dueDate) {
    const start = startOfDay(task.startDate);
    const end = startOfDay(task.dueDate);
    return start <= end ? { start, end } : { start: end, end: start };
  }
  if (task.dueDate) {
    const d = startOfDay(task.dueDate);
    return { start: d, end: d };
  }
  if (task.startDate) {
    const d = startOfDay(task.startDate);
    return { start: d, end: d };
  }
  return null;
}

export function TasksTimelineView({
  projectId,
  tasks,
}: {
  projectId: string;
  tasks: TaskViewItem[];
}) {
  const dated = tasks
    .map((task) => ({ task, range: rangeForTask(task) }))
    .filter((x): x is { task: TaskViewItem; range: { start: Date; end: Date } } =>
      !!x.range,
    );

  const undated = tasks.filter((t) => !rangeForTask(t));

  if (dated.length === 0 && undated.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
        Nenhuma tarefa neste board.
      </div>
    );
  }

  if (dated.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Nenhuma tarefa com data de início ou vencimento para exibir na linha do
        tempo.
        {undated.length > 0 && (
          <p className="mt-2 text-xs">
            {undated.length} tarefa(s) sem datas.
          </p>
        )}
      </div>
    );
  }

  const minStart = dated.reduce(
    (min, x) => (x.range.start < min ? x.range.start : min),
    dated[0].range.start,
  );
  const maxEnd = dated.reduce(
    (max, x) => (x.range.end > max ? x.range.end : max),
    dated[0].range.end,
  );

  const padStart = addDays(minStart, -2);
  const padEnd = addDays(maxEnd, 3);
  const totalDays = Math.max(daysBetween(padStart, padEnd), 1);
  const today = startOfDay(new Date());
  const todayOffset = daysBetween(padStart, today);

  const ticks: Date[] = [];
  for (let i = 0; i <= totalDays; i += Math.max(1, Math.floor(totalDays / 8))) {
    ticks.push(addDays(padStart, i));
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <div className="min-w-[720px]">
        <div className="grid grid-cols-[220px_1fr] border-b border-border bg-muted/40 text-xs text-muted-foreground">
          <div className="px-3 py-2.5 font-medium">Tarefa</div>
          <div className="relative px-2 py-2.5">
            <div className="relative h-5">
              {ticks.map((t) => {
                const left = (daysBetween(padStart, t) / totalDays) * 100;
                return (
                  <span
                    key={t.toISOString()}
                    className="absolute -translate-x-1/2 whitespace-nowrap"
                    style={{ left: `${left}%` }}
                  >
                    {dateBR(t)}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <ul>
          {dated.map(({ task, range }) => {
            const offset = daysBetween(padStart, range.start);
            const span = Math.max(daysBetween(range.start, range.end) + 1, 1);
            const left = (offset / totalDays) * 100;
            const width = (span / totalDays) * 100;
            const completed = !!task.completedAt;

            return (
              <li
                key={task.id}
                className="grid grid-cols-[220px_1fr] border-b border-border last:border-0"
              >
                <div className="flex flex-col justify-center gap-0.5 px-3 py-2.5">
                  <Link
                    href={`/projects/${projectId}/tasks/${task.id}`}
                    className={
                      "truncate text-sm font-medium hover:underline " +
                      (completed
                        ? "text-muted-foreground line-through"
                        : "")
                    }
                  >
                    {task.title}
                  </Link>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {task.columnName}
                    {task.assignees[0]?.user.name
                      ? ` · ${task.assignees[0].user.name}`
                      : ""}
                  </span>
                </div>
                <div className="relative mx-2 flex h-10 items-center">
                  {todayOffset >= 0 && todayOffset <= totalDays && (
                    <div
                      className="pointer-events-none absolute inset-y-0 z-0 w-px bg-primary/35"
                      style={{ left: `${(todayOffset / totalDays) * 100}%` }}
                      title="Hoje"
                    />
                  )}
                  <Link
                    href={`/projects/${projectId}/tasks/${task.id}`}
                    className={
                      "absolute z-[1] h-6 min-w-[8px] truncate rounded-md px-2 text-[10px] leading-6 text-white " +
                      (completed ? "bg-emerald-600/80" : "bg-sky-600")
                    }
                    style={{
                      left: `${left}%`,
                      width: `${Math.max(width, 1.5)}%`,
                    }}
                    title={`${dateBR(range.start)} → ${dateBR(range.end)}`}
                  >
                    {dateBR(range.start) === dateBR(range.end)
                      ? dateBR(range.start)
                      : `${dateBR(range.start)} – ${dateBR(range.end)}`}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>

        {undated.length > 0 && (
          <div className="border-t border-border px-3 py-3 text-xs text-muted-foreground">
            {undated.length} tarefa(s) sem datas — não exibidas na linha do
            tempo.
          </div>
        )}
      </div>
    </div>
  );
}
