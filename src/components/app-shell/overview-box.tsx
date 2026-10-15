export function OverviewBox({
  projectsActive,
  tasksOpen,
  tasksOverdue,
}: {
  projectsActive: number;
  tasksOpen: number;
  tasksOverdue: number;
}) {
  return (
    <div className="mx-2 mb-3 rounded-lg border border-sidebar-border bg-muted/40 p-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Visão geral
      </p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Projetos" value={projectsActive} />
        <Stat label="Abertas" value={tasksOpen} />
        <Stat label="Atrasadas" value={tasksOverdue} highlight={tasksOverdue > 0} />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div>
      <p
        className={
          "text-sm font-semibold tabular-nums " +
          (highlight ? "text-primary" : "text-foreground")
        }
      >
        {value}
      </p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
