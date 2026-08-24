/**
 * Service de Boards e Columns.
 */

import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

export const boardService = {
  async listByProject(projectId: string) {
    return prisma.board.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      include: { columns: { orderBy: { position: "asc" } } },
    });
  },

  async getById(boardId: string) {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { columns: { orderBy: { position: "asc" } }, project: true },
    });
    if (!board) throw new AppError("NOT_FOUND", "Board não encontrado.", 404);
    return board;
  },

  async create(actor: { userId: string | null; actorType: "USER" | "API" }, projectId: string, data: { name: string; description?: string | null }) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError("NOT_FOUND", "Projeto não encontrado.", 404);

    const board = await prisma.board.create({
      data: {
        projectId,
        name: data.name,
        description: data.description ?? null,
      },
    });

    await prisma.activity.create({
      data: {
        workspaceId: project.workspaceId,
        projectId,
        userId: actor.userId,
        actorType: actor.actorType,
        actorId: actor.userId ?? `api:${project.workspaceId}`,
        action: "board.created",
        entityType: "Board",
        entityId: board.id,
        metadata: JSON.stringify({ name: board.name }),
      },
    });

    return board;
  },
};

export const columnService = {
  async listByBoard(boardId: string) {
    return prisma.boardColumn.findMany({
      where: { boardId },
      orderBy: { position: "asc" },
    });
  },

  async create(actor: { userId: string | null; actorType: "USER" | "API" }, boardId: string, data: { name: string; color?: string | null; position: number }) {
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { project: true },
    });
    if (!board) throw new AppError("NOT_FOUND", "Board não encontrado.", 404);

    const column = await prisma.boardColumn.create({
      data: {
        boardId,
        name: data.name,
        color: data.color ?? null,
        position: data.position,
      },
    });

    await prisma.activity.create({
      data: {
        workspaceId: board.project.workspaceId,
        projectId: board.projectId,
        userId: actor.userId,
        actorType: actor.actorType,
        actorId: actor.userId ?? `api:${board.project.workspaceId}`,
        action: "column.created",
        entityType: "BoardColumn",
        entityId: column.id,
        metadata: JSON.stringify({ name: column.name, boardId }),
      },
    });

    return column;
  },

  async update(actor: { userId: string | null; actorType: "USER" | "API" }, columnId: string, data: { name?: string; color?: string | null; position?: number }) {
    const existing = await prisma.boardColumn.findUnique({
      where: { id: columnId },
      include: { board: { include: { project: true } } },
    });
    if (!existing) throw new AppError("NOT_FOUND", "Coluna não encontrada.", 404);

    const updated = await prisma.boardColumn.update({
      where: { id: columnId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.position !== undefined && { position: data.position }),
      },
    });

    await prisma.activity.create({
      data: {
        workspaceId: existing.board.project.workspaceId,
        projectId: existing.board.projectId,
        userId: actor.userId,
        actorType: actor.actorType,
        actorId: actor.userId ?? `api:${existing.board.project.workspaceId}`,
        action: "column.updated",
        entityType: "BoardColumn",
        entityId: columnId,
        metadata: JSON.stringify(data),
      },
    });

    return updated;
  },
};

