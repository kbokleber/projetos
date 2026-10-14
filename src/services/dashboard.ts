/**
 * Service do Dashboard de acompanhamento — leitura focada em visões
 * executivas voltadas para usuários humanos que querem ver o que a IA fez.
 * Métricas de projeto/tarefa respeitam o acesso do usuário (ProjectMember
 * ou Workspace OWNER/ADMIN).
 */

import { prisma } from "@/lib/prisma";
import { isCompletionColumnName } from "@/lib/task-completion";
import { projectWhereForUser } from "@/lib/project-access";
import type { Prisma } from "@/generated/prisma/client";

function accessibleProjectFilter(
  workspaceId: string,
  userId: string,
): Prisma.ProjectWhereInput {
  return {
    workspaceId,
    AND: [projectWhereForUser(userId)],
  };
}

async function completionColumnIds(workspaceId: string, userId: string) {
  const columns = await prisma.boardColumn.findMany({
    where: {
      board: {
        project: accessibleProjectFilter(workspaceId, userId),
      },
    },
    select: { id: true, name: true },
  });
  return columns.filter((c) => isCompletionColumnName(c.name)).map((c) => c.id);
}

/** Em aberto = ainda não concluída (sem completedAt e fora de colunas Concluído/Done). */
function openTaskWhere(
  workspaceId: string,
  userId: string,
  doneColumnIds: string[],
): Prisma.TaskWhereInput {
  return {
    project: {
      ...accessibleProjectFilter(workspaceId, userId),
      archivedAt: null,
    },
    archivedAt: null,
    completedAt: null,
    ...(doneColumnIds.length > 0
      ? { columnId: { notIn: doneColumnIds } }
      : {}),
  };
}

/** Atividades do workspace em projetos acessíveis (ou sem projeto). */
function activityProjectAccess(
  workspaceId: string,
  userId: string,
): Prisma.ActivityWhereInput {
  return {
    workspaceId,
    OR: [
      { projectId: null },
      { project: accessibleProjectFilter(workspaceId, userId) },
    ],
  };
}

export const dashboardService = {
  async summary(workspaceId: string, userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const doneColumnIds = await completionColumnIds(workspaceId, userId);
    const openWhere = openTaskWhere(workspaceId, userId, doneColumnIds);
    const projectAccess = accessibleProjectFilter(workspaceId, userId);

    const [
      projectsActive,
      tasksOpen,
      tasksCompletedToday,
      tasksOverdue,
      apiTasksCreatedToday,
      webhookDeliveriesLast7d,
    ] = await Promise.all([
      prisma.project.count({
        where: {
          ...projectAccess,
          archivedAt: null,
          status: { in: ["ACTIVE", "PLANNING"] },
        },
      }),
      prisma.task.count({ where: openWhere }),
      prisma.task.count({
        where: {
          project: projectAccess,
          completedAt: { gte: today, lte: endOfDay },
        },
      }),
      prisma.task.count({
        where: {
          ...openWhere,
          dueDate: { lt: today },
        },
      }),
      prisma.activity.count({
        where: {
          ...activityProjectAccess(workspaceId, userId),
          actorType: "API",
          action: "task.created",
          createdAt: { gte: today },
        },
      }),
      prisma.webhookDelivery.count({
        where: {
          webhook: { workspaceId },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return {
      projectsActive,
      tasksOpen,
      tasksCompletedToday,
      tasksOverdue,
      apiTasksCreatedToday,
      webhookDeliveriesLast7d,
    };
  },

  /**
   * Atividade recente enriquecida com ator humano (quando houver).
   * Por padrão só mostra ações feitas pela IA (API, WEBHOOK) e pelo
   * SYSTEM. Ações do próprio usuário ficam fora do feed — elas já
   * aparecem inline no board/projeto e não precisam poluir o dashboard.
   */
  async recentActivity(
    workspaceId: string,
    userId: string,
    limit = 20,
    options: { includeUserActions?: boolean } = {},
  ) {
    const where: Prisma.ActivityWhereInput = {
      ...activityProjectAccess(workspaceId, userId),
    };
    if (!options.includeUserActions) {
      where.actorType = { in: ["API", "WEBHOOK", "SYSTEM"] };
    }
    return prisma.activity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, email: true } },
        project: { select: { id: true, name: true, color: true } },
        task: { select: { id: true, title: true } },
      },
    });
  },

  /** Atividade agrupada por origem (USER, API, WEBHOOK, SYSTEM) — última semana. */
  async activityByOrigin(workspaceId: string, userId: string) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const groups = await prisma.activity.groupBy({
      by: ["actorType"],
      where: {
        ...activityProjectAccess(workspaceId, userId),
        createdAt: { gte: since },
      },
      _count: true,
    });
    const map: Record<string, number> = {};
    for (const g of groups) map[g.actorType] = g._count;
    return map;
  },

  /** Tarefas criadas/atualizadas pela API nas últimas 24h. */
  async recentApiTasks(workspaceId: string, userId: string, limit = 10) {
    return prisma.activity.findMany({
      where: {
        ...activityProjectAccess(workspaceId, userId),
        actorType: "API",
        action: {
          in: ["task.created", "task.updated", "task.moved", "task.completed"],
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        task: { select: { id: true, title: true } },
        project: { select: { id: true, name: true } },
      },
    });
  },
};
