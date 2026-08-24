import Link from "next/link";
import { dateTimeBR } from "@/lib/format-date";

type ApiTaskActivity = {
  id: string;
  action: string;
  createdAt: Date;
  project: { id: string; name: string } | null;
  task: { id: string; title: string } | null;
};

const ACTION_LABEL: Record<string, string> = {
  "task.created": "criou",
  "task.updated": "atualizou",
  "task.moved": "moveu",
  "task.completed": "concluiu",
};

export function RecentApiTasks({ tasks }: { tasks: ApiTaskActivity[] }) {
  if (tasks.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-border bg-card/50 p-4 text-xs text-muted-foreground">
        A IA ainda não movimentou tarefas. Assim que ela usar a API, o
        histórico aparece aqui.
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 text-sm font-medium">Últimas ações da IA</h2>
      <ul className="flex flex-col gap-2">
        {tasks.map((t) => (
          <li key={t.id} className="text-xs">
            <p className="font-medium text-foreground">
              {ACTION_LABEL[t.action] ?? t.action}{" "}
              {t.task ? `"${t.task.title}"` : "tarefa"}
            </p>
            {t.project && (
              <p className="text-muted-foreground">
                em{" "}
                <Link
                  href={`/projects/${t.project.id}`}
                  className="text-primary underline"
                >
                  {t.project.name}
                </Link>
              </p>
            )}
            <p className="mt-0.5 text-muted-foreground">
              {dateTimeBR(t.createdAt)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
