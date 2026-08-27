import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { dateBR } from "@/lib/format-date";
import { prisma } from "@/lib/prisma";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
import { isCompletionColumnName } from "@/lib/task-completion";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function MyTasksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; projectId?: string; status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { active } = await resolveActiveWorkspace(session.user.id);
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const projectId = params.projectId?.trim() || "";
  const statusRaw = params.status ?? "open";
  const status =
    statusRaw === "all" || statusRaw === "completed" || statusRaw === "open"
      ? statusRaw
      : "open";

  const doneColumnIds = active
    ? (
        await prisma.boardColumn.findMany({
          where: { board: { project: { workspaceId: active.id } } },
          select: { id: true, name: true },
        })
      )
        .filter((c) => isCompletionColumnName(c.name))
        .map((c) => c.id)
    : [];

  const projects = active
    ? await prisma.project.findMany({
        where: {
          workspaceId: active.id,
          archivedAt: null,
          tasks: {
            some: {
              archivedAt: null,
              OR: [
                { assignees: { some: { userId: session.user.id } } },
                { createdBy: session.user.id },
              ],
            },
          },
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  const where: Prisma.TaskWhereInput = {
    project: {
      archivedAt: null,
      ...(active ? { workspaceId: active.id } : {}),
      ...(projectId ? { id: projectId } : {}),
    },
    OR: [
      { assignees: { some: { userId: session.user.id } } },
      { createdBy: session.user.id },
    ],
  };

  if (status === "completed") {
    where.archivedAt = null;
    where.AND = [
      {
        OR: [
          { completedAt: { not: null } },
          ...(doneColumnIds.length > 0
            ? [{ columnId: { in: doneColumnIds } }]
            : []),
        ],
      },
    ];
  } else if (status === "all") {
    where.archivedAt = null;
  } else {
    where.archivedAt = null;
    where.completedAt = null;
    if (doneColumnIds.length > 0) {
      where.columnId = { notIn: doneColumnIds };
    }
  }

  if (q) {
    const textFilter: Prisma.TaskWhereInput = {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    };
    where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), textFilter];
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    take: 150,
    include: {
      project: { select: { id: true, name: true, color: true } },
      column: { select: { name: true } },
    },
  });

  const groups: Record<string, typeof tasks> = {
    Atrasadas: [],
    Hoje: [],
    "Próximos dias": [],
    "Sem prazo / depois": [],
    Concluídas: [],
  };

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const nextDaysEnd = new Date(
    startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000,
  );

  for (const t of tasks) {
    if (t.completedAt) {
      groups["Concluídas"].push(t);
      continue;
    }
    if (!t.dueDate) {
      groups["Sem prazo / depois"].push(t);
    } else if (t.dueDate < startOfToday) {
      groups["Atrasadas"].push(t);
    } else if (t.dueDate < endOfToday) {
      groups["Hoje"].push(t);
    } else if (t.dueDate < nextDaysEnd) {
      groups["Próximos dias"].push(t);
    } else {
      groups["Sem prazo / depois"].push(t);
    }
  }

  const hasSearchFilters = Boolean(q || projectId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Search className="size-5" />
          Minhas tarefas
        </h1>
        <p className="text-sm text-muted-foreground">
          Tarefas em que você é responsável ou criador
          {active ? (
            <>
              {" "}
              em <strong>{active.name}</strong>
            </>
          ) : null}
          . {tasks.length} resultado(s)
          {q ? (
            <>
              {" "}
              para <strong>&quot;{q}&quot;</strong>
            </>
          ) : null}
          .
        </p>
      </div>

      <form
        method="get"
        className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="flex min-w-[12rem] flex-1 flex-col gap-1.5">
          <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
            Buscar
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Título ou descrição…"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-48">
          <label
            htmlFor="projectId"
            className="text-xs font-medium text-muted-foreground"
          >
            Projeto
          </label>
          <select
            id="projectId"
            name="projectId"
            defaultValue={projectId}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="">Todos os meus</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-40">
          <label
            htmlFor="status"
            className="text-xs font-medium text-muted-foreground"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="open">Abertas</option>
            <option value="completed">Concluídas</option>
            <option value="all">Abertas + concluídas</option>
          </select>
        </div>
        <Button type="submit" className="sm:self-end">
          Buscar
        </Button>
        {hasSearchFilters && (
          <Button type="button" variant="outline" asChild className="sm:self-end">
            <Link href="/my-tasks">Limpar</Link>
          </Button>
        )}
      </form>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <p className="text-sm font-medium">
            {hasSearchFilters
              ? "Nenhuma tarefa sua com esse filtro"
              : "Nenhuma tarefa relacionada a você neste workspace"}
          </p>
          <p className="text-sm text-muted-foreground">
            {hasSearchFilters
              ? "Tente outro termo ou projeto."
              : "Crie uma tarefa no board (você será o responsável) ou atribua a si mesmo na edição da tarefa. Confira se o workspace ativo é o correto."}
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
                    href={`/projects/${t.project.id}/tasks/${t.id}`}
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
