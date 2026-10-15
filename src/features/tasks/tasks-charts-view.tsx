import {
  taskPriorityLabel,
  taskStatusLabel,
  type TaskViewItem,
} from "@/features/tasks/task-view-types";

type Slice = { label: string; value: number; color: string };

const COLORS = [
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#64748b",
  "#ec4899",
  "#14b8a6",
];

function BarChart({ title, slices }: { title: string; slices: Slice[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const max = Math.max(...slices.map((s) => s.value), 1);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {total} {total === 1 ? "tarefa" : "tarefas"}
      </p>
      {total === 0 ? (
        <p className="mt-6 text-xs text-muted-foreground">Sem dados.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2.5">
          {slices.map((slice) => (
            <li key={slice.label} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-muted-foreground">
                  {slice.label}
                </span>
                <span className="shrink-0 font-medium tabular-nums">
                  {slice.value}
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({Math.round((slice.value / total) * 100)}%)
                  </span>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(slice.value / max) * 100}%`,
                    backgroundColor: slice.color,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DonutChart({ title, slices }: { title: string; slices: Slice[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const size = 140;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {total} {total === 1 ? "tarefa" : "tarefas"}
      </p>
      {total === 0 ? (
        <p className="mt-6 text-xs text-muted-foreground">Sem dados.</p>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth={stroke}
            />
            {slices
              .filter((s) => s.value > 0)
              .map((slice) => {
                const len = (slice.value / total) * c;
                const dash = `${len} ${c - len}`;
                const el = (
                  <circle
                    key={slice.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={stroke}
                    strokeDasharray={dash}
                    strokeDashoffset={-offset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                  />
                );
                offset += len;
                return el;
              })}
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground text-lg font-semibold"
            >
              {total}
            </text>
          </svg>
          <ul className="flex min-w-[120px] flex-col gap-1.5 text-xs">
            {slices.map((slice) => (
              <li key={slice.label} className="flex items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="truncate text-muted-foreground">
                  {slice.label}
                </span>
                <span className="ml-auto tabular-nums font-medium">
                  {slice.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function countBy(
  tasks: TaskViewItem[],
  keyFn: (t: TaskViewItem) => string,
): Slice[] {
  const map = new Map<string, number>();
  for (const t of tasks) {
    const key = keyFn(t);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({
      label,
      value,
      color: COLORS[i % COLORS.length],
    }));
}

export function TasksChartsView({ tasks }: { tasks: TaskViewItem[] }) {
  const statusSlices: Slice[] = [
    {
      label: "Aberta",
      value: tasks.filter((t) => taskStatusLabel(t) === "Aberta").length,
      color: COLORS[0],
    },
    {
      label: "Concluída",
      value: tasks.filter((t) => taskStatusLabel(t) === "Concluída").length,
      color: COLORS[1],
    },
  ].filter((s) => s.value > 0);

  const priorityOrder = ["URGENT", "HIGH", "MEDIUM", "LOW"];
  const priorityCounts = new Map(
    priorityOrder.map((p) => [p, 0] as [string, number]),
  );
  for (const t of tasks) {
    priorityCounts.set(t.priority, (priorityCounts.get(t.priority) ?? 0) + 1);
  }
  const prioritySlices: Slice[] = [...priorityCounts.entries()]
    .filter(([, v]) => v > 0)
    .map(([priority, value], i) => ({
      label: taskPriorityLabel(priority),
      value,
      color: COLORS[i % COLORS.length],
    }));

  const bucketSlices = countBy(tasks, (t) => t.columnName || "Sem bucket");
  const memberSlices = countBy(tasks, (t) => {
    if (t.assignees.length === 0) return "Sem responsável";
    return t.assignees.map((a) => a.user.name ?? "Sem nome").join(", ");
  });

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
        Nenhuma tarefa neste board.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <DonutChart title="Status" slices={statusSlices} />
      <BarChart title="Prioridade" slices={prioritySlices} />
      <BarChart title="Bucket" slices={bucketSlices} />
      <BarChart title="Membros" slices={memberSlices} />
    </div>
  );
}
