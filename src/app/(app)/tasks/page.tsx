import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
import { dateBR } from "@/lib/format-date";
import { isCompletionColumnName } from "@/lib/task-completion";
import { Button } from "@/components/ui/button";
import { CircleDashed } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

type StatusFilter = "open" | "completed" | "all";

export default async function WorkspaceTasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    projectId?: string;
    status?: string;
    overdue?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { active } = await resolveActiveWorkspace(session.user.id);
  if (!active) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm">
        Selecione um workspace em{" "}
        <Link href="/settings/workspaces" className="text-primary underline">
          Workspaces
        </Link>
        .
      </div>
    );
  }

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const projectId = params.projectId?.trim() || "";
  const overdueOnly = params.overdue === "1" || params.overdue === "true";
  const statusRaw = params.status ?? "open";
  const status: StatusFilter =
    statusRaw === "all" || statusRaw === "completed" || statusRaw === "open"
      ? statusRaw
      : "open";

  const columns = await prisma.boardColumn.findMany({
    where: { board: { project: { workspaceId: active.id } } },
    select: { id: true, name: true },
  });
  const doneColumnIds = columns
    .filter((c) => isCompletionColumnName(c.name))
    .map((c) => c.id);

  const projects = await prisma.project.findMany({
    where: { workspaceId: active.id, archivedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where: Prisma.TaskWhereInput = {
    archivedAt: null,
    project: {
      workspaceId: active.id,
      archivedAt: null,
      ...(projectId ? { id: projectId } : {}),
    },
  };

  if (status === "open") {
    where.completedAt = null;
    if (doneColumnIds.length > 0) {
      where.columnId = { notIn: doneColumnIds };
    }
    if (overdueOnly) {
      where.dueDate = { lt: today };
    }
  } else if (status === "completed") {
    where.OR = [
      { completedAt: { not: null } },
      ...(doneColumnIds.length > 0
        ? [{ columnId: { in: doneColumnIds } }]
        : []),
    ];
  }

  if (q) {
    where.AND = [
      {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
    ];
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    take: 300,
    include: {
      project: { select: { id: true, name: true, color: true } },
      column: { select: { id: true, name: true } },
      assignees: {
        include: { user: { select: { id: true, name: true } } },
        take: 3,
      },
    },
  });

  const title =
    status === "open"
      ? overdueOnly
        ? "Tarefas atrasadas"
        : "Tarefas em aberto"
      : status === "completed"
        ? "Tarefas concluídas"
        : "Todas as tarefas";

  const queryBase = (extra: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (projectId) sp.set("projectId", projectId);
    for (const [k, v] of Object.entries(extra)) sp.set(k, v);
    const s = sp.toString();
    return s ? `/tasks?${s}` : "/tasks";
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <CircleDashed className="size-5" />
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">
          Visão do workspace <strong>{active.name}</strong>
          {status === "open"
            ? " — tarefas ainda não concluídas (fora da coluna Concluído)."
            : "."}{" "}
          {tasks.length} resultado(s).
        </p>
      </div>

      <form
        method="get"
        className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end"
      >
        {overdueOnly ? <input type="hidden" name="overdue" value="1" /> : null}
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
        <div className="flex w-full flex-col gap-1.5 sm:w-52">
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
            <option value="">Todos do workspace</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-44">
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
            <option value="open">Em aberto</option>
            <option value="completed">Concluídas</option>
            <option value="all">Todas</option>
          </select>
        </div>
        <Button type="submit" className="sm:self-end">
          Filtrar
        </Button>
        {(q || projectId || status !== "open" || overdueOnly) && (
          <Button type="button" variant="outline" asChild className="sm:self-end">
            <Link href="/tasks?status=open">Limpar</Link>
          </Button>
        )}
      </form>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <p className="text-sm font-medium">Nenhuma tarefa com esse filtro</p>
          <p className="text-sm text-muted-foreground">
            {status === "open"
              ? "Não há tarefas em aberto neste workspace."
              : "Tente outro status ou projeto."}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href={queryBase({ status: "open" })}>Ver em aberto</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((t) => {
            const done =
              !!t.completedAt || isCompletionColumnName(t.column.name);
            return (
              <Link
                key={t.id}
                href={`/projects/${t.project.id}/tasks/${t.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/40"
              >
                <div className="flex min-w-0 flex-col">
                  <span
                    className={
                      "truncate text-sm font-medium" +
                      (done ? " text-muted-foreground line-through" : "")
                    }
                  >
                    {t.title}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {t.project.name} · {t.column.name} · {t.priority}
                    {t.assignees.length > 0
                      ? ` · ${t.assignees
                          .map((a) => a.user.name ?? "?")
                          .join(", ")}`
                      : ""}
                  </span>
                </div>
                {t.dueDate && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {dateBR(t.dueDate)}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
