import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  ListChecks,
  Plug,
  Webhook,
} from "lucide-react";
import Link from "next/link";

export function SummaryCards(props: {
  projectsActive: number;
  tasksOpen: number;
  tasksCompletedToday: number;
  tasksOverdue: number;
  apiTasksCreatedToday: number;
  webhookDeliveriesLast7d: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Card href="/projects" icon={<ListChecks className="size-4" />} label="Projetos ativos" value={props.projectsActive} />
      <Card href="/my-tasks" icon={<CircleDashed className="size-4" />} label="Tarefas em aberto" value={props.tasksOpen} />
      <Card icon={<CheckCircle2 className="size-4" />} label="Concluídas hoje" value={props.tasksCompletedToday} tone="positive" />
      <Card
        href="/my-tasks?filter=overdue"
        icon={<AlertTriangle className="size-4" />}
        label="Tarefas atrasadas"
        value={props.tasksOverdue}
        tone={props.tasksOverdue > 0 ? "danger" : "neutral"}
      />
      <Card
        href="/settings/api"
        icon={<Plug className="size-4" />}
        label="Tarefas criadas pela IA · 24h"
        value={props.apiTasksCreatedToday}
      />
      <Card
        href="/settings/webhooks"
        icon={<Webhook className="size-4" />}
        label="Entregas webhook · 7d"
        value={props.webhookDeliveriesLast7d}
      />
    </div>
  );
}

function Card({
  href,
  icon,
  label,
  value,
  tone,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "positive" | "danger" | "neutral";
}) {
  const body = (
    <div
      className={cn(
        "flex h-full flex-col gap-1 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors",
        href && "hover:bg-accent/30",
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div
        className={cn(
          "text-2xl font-semibold tracking-tight",
          tone === "positive" && "text-emerald-600",
          tone === "danger" && "text-destructive",
        )}
      >
        {value}
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
