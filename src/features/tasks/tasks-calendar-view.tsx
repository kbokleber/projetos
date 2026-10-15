"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TaskViewItem } from "@/features/tasks/task-view-types";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

export function TasksCalendarView({
  projectId,
  tasks,
}: {
  projectId: string;
  tasks: TaskViewItem[];
}) {
  const today = startOfDay(new Date());
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const { cells, byDay } = useMemo(() => {
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((startPad + daysInMonth) / 7) * 7;

    const map = new Map<string, TaskViewItem[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const d = startOfDay(task.dueDate);
      if (d.getMonth() !== month || d.getFullYear() !== year) continue;
      const key = dayKey(d);
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    }

    const grid: Array<{ date: Date | null; key: string }> = [];
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startPad + 1;
      if (dayNum < 1 || dayNum > daysInMonth) {
        grid.push({ date: null, key: `empty-${i}` });
      } else {
        const date = new Date(year, month, dayNum);
        grid.push({ date, key: dayKey(date) });
      }
    }

    return { cells: grid, byDay: map };
  }, [tasks, year, month]);

  const unscheduled = tasks.filter((t) => !t.dueDate);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium capitalize">
            {monthLabel(year, month)}
          </h2>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setCursor(new Date(today.getFullYear(), today.getMonth(), 1))
              }
            >
              Hoje
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              aria-label="Próximo mês"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-border text-center text-[11px] font-medium text-muted-foreground">
          {WEEKDAYS.map((d) => (
            <div key={d} className="px-1 py-2">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-[minmax(96px,1fr)]">
          {cells.map((cell) => {
            if (!cell.date) {
              return (
                <div
                  key={cell.key}
                  className="border-b border-r border-border bg-muted/20"
                />
              );
            }
            const dayTasks = byDay.get(cell.key) ?? [];
            const isToday = sameDay(cell.date, today);
            return (
              <div
                key={cell.key}
                className="flex min-h-24 flex-col gap-1 border-b border-r border-border p-1.5"
              >
                <span
                  className={
                    "inline-flex size-6 items-center justify-center rounded-full text-xs " +
                    (isToday
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground")
                  }
                >
                  {cell.date.getDate()}
                </span>
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  {dayTasks.slice(0, 3).map((task) => (
                    <Link
                      key={task.id}
                      href={`/projects/${projectId}/tasks/${task.id}`}
                      className={
                        "truncate rounded px-1 py-0.5 text-[11px] hover:bg-accent " +
                        (task.completedAt
                          ? "text-muted-foreground line-through"
                          : "bg-sky-500/10 text-sky-800")
                      }
                      title={task.title}
                    >
                      {task.title}
                    </Link>
                  ))}
                  {dayTasks.length > 3 && (
                    <span className="px-1 text-[10px] text-muted-foreground">
                      +{dayTasks.length - 3} mais
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <aside className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-medium">Tarefas não agendadas</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Sem data de vencimento
        </p>
        <ul className="mt-3 flex max-h-[480px] flex-col gap-1.5 overflow-y-auto">
          {unscheduled.length === 0 && (
            <li className="text-xs text-muted-foreground">Nenhuma.</li>
          )}
          {unscheduled.map((task) => (
            <li key={task.id}>
              <Link
                href={`/projects/${projectId}/tasks/${task.id}`}
                className={
                  "block rounded-md border border-border px-2.5 py-2 text-xs hover:bg-accent/40 " +
                  (task.completedAt
                    ? "text-muted-foreground line-through"
                    : "")
                }
              >
                {task.title}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
