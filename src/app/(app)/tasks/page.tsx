import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
import { dateBR, dateTimeBR } from "@/lib/format-date";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type StatusFilter = "all" | "open" | "completed" | "archived";

export default async function TasksSearchPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    projectId?: string;
    status?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { active } = await resolveActiveWorkspace(session.user.id);
  if (!active) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
        Sem workspace.{" "}
        <Link href="/settings/workspaces" className="text-primary underline">
          Criar workspace
        </Link>
      </div>
    );
  }

  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const projectId = params.projectId?.trim() || "";
  const statusRaw = params.status ?? "all";
  const status: StatusFilter = ["all", "open", "completed", "archived"].includes(
    statusRaw,
  )
    ? (statusRaw as StatusFilter)
    : "all";

  const projects = await prisma.project.findMany({
    where: {
      workspaceId: active.id,
      archivedAt: null,
      OR: [
        { members: { some: { userId: session.user.id } } },
        {
          workspace: {
            is: { members: { some: { userId: session.user.id } } },
          },
        },
      ],
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  });
  const projectIds = projects.map((p) => p.id);

  const baseWhere = {
    projectId: projectId
      ? projectIds.includes(projectId)
        ? projectId
        : "__none__"
      : { in: projectIds.length ? projectIds : ["__none__"] },
    ...(status === "archived"
      ? { archivedAt: { not: null } }
      : status === "completed"
        ? { archivedAt: null, completedAt: { not: null } }
        : status === "open"
          ? { archivedAt: null, completedAt: null }
          : { archivedAt: null }),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
            { externalId: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [totalInWorkspace, matchCount, tasks] = await Promise.all([
    prisma.task.count({
      where: {
        archivedAt: null,
        projectId: { in: projectIds.length ? projectIds : ["__none__"] },
      },
    }),
    prisma.task.count({ where: baseWhere }),
    prisma.task.findMany({
      where: baseWhere,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 100,
      include: {
        project: { select: { id: true, name: true, color: true } },
        column: { select: { name: true } },
        assignees: {
          include: { user: { select: { id: true, name: true } } },
          take: 5,
        },
      },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Search className="size-5" />
          Buscar tarefas
        </h1>
        <p className="text-sm text-muted-foreground">
          Workspace <strong>{active.name}</strong> · {totalInWorkspace} tarefa(s)
          ativas no total.
        </p>
      </div>

      <form
        method="get"
        className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="flex min-w-[12rem] flex-1 flex-col gap-1.5">
          <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
            Busca
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Título, descrição ou ID externo…"
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
            <option value="">Todos</option>
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
            <option value="all">Abertas + concluídas</option>
            <option value="open">Só abertas</option>
            <option value="completed">Só concluídas</option>
            <option value="archived">Arquivadas</option>
          </select>
        </div>
        <Button type="submit" className="sm:self-end">
          Buscar
        </Button>
        {(q || projectId || status !== "all") && (
          <Button type="button" variant="outline" asChild className="sm:self-end">
            <Link href="/tasks">Limpar</Link>
          </Button>
        )}
      </form>

      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <p>
          {matchCount === 0
            ? "Nenhum resultado"
            : `${matchCount} resultado(s)${matchCount > tasks.length ? ` · mostrando ${tasks.length}` : ""}`}
          {q ? (
            <>
              {" "}
              para <strong className="text-foreground">&quot;{q}&quot;</strong>
            </>
          ) : null}
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
          {q
            ? "Nenhuma tarefa encontrada com esse filtro. Tente outro termo ou projeto."
            : "Ainda não há tarefas neste workspace (ou nos filtros escolhidos)."}
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {tasks.map((t) => (
            <li key={t.id}>
              <Link
                href={`/projects/${t.project.id}/tasks/${t.id}`}
                className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-accent/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {t.project.color && (
                      <span
                        className="size-2.5 shrink-0 rounded-sm"
                        style={{ background: t.project.color }}
                      />
                    )}
                    <span className="truncate font-medium">{t.title}</span>
                    {t.completedAt && (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-emerald-600">
                        Concluída
                      </span>
                    )}
                    {t.archivedAt && (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        Arquivada
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.project.name} · {t.column.name} · {t.priority}
                    {t.assignees.length > 0
                      ? ` · ${t.assignees.map((a) => a.user.name).join(", ")}`
                      : " · sem responsável"}
                    {t.externalId ? ` · ext: ${t.externalId}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-xs text-muted-foreground sm:text-right">
                  {t.dueDate ? (
                    <p>Prazo {dateBR(t.dueDate)}</p>
                  ) : (
                    <p>Sem prazo</p>
                  )}
                  <p>Atualizada {dateTimeBR(t.updatedAt)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
