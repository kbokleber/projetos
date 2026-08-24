/**
 * Service do Dashboard de acompanhamento — leitura focada em visões
 * executivas voltadas para usuários humanos que querem ver o que a IA fez.
 */

import { prisma } from "@/lib/prisma";

export const dashboardService = {
  async summary(workspaceId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const [
      projectsActive,
      tasksOpen,
      tasksCompletedToday,
      tasksOverdue,
      apiTasksCreatedToday,
      webhookDeliveriesLast7d,
    ] = await Promise.all([
      prisma.project.count({
        where: { workspaceId, archivedAt: null, status: { in: ["ACTIVE", "PLANNING"] } },
      }),
      prisma.task.count({
        where: {
          project: { workspaceId },
          archivedAt: null,
          completedAt: null,
        },
      }),
      prisma.task.count({
        where: {
          project: { workspaceId },
          completedAt: { gte: today, lte: endOfDay },
        },
      }),
      prisma.task.count({
        where: {
          project: { workspaceId },
          archivedAt: null,
          completedAt: null,
          dueDate: { lt: today },
        },
      }),
      prisma.activity.count({
        where: {
          workspaceId,
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
    limit = 20,
    options: { includeUserActions?: boolean } = {},
  ) {
    const where: Record<string, unknown> = { workspaceId };
    if (!options.includeUserActions) {
      where.actorType = { in: ["API", "WEBHOOK", "SYSTEM"] };
    }
    const items = await prisma.activity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, email: true } },
        project: { select: { id: true, name: true, color: true } },
        task: { select: { id: true, title: true } },
      },
    });
    return items;
  },

  /** Atividade agrupada por origem (USER, API, WEBHOOK, SYSTEM) — última semana. */
  async activityByOrigin(workspaceId: string) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const groups = await prisma.activity.groupBy({
      by: ["actorType"],
      where: { workspaceId, createdAt: { gte: since } },
      _count: true,
    });
    const map: Record<string, number> = {};
    for (const g of groups) map[g.actorType] = g._count;
    return map;
  },

  /** Tarefas criadas/atualizadas pela API nas últimas 24h. */
  async recentApiTasks(workspaceId: string, limit = 10) {
    return prisma.activity.findMany({
      where: {
        workspaceId,
        actorType: "API",
        action: { in: ["task.created", "task.updated", "task.moved", "task.completed"] },
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
