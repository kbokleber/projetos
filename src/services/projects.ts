/**
 * Service de Projetos — compartilhado pela Web UI e pela API pública.
 * Toda regra de negócio (validação, autorização, atividade) vive aqui.
 */

import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import type { Project, ProjectStatus } from "@/generated/prisma/client";

const DEFAULT_COLUMNS = [
  { name: "Backlog", color: "#94a3b8", position: 1000 },
  { name: "A Fazer", color: "#60a5fa", position: 2000 },
  { name: "Em Andamento", color: "#fbbf24", position: 3000 },
  { name: "Em Revisão", color: "#a78bfa", position: 4000 },
  { name: "Concluído", color: "#34d399", position: 5000 },
];

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
  async list(workspaceId: string, opts: { status?: ProjectStatus; search?: string; take: number; cursor?: string | null }) {
    const where: Record<string, unknown> = {
      workspaceId,
      archivedAt: null,
    };
    if (opts.status) where.status = opts.status;
    if (opts.search) where.name = { contains: opts.search };

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

  async getById(projectId: string) {
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
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: actor.userId } },
      });
      const isWsMember = !member
        ? !!(await prisma.workspaceMember.findFirst({
            where: { workspaceId: existing.workspaceId, userId: actor.userId },
            select: { id: true },
          }))
        : false;
      if ((!member || member.role === "VIEWER") && !isWsMember) {
        throw new AppError("FORBIDDEN", "Sem permissão para editar o projeto.", 403);
      }
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
    return this.update(actor, projectId, { archived: true });
  },

  async getAccessibleProject(projectId: string, workspaceId: string): Promise<Project> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId },
    });
    if (!project) throw new AppError("NOT_FOUND", "Projeto não encontrado.", 404);
    return project;
  },
};
