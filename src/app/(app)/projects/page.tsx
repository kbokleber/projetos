import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
import { projectWhereForUser } from "@/lib/project-access";
import { isCompletionColumnName } from "@/lib/task-completion";
import { ProjectLogo } from "@/components/project-logo";
import {
  PROJECT_STATUSES,
  projectStatusLabel,
  type ProjectStatusValue,
} from "@/lib/constants";
import { PageHeader } from "@/components/app-shell/page-header";
import { StatusPills } from "@/components/ui/status-pills";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableRow,
  DataTableShell,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/data-table-shell";
import { dateBR } from "@/lib/format-date";
import {
  CircleDashed,
  PlayCircle,
  PauseCircle,
  CheckCircle2,
  XCircle,
  LayoutGrid,
} from "lucide-react";

const STATUS_ICONS: Record<ProjectStatusValue, typeof CircleDashed> = {
  PLANNING: CircleDashed,
  ACTIVE: PlayCircle,
  ON_HOLD: PauseCircle,
  COMPLETED: CheckCircle2,
  CANCELLED: XCircle,
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
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

  const { status: statusRaw } = await searchParams;
  const statusFilter =
    statusRaw &&
    (PROJECT_STATUSES as readonly string[]).includes(statusRaw)
      ? (statusRaw as ProjectStatusValue)
      : null;

  const projectFilter = {
    archivedAt: null as null,
    workspaceId: active.id,
    AND: [projectWhereForUser(session.user.id)],
  };

  // Mesma regra do dashboard: em aberto = sem completedAt e fora de colunas Concluído/Done
  const boardColumns = await prisma.boardColumn.findMany({
    where: { board: { project: projectFilter } },
    select: { id: true, name: true },
  });
  const doneColumnIds = boardColumns
    .filter((c) => isCompletionColumnName(c.name))
    .map((c) => c.id);

  const openTasksWhere = {
    archivedAt: null as null,
    completedAt: null as null,
    ...(doneColumnIds.length > 0
      ? { columnId: { notIn: doneColumnIds } }
      : {}),
  };

  const projects = await prisma.project.findMany({
    where: {
      ...projectFilter,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { tasks: { where: openTasksWhere } } },
      members: { where: { userId: session.user.id }, select: { id: true } },
    },
  });

  const statusCounts = await prisma.project.groupBy({
    by: ["status"],
    where: {
      archivedAt: null,
      workspaceId: active.id,
      AND: [projectWhereForUser(session.user.id)],
    },
    _count: { _all: true },
  });
  const countByStatus = Object.fromEntries(
    statusCounts.map((s) => [s.status, s._count._all]),
  ) as Record<string, number>;
  const totalCount = Object.values(countByStatus).reduce((a, b) => a + b, 0);

  const pills = [
    {
      href: "/projects",
      label: "Todos",
      active: !statusFilter,
      Icon: LayoutGrid,
      count: totalCount,
    },
    ...PROJECT_STATUSES.map((s) => ({
      href: `/projects?status=${s}`,
      label: projectStatusLabel(s),
      active: statusFilter === s,
      Icon: STATUS_ICONS[s],
      count: countByStatus[s] ?? 0,
    })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={
          statusFilter
            ? `Projetos — ${projectStatusLabel(statusFilter)}`
            : "Projetos"
        }
        description={
          <>
            Projetos de <strong>{active.name}</strong>.{" "}
            {projects.length}{" "}
            {projects.length === 1 ? "resultado" : "resultados"}.
          </>
        }
        actions={
          <Button asChild>
            <Link href="/projects/new">+ Novo projeto</Link>
          </Button>
        }
      />

      <StatusPills items={pills} />

      {projects.length === 0 ? (
        <EmptyProjects filtered={!!statusFilter} />
      ) : (
        <DataTableShell>
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableTh>Projeto</DataTableTh>
                <DataTableTh>Status</DataTableTh>
                <DataTableTh>Em aberto</DataTableTh>
                <DataTableTh>Atualizado</DataTableTh>
                <DataTableTh className="text-right">Abrir</DataTableTh>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {projects.map((p) => (
                <DataTableRow key={p.id}>
                  <DataTableTd>
                    <Link
                      href={`/projects/${p.id}`}
                      className="flex min-w-0 items-center gap-2.5 font-medium hover:text-primary"
                    >
                      <ProjectLogo
                        projectId={p.id}
                        logoPath={p.logoPath}
                        color={p.color}
                        size="card"
                        updatedAt={p.updatedAt}
                      />
                      <span className="truncate">{p.name}</span>
                    </Link>
                  </DataTableTd>
                  <DataTableTd>
                    <span className="rounded bg-muted px-2 py-0.5 text-xs">
                      {projectStatusLabel(p.status)}
                    </span>
                  </DataTableTd>
                  <DataTableTd className="tabular-nums text-muted-foreground">
                    {p._count.tasks}
                  </DataTableTd>
                  <DataTableTd className="text-muted-foreground">
                    {dateBR(p.updatedAt)}
                  </DataTableTd>
                  <DataTableTd className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/projects/${p.id}`}>Visualizar</Link>
                    </Button>
                  </DataTableTd>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        </DataTableShell>
      )}
    </div>
  );
}

function EmptyProjects({ filtered }: { filtered?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <p className="text-sm font-medium">
        {filtered
          ? "Nenhum projeto com este status"
          : "Você ainda não tem projetos"}
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {filtered
          ? "Tente outro filtro ou limpe a seleção."
          : "Crie seu primeiro projeto para começar a organizar tarefas em um quadro Kanban."}
      </p>
      {!filtered && (
        <Button asChild>
          <Link href="/projects/new">Criar projeto</Link>
        </Button>
      )}
    </div>
  );
}
