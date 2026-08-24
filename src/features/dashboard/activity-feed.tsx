import { CircleCheck, MessageSquare, MoveRight, Pencil, Plus, Trash2 } from "lucide-react";
import { dateTimeBR } from "@/lib/format-date";

type Item = {
  id: string;
  action: string;
  actorType: string;
  actorId: string | null;
  userId: string | null;
  user?: { id: string; name: string | null; email: string } | null;
  createdAt: Date;
  project?: { id: string; name: string; color: string | null } | null;
  task?: { id: string; title: string } | null;
};

const ACTION_META: Record<string, { icon: React.ReactNode; label: string }> = {
  "task.created": { icon: <Plus className="size-3.5" />, label: "criou tarefa" },
  "task.updated": { icon: <Pencil className="size-3.5" />, label: "atualizou tarefa" },
  "task.moved": { icon: <MoveRight className="size-3.5" />, label: "moveu tarefa" },
  "task.completed": { icon: <CircleCheck className="size-3.5" />, label: "concluiu tarefa" },
  "task.deleted": { icon: <Trash2 className="size-3.5" />, label: "removeu tarefa" },
  "task.reopened": { icon: <Pencil className="size-3.5" />, label: "reabriu tarefa" },
  "task.assignee.added": { icon: <Plus className="size-3.5" />, label: "adicionou responsável" },
  "task.assignee.removed": { icon: <Trash2 className="size-3.5" />, label: "removeu responsável" },
  "comment.created": { icon: <MessageSquare className="size-3.5" />, label: "comentou em" },
  "project.created": { icon: <Plus className="size-3.5" />, label: "criou projeto" },
  "project.updated": { icon: <Pencil className="size-3.5" />, label: "atualizou projeto" },
  "column.created": { icon: <Plus className="size-3.5" />, label: "criou coluna" },
  "column.updated": { icon: <Pencil className="size-3.5" />, label: "atualizou coluna" },
  "board.created": { icon: <Plus className="size-3.5" />, label: "criou board" },
};

const ORIGIN_LABEL: Record<string, string> = {
  USER: "Você",
  API: "IA · API",
  WEBHOOK: "Webhook",
  SYSTEM: "Sistema",
};

const ORIGIN_CLASS: Record<string, string> = {
  USER: "bg-blue-500/10 text-blue-700",
  API: "bg-violet-500/10 text-violet-700",
  WEBHOOK: "bg-amber-500/10 text-amber-700",
  SYSTEM: "bg-zinc-500/10 text-zinc-700",
};

export function ActivityFeed({ items }: { items: Item[] }) {
  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
        Nenhuma atividade da IA ainda. Conecte um{" "}
        <a href="/settings/api" className="text-primary underline">
          token de API
        </a>{" "}
        para começar a ver o que está acontecendo.
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium">Atividade recente</h2>
        <span className="text-xs text-muted-foreground">
          Últimas {items.length}
        </span>
      </header>
      <ol className="flex flex-col gap-3">
        {items.map((it) => {
          const meta = ACTION_META[it.action] ?? {
            icon: <Pencil className="size-3.5" />,
            label: it.action,
          };
          const actor = it.user?.name ?? it.user?.email ?? "Usuário";
          const isApi = it.actorType === "API";
          return (
            <li
              key={it.id}
              className="flex items-start gap-3 rounded-md border border-border bg-background p-3"
            >
              <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                {meta.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <strong className="font-medium">
                    {isApi ? "IA" : actor}
                  </strong>{" "}
                  <span className="text-muted-foreground">{meta.label}</span>{" "}
                  {it.task ? (
                    <span className="font-medium">“{it.task.title}”</span>
                  ) : it.project ? (
                    <span className="font-medium">“{it.project.name}”</span>
                  ) : null}
                </p>
                {it.project && it.task && (
                  <p className="text-xs text-muted-foreground">
                    em {it.project.name}
                  </p>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {dateTimeBR(it.createdAt)}
                </p>
              </div>
              <span
                className={
                  "shrink-0 rounded px-2 py-0.5 text-xs " +
                  (ORIGIN_CLASS[it.actorType] ?? ORIGIN_CLASS.SYSTEM)
                }
              >
                {ORIGIN_LABEL[it.actorType] ?? it.actorType}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// helper type no-op
