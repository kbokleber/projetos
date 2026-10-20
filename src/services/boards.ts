/**
 * Service de Boards e Columns.
 * Criação/edição/exclusão de colunas é só pela UI (server actions) —
 * a API pública não deve chamar create/update/remove de coluna.
 */

import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { POSITION_GAP } from "@/lib/constants";
import {
  isCompletionColumnName,
  isFixedStartColumnName,
  isFixedSystemColumnName,
} from "@/lib/board-columns";

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

  async create(
    actor: { userId: string | null; actorType: "USER" | "API" },
    projectId: string,
    data: { name: string; description?: string | null },
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
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

async function assertNoDuplicateCompletion(
  boardId: string,
  name: string,
  exceptColumnId?: string,
) {
  if (!isCompletionColumnName(name)) return;
  const siblings = await prisma.boardColumn.findMany({
    where: { boardId, ...(exceptColumnId ? { id: { not: exceptColumnId } } : {}) },
    select: { id: true, name: true },
  });
  if (siblings.some((c) => isCompletionColumnName(c.name))) {
    throw new AppError(
      "CONFLICT",
      "Já existe uma coluna de conclusão neste quadro.",
      409,
    );
  }
}

async function nextIntermediatePosition(boardId: string) {
  const columns = await prisma.boardColumn.findMany({
    where: { boardId },
    orderBy: { position: "asc" },
    select: { id: true, name: true, position: true },
  });
  const done = columns.find((c) => isCompletionColumnName(c.name));
  if (done) {
    const before = columns.filter((c) => c.position < done.position);
    const left = before[before.length - 1]?.position ?? 0;
    return (left + done.position) / 2;
  }
  const last = columns[columns.length - 1];
  return (last?.position ?? 0) + POSITION_GAP;
}

export const columnService = {
  async listByBoard(boardId: string) {
    return prisma.boardColumn.findMany({
      where: { boardId },
      orderBy: { position: "asc" },
    });
  },

  async create(
    actor: { userId: string | null; actorType: "USER" | "API" },
    boardId: string,
    data: { name: string; color?: string | null; position?: number },
  ) {
    const name = data.name.trim();
    if (!name) {
      throw new AppError("VALIDATION_ERROR", "Informe o nome da etapa.", 400);
    }
    if (isFixedStartColumnName(name)) {
      throw new AppError(
        "FORBIDDEN",
        'A etapa "A Fazer" é fixa e não pode ser criada novamente.',
        403,
      );
    }

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { project: true },
    });
    if (!board) throw new AppError("NOT_FOUND", "Board não encontrado.", 404);

    await assertNoDuplicateCompletion(boardId, name);

    const position =
      data.position !== undefined && Number.isFinite(data.position)
        ? data.position
        : await nextIntermediatePosition(boardId);

    const column = await prisma.boardColumn.create({
      data: {
        boardId,
        name,
        color: data.color ?? null,
        position,
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

  async update(
    actor: { userId: string | null; actorType: "USER" | "API" },
    columnId: string,
    data: { name?: string; color?: string | null; position?: number },
  ) {
    const existing = await prisma.boardColumn.findUnique({
      where: { id: columnId },
      include: { board: { include: { project: true } } },
    });
    if (!existing) throw new AppError("NOT_FOUND", "Coluna não encontrada.", 404);

    if (isFixedSystemColumnName(existing.name)) {
      throw new AppError(
        "FORBIDDEN",
        `A etapa "${existing.name}" é fixa e não pode ser alterada.`,
        403,
      );
    }

    const nextName =
      data.name !== undefined ? data.name.trim() : undefined;
    if (nextName !== undefined) {
      if (!nextName) {
        throw new AppError("VALIDATION_ERROR", "Informe o nome da etapa.", 400);
      }
      if (isFixedStartColumnName(nextName)) {
        throw new AppError(
          "FORBIDDEN",
          'Não é permitido renomear para "A Fazer".',
          403,
        );
      }
      await assertNoDuplicateCompletion(
        existing.boardId,
        nextName,
        columnId,
      );
    }

    if (data.position !== undefined) {
      // Etapas intermediárias podem reordenar, mas não atravessar A Fazer / Concluído
      const siblings = await prisma.boardColumn.findMany({
        where: { boardId: existing.boardId },
        select: { name: true, position: true },
      });
      const startPos = siblings.find((c) => isFixedStartColumnName(c.name))
        ?.position;
      const donePos = siblings.find((c) => isCompletionColumnName(c.name))
        ?.position;
      if (startPos !== undefined && data.position <= startPos) {
        throw new AppError(
          "VALIDATION_ERROR",
          'A etapa deve ficar depois de "A Fazer".',
          400,
        );
      }
      if (donePos !== undefined && data.position >= donePos) {
        throw new AppError(
          "VALIDATION_ERROR",
          'A etapa deve ficar antes de "Concluído".',
          400,
        );
      }
    }

    const updated = await prisma.boardColumn.update({
      where: { id: columnId },
      data: {
        ...(nextName !== undefined && { name: nextName }),
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

  async remove(
    actor: { userId: string | null; actorType: "USER" | "API" },
    columnId: string,
  ) {
    const existing = await prisma.boardColumn.findUnique({
      where: { id: columnId },
      include: {
        board: { include: { project: true } },
        _count: { select: { tasks: true } },
      },
    });
    if (!existing) throw new AppError("NOT_FOUND", "Coluna não encontrada.", 404);

    if (isFixedSystemColumnName(existing.name)) {
      throw new AppError(
        "FORBIDDEN",
        `A etapa "${existing.name}" é fixa e não pode ser excluída.`,
        403,
      );
    }

    const siblings = await prisma.boardColumn.findMany({
      where: { boardId: existing.boardId },
      select: { id: true, name: true },
      orderBy: { position: "asc" },
    });
    const startCol = siblings.find((c) => isFixedStartColumnName(c.name));
    if (!startCol || startCol.id === columnId) {
      throw new AppError(
        "CONFLICT",
        'Não foi possível localizar a etapa "A Fazer" para receber as tarefas.',
        409,
      );
    }

    const movedCount = existing._count.tasks;

    await prisma.$transaction(async (tx) => {
      if (movedCount > 0) {
        const lastInStart = await tx.task.findFirst({
          where: { columnId: startCol.id, archivedAt: null },
          orderBy: { position: "desc" },
          select: { position: true },
        });
        let nextPos = (lastInStart?.position ?? 0) + POSITION_GAP;
        const tasks = await tx.task.findMany({
          where: { columnId },
          orderBy: { position: "asc" },
          select: { id: true },
        });
        for (const task of tasks) {
          await tx.task.update({
            where: { id: task.id },
            data: {
              columnId: startCol.id,
              position: nextPos,
              completedAt: null,
            },
          });
          nextPos += POSITION_GAP;
        }
      }

      await tx.boardColumn.delete({ where: { id: columnId } });
    });

    await prisma.activity.create({
      data: {
        workspaceId: existing.board.project.workspaceId,
        projectId: existing.board.projectId,
        userId: actor.userId,
        actorType: actor.actorType,
        actorId: actor.userId ?? `api:${existing.board.project.workspaceId}`,
        action: "column.deleted",
        entityType: "BoardColumn",
        entityId: columnId,
        metadata: JSON.stringify({
          name: existing.name,
          movedTo: startCol.name,
          movedCount,
        }),
      },
    });
  },
};
