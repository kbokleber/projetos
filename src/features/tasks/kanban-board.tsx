"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
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
import {
  Circle,
  CircleCheck,
  CalendarDays,
  AlertCircle,
  GripVertical,
} from "lucide-react";
import { dateBR } from "@/lib/format-date";
import {
  toggleTaskCompletionAction,
  reorderTaskAction,
} from "@/features/tasks/actions";
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

function moveTaskInBoard(
  board: ColumnLite[],
  taskId: string,
  toColId: string,
  toIndex: number,
): ColumnLite[] {
  const next = board.map((c) => ({ ...c, tasks: [...c.tasks] }));
  const fromCol = next.find((c) => c.tasks.some((t) => t.id === taskId));
  const toCol = next.find((c) => c.id === toColId);
  if (!fromCol || !toCol) return board;

  const fromIdx = fromCol.tasks.findIndex((t) => t.id === taskId);
  if (fromIdx < 0) return board;
  const [task] = fromCol.tasks.splice(fromIdx, 1);
  task.columnId = toCol.id;

  let insertAt = toIndex;
  if (fromCol.id === toCol.id && fromIdx < insertAt) {
    insertAt -= 1;
  }
  insertAt = Math.max(0, Math.min(insertAt, toCol.tasks.length));
  toCol.tasks.splice(insertAt, 0, task);
  return next;
}

function resolveDropTarget(
  board: ColumnLite[],
  activeId: string,
  overId: string,
): { toColId: string; toIndex: number } | null {
  if (overId.startsWith("col:")) {
    const toColId = overId.slice(4);
    const col = board.find((c) => c.id === toColId);
    if (!col) return null;
    const already = col.tasks.findIndex((t) => t.id === activeId);
    return {
      toColId,
      toIndex: already >= 0 ? already : col.tasks.length,
    };
  }

  const toCol = board.find((c) => c.tasks.some((t) => t.id === overId));
  if (!toCol) return null;
  const overIndex = toCol.tasks.findIndex((t) => t.id === overId);
  return {
    toColId: toCol.id,
    toIndex: overIndex < 0 ? toCol.tasks.length : overIndex,
  };
}

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
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(columns);
  }, [columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function findTask(taskId: string): TaskLite | undefined {
    for (const col of itemsRef.current) {
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
    if (!over || !canEdit) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const target = resolveDropTarget(itemsRef.current, activeIdStr, overIdStr);
    if (!target) return;

    const fromCol = itemsRef.current.find((c) =>
      c.tasks.some((t) => t.id === activeIdStr),
    );
    if (!fromCol) return;
    if (fromCol.id === target.toColId) return;

    setItems((prev) =>
      moveTaskInBoard(prev, activeIdStr, target.toColId, target.toIndex),
    );
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over || !canEdit) {
      setItems(columns);
      return;
    }

    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const board = itemsRef.current;
    const target = resolveDropTarget(board, activeIdStr, overIdStr);
    if (!target) {
      setItems(columns);
      return;
    }

    const next = moveTaskInBoard(
      board,
      activeIdStr,
      target.toColId,
      target.toIndex,
    );
    setItems(next);

    const col = next.find((c) => c.id === target.toColId);
    const finalIndex = col?.tasks.findIndex((t) => t.id === activeIdStr) ?? 0;
    if (finalIndex < 0) {
      setItems(columns);
      return;
    }

    const fd = new FormData();
    fd.set("taskId", activeIdStr);
    fd.set("columnId", target.toColId);
    fd.set("index", String(finalIndex));

    startTransition(async () => {
      const res = await reorderTaskAction(fd);
      if (!res.ok) {
        setItems(columns);
        router.refresh();
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  }

  const activeTask = activeId ? findTask(activeId) : null;
  const columnOptions = items.map((c) => ({ id: c.id, name: c.name }));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveId(null);
        setItems(columns);
      }}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {items.map((col) => (
          <KanbanColumn
            key={col.id}
            projectId={projectId}
            boardId={boardId}
            column={col}
            canEdit={canEdit}
            columns={columnOptions}
            onMenuMove={(taskId, columnId) => {
              setItems((prev) => {
                const target = prev.find((c) => c.id === columnId);
                if (!target) return prev;
                return moveTaskInBoard(
                  prev,
                  taskId,
                  columnId,
                  target.tasks.length,
                );
              });
            }}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="w-72 cursor-grabbing opacity-90">
            <TaskCardContent
              projectId={projectId}
              task={activeTask}
              canComplete={canEdit}
              isOverlay
              columns={columnOptions}
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
  columns,
  onMenuMove,
}: {
  projectId: string;
  boardId: string;
  column: ColumnLite;
  canEdit: boolean;
  columns: Array<{ id: string; name: string }>;
  onMenuMove?: (taskId: string, columnId: string) => void;
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
        <div className="flex min-h-[48px] flex-col gap-2">
          {column.tasks.map((t) => (
            <SortableTaskCard
              key={t.id}
              projectId={projectId}
              task={t}
              canComplete={canEdit}
              columns={columns}
              onMenuMove={onMenuMove}
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
  columns,
  onMenuMove,
}: {
  projectId: string;
  task: TaskLite;
  canComplete: boolean;
  columns: Array<{ id: string; name: string }>;
  onMenuMove?: (taskId: string, columnId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: !canComplete,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TaskCardContent
        projectId={projectId}
        task={task}
        canComplete={canComplete}
        columns={columns}
        dragHandleProps={canComplete ? listeners : undefined}
        onMenuMove={onMenuMove}
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
  dragHandleProps,
  onMenuMove,
}: {
  projectId: string;
  task: TaskLite;
  canComplete: boolean;
  columns: Array<{ id: string; name: string }>;
  isOverlay?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  onMenuMove?: (taskId: string, columnId: string) => void;
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
      {canComplete && dragHandleProps && (
        <button
          type="button"
          className="mt-0.5 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
          title="Arrastar"
          aria-label="Arrastar tarefa"
          {...dragHandleProps}
        >
          <GripVertical className="size-4" />
        </button>
      )}
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
      {columns.length > 1 && !isOverlay && canComplete && (
        <TaskCardMenu
          projectId={projectId}
          taskId={task.id}
          currentColumnId={task.columnId}
          columns={columns}
          onMoved={onMenuMove}
        />
      )}
    </div>
  );
}
