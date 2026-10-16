import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TaskDetailsPanel } from "@/features/tasks/task-details-panel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  getProjectAccess,
  projectWhereForUser,
} from "@/lib/project-access";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; taskId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { projectId, taskId } = await params;

  const access = await getProjectAccess(session.user.id, projectId);
  if (!access?.canView) notFound();

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      AND: [projectWhereForUser(session.user.id)],
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      boards: {
        include: {
          columns: {
            orderBy: { position: "asc" },
          },
        },
      },
    },
  });
  if (!project) notFound();

  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId },
    include: {
      assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
      column: { select: { id: true, name: true, boardId: true } },
      comments: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      },
      attachments: {
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      checklists: {
        orderBy: { position: "asc" },
        include: {
          items: { orderBy: { position: "asc" } },
        },
      },
    },
  });
  if (!task) notFound();

  const canEdit = access.canEdit;

  // Responsáveis: membros do projeto (+ atuais, mesmo se saíram)
  const assignableById = new Map<
    string,
    { userId: string; name: string | null; email: string }
  >();
  for (const m of project.members) {
    if (!m.user) continue;
    assignableById.set(m.userId, {
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
    });
  }
  for (const a of task.assignees) {
    if (!assignableById.has(a.userId)) {
      assignableById.set(a.userId, {
        userId: a.userId,
        name: a.user.name,
        email: a.user.email,
      });
    }
  }
  const assignableMembers = [...assignableById.values()].sort((a, b) =>
    (a.name ?? a.email).localeCompare(b.name ?? b.email, "pt-BR"),
  );

  const board = project.boards.find((b) => b.id === task.column.boardId);
  const columns = board?.columns ?? [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav className="flex min-w-0 flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Link href="/projects" className="hover:text-foreground">
            Projetos
          </Link>
          <span>/</span>
          <Link
            href={`/projects/${project.id}`}
            className="truncate hover:text-foreground"
          >
            {project.name}
          </Link>
          <span>/</span>
          <span className="truncate text-foreground/80">Tarefa</span>
        </nav>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/projects/${project.id}`}>
            <ArrowLeft className="size-3.5" /> Board
          </Link>
        </Button>
      </div>

      <TaskDetailsPanel
        taskId={task.id}
        projectId={project.id}
        canEdit={!!canEdit}
        columns={columns.map((c) => ({ id: c.id, name: c.name }))}
        currentColumnId={task.column.id}
        currentColumnName={task.column.name}
        members={assignableMembers}
        currentAssigneeIds={task.assignees.map((a) => a.userId)}
        initial={{
          title: task.title,
          description: task.description,
          priority: task.priority,
          startDate: task.startDate,
          dueDate: task.dueDate,
          estimatedHours: task.estimatedHours,
          completedAt: task.completedAt,
          archivedAt: task.archivedAt,
          createdAt: task.createdAt,
        }}
        comments={task.comments.map((c) => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt,
          user: c.user,
        }))}
        attachments={task.attachments.map((a) => ({
          id: a.id,
          fileName: a.fileName,
          mimeType: a.mimeType,
          size: a.size,
          createdAt: a.createdAt,
          user: a.user,
        }))}
        checklists={task.checklists.map((c) => ({
          id: c.id,
          title: c.title,
          items: c.items.map((i) => ({
            id: i.id,
            description: i.description,
            completed: i.completed,
          })),
        }))}
        currentUserId={session.user.id}
      />
    </div>
  );
}
