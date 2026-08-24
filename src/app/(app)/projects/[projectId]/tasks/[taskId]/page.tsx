import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TaskDetailsPanel } from "@/features/tasks/task-details-panel";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { dateTimeBR } from "@/lib/format-date";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; taskId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { projectId, taskId } = await params;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
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
    },
  });
  if (!task) notFound();

  const myMembership = project.members.find(
    (m) => m.userId === session.user.id,
  );
  let canEdit = false;
  if (myMembership && myMembership.role !== "VIEWER") {
    canEdit = true;
  } else if (!myMembership) {
    const wsMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId: project.workspaceId, userId: session.user.id },
      select: { id: true },
    });
    if (wsMember) canEdit = true;
  }

  const board = project.boards.find((b) => b.id === task.column.boardId);
  const columns = board?.columns ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <nav className="mb-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Link href="/projects" className="hover:text-foreground">
            Projetos
          </Link>
          <span>/</span>
          <Link
            href={`/projects/${project.id}`}
            className="hover:text-foreground"
          >
            {project.name}
          </Link>
          <span>/</span>
          <span className="truncate text-foreground">{task.title}</span>
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {task.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              {task.column.name} · {task.priority} ·{" "}
              {task.completedAt ? (
                <span className="text-emerald-600">concluída</span>
              ) : (
                "em aberto"
              )}{" "}
              · criada em {dateTimeBR(task.createdAt)}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${project.id}`}>
              <ArrowLeft className="size-3.5" /> Voltar ao board
            </Link>
          </Button>
        </div>
      </div>

      <TaskDetailsPanel
        taskId={task.id}
        projectId={project.id}
        canEdit={!!canEdit}
        columns={columns.map((c) => ({ id: c.id, name: c.name }))}
        currentColumnId={task.column.id}
        currentColumnName={task.column.name}
        members={project.members.map((m) => ({
          userId: m.userId,
          name: m.user.name,
          email: m.user.email,
        }))}
        currentAssigneeIds={task.assignees.map((a) => a.userId)}
        initial={{
          title: task.title,
          description: task.description,
          priority: task.priority,
          startDate: task.startDate,
          dueDate: task.dueDate,
          estimatedHours: task.estimatedHours,
          completedAt: task.completedAt,
        }}
        comments={task.comments.map((c) => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt,
          user: c.user,
        }))}
        currentUserId={session.user.id}
      />
    </div>
  );
}
