import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { KanbanBoard } from "@/features/tasks/kanban-board";
import { MembersManager } from "@/features/projects/members-manager";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, Settings, Users2, LayoutDashboard, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { dateBR, dateTimeBR } from "@/lib/format-date";

export const dynamic = "force-dynamic";

type Tab = "board" | "members" | "overview";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { projectId } = await params;
  const { tab } = await searchParams;
  const activeTab: Tab =
    tab === "members" || tab === "overview" ? tab : "board";

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      // Membro do workspace OU membro explícito do projeto pode ver.
      // Isso evita que um projeto recém-criado (sem ProjectMember)
      // fique invisível para o criador, que já é membro do workspace.
      OR: [
        { members: { some: { userId: session.user.id } } },
        {
          workspace: {
            is: {
              members: { some: { userId: session.user.id } },
            },
          },
        },
      ],
    },
    include: {
      workspace: { select: { id: true, name: true } },
      boards: {
        take: 1,
        include: {
          columns: {
            orderBy: { position: "asc" },
            include: {
              tasks: {
                where: { archivedAt: null },
                orderBy: { position: "asc" },
                // Sem limite artificial: o board precisa listar todas as
                // tarefas ativas (ex.: coluna Concluído com 80+ itens).
                select: {
                  id: true,
                  columnId: true,
                  title: true,
                  priority: true,
                  completedAt: true,
                  dueDate: true,
                  assignees: {
                    include: { user: { select: { id: true, name: true } } },
                  },
                },
              },
            },
          },
        },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: {
          tasks: { where: { archivedAt: null } },
          activities: true,
        },
      },
    },
  });

  if (!project) notFound();

  const myMembership = project.members.find(
    (m) => m.userId === session.user.id,
  );
  // Se não for ProjectMember explícito, verifica se é WorkspaceMember —
  // nesse caso herda permissão de MEMBER (pode editar, não pode gerenciar membros).
  const isWsMember = myMembership
    ? false
    : !!(await prisma.workspaceMember.findFirst({
        where: { workspaceId: project.workspaceId, userId: session.user.id },
        select: { id: true },
      }));
  const canEdit =
    (!!myMembership && myMembership.role !== "VIEWER") || isWsMember;
  const canManageMembers =
    !!myMembership &&
    (myMembership.role === "OWNER" || myMembership.role === "ADMIN");
  const board = project.boards[0];
  const isArchived = !!project.archivedAt;

  const tabLink = (key: Tab, label: string, Icon: React.ElementType) => (
    <Link
      key={key}
      href={`/projects/${projectId}${key === "board" ? "" : `?tab=${key}`}`}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
        activeTab === key && "bg-accent font-medium text-accent-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" />
            Projetos
          </Link>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {project.color && (
                <span
                  className="size-4 rounded-sm"
                  style={{ background: project.color }}
                />
              )}
              <h1 className="truncate text-2xl font-semibold tracking-tight">
                {project.name}
              </h1>
              {isArchived && (
                <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  Arquivado
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {project.workspace.name} · {project.status} ·{" "}
              {project._count.tasks} tarefas ·{" "}
              {project.members.length}{" "}
              {project.members.length === 1 ? "membro" : "membros"}
            </p>
          </div>
          {canEdit && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/projects/${projectId}/edit`}>
                <Pencil className="size-3.5" />
                Editar projeto
              </Link>
            </Button>
          )}
        </div>
        {project.description && (
          <p className="max-w-3xl text-sm text-muted-foreground">
            {project.description}
          </p>
        )}

        <nav className="mt-2 flex flex-wrap items-center gap-1 border-b border-border">
          {tabLink("board", "Board", LayoutDashboard)}
          {tabLink("overview", "Overview", ListChecks)}
          {tabLink("members", `Membros (${project.members.length})`, Users2)}
        </nav>
      </header>

      {activeTab === "board" && (
        <Board
          projectId={project.id}
          board={board}
          canEdit={!!canEdit}
        />
      )}

      {activeTab === "members" && (
        <MembersManager
          projectId={project.id}
          currentUserId={session.user.id}
          canManage={!!canManageMembers}
          members={project.members.map((m) => ({
            userId: m.userId,
            name: m.user.name,
            email: m.user.email,
            avatarUrl: m.user.avatarUrl,
            role: m.role,
          }))}
        />
      )}

      {activeTab === "overview" && <Overview project={project} />}
    </div>
  );
}

type BoardShape = {
  id: string;
  name: string;
  columns: Array<{
    id: string;
    name: string;
    color: string | null;
    tasks: Array<{
      id: string;
      columnId: string;
      title: string;
      priority: string;
      completedAt: Date | null;
      dueDate: Date | null;
      assignees: Array<{ user: { id: string; name: string | null } }>;
    }>;
  }>;
} | null;

function Board({
  projectId,
  board,
  canEdit,
}: {
  projectId: string;
  board: BoardShape;
  canEdit: boolean;
}) {
  if (!board) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center text-sm text-muted-foreground">
        Este projeto ainda não tem board.
      </div>
    );
  }

  return (
    <KanbanBoard
      projectId={projectId}
      boardId={board.id}
      canEdit={canEdit}
      columns={board.columns.map((col) => ({
        id: col.id,
        name: col.name,
        color: col.color,
        tasks: col.tasks.map((t) => ({
          id: t.id,
          columnId: t.columnId,
          title: t.title,
          priority: t.priority,
          completedAt: t.completedAt,
          dueDate: t.dueDate,
          assignees: t.assignees,
        })),
      }))}
    />
  );
}

function Overview({
  project,
}: {
  project: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    icon: string | null;
    status: string;
    startDate: Date | null;
    dueDate: Date | null;
    createdAt: Date;
    _count: { tasks: number; activities: number };
    members: Array<{
      role: string;
      user: { id: string; name: string | null; email: string };
    }>;
  };
}) {
  const fmt = (d: Date | null) => dateBR(d);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="rounded-xl border border-border bg-card p-4 lg:col-span-2">
        <h2 className="mb-3 text-sm font-medium">Detalhes</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt className="text-muted-foreground">Status</dt>
          <dd>{project.status}</dd>
          <dt className="text-muted-foreground">Início</dt>
          <dd>{fmt(project.startDate)}</dd>
          <dt className="text-muted-foreground">Prazo</dt>
          <dd>{fmt(project.dueDate)}</dd>
          <dt className="text-muted-foreground">Ícone</dt>
          <dd>{project.icon ?? "—"}</dd>
          <dt className="text-muted-foreground">Cor</dt>
          <dd>
            {project.color ? (
              <span className="inline-flex items-center gap-2">
                <span
                  className="size-3 rounded-sm"
                  style={{ background: project.color }}
                />
                {project.color}
              </span>
            ) : (
              "—"
            )}
          </dd>
          <dt className="text-muted-foreground">Criado em</dt>
          <dd>{dateTimeBR(project.createdAt)}</dd>
        </dl>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium">Resumo</h2>
        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex justify-between">
            <span className="text-muted-foreground">Tarefas</span>
            <span className="font-mono">{project._count.tasks}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-muted-foreground">Eventos</span>
            <span className="font-mono">{project._count.activities}</span>
          </li>
          <li className="flex justify-between">
            <span className="text-muted-foreground">Membros</span>
            <span className="font-mono">{project.members.length}</span>
          </li>
        </ul>

        <h3 className="mb-2 mt-4 text-sm font-medium">Membros</h3>
        <ul className="flex flex-col gap-1.5 text-sm">
          {project.members.map((m) => (
            <li key={m.user.id} className="flex items-center justify-between gap-2">
              <span className="truncate">{m.user.name ?? m.user.email}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {m.role}
              </span>
            </li>
          ))}
        </ul>

        <Button asChild variant="outline" size="sm" className="mt-4 w-full">
          <Link href={`/projects/${project.id}/edit`}>
            <Settings className="size-3.5" />
            Editar projeto
          </Link>
        </Button>
      </section>
    </div>
  );
}
