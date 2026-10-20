/**
 * Service de Projetos — compartilhado pela Web UI e pela API pública.
 * Toda regra de negócio (validação, autorização, atividade) vive aqui.
 */

import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import {
  assertProjectAccess,
  projectWhereForUser,
} from "@/lib/project-access";
import {
  assertProjectLogoUpload,
  deleteLocalFile,
  saveProjectLogoFile,
} from "@/lib/storage";
import { DEFAULT_BOARD_COLUMNS } from "@/lib/constants";
import type { Project, ProjectStatus } from "@/generated/prisma/client";

const DEFAULT_COLUMNS = DEFAULT_BOARD_COLUMNS.map((c) => ({
  name: c.name,
  color: c.color,
  position: c.position,
}));

export type CreateProjectInput = {
  workspaceId: string;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  status?: ProjectStatus;
  startDate?: Date | null;
  dueDate?: Date | null;
  createdBy: string;
};

export type UpdateProjectInput = {
  name?: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  status?: ProjectStatus;
  startDate?: Date | null;
  dueDate?: Date | null;
  archived?: boolean;
};

async function ensureMember(workspaceId: string, userId: string | null) {
  if (!userId) {
    throw new AppError("FORBIDDEN", "Usuário não associado ao token.", 403);
  }
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) {
    throw new AppError("FORBIDDEN", "Usuário não é membro do workspace.", 403);
  }
  return member;
}

export const projectService = {
  async list(
    workspaceId: string,
    opts: {
      status?: ProjectStatus;
      search?: string;
      take: number;
      cursor?: string | null;
      /** Quando informado, só projetos acessíveis a este usuário. */
      userId?: string | null;
    },
  ) {
    const where: Record<string, unknown> = {
      workspaceId,
      archivedAt: null,
    };
    if (opts.status) where.status = opts.status;
    if (opts.search) where.name = { contains: opts.search };
    if (opts.userId) {
      where.AND = [projectWhereForUser(opts.userId)];
    }

    const cursor = opts.cursor
      ? { id: opts.cursor }
      : undefined;

    const items = await prisma.project.findMany({
      where,
      orderBy: { id: "asc" },
      take: opts.take + 1,
      ...(cursor ? { cursor, skip: 1 } : {}),
      include: {
        _count: { select: { tasks: { where: { archivedAt: null } } } },
      },
    });

    const hasMore = items.length > opts.take;
    const data = hasMore ? items.slice(0, opts.take) : items;
    const last = data[data.length - 1];
    return {
      data,
      pagination: {
        nextCursor: hasMore && last ? last.id : null,
        hasMore,
      },
    };
  },

  async getById(projectId: string, userId?: string | null) {
    if (userId) {
      await assertProjectAccess(userId, projectId, "view");
    }
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        boards: {
          include: { columns: { orderBy: { position: "asc" } } },
        },
      },
    });
    if (!project) throw new AppError("NOT_FOUND", "Projeto não encontrado.", 404);
    return project;
  },

  async create(actor: { userId: string | null; actorType: "USER" | "API" }, input: CreateProjectInput) {
    const member = await ensureMember(input.workspaceId, actor.userId);

    const project = await prisma.project.create({
      data: {
        workspaceId: input.workspaceId,
        name: input.name,
        description: input.description ?? null,
        color: input.color ?? null,
        icon: input.icon ?? null,
        status: input.status ?? "ACTIVE",
        startDate: input.startDate ?? null,
        dueDate: input.dueDate ?? null,
        createdBy: input.createdBy,
        members: {
          create: {
            userId: input.createdBy,
            role: member.role === "MEMBER" ? "MEMBER" : "ADMIN",
          },
        },
        boards: {
          create: {
            name: "Board Principal",
            description: null,
            columns: { create: DEFAULT_COLUMNS },
          },
        },
      },
      include: { boards: { include: { columns: true } } },
    });

    await prisma.activity.create({
      data: {
        workspaceId: input.workspaceId,
        projectId: project.id,
        userId: actor.userId,
        actorType: actor.actorType,
        actorId: actor.userId ?? `api:${input.workspaceId}`,
        action: "project.created",
        entityType: "Project",
        entityId: project.id,
        metadata: JSON.stringify({ name: project.name }),
      },
    });

    return project;
  },

  async update(actor: { userId: string | null; actorType: "USER" | "API" }, projectId: string, input: UpdateProjectInput) {
    const existing = await prisma.project.findUnique({ where: { id: projectId } });
    if (!existing) throw new AppError("NOT_FOUND", "Projeto não encontrado.", 404);

    if (actor.userId) {
      await assertProjectAccess(actor.userId, projectId, "edit");
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.color !== undefined && { color: input.color }),
        ...(input.icon !== undefined && { icon: input.icon }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.startDate !== undefined && { startDate: input.startDate }),
        ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
        ...(input.archived !== undefined && {
          archivedAt: input.archived ? new Date() : null,
        }),
      },
    });

    // Ao concluir ou cancelar o projeto, arquiva tarefas ainda abertas
    const closing =
      input.status === "COMPLETED" || input.status === "CANCELLED";
    if (closing && existing.status !== input.status) {
      await prisma.task.updateMany({
        where: {
          projectId,
          archivedAt: null,
          completedAt: null,
        },
        data: { archivedAt: new Date() },
      });
    }

    await prisma.activity.create({
      data: {
        workspaceId: existing.workspaceId,
        projectId,
        userId: actor.userId,
        actorType: actor.actorType,
        actorId: actor.userId ?? `api:${existing.workspaceId}`,
        action: "project.updated",
        entityType: "Project",
        entityId: projectId,
        metadata: JSON.stringify(input),
      },
    });

    return updated;
  },

  async archive(actor: { userId: string | null; actorType: "USER" | "API" }, projectId: string) {
    const updated = await this.update(actor, projectId, { archived: true });
    // Esconde as tarefas do projeto arquivado em "Minhas tarefas" e listas
    await prisma.task.updateMany({
      where: { projectId, archivedAt: null },
      data: { archivedAt: new Date() },
    });
    return updated;
  },

  async getAccessibleProject(projectId: string, workspaceId: string): Promise<Project> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId },
    });
    if (!project) throw new AppError("NOT_FOUND", "Projeto não encontrado.", 404);
    return project;
  },

  async setLogo(userId: string, projectId: string, file: File) {
    await assertProjectAccess(userId, projectId, "edit");
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, workspaceId: true, logoPath: true },
    });
    if (!project) throw new AppError("NOT_FOUND", "Projeto não encontrado.", 404);

    let meta: { mime: string; fileName: string };
    try {
      meta = assertProjectLogoUpload(file);
    } catch (err) {
      throw new AppError(
        "VALIDATION_ERROR",
        err instanceof Error ? err.message : "Arquivo inválido.",
        400,
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const { relative } = await saveProjectLogoFile({
      workspaceId: project.workspaceId,
      projectId: project.id,
      fileName: meta.fileName,
      bytes,
    });

    if (project.logoPath) {
      await deleteLocalFile(project.logoPath);
    }

    return prisma.project.update({
      where: { id: projectId },
      data: { logoPath: relative },
      select: { id: true, logoPath: true },
    });
  },

  async clearLogo(userId: string, projectId: string) {
    await assertProjectAccess(userId, projectId, "edit");
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, logoPath: true },
    });
    if (!project) throw new AppError("NOT_FOUND", "Projeto não encontrado.", 404);
    if (project.logoPath) {
      await deleteLocalFile(project.logoPath);
    }
    return prisma.project.update({
      where: { id: projectId },
      data: { logoPath: null },
      select: { id: true, logoPath: true },
    });
  },

  async getLogoForView(userId: string, projectId: string) {
    await assertProjectAccess(userId, projectId, "view");
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { logoPath: true, updatedAt: true },
    });
    if (!project?.logoPath) {
      throw new AppError("NOT_FOUND", "Logo não encontrado.", 404);
    }
    return project;
  },
};
