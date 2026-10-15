import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { dateBR } from "@/lib/format-date";
import { prisma } from "@/lib/prisma";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
import { isCompletionColumnName } from "@/lib/task-completion";
import { Button } from "@/components/ui/button";
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
import { Circle, CircleCheck, LayoutList } from "lucide-react";
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
    where.AND = [
      ...(Array.isArray(where.AND)
        ? where.AND
        : where.AND
          ? [where.AND]
          : []),
      textFilter,
    ];
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

  const qs = (next: { status?: string }) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (projectId) sp.set("projectId", projectId);
    if (next.status && next.status !== "open") sp.set("status", next.status);
    const s = sp.toString();
    return s ? `/my-tasks?${s}` : "/my-tasks";
  };

  const hasSearchFilters = Boolean(q || projectId);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Minhas tarefas"
        description={
          <>
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
          </>
        }
      />

      <StatusPills
        items={[
          {
            href: qs({ status: "open" }),
            label: "Abertas",
            active: status === "open",
            Icon: Circle,
          },
          {
            href: qs({ status: "completed" }),
            label: "Concluídas",
            active: status === "completed",
            Icon: CircleCheck,
          },
          {
            href: qs({ status: "all" }),
            label: "Todas",
            active: status === "all",
            Icon: LayoutList,
          },
        ]}
      />

      <form
        method="get"
        className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
      >
        {status !== "open" && (
          <input type="hidden" name="status" value={status} />
        )}
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
        <Button type="submit" className="sm:self-end">
          Buscar
        </Button>
        {hasSearchFilters && (
          <Button type="button" variant="outline" asChild className="sm:self-end">
            <Link href={status === "open" ? "/my-tasks" : `/my-tasks?status=${status}`}>
              Limpar
            </Link>
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
              : "Crie uma tarefa no board ou atribua a si mesmo na edição da tarefa."}
          </p>
        </div>
      ) : (
        <DataTableShell>
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableTh>Tarefa</DataTableTh>
                <DataTableTh>Projeto</DataTableTh>
                <DataTableTh>Bucket</DataTableTh>
                <DataTableTh>Prioridade</DataTableTh>
                <DataTableTh>Vencimento</DataTableTh>
                <DataTableTh className="text-right">Abrir</DataTableTh>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {tasks.map((t) => {
                const overdue =
                  !t.completedAt &&
                  t.dueDate &&
                  t.dueDate < startOfToday;
                return (
                  <DataTableRow key={t.id} selected={!!overdue}>
                    <DataTableTd>
                      <Link
                        href={`/projects/${t.project.id}/tasks/${t.id}`}
                        className={
                          "font-medium hover:text-primary " +
                          (t.completedAt
                            ? "text-muted-foreground line-through"
                            : "")
                        }
                      >
                        {t.title}
                      </Link>
                    </DataTableTd>
                    <DataTableTd className="text-muted-foreground">
                      {t.project.name}
                    </DataTableTd>
                    <DataTableTd className="text-muted-foreground">
                      {t.column.name}
                    </DataTableTd>
                    <DataTableTd>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                        {t.priority}
                      </span>
                    </DataTableTd>
                    <DataTableTd
                      className={
                        overdue
                          ? "font-medium text-primary"
                          : "text-muted-foreground"
                      }
                    >
                      {dateBR(t.dueDate)}
                    </DataTableTd>
                    <DataTableTd className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/projects/${t.project.id}/tasks/${t.id}`}>
                          Visualizar
                        </Link>
                      </Button>
                    </DataTableTd>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        </DataTableShell>
      )}
    </div>
  );
}
