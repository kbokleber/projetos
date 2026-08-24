import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { dateBR } from "@/lib/format-date";
import { prisma } from "@/lib/prisma";

export default async function MyTasksPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tasks = await prisma.task.findMany({
    where: {
      archivedAt: null,
      assignees: { some: { userId: session.user.id } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      project: { select: { id: true, name: true, color: true } },
      column: { select: { name: true } },
    },
  });

  const groups: Record<string, typeof tasks> = {
    Hoje: [],
    "Próximos dias": [],
    Atrasadas: [],
    "Sem prazo": [],
  };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const nextDaysEnd = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

  for (const t of tasks) {
    if (!t.dueDate) {
      groups["Sem prazo"].push(t);
    } else if (t.completedAt) {
      // concluídas não exibimos por enquanto
    } else if (t.dueDate < startOfToday) {
      groups["Atrasadas"].push(t);
    } else if (t.dueDate < endOfToday) {
      groups["Hoje"].push(t);
    } else if (t.dueDate < nextDaysEnd) {
      groups["Próximos dias"].push(t);
    } else {
      groups["Sem prazo"].push(t);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minhas tarefas</h1>
        <p className="text-sm text-muted-foreground">
          Tarefas atribuídas a você, agrupadas por prazo.
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <p className="text-sm font-medium">Nenhuma tarefa atribuída a você</p>
          <p className="text-sm text-muted-foreground">
            Quando alguém te atribuir uma tarefa, ela aparecerá aqui.
          </p>
        </div>
      ) : (
        Object.entries(groups).map(([title, items]) =>
          items.length === 0 ? null : (
            <section key={title}>
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                {title} <span className="text-xs">({items.length})</span>
              </h2>
              <div className="flex flex-col gap-2">
                {items.map((t) => (
                  <Link
                    key={t.id}
                    href={`/projects/${t.project.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/40"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium">
                        {t.title}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {t.project.name} · {t.column.name} · {t.priority}
                      </span>
                    </div>
                    {t.dueDate && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {dateBR(t.dueDate)}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          ),
        )
      )}
    </div>
  );
}
