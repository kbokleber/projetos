import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

export type WorkspaceRef = {
  id: string;
  name: string;
  slug: string;
};

/**
 * Resolve o workspace alvo para a API.
 * Aceita id, slug ou nome (case-insensitive), sempre exigindo membership do usuário.
 */
export async function resolveApiWorkspace(opts: {
  userId: string | null;
  fallbackWorkspaceId: string;
  workspaceId?: string | null;
  workspaceSlug?: string | null;
  workspace?: string | null; // id, slug ou nome
}): Promise<WorkspaceRef> {
  if (!opts.userId) {
    throw new AppError("FORBIDDEN", "Usuário não associado ao token.", 403);
  }

  const raw =
    opts.workspaceId?.trim() ||
    opts.workspaceSlug?.trim() ||
    opts.workspace?.trim() ||
    null;

  if (!raw) {
    const ws = await prisma.workspace.findFirst({
      where: {
        id: opts.fallbackWorkspaceId,
        members: { some: { userId: opts.userId } },
      },
      select: { id: true, name: true, slug: true },
    });
    if (!ws) {
      throw new AppError(
        "FORBIDDEN",
        "Usuário não é membro do workspace do token.",
        403,
      );
    }
    return ws;
  }

  const memberships = await prisma.workspace.findMany({
    where: { members: { some: { userId: opts.userId } } },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: "asc" },
  });

  const lower = raw.toLowerCase();
  const match =
    memberships.find((w) => w.id === raw) ||
    memberships.find((w) => w.slug === lower) ||
    memberships.find((w) => w.name.toLowerCase() === lower);

  if (!match) {
    const available = memberships
      .map((w) => `${w.name} (slug: ${w.slug})`)
      .join("; ");
    throw new AppError(
      "NOT_FOUND",
      available
        ? `Workspace "${raw}" não encontrado ou sem acesso. Disponíveis: ${available}`
        : `Workspace "${raw}" não encontrado ou sem acesso.`,
      404,
    );
  }

  return match;
}

export async function listApiWorkspaces(userId: string | null) {
  if (!userId) {
    throw new AppError("FORBIDDEN", "Usuário não associado ao token.", 403);
  }

  return prisma.workspace.findMany({
    where: { members: { some: { userId } } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      _count: {
        select: { projects: { where: { archivedAt: null } } },
      },
    },
  });
}

/**
 * Garante que o usuário do token pode acessar a tarefa (membro do workspace do projeto).
 * Não limita ao workspace padrão do token.
 */
export async function resolveTaskAccessForApi(opts: {
  userId: string | null;
  taskId: string;
}) {
  if (!opts.userId) {
    throw new AppError("FORBIDDEN", "Usuário não associado ao token.", 403);
  }

  const task = await prisma.task.findUnique({
    where: { id: opts.taskId },
    select: {
      id: true,
      projectId: true,
      project: { select: { id: true, workspaceId: true, name: true } },
    },
  });
  if (!task) {
    throw new AppError("NOT_FOUND", "Tarefa não encontrada.", 404);
  }

  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: task.project.workspaceId,
        userId: opts.userId,
      },
    },
    select: { id: true },
  });
  if (!member) {
    throw new AppError(
      "FORBIDDEN",
      "Sem acesso ao workspace desta tarefa.",
      403,
    );
  }

  return {
    workspaceId: task.project.workspaceId,
    projectId: task.projectId,
  };
}
