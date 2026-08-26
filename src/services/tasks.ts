/**
 * Service de Tasks — núcleo do sistema.
 * Chamado tanto pela Web UI quanto pela API pública.
 */

import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import type { Task, TaskPriority } from "@/generated/prisma/client";
import { POSITION_GAP } from "@/lib/constants";

type Actor = {
  userId: string | null;
  actorType: "USER" | "API" | "WEBHOOK" | "SYSTEM";
  workspaceId?: string;
};

export type CreateTaskInput = {
  projectId: string;
  boardId: string;
  columnId: string;
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  startDate?: Date | null;
  dueDate?: Date | null;
  estimatedHours?: number | null;
  position?: number;
  externalId?: string | null;
  externalSource?: string | null;
  assigneeIds?: string[];
  createdBy: string;
};

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  startDate?: Date | null;
  dueDate?: Date | null;
  estimatedHours?: number | null;
  columnId?: string;
  position?: number;
  completed?: boolean;
  archived?: boolean;
  externalId?: string | null;
  externalSource?: string | null;
};

export type ListTasksInput = {
  workspaceId: string;
  projectId?: string;
  boardId?: string;
  columnId?: string;
  assigneeId?: string;
  priority?: TaskPriority;
  labelId?: string;
  status?: "OPEN" | "COMPLETED" | "ARCHIVED";
  dueBefore?: Date;
  dueAfter?: Date;
  search?: string;
  externalSource?: string;
  externalId?: string;
  limit: number;
  cursor?: string | null;
};

async function loadTaskOr404(taskId: string): Promise<Task> {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) throw new AppError("NOT_FOUND", "Tarefa não encontrada.", 404);
  return task;
}

async function resolveProjectAccess(task: Task, workspaceId: string) {
  const project = await prisma.project.findFirst({
    where: { id: task.projectId, workspaceId },
    select: { id: true, workspaceId: true },
  });
  if (!project) throw new AppError("FORBIDDEN", "Token sem acesso ao projeto.", 403);
  return project;
}

export const taskService = {
  async list(input: ListTasksInput) {
    const where: Record<string, unknown> = {};
    if (input.projectId) where.projectId = input.projectId;
    if (input.boardId) where.boardId = input.boardId;
    if (input.columnId) where.columnId = input.columnId;
    if (input.priority) where.priority = input.priority;
    if (input.labelId) where.labels = { some: { labelId: input.labelId } };
    if (input.assigneeId) {
      where.assignees = { some: { userId: input.assigneeId } };
    }
    if (input.status === "ARCHIVED") where.archivedAt = { not: null };
    else if (input.status === "COMPLETED") where.completedAt = { not: null };
    else where.archivedAt = null;
    if (input.dueBefore || input.dueAfter) {
      where.dueDate = {
        ...(input.dueBefore ? { lt: input.dueBefore } : {}),
        ...(input.dueAfter ? { gt: input.dueAfter } : {}),
      };
    }
    if (input.search) {
      where.OR = [
        { title: { contains: input.search, mode: "insensitive" } },
        { description: { contains: input.search, mode: "insensitive" } },
        { externalId: { contains: input.search, mode: "insensitive" } },
      ];
    }
    if (input.externalSource && input.externalId) {
      where.externalSource = input.externalSource;
      where.externalId = input.externalId;
    }

    // Garante acesso ao workspace (tasks sempre têm projectId)
    if (!input.projectId) {
      const projects = await prisma.project.findMany({
        where: { workspaceId: input.workspaceId },
        select: { id: true },
      });
      where.projectId = { in: projects.map((p) => p.id) };
    } else {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, workspaceId: input.workspaceId },
        select: { id: true },
      });
      if (!project) throw new AppError("FORBIDDEN", "Sem acesso ao projeto.", 403);
    }

    const take = Math.min(Math.max(input.limit, 1), 100);
    const cursor = input.cursor ? { id: input.cursor } : undefined;

    const items = await prisma.task.findMany({
      where,
      orderBy: { id: "asc" },
      take: take + 1,
      ...(cursor ? { cursor, skip: 1 } : {}),
      include: {
        assignees: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        labels: { include: { label: true } },
        column: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    });

    const hasMore = items.length > take;
    const data = hasMore ? items.slice(0, take) : items;
    const last = data[data.length - 1];
    return {
      data,
      pagination: {
        nextCursor: hasMore && last ? last.id : null,
        hasMore,
      },
    };
  },

  async getById(taskId: string, workspaceId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignees: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        labels: { include: { label: true } },
        column: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, color: true } },
        checklists: {
          include: { items: { orderBy: { position: "asc" } } },
        },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });
    if (!task) throw new AppError("NOT_FOUND", "Tarefa não encontrada.", 404);
    await resolveProjectAccess(task, workspaceId);
    return task;
  },

  async create(actor: Actor, input: CreateTaskInput) {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId },
    });
    if (!project) throw new AppError("NOT_FOUND", "Projeto não encontrado.", 404);

    const column = await prisma.boardColumn.findFirst({
      where: { id: input.columnId, boardId: input.boardId },
    });
    if (!column) {
      throw new AppError("VALIDATION_ERROR", "Coluna não pertence ao board.", 422);
    }

    // Calcula posição no final da coluna se não informada
    let position = input.position;
    if (position === undefined) {
      const last = await prisma.task.findFirst({
        where: { columnId: input.columnId, archivedAt: null },
        orderBy: { position: "desc" },
      });
      position = last ? last.position + POSITION_GAP : POSITION_GAP;
    }

    const task = await prisma.task.create({
      data: {
        projectId: input.projectId,
        boardId: input.boardId,
        columnId: input.columnId,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? "MEDIUM",
        startDate: input.startDate ?? null,
        dueDate: input.dueDate ?? null,
        estimatedHours: input.estimatedHours ?? null,
        position,
        externalId: input.externalId ?? null,
        externalSource: input.externalSource ?? null,
        createdBy: input.createdBy,
        assignees: input.assigneeIds
          ? { create: input.assigneeIds.map((userId) => ({ userId })) }
          : undefined,
      },
      include: {
        assignees: { include: { user: true } },
        column: true,
        project: { select: { id: true, name: true, workspaceId: true } },
      },
    });

    await prisma.activity.create({
      data: {
        workspaceId: project.workspaceId,
        projectId: project.id,
        taskId: task.id,
        userId: actor.userId,
        actorType: actor.actorType,
        actorId: actor.userId ?? `api:${project.workspaceId}`,
        action: "task.created",
        entityType: "Task",
        entityId: task.id,
        metadata: JSON.stringify({
          title: task.title,
          priority: task.priority,
          externalSource: task.externalSource,
          externalId: task.externalId,
        }),
      },
    });

    // Dispara webhook (best-effort)
    void import("@/services/webhooks").then(({ webhookService }) =>
      webhookService.dispatch(project.workspaceId, "task.created", { task }),
    );

    return task;
  },

  async update(actor: Actor & { workspaceId?: string }, taskId: string, input: UpdateTaskInput) {
    const task = await loadTaskOr404(taskId);
    if (actor.workspaceId) {
      await resolveProjectAccess(task, actor.workspaceId);
    }
    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
    });
    if (!project) throw new AppError("NOT_FOUND", "Projeto não encontrado.", 404);

    // Valida troca de coluna
    if (input.columnId && input.columnId !== task.columnId) {
      const targetCol = await prisma.boardColumn.findUnique({
        where: { id: input.columnId },
      });
      if (!targetCol || targetCol.boardId !== task.boardId) {
        throw new AppError(
          "VALIDATION_ERROR",
          "Coluna não pertence ao board da tarefa.",
          422,
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.startDate !== undefined) data.startDate = input.startDate;
    if (input.dueDate !== undefined) data.dueDate = input.dueDate;
    if (input.estimatedHours !== undefined) data.estimatedHours = input.estimatedHours;
    if (input.columnId !== undefined) data.columnId = input.columnId;
    if (input.position !== undefined) data.position = input.position;
    if (input.completed !== undefined) {
      data.completedAt = input.completed ? new Date() : null;
    }
    if (input.archived !== undefined) {
      data.archivedAt = input.archived ? new Date() : null;
    }
    if (input.externalId !== undefined) data.externalId = input.externalId;
    if (input.externalSource !== undefined) data.externalSource = input.externalSource;

    const updated = await prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        assignees: { include: { user: true } },
        column: true,
        project: { select: { id: true, name: true, workspaceId: true } },
      },
    });

    await prisma.activity.create({
      data: {
        workspaceId: project.workspaceId,
        projectId: project.id,
        taskId: updated.id,
        userId: actor.userId,
        actorType: actor.actorType,
        actorId: actor.userId ?? `api:${project.workspaceId}`,
        action:
          input.completed === true
            ? "task.completed"
            : input.completed === false
              ? "task.reopened"
              : "task.updated",
        entityType: "Task",
        entityId: updated.id,
        metadata: JSON.stringify(input),
      },
    });

    void import("@/services/webhooks").then(({ webhookService }) =>
      webhookService.dispatch(project.workspaceId, "task.updated", { task: updated }),
    );

    return updated;
  },

  async move(actor: Actor, taskId: string, input: { columnId: string; position: number }) {
    const task = await loadTaskOr404(taskId);
    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
    });
    if (!project) throw new AppError("NOT_FOUND", "Projeto não encontrado.", 404);

    const targetCol = await prisma.boardColumn.findUnique({
      where: { id: input.columnId },
    });
    if (!targetCol || targetCol.boardId !== task.boardId) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Coluna não pertence ao board da tarefa.",
        422,
      );
    }

    const previousColumn = task.columnId;
    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { columnId: input.columnId, position: input.position },
      include: {
        column: true,
        project: { select: { id: true, name: true, workspaceId: true } },
      },
    });

    if (previousColumn !== input.columnId) {
      await prisma.activity.create({
        data: {
          workspaceId: project.workspaceId,
          projectId: project.id,
          taskId: updated.id,
          userId: actor.userId,
          actorType: actor.actorType,
          actorId: actor.userId ?? `api:${project.workspaceId}`,
          action: "task.moved",
          entityType: "Task",
          entityId: updated.id,
          metadata: JSON.stringify({
            from: previousColumn,
            to: input.columnId,
            position: input.position,
          }),
        },
      });

      void import("@/services/webhooks").then(({ webhookService }) =>
        webhookService.dispatch(project.workspaceId, "task.moved", {
          task: updated,
          from: previousColumn,
          to: input.columnId,
        }),
      );
    }

    return updated;
  },

  async delete(actor: Actor, taskId: string) {
    const task = await loadTaskOr404(taskId);
    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
    });
    if (!project) throw new AppError("NOT_FOUND", "Projeto não encontrado.", 404);

    await prisma.task.update({
      where: { id: taskId },
      data: { archivedAt: new Date() },
    });

    await prisma.activity.create({
      data: {
        workspaceId: project.workspaceId,
        projectId: project.id,
        taskId,
        userId: actor.userId,
        actorType: actor.actorType,
        actorId: actor.userId ?? `api:${project.workspaceId}`,
        action: "task.deleted",
        entityType: "Task",
        entityId: taskId,
        metadata: JSON.stringify({ title: task.title }),
      },
    });
  },

  async addAssignee(actor: Actor, taskId: string, userId: string) {
    const task = await loadTaskOr404(taskId);
    await prisma.taskAssignee.upsert({
      where: { taskId_userId: { taskId, userId } },
      create: { taskId, userId },
      update: {},
    });
    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
    });
    if (project) {
      await prisma.activity.create({
        data: {
          workspaceId: project.workspaceId,
          projectId: project.id,
          taskId,
          userId: actor.userId,
          actorType: actor.actorType,
          actorId: actor.userId ?? `api:${project.workspaceId}`,
          action: "task.assignee.added",
          entityType: "Task",
          entityId: taskId,
          metadata: JSON.stringify({ assigneeId: userId }),
        },
      });
    }
    return { taskId, userId };
  },

  async removeAssignee(actor: Actor, taskId: string, userId: string) {
    const task = await loadTaskOr404(taskId);
    await prisma.taskAssignee
      .delete({
        where: { taskId_userId: { taskId, userId } },
      })
      .catch(() => null);
    const project = await prisma.project.findUnique({
      where: { id: task.projectId },
    });
    if (project) {
      await prisma.activity.create({
        data: {
          workspaceId: project.workspaceId,
          projectId: project.id,
          taskId,
          userId: actor.userId,
          actorType: actor.actorType,
          actorId: actor.userId ?? `api:${project.workspaceId}`,
          action: "task.assignee.removed",
          entityType: "Task",
          entityId: taskId,
          metadata: JSON.stringify({ assigneeId: userId }),
        },
      });
    }
    return { taskId, userId };
  },
};
