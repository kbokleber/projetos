"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Circle, CircleCheck, CalendarDays, AlertCircle } from "lucide-react";
import { dateBR } from "@/lib/format-date";
import { toggleTaskCompletionAction, reorderTaskAction } from "@/features/tasks/actions";
import { TaskCardMenu } from "@/features/tasks/task-card-menu";
import { QuickTaskButton } from "@/features/tasks/quick-task-button";
import { cn } from "@/lib/utils";

type Assignee = { user: { id: string; name: string | null } };
type TaskLite = {
  id: string;
  columnId: string;
  title: string;
  priority: string;
  completedAt: Date | null;
  dueDate: Date | null;
  assignees: Assignee[];
};
type ColumnLite = {
  id: string;
  name: string;
  color: string | null;
  tasks: TaskLite[];
};

const priorityColor: Record<string, string> = {
  LOW: "bg-slate-500/10 text-slate-700",
  MEDIUM: "bg-sky-500/10 text-sky-700",
  HIGH: "bg-amber-500/10 text-amber-700",
  URGENT: "bg-red-500/10 text-red-700",
};

export function KanbanBoard({
  projectId,
  boardId,
  columns,
  canEdit,
}: {
  projectId: string;
  boardId: string;
  columns: ColumnLite[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState<ColumnLite[]>(columns);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function findContainerByTaskId(taskId: string): string | undefined {
    return items.find((col) => col.tasks.some((t) => t.id === taskId))?.id;
  }

  function findTask(taskId: string): TaskLite | undefined {
    for (const col of items) {
      const t = col.tasks.find((t) => t.id === taskId);
      if (t) return t;
    }
    return undefined;
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    const fromColId = findContainerByTaskId(activeIdStr);
    if (!fromColId) return;

    // over pode ser uma coluna (id começa com "col:") ou uma tarefa
    let toColId: string | undefined;

    if (overIdStr.startsWith("col:")) {
      toColId = overIdStr.slice(4);
    } else {
      toColId = findContainerByTaskId(overIdStr);
    }

    if (!toColId) return;
    if (toColId === fromColId) return;

    // Calcula índice na coluna destino baseado em onde está o over
    const targetCol = items.find((c) => c.id === toColId);
    const overIndex = overIdStr.startsWith("col:")
      ? (targetCol?.tasks.length ?? 0)
      : (targetCol?.tasks.findIndex((t) => t.id === overIdStr) ?? 0);

    setItems((prev) => {
      const next = prev.map((c) => ({ ...c, tasks: [...c.tasks] }));
      const fromCol = next.find((c) => c.id === fromColId)!;
      const toCol = next.find((c) => c.id === toColId)!;
      const idx = fromCol.tasks.findIndex((t) => t.id === activeIdStr);
      if (idx < 0) return prev;
      const [task] = fromCol.tasks.splice(idx, 1);
      task.columnId = toCol.id;
      const insertAt = overIndex < 0 ? toCol.tasks.length : overIndex;
      toCol.tasks.splice(insertAt, 0, task);
      return next;
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const activeIdStr = String(active.id);

    let toColId: string | undefined;
    let toIndex = 0;

    if (String(over.id).startsWith("col:")) {
      toColId = String(over.id).slice(4);
      const col = items.find((c) => c.id === toColId);
      toIndex = col ? col.tasks.length : 0;
    } else {
      toColId = findContainerByTaskId(String(over.id));
      const col = items.find((c) => c.id === toColId);
      toIndex = col ? col.tasks.findIndex((t) => t.id === String(over.id)) : 0;
      if (toIndex < 0) toIndex = 0;
    }

    if (!toColId) return;

    const col = items.find((c) => c.id === toColId);
    if (!col) return;
    const finalIndex = col.tasks.findIndex((t) => t.id === activeIdStr);
    if (finalIndex < 0) return;

    // Sincroniza o estado local e dispara a action
    const fd = new FormData();
    fd.set("taskId", activeIdStr);
    fd.set("columnId", toColId);
    fd.set("index", String(finalIndex));

    startTransition(async () => {
      const res = await reorderTaskAction(fd);
      if (!res.ok) {
        // rollback: refetch do servidor
        router.refresh();
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  }

  const activeTask = activeId ? findTask(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {items.map((col) => (
          <KanbanColumn
            key={col.id}
            projectId={projectId}
            boardId={boardId}
            column={col}
            canEdit={canEdit}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="w-72 cursor-grabbing opacity-90">
            <TaskCardContent
              projectId={projectId}
              task={activeTask}
              canComplete={canEdit}
              isOverlay
              columns={items.map((c) => ({ id: c.id, name: c.name }))}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  projectId,
  boardId,
  column,
  canEdit,
}: {
  projectId: string;
  boardId: string;
  column: ColumnLite;
  canEdit: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${column.id}` });
  const taskIds = column.tasks.map((t) => t.id);

  return (
    <section
      ref={setNodeRef}
      data-column-id={column.id}
      className={cn(
        "flex w-72 shrink-0 flex-col gap-2 rounded-xl bg-muted/40 p-3 transition-colors",
        isOver && "ring-2 ring-primary/40 bg-muted/70",
      )}
    >
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {column.color && (
            <span
              className="size-2.5 rounded-sm"
              style={{ background: column.color }}
            />
          )}
          <h3 className="text-sm font-medium">{column.name}</h3>
          <span className="rounded bg-background px-1.5 py-0.5 text-xs text-muted-foreground">
            {column.tasks.length}
          </span>
        </div>
      </header>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2 min-h-[12px]">
          {column.tasks.map((t) => (
            <SortableTaskCard
              key={t.id}
              projectId={projectId}
              task={t}
              canComplete={canEdit}
            />
          ))}
          {canEdit && (
            <QuickTaskButton
              projectId={projectId}
              boardId={boardId}
              columnId={column.id}
            />
          )}
        </div>
      </SortableContext>
    </section>
  );
}

function SortableTaskCard({
  projectId,
  task,
  canComplete,
}: {
  projectId: string;
  task: TaskLite;
  canComplete: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: task.id,
      disabled: !canComplete,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCardContent
        projectId={projectId}
        task={task}
        canComplete={canComplete}
        columns={[]}
      />
    </div>
  );
}

function TaskCardContent({
  projectId,
  task,
  canComplete,
  columns,
  isOverlay = false,
}: {
  projectId: string;
  task: TaskLite;
  canComplete: boolean;
  columns: Array<{ id: string; name: string }>;
  isOverlay?: boolean;
}) {
  const completed = !!task.completedAt;
  const overdue = !completed && task.dueDate && task.dueDate < new Date();

  return (
    <div
      data-task-id={task.id}
      className={cn(
        "group/card flex items-stretch gap-1 rounded-md border border-border bg-card p-2 shadow-sm transition-colors hover:bg-accent/30",
        isOverlay && "shadow-lg ring-2 ring-primary/40",
      )}
    >
      {canComplete && (
        <form action={toggleTaskCompletionAction} className="pt-1">
          <input type="hidden" name="taskId" value={task.id} />
          <button
            type="submit"
            title={completed ? "Reabrir" : "Concluir"}
            onClick={(e) => e.stopPropagation()}
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
        onClick={(e) => e.stopPropagation()}
        className="min-w-0 flex-1"
      >
        <p
          className={cn(
            "line-clamp-2 text-sm font-medium",
            completed && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span
            className={cn(
              "rounded px-1.5 py-0.5",
              priorityColor[task.priority] ?? "bg-muted",
            )}
          >
            {task.priority}
          </span>
          {task.dueDate && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                overdue && "text-destructive",
              )}
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
      {columns.length > 1 && !isOverlay && (
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
