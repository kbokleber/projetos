export type TaskViewItem = {
  id: string;
  columnId: string;
  columnName: string;
  title: string;
  priority: string;
  completedAt: Date | null;
  startDate: Date | null;
  dueDate: Date | null;
  assignees: Array<{ user: { id: string; name: string | null } }>;
};

export type TaskViewColumn = {
  id: string;
  name: string;
  color: string | null;
  tasks: Array<{
    id: string;
    columnId: string;
    title: string;
    priority: string;
    completedAt: Date | null;
    startDate: Date | null;
    dueDate: Date | null;
    assignees: Array<{ user: { id: string; name: string | null } }>;
  }>;
};

export type TaskBoardView =
  | "board"
  | "grid"
  | "timeline"
  | "calendar"
  | "charts";

export const TASK_BOARD_VIEWS: TaskBoardView[] = [
  "board",
  "grid",
  "timeline",
  "calendar",
  "charts",
];

export function parseTaskBoardView(value: string | undefined): TaskBoardView {
  if (
    value === "grid" ||
    value === "timeline" ||
    value === "calendar" ||
    value === "charts"
  ) {
    return value;
  }
  return "board";
}

export function flattenTasksFromColumns(
  columns: TaskViewColumn[],
): TaskViewItem[] {
  return columns.flatMap((col) =>
    col.tasks.map((t) => ({
      id: t.id,
      columnId: t.columnId,
      columnName: col.name,
      title: t.title,
      priority: t.priority,
      completedAt: t.completedAt,
      startDate: t.startDate,
      dueDate: t.dueDate,
      assignees: t.assignees,
    })),
  );
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

export function taskPriorityLabel(priority: string): string {
  return PRIORITY_LABELS[priority] ?? priority;
}

export function taskStatusLabel(task: {
  completedAt: Date | null;
}): "Concluída" | "Aberta" {
  return task.completedAt ? "Concluída" : "Aberta";
}
