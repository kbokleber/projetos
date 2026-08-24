"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { taskService } from "@/services/tasks";
import { taskQuickSchema } from "@/schemas/tasks";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

export type TaskFormState =
  | { ok: true; taskId: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }
  | undefined;

async function getSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

/**
 * Verifica se o usuário tem acesso ao projeto. Aceita ProjectMember
 * (qualquer role exceto VIEWER) ou WorkspaceMember (herda permissão
 * de MEMBER, ou seja, pode editar mas não pode gerenciar membros).
 * Retorna o projectId + workspaceId se permitido.
 */
async function assertProjectEditAccess(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { members: { some: { userId, role: { in: ["OWNER", "ADMIN", "MEMBER"] } } } },
        {
          workspace: {
            is: { members: { some: { userId } } },
          },
        },
      ],
    },
    select: { id: true, workspaceId: true },
  });
  if (!project) {
    throw new AppError("FORBIDDEN", "Sem permissão neste projeto.", 403);
  }
  return project;
}

function flatten(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function createQuickTaskAction(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const user = await getSession();
  const raw = Object.fromEntries(formData.entries());
  const parsed = taskQuickSchema.safeParse({
    ...raw,
    dueDate: raw.dueDate === "" ? undefined : raw.dueDate,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique o formulário.",
      fieldErrors: flatten(parsed.error),
    };
  }

  try {
    const task = await taskService.create(
      { userId: user.id, actorType: "USER" },
      {
        projectId: parsed.data.projectId,
        boardId: parsed.data.boardId,
        columnId: parsed.data.columnId,
        title: parsed.data.title,
        priority: parsed.data.priority,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        createdBy: user.id,
      },
    );
    revalidatePath(`/projects/${parsed.data.projectId}`);
    revalidatePath("/my-tasks");
    revalidatePath("/dashboard");
    return { ok: true, taskId: task.id };
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, error: err.message };
    }
    console.error("[createTask]", err);
    return { ok: false, error: "Não foi possível criar a tarefa." };
  }
}

export async function toggleTaskCompletionAction(formData: FormData) {
  const user = await getSession();
  const taskId = formData.get("taskId");
  if (typeof taskId !== "string") return;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, completedAt: true, projectId: true },
  });
  if (!task) return;

  const completed = !task.completedAt;
  await taskService.update(
    { userId: user.id, actorType: "USER" },
    task.id,
    { completed },
  );
  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath(`/projects/${task.projectId}/tasks/${taskId}`);
  revalidatePath("/my-tasks");
}

export async function updateTaskDetailsAction(
  taskId: string,
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const user = await getSession();

  const assigneeIds = formData.getAll("assigneeIds").map(String);

  const raw = Object.fromEntries(formData.entries());
  const parsed = (await import("@/schemas/tasks")).taskFullSchema.safeParse({
    ...raw,
    startDate: raw.startDate === "" ? undefined : raw.startDate,
    dueDate: raw.dueDate === "" ? undefined : raw.dueDate,
    estimatedHours: raw.estimatedHours === "" ? undefined : raw.estimatedHours,
    assigneeIds,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos.",
      fieldErrors: flatten(parsed.error),
    };
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true },
  });
  if (!task) return { ok: false, error: "Tarefa não encontrada." };

  try {
    await taskService.update(
      { userId: user.id, actorType: "USER", workspaceId: undefined },
      taskId,
      {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        priority: parsed.data.priority,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        estimatedHours: parsed.data.estimatedHours ?? null,
      },
    );

    // Atualiza assignees: diff simples — remove os antigos e adiciona os novos
    const currentAssignees = await prisma.taskAssignee.findMany({
      where: { taskId },
      select: { userId: true },
    });
    const current = new Set(currentAssignees.map((a) => a.userId));
    const next = new Set(parsed.data.assigneeIds ?? []);
    const toAdd = [...next].filter((u) => !current.has(u));
    const toRemove = [...current].filter((u) => !next.has(u));

    for (const userId of toRemove) {
      await prisma.taskAssignee
        .delete({ where: { taskId_userId: { taskId, userId } } })
        .catch(() => null);
    }
    for (const userId of toAdd) {
      await prisma.taskAssignee.upsert({
        where: { taskId_userId: { taskId, userId } },
        create: { taskId, userId },
        update: {},
      });
    }

    revalidatePath(`/projects/${task.projectId}`);
    revalidatePath(`/projects/${task.projectId}/tasks/${taskId}`);
    revalidatePath("/my-tasks");
    return { ok: true, taskId };
  } catch (err) {
    if (err instanceof AppError) return { ok: false, error: err.message };
    console.error("[updateTask]", err);
    return { ok: false, error: "Não foi possível atualizar." };
  }
}

export async function moveTaskAction(
  taskId: string,
  formData: FormData,
) {
  const user = await getSession();
  const columnId = formData.get("columnId");
  if (typeof columnId !== "string") return;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true, boardId: true, columnId: true },
  });
  if (!task) return;

  const targetCol = await prisma.boardColumn.findUnique({
    where: { id: columnId },
    select: { id: true, boardId: true },
  });
  if (!targetCol || targetCol.boardId !== task.boardId) return;

  await assertProjectEditAccess(user.id, task.projectId);

  const { POSITION_GAP } = await import("@/lib/constants");
  const last = await prisma.task.findFirst({
    where: { columnId, archivedAt: null, id: { not: taskId } },
    orderBy: { position: "desc" },
  });
  const position = last ? last.position + POSITION_GAP : POSITION_GAP;

  await taskService.move(
    { userId: user.id, actorType: "USER" },
    taskId,
    { columnId, position },
  );

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath(`/projects/${task.projectId}/tasks/${taskId}`);
  revalidatePath("/my-tasks");
}

/**
 * Server Action chamada pelo DnD. Recebe columnId + índice (0-based) na
 * coluna destino. Calcula a posição real baseada nos vizinhos e chama
 * taskService.move.
 *
 * FormData esperado:
 *   - taskId: string
 *   - columnId: string
 *   - index: number (string numérico)
 */
export async function reorderTaskAction(formData: FormData) {
  const user = await getSession();

  const taskId = formData.get("taskId");
  const columnId = formData.get("columnId");
  const indexRaw = formData.get("index");
  if (
    typeof taskId !== "string" ||
    typeof columnId !== "string" ||
    typeof indexRaw !== "string"
  ) {
    return { ok: false, error: "Parâmetros inválidos." } as const;
  }
  const index = Number.parseInt(indexRaw, 10);
  if (!Number.isFinite(index) || index < 0) {
    return { ok: false, error: "Índice inválido." } as const;
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true, boardId: true },
  });
  if (!task) return { ok: false, error: "Tarefa não encontrada." } as const;

  const targetCol = await prisma.boardColumn.findUnique({
    where: { id: columnId },
    select: { id: true, boardId: true },
  });
  if (!targetCol || targetCol.boardId !== task.boardId) {
    return { ok: false, error: "Coluna inválida." } as const;
  }

  try {
    await assertProjectEditAccess(user.id, task.projectId);
  } catch (err) {
    if (err instanceof AppError) return { ok: false, error: err.message };
    throw err;
  }

  const { POSITION_GAP } = await import("@/lib/constants");

  // Busca vizinhos na coluna destino (excluindo a própria tarefa)
  const siblings = await prisma.task.findMany({
    where: { columnId, archivedAt: null, id: { not: taskId } },
    orderBy: { position: "asc" },
    select: { id: true, position: true },
  });

  let position: number;
  if (siblings.length === 0) {
    position = POSITION_GAP;
  } else if (index <= 0) {
    position = siblings[0].position - POSITION_GAP;
  } else if (index >= siblings.length) {
    position = siblings[siblings.length - 1].position + POSITION_GAP;
  } else {
    const before = siblings[index - 1].position;
    const after = siblings[index].position;
    position = (before + after) / 2;
  }

  try {
    await taskService.move(
      { userId: user.id, actorType: "USER" },
      taskId,
      { columnId, position },
    );
  } catch (err) {
    if (err instanceof AppError) return { ok: false, error: err.message };
    console.error("[reorderTask]", err);
    return { ok: false, error: "Não foi possível mover." } as const;
  }

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/my-tasks");
  return { ok: true } as const;
}

export async function deleteTaskAction(taskId: string) {
  const user = await getSession();
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, projectId: true },
  });
  if (!task) return;

  await taskService.delete({ userId: user.id, actorType: "USER" }, taskId);

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/my-tasks");
  revalidatePath("/dashboard");
  redirect(`/projects/${task.projectId}`);
}

export async function createCommentAction(
  taskId: string,
  _prev: { ok: boolean; error?: string } | undefined,
  formData: FormData,
) {
  const user = await getSession();
  const parsed = (await import("@/schemas/tasks")).commentCreateSchema.safeParse({
    content: formData.get("content"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Inválido." };
  }

  const taskWithProject = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { id: true, workspaceId: true } } },
  });
  if (!taskWithProject) return { ok: false, error: "Tarefa não encontrada." };

  await prisma.comment.create({
    data: { taskId, userId: user.id, content: parsed.data.content },
  });

  await prisma.activity.create({
    data: {
      workspaceId: taskWithProject.project.workspaceId,
      projectId: taskWithProject.project.id,
      taskId,
      userId: user.id,
      actorType: "USER",
      actorId: user.id,
      action: "comment.created",
      entityType: "Comment",
      entityId: taskId,
      metadata: JSON.stringify({ taskId }),
    },
  });

  revalidatePath(`/projects/${taskWithProject.project.id}/tasks/${taskId}`);
  return { ok: true };
}
