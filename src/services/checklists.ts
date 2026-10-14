import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { POSITION_GAP } from "@/lib/constants";

async function assertTaskAccess(
  userId: string,
  taskId: string,
  mode: "read" | "write",
) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      projectId: true,
      completedAt: true,
      archivedAt: true,
      project: { select: { workspaceId: true } },
    },
  });
  if (!task) throw new AppError("NOT_FOUND", "Tarefa não encontrada.", 404);

  const { assertProjectAccess } = await import("@/lib/project-access");
  await assertProjectAccess(
    userId,
    task.projectId,
    mode === "write" ? "edit" : "view",
  );

  if (mode === "write" && (task.completedAt || task.archivedAt)) {
    throw new AppError(
      "FORBIDDEN",
      task.archivedAt
        ? "Tarefa arquivada: lista de verificação somente leitura."
        : "Reabra a tarefa para alterar a lista de verificação.",
      403,
    );
  }

  return {
    taskId: task.id,
    projectId: task.projectId,
    workspaceId: task.project.workspaceId,
  };
}

/** Garante uma checklist padrão por tarefa (estilo Planner). */
async function ensureDefaultChecklist(taskId: string) {
  const existing = await prisma.checklist.findFirst({
    where: { taskId },
    orderBy: { position: "asc" },
  });
  if (existing) return existing;

  return prisma.checklist.create({
    data: {
      taskId,
      title: "Lista de verificação",
      position: POSITION_GAP,
    },
  });
}

export const checklistService = {
  async getForTask(userId: string, taskId: string) {
    await assertTaskAccess(userId, taskId, "read");
    return prisma.checklist.findMany({
      where: { taskId },
      orderBy: { position: "asc" },
      include: {
        items: { orderBy: { position: "asc" } },
      },
    });
  },

  async addItem(userId: string, taskId: string, description: string) {
    const access = await assertTaskAccess(userId, taskId, "write");
    const text = description.trim();
    if (!text) {
      throw new AppError("VALIDATION_ERROR", "Descreva o item.", 422);
    }
    if (text.length > 500) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Item muito longo (máx. 500 caracteres).",
        422,
      );
    }

    const checklist = await ensureDefaultChecklist(taskId);
    const last = await prisma.checklistItem.findFirst({
      where: { checklistId: checklist.id },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const position = last ? last.position + POSITION_GAP : POSITION_GAP;

    const item = await prisma.checklistItem.create({
      data: {
        checklistId: checklist.id,
        description: text,
        position,
      },
    });

    await prisma.activity.create({
      data: {
        workspaceId: access.workspaceId,
        projectId: access.projectId,
        taskId,
        userId,
        actorType: "USER",
        actorId: userId,
        action: "checklist.item_added",
        entityType: "ChecklistItem",
        entityId: item.id,
        metadata: JSON.stringify({ description: text }),
      },
    });

    return { item, projectId: access.projectId, taskId };
  },

  async toggleItem(userId: string, itemId: string) {
    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        checklist: { select: { id: true, taskId: true } },
      },
    });
    if (!item) throw new AppError("NOT_FOUND", "Item não encontrado.", 404);

    const access = await assertTaskAccess(
      userId,
      item.checklist.taskId,
      "write",
    );
    const completed = !item.completed;
    const updated = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        completed,
        completedAt: completed ? new Date() : null,
        completedBy: completed ? userId : null,
      },
    });

    await prisma.activity.create({
      data: {
        workspaceId: access.workspaceId,
        projectId: access.projectId,
        taskId: item.checklist.taskId,
        userId,
        actorType: "USER",
        actorId: userId,
        action: completed
          ? "checklist.item_completed"
          : "checklist.item_reopened",
        entityType: "ChecklistItem",
        entityId: item.id,
        metadata: JSON.stringify({ description: item.description }),
      },
    });

    return {
      item: updated,
      projectId: access.projectId,
      taskId: item.checklist.taskId,
    };
  },

  async updateItem(
    userId: string,
    itemId: string,
    description: string,
  ) {
    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        checklist: { select: { taskId: true } },
      },
    });
    if (!item) throw new AppError("NOT_FOUND", "Item não encontrado.", 404);

    const access = await assertTaskAccess(
      userId,
      item.checklist.taskId,
      "write",
    );
    const text = description.trim();
    if (!text) {
      throw new AppError("VALIDATION_ERROR", "Descreva o item.", 422);
    }

    const updated = await prisma.checklistItem.update({
      where: { id: itemId },
      data: { description: text.slice(0, 500) },
    });

    return {
      item: updated,
      projectId: access.projectId,
      taskId: item.checklist.taskId,
    };
  },

  async deleteItem(userId: string, itemId: string) {
    const item = await prisma.checklistItem.findUnique({
      where: { id: itemId },
      include: {
        checklist: { select: { taskId: true } },
      },
    });
    if (!item) throw new AppError("NOT_FOUND", "Item não encontrado.", 404);

    const access = await assertTaskAccess(
      userId,
      item.checklist.taskId,
      "write",
    );
    await prisma.checklistItem.delete({ where: { id: itemId } });

    await prisma.activity.create({
      data: {
        workspaceId: access.workspaceId,
        projectId: access.projectId,
        taskId: item.checklist.taskId,
        userId,
        actorType: "USER",
        actorId: userId,
        action: "checklist.item_deleted",
        entityType: "ChecklistItem",
        entityId: item.id,
        metadata: JSON.stringify({ description: item.description }),
      },
    });

    return { projectId: access.projectId, taskId: item.checklist.taskId };
  },
};
